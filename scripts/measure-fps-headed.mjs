// Headed GPU frame-rate probe (D39 companion to scripts/measure-fps.mjs).
//
// measure-fps.mjs launches headless Chromium, which can fall back to SwiftShader
// software rendering. This script runs the *same* measurement with a headed
// browser so the headline numbers come from the real GPU path. It also prints
// the WebGL renderer string each run actually used, so the report can say
// whether the numbers are hardware or software.
//
//   node scripts/measure-fps-headed.mjs            # headed (headline numbers)
//   node scripts/measure-fps-headed.mjs --headless # same probe, headless
//
// The dev server is started (or reused) on 127.0.0.1:5173, exactly like
// scripts/measure-fps.mjs.
/* global window, document, requestAnimationFrame */

import { spawn } from 'node:child_process'
import { chromium } from '@playwright/test'

const HOST = '127.0.0.1'
const PORT = 5173
const BASE = `http://${HOST}:${PORT}`

const SETTLE_MS = 3000
const SAMPLE_MS = 4000
const headless = process.argv.includes('--headless')
const viewportArg = process.argv.find((arg) => arg.startsWith('--viewport='))
const [VIEWPORT_WIDTH, VIEWPORT_HEIGHT] = (viewportArg?.split('=')[1] ?? '1440x900')
  .split('x')
  .map((value) => Number(value))


async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(BASE)
      if (response.ok) return
    } catch {
      // Server not ready yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  throw new Error(`Dev server did not start at ${BASE}`)
}

/** WebGL backend the page is really drawing with (SwiftShader vs a real GPU). */
async function glRenderer(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return null
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    if (!gl) return null
    const info = gl.getExtension('WEBGL_debug_renderer_info')
    return {
      vendor: info ? gl.getParameter(info.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
      renderer: info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
    }
  })
}

/** Load one studio at one DPR, let the scene settle, then count frames. */
async function measureFps(page, site, dpr) {
  await page.goto(`${BASE}/studio/${site}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(SETTLE_MS)

  const gl = await glRenderer(page)

  await page.evaluate(() => {
    window.__fpsFrames = 0
    const count = () => {
      window.__fpsFrames += 1
      requestAnimationFrame(count)
    }
    requestAnimationFrame(count)
  })

  await page.waitForTimeout(SAMPLE_MS)
  const frames = (await page.evaluate(() => window.__fpsFrames)) ?? 0
  const fps = frames / (SAMPLE_MS / 1000)
  console.log(
    `${site} dpr${dpr} ${fps.toFixed(1)} fps | gl=${gl?.renderer ?? 'unknown'} | vendor=${gl?.vendor ?? 'unknown'}`,
  )
}

const server = spawn('npm', ['run', 'dev', '--', '--host', HOST, '--port', String(PORT)], {
  stdio: 'ignore',
  env: { ...process.env, BROWSER: 'none' },
})

try {
  await waitForServer()

  // Metal ANGLE is the accelerated path on macOS; elsewhere rely on defaults.
  const args =
    process.platform === 'darwin'
      ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist']
      : ['--enable-gpu', '--ignore-gpu-blocklist']
  const browser = await chromium.launch({ headless, args })
  console.log(`mode=${headless ? 'headless' : 'headed'} platform=${process.platform}`)

  for (const site of ['compact-infill', 'sloped-edge']) {
    for (const dpr of [1, 2]) {
      const context = await browser.newContext({
        viewport: { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT },
        deviceScaleFactor: dpr,
      })
      const page = await context.newPage()
      try {
        await measureFps(page, site, dpr)
      } finally {
        await context.close()
      }
    }
  }

  await browser.close()
} finally {
  server.kill('SIGTERM')
}
