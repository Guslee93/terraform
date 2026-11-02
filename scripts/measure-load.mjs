// Cold-cache load timings on the production build (D39).
//
// Measures, median of five runs, at 1440x900:
//   DOMContentLoaded, load, first contentful paint   (Navigation Timing / Paint Timing)
//   studio only: time until the 3D viewport region shows a canvas with a real box,
//                and time until `Draw building` is enabled (the app's "package ready" signal)
//
// Each run gets a fresh browser context, so the HTTP cache starts empty; the
// script also reports how many resources were fetched from the network to show
// the runs really were cold.
//
//   npm run build
//   node scripts/measure-load.mjs
//
// The preview server is started (or reused) on 127.0.0.1:4173 from `dist/`.
/* global document */

import { spawn } from 'node:child_process'
import { chromium } from '@playwright/test'

const HOST = '127.0.0.1'
const PORT = 4173
const BASE = `http://${HOST}:${PORT}`
const RUNS = 5
const ROUTES = [
  { label: 'landing', path: '/', studio: false },
  { label: 'studio', path: '/studio/compact-infill', studio: true },
]

async function waitForServer() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(BASE)
      if (response.ok) return
    } catch {
      // Preview server not ready yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`Preview server did not start at ${BASE}`)
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
}

const round = (value) => (value === null || value === undefined ? null : Math.round(value))

async function runOnce(browser, route) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  })
  const page = await context.newPage()
  try {
    await page.goto(`${BASE}${route.path}`, { waitUntil: 'commit' })
    await page.waitForFunction(() => document.readyState === 'complete', null, {
      timeout: 60_000,
      polling: 'raf',
    })
    // The first-contentful-paint entry lands a few ms after the load event.
    await page
      .waitForFunction(
        () => performance.getEntriesByType('paint').some((entry) => entry.name === 'first-contentful-paint'),
        null,
        { timeout: 5000, polling: 'raf' },
      )
      .catch(() => undefined)

    const timing = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0]
      const paints = performance.getEntriesByType('paint')
      const fcp = paints.find((entry) => entry.name === 'first-contentful-paint')
      const fp = paints.find((entry) => entry.name === 'first-paint')
      const resources = performance.getEntriesByType('resource')
      return {
        dcl: nav ? nav.domContentLoadedEventEnd : null,
        load: nav && nav.loadEventEnd > 0 ? nav.loadEventEnd : performance.now(),
        fcp: fcp ? fcp.startTime : null,
        fp: fp ? fp.startTime : null,
        resources: resources.length,
        networkResources: resources.filter((entry) => (entry.transferSize ?? 0) > 0).length,
        transferBytes: resources.reduce((sum, entry) => sum + (entry.transferSize ?? 0), 0),
        gl: (() => {
          const canvas = document.querySelector('canvas')
          if (!canvas) return null
          const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
          if (!gl) return null
          const info = gl.getExtension('WEBGL_debug_renderer_info')
          return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)
        })(),
      }
    })

    let viewport = null
    let drawable = null
    if (route.studio) {
      viewport = await page
        .waitForFunction(
          () => {
            const region = document.querySelector('[aria-label="Studio viewport"]')
            if (!region) return null
            const canvas = region.querySelector('canvas')
            if (!canvas) return null
            const rect = region.getBoundingClientRect()
            if (rect.width < 100 || rect.height < 100) return null
            return {
              at: performance.now(),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            }
          },
          null,
          { timeout: 60_000, polling: 'raf' },
        )
        .then((handle) => handle.jsonValue())

      drawable = await page
        .waitForFunction(
          () => {
            const button = [...document.querySelectorAll('button')].find(
              (candidate) => candidate.textContent?.trim() === 'Draw building',
            )
            if (!button || button.disabled) return null
            return performance.now()
          },
          null,
          { timeout: 60_000, polling: 'raf' },
        )
        .then((handle) => handle.jsonValue())
    }

    return { ...timing, viewportAt: viewport?.at ?? null, viewportSize: viewport, drawableAt: drawable }
  } finally {
    await context.close()
  }
}

const server = spawn(
  'npm',
  ['run', 'preview', '--', '--host', HOST, '--port', String(PORT), '--strictPort'],
  { stdio: 'ignore', env: { ...process.env, BROWSER: 'none' } },
)

try {
  await waitForServer()

  const browser = await chromium.launch()
  const results = []

  for (const route of ROUTES) {
    for (let run = 1; run <= RUNS; run += 1) {
      const sample = await runOnce(browser, route)
      results.push({ route: route.label, run, ...sample })
      console.log(
        `${route.label} run ${run}: dcl=${round(sample.dcl)}ms load=${round(sample.load)}ms ` +
          `fcp=${round(sample.fcp)}ms first-paint=${round(sample.fp)}ms ` +
          `viewport=${round(sample.viewportAt)}ms drawable=${round(sample.drawableAt)}ms ` +
          `resources=${sample.resources}/${sample.networkResources} bytes=${sample.transferBytes}` +
          (sample.gl ? ` gl=${sample.gl}` : ''),
      )
    }
  }

  await browser.close()

  console.log('\nmedian of 5 runs:')
  for (const route of ROUTES) {
    const samples = results.filter((sample) => sample.route === route.label)
    const medians = {}
    for (const key of ['dcl', 'load', 'fcp', 'fp', 'viewportAt', 'drawableAt']) {
      const values = samples.map((sample) => sample[key]).filter((value) => value !== null)
      medians[key] = values.length === samples.length ? round(median(values)) : null
    }
    console.log(
      `${route.label}: dcl=${medians.dcl}ms load=${medians.load}ms fcp=${medians.fcp}ms first-paint=${medians.fp}ms` +
        (route.studio ? ` viewport=${medians.viewportAt}ms drawable=${medians.drawableAt}ms` : ''),
    )
  }
} finally {
  server.kill('SIGTERM')
}
