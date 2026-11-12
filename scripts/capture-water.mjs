// Water-surface evidence screenshots at 1440×900 (ADR-0025). Spawns its own dev server.
// Usage: node scripts/capture-water.mjs          # curated sites
//        IMPORT=1 node scripts/capture-water.mjs  # also a live import (needs the network)
import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const HOST = '127.0.0.1'
const PORT = Number(process.env.PORT ?? 5179)
const BASE = `http://${HOST}:${PORT}`
const OUT = 'docs/screenshots'
const IMPORT = process.env.IMPORT === '1'

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

/** The viewport rectangle of the 3D canvas, as a fraction of the canvas box. */
async function viewportBox(page) {
  const viewport = page.getByRole('region', { name: /3D site viewport/ })
  // The studio loads its package asynchronously, so the region appears after the canvas.
  await viewport.waitFor({ timeout: 60000 })
  const box = await viewport.boundingBox()
  if (!box) throw new Error('No 3D viewport on screen')
  return box
}

/** Switch between the 3D and the plan view and wait for the studio to be back. */
async function setView(page, name) {
  await page.getByRole('button', { name, exact: true }).click()
  // Switching the view re-mounts the studio, so the viewport has to come back before anything
  // is measured against it.
  await page.getByRole('region', { name: /3D site viewport/ }).waitFor({ timeout: 60000 })
  await page.waitForTimeout(3000)
}

/** Orbit the camera with a left-drag of a fixed pixel delta: the same view every run. */
async function rotate(page, at, dx, dy) {
  await page.mouse.move(at.x, at.y)
  await page.mouse.down()
  await page.mouse.move(at.x + dx, at.y + dy, { steps: 30 })
  await page.mouse.up()
  await page.waitForTimeout(2000)
}

async function zoom(page, at, steps) {
  await page.mouse.move(at.x, at.y)
  for (let step = 0; step < steps; step += 1) {
    await page.mouse.wheel(0, -240)
    await page.waitForTimeout(220)
  }
  await page.waitForTimeout(2200)
}

await mkdir(OUT, { recursive: true })
const server = spawn('npm', ['run', 'dev', '--', '--host', HOST, '--port', String(PORT)], {
  stdio: 'ignore',
  env: { ...process.env, BROWSER: 'none' },
})

try {
  await waitForServer()
  const browser = await chromium.launch()

  // --- The curated Akerselva in Compact Infill -------------------------------------------
  {
    const context = await browser.newContext({ deviceScaleFactor: 1, viewport: { width: 1440, height: 900 } })
    const page = await context.newPage()
    await page.addInitScript(() => {
      globalThis.localStorage.setItem('terraform.renderQuality', 'high')
      globalThis.localStorage.setItem('terraform:studio-guide-dismissed:v1', 'true')
    })
    await page.goto(`${BASE}/studio/compact-infill`, { waitUntil: 'networkidle' })
    await page.locator('canvas').first().waitFor()
    await page.waitForTimeout(5000)

    const box = await viewportBox(page)
    const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 }

    // Plan view: the river reads as a flat ribbon, and the contour lines that run across the
    // ground around it do not run across it.
    await setView(page, 'Plan')
    const planPath = `${OUT}/water-compact-infill-plan-1440x900.png`
    await page.screenshot({ path: planPath })
    console.log(planPath)

    // The same view tilted down into an oblique: the surface stays flat and keeps to the
    // ground it lies in.
    await rotate(page, centre, 0, -120)
    const lowPath = `${OUT}/water-compact-infill-river-1440x900.png`
    await page.screenshot({ path: lowPath })
    console.log(lowPath)
    await context.close()
  }

  // --- A live import: the Nidelva at Bakklandet, Trondheim --------------------------------
  if (IMPORT) {
    const context = await browser.newContext({ deviceScaleFactor: 1, viewport: { width: 1440, height: 900 } })
    const page = await context.newPage()
    await page.addInitScript(() => {
      globalThis.localStorage.setItem('terraform.renderQuality', 'high')
      globalThis.localStorage.setItem('terraform:studio-guide-dismissed:v1', 'true')
    })
    try {
      await page.goto(`${BASE}/new?lat=63.428&lon=10.4029&label=${encodeURIComponent('Trondheim (Bakklandet)')}`, {
        waitUntil: 'networkidle',
      })
      await page.waitForTimeout(6000)
      await page.getByRole('button', { name: 'Open in 3D' }).click()
      await page.waitForURL(/\/studio\/import\//, { timeout: 240000 })
      await page.locator('canvas').first().waitFor({ timeout: 60000 })
      await page.waitForTimeout(12000)

      const box = await viewportBox(page)
      // The river runs north to south a little west of the middle of the frame.
      const at = { x: box.x + box.width * 0.7, y: box.y + box.height * 0.3 }
      await zoom(page, at, 8)
      const closePath = `${OUT}/water-import-bakklandet-1440x900.png`
      await page.screenshot({ path: closePath })
      console.log(closePath)

      await rotate(page, at, 0, -45)
      const lowPath = `${OUT}/water-import-bakklandet-low-1440x900.png`
      await page.screenshot({ path: lowPath })
      console.log(lowPath)
    } catch (error) {
      // The live import needs OpenFreeMap tiles and Kartverket; report rather than fail the run.
      console.warn(`Live import capture skipped: ${error instanceof Error ? error.message : String(error)}`)
    }
    await context.close()
  }

  await browser.close()
} finally {
  server.kill('SIGTERM')
}
