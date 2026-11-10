// Sun-analysis evidence screenshots at 1440×900 (ADR-0021). Spawns its own dev server.
// Usage: node scripts/capture-sun.mjs
import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const HOST = '127.0.0.1'
const PORT = Number(process.env.PORT ?? 5178)
const BASE = `http://${HOST}:${PORT}`
const OUT = 'docs/screenshots'
const SITES = ['compact-infill', 'sloped-edge']
const ALL_MODES = [
  { key: 'hours', label: 'Sun hours', draw: false },
  { key: 'roof-solar', label: 'Roof solar', draw: false },
  { key: 'facade', label: 'Façade', draw: true },
  { key: 'vsc', label: 'VSC', draw: true },
]
const ONLY = process.env.MODES ? process.env.MODES.split(',') : null
const MODES = ONLY ? ALL_MODES.filter((mode) => ONLY.includes(mode.key)) : ALL_MODES

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

await mkdir(OUT, { recursive: true })
const server = spawn('npm', ['run', 'dev', '--', '--host', HOST, '--port', String(PORT)], {
  stdio: 'ignore',
  env: { ...process.env, BROWSER: 'none' },
})

try {
  await waitForServer()
  const browser = await chromium.launch()

  for (const site of SITES) {
    for (const mode of MODES) {
      const context = await browser.newContext({ deviceScaleFactor: 1, viewport: { width: 1440, height: 900 } })
      const page = await context.newPage()
      await page.addInitScript(() => globalThis.localStorage.setItem('terraform.renderQuality', 'high'))
      await page.goto(`${BASE}/studio/${site}`, { waitUntil: 'networkidle' })
      await page.locator('canvas').first().waitFor()
      await page.waitForTimeout(3500)

      if (mode.draw) {
        // Draw one block so the façade layers have something to sample.
        await page.getByRole('button', { name: 'Add a block' }).click()
        await page.getByRole('button', { name: 'Plan', exact: true }).click()
        await page.waitForTimeout(1200)
        await page.getByRole('button', { name: 'Draw building' }).click()
        const box = await page.locator('canvas').first().boundingBox()
        if (!box) throw new Error(`No canvas at ${site}`)
        const cx = box.x + box.width * 0.5
        const cy = box.y + box.height * 0.55
        for (const [dx, dy] of [[-55, -35], [55, -35], [55, 35], [-55, 35]]) {
          await page.mouse.click(cx + dx, cy + dy)
        }
        await page.keyboard.press('Enter')
        await page.getByRole('button', { name: '3D', exact: true }).click()
        await page.waitForTimeout(2500)
      }

      await page.getByRole('group', { name: 'Analysis cards' }).getByRole('button', { name: /^Sun/ }).click()
      await page.getByRole('button', { name: mode.label, exact: true }).first().click()
      await page.waitForTimeout(mode.key === 'roof-solar' ? 4500 : 1500)
      if (mode.draw) {
        // The drawn block is small at the site camera; move in so the façade quads are legible.
        const canvas = await page.locator('canvas').first().boundingBox()
        if (canvas) {
          await page.mouse.move(canvas.x + canvas.width * 0.5, canvas.y + canvas.height * 0.55)
          for (let step = 0; step < 9; step += 1) await page.mouse.wheel(0, -120)
          await page.waitForTimeout(1000)
        }
      }
      const path = `${OUT}/sun-${mode.key}-${site}-1440x900.png`
      await page.screenshot({ path })
      console.log(path)
      await context.close()
    }
  }

  await browser.close()
} finally {
  server.kill('SIGTERM')
}
