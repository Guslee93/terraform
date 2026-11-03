// Frame-rate probe with three drawn masses (D39).
//
// The empty-scene numbers in scripts/measure-fps.mjs do not show what the
// renderer does once the visitor has massing in the scene. This script draws
// three footprints exactly the way e2e/massing.spec.ts does — Plan preset,
// `Draw building`, four ground clicks, Enter — then switches back to the 3D
// preset and counts requestAnimationFrame frames like the existing probe.
//
//   node scripts/measure-fps-masses.mjs            # headed (headline numbers)
//   node scripts/measure-fps-masses.mjs --headless # same probe, headless
//
// The dev server is started (or reused) on 127.0.0.1:5173.
/* global window, document, requestAnimationFrame */

import { spawn } from 'node:child_process'
import { chromium } from '@playwright/test'

const HOST = '127.0.0.1'
const PORT = 5173
const BASE = `http://${HOST}:${PORT}`

const SETTLE_MS = 3000
const SAMPLE_MS = 4000
const MASSES = 3
const headless = process.argv.includes('--headless')

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

/** Centre of the 3D viewport, in page (viewport) coordinates. */
async function viewportCentre(page) {
  const box = await page.getByRole('region', { name: /3D site viewport for Compact Infill/i }).boundingBox()
  if (!box) throw new Error('The 3D site viewport region was not found')
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/** Draw `count` separated squares in the Plan preset, as massing.spec.ts does. */
async function drawMasses(page, count) {
  await page.getByRole('button', { name: 'Plan', exact: true }).click()
  await page.waitForTimeout(400)
  const centre = await viewportCentre(page)
  const step = 45
  // Non-overlapping 90 x 90 m footprints around the viewport centre.
  const offsets = [
    { x: -150, y: -90 },
    { x: 60, y: -90 },
    { x: -45, y: 90 },
  ]
  for (let index = 0; index < count; index += 1) {
    const origin = offsets[index % offsets.length]
    await page.getByRole('button', { name: 'Draw building' }).click()
    const corners = [
      { x: centre.x + origin.x - step, y: centre.y + origin.y - step },
      { x: centre.x + origin.x + step, y: centre.y + origin.y - step },
      { x: centre.x + origin.x + step, y: centre.y + origin.y + step },
      { x: centre.x + origin.x - step, y: centre.y + origin.y + step },
    ]
    for (const corner of corners) await page.mouse.click(corner.x, corner.y)
    // Clicking the canvas leaves focus on Draw building; Enter would cancel the drawing.
    await page.getByRole('button', { name: 'Draw building' }).evaluate((button) => button.blur())
    await page.keyboard.press('Enter')
    // Wait until the committed mass is selected in the inspector.
    const expected = `Mass ${index + 1}`
    await page.getByLabel('Name').waitFor({ state: 'visible' })
    const name = await page.getByLabel('Name').inputValue()
    if (name !== expected) throw new Error(`Expected ${expected}, got ${name}`)
  }
  await page.getByRole('button', { name: '3D', exact: true }).click()
  await page.waitForTimeout(SETTLE_MS)
}

/** Draw three masses, then count frames for the settled 3D scene. */
async function measureFps(page, dpr) {
  await page.goto(`${BASE}/studio/compact-infill`, { waitUntil: 'networkidle' })
  await page.getByRole('region', { name: /3D site viewport for Compact Infill/i }).waitFor()
  await drawMasses(page, MASSES)

  const drawn = await page.locator('aside[aria-label="Inspector"]').getByText(/^Mass \d$/).count()
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
    `compact-infill masses=${MASSES} drawable=${drawn} dpr${dpr} ${fps.toFixed(1)} fps | gl=${gl?.renderer ?? 'unknown'} | vendor=${gl?.vendor ?? 'unknown'}`,
  )
}

const server = spawn('npm', ['run', 'dev', '--', '--host', HOST, '--port', String(PORT)], {
  stdio: 'ignore',
  env: { ...process.env, BROWSER: 'none' },
})

try {
  await waitForServer()

  const args =
    process.platform === 'darwin'
      ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist']
      : ['--enable-gpu', '--ignore-gpu-blocklist']
  const browser = await chromium.launch({ headless, args })
  console.log(`mode=${headless ? 'headless' : 'headed'} platform=${process.platform}`)

  for (const dpr of [1, 2]) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: dpr,
    })
    const page = await context.newPage()
    try {
      await measureFps(page, dpr)
    } finally {
      await context.close()
    }
  }

  await browser.close()
} finally {
  server.kill('SIGTERM')
}
