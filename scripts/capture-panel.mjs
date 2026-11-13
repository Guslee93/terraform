// Panel evidence screenshots against an already-running dev server (npm run dev).
// Usage: node scripts/capture-panel.mjs
import { mkdir } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const BASE = process.env.BASE ?? 'http://localhost:5173'
const OUT = 'docs/screenshots'

await mkdir(OUT, { recursive: true })
const browser = await chromium.launch()
const context = await browser.newContext({ deviceScaleFactor: 1, viewport: { width: 1440, height: 900 } })
const page = await context.newPage()
await page.addInitScript(() => {
  localStorage.setItem('terraform.renderQuality', 'high')
  localStorage.setItem('terraform:studio-guide-dismissed:v1', 'true')
})

// The studio: one card per analysis in the Parameters panel, no bottom dock.
await page.goto(`${BASE}/studio/compact-infill`, { waitUntil: 'networkidle' })
await page.locator('canvas').first().waitFor()
await page.waitForTimeout(4000)
await page.screenshot({ path: `${OUT}/panel-noise-1440x900.png` })
console.log(`${OUT}/panel-noise-1440x900.png`)

await page.getByTestId('analysis-card-wind').click()
await page.waitForTimeout(9000)
await page.screenshot({ path: `${OUT}/panel-wind-1440x900.png` })
console.log(`${OUT}/panel-wind-1440x900.png`)

await page.getByTestId('analysis-card-sun').click()
await page.waitForTimeout(2500)
await page.screenshot({ path: `${OUT}/panel-sun-1440x900.png` })
console.log(`${OUT}/panel-sun-1440x900.png`)

// The frame step: the map with the frame, and the import progress bar.
await page.goto(`${BASE}/new`, { waitUntil: 'networkidle' })
await page.waitForTimeout(3000)
await page.screenshot({ path: `${OUT}/panel-frame-1440x900.png` })
console.log(`${OUT}/panel-frame-1440x900.png`)

await page.getByRole('button', { name: 'Open in 3D' }).click()
await page.waitForTimeout(2500)
await page.screenshot({ path: `${OUT}/panel-import-1440x900.png` })
console.log(`${OUT}/panel-import-1440x900.png`)

await context.close()
await browser.close()
