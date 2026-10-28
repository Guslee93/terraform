// Reusable GPU frame-rate probe.
//
// Prints steady-state `requestAnimationFrame` frames per second for each site
// at device scale 1 and 2, so scene-look work can compare against a known
// baseline on a particular machine. Usage:
//
//   node scripts/measure-fps.mjs
//
// The dev server is started (or reused) on 127.0.0.1:5173, exactly like
// `scripts/capture.mjs`.
/* global window, requestAnimationFrame */

import { spawn } from 'node:child_process'
import { chromium } from '@playwright/test'

const HOST = '127.0.0.1'
const PORT = 5173
const BASE = `http://${HOST}:${PORT}`

const SETTLE_MS = 3000
const SAMPLE_MS = 4000

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

/** Load one studio at one DPR, let the scene settle, then count frames. */
async function measureFps(page, site, dpr) {
  await page.goto(`${BASE}/studio/${site}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(SETTLE_MS)

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
  console.log(`${site} dpr${dpr} ${fps.toFixed(1)} fps`)
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
      : []
  const browser = await chromium.launch({ args })

  for (const site of ['compact-infill', 'sloped-edge']) {
    for (const dpr of [1, 2]) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
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