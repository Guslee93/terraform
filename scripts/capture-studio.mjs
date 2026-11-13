// Studio evidence screenshots against an already-running dev server (npm run dev).
// Usage: SHOT_PREFIX=studio-v3-after node scripts/capture-studio.mjs
import { mkdir } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const BASE = process.env.BASE ?? 'http://localhost:5173'
const OUT = 'docs/screenshots'
const PREFIX = process.env.SHOT_PREFIX ?? 'studio'
const SIZES = process.env.SIZE ? [process.env.SIZE.split('x').map(Number)] : [[1440, 900], [1280, 800], [1920, 1080]]

await mkdir(OUT, { recursive: true })
const browser = await chromium.launch()
/* eslint-disable no-undef -- page callbacks run in the browser */
for (const [width, height] of SIZES) {
  // A fresh context per size: no scenario or mass carries over from the previous size.
  const page = await (await browser.newContext({ deviceScaleFactor: 1, viewport: { width, height } })).newPage()
  await page.addInitScript((testBuilding) => {
    localStorage.setItem('terraform.renderQuality', 'high')
    localStorage.setItem('terraform:test-building:v1', String(testBuilding))
    localStorage.setItem('terraform:studio-guide-dismissed:v1', 'true')
  }, !process.env.ANALYSIS)
  await page.goto(`${BASE}/studio/compact-infill`, { waitUntil: 'networkidle' })
  await page.locator('canvas').first().waitFor()
  await page.waitForTimeout(4000)
  if (process.env.DRAW) {
    // Draw one 4-corner mass in plan, then return to the 3D view; the new mass stays selected.
    // "Add a block" opens the tool rail; without it the Draw building button is not on screen.
    await page.getByRole('button', { name: 'Add a block' }).click()
    await page.getByRole('button', { name: 'Plan', exact: true }).click()
    await page.waitForTimeout(1500)
    const box = await page.getByRole('region', { name: /3D site viewport/ }).boundingBox()
    await page.getByRole('button', { name: 'Draw building' }).click()
    const cx = box.x + box.width * 0.5, cy = box.y + box.height * 0.55
    for (const [dx, dy] of [[-40, -25], [40, -25], [40, 25], [-40, 25]]) await page.mouse.click(cx + dx, cy + dy)
    await page.keyboard.press('Enter')
    await page.getByRole('button', { name: '3D', exact: true }).click()
    await page.waitForTimeout(2500)
  }
  if (process.env.NOGRID) await page.getByRole('checkbox', { name: /Ground grid/ }).uncheck()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)
  if (overflow) console.warn(`${width}x${height}: horizontal overflow`)
  await page.screenshot({ path: `${OUT}/${PREFIX}-${width}x${height}.png` })
  console.log(`${OUT}/${PREFIX}-${width}x${height}.png`)
  if (process.env.WIND && width === 1440) {
    const card = process.env.CARD ?? 'Wind'
    await page.getByTestId(`analysis-card-${card.toLowerCase()}`).click()
    await page.waitForTimeout(8000)
    await page.screenshot({ path: `${OUT}/${PREFIX}-${(process.env.CARD ?? 'Wind').toLowerCase()}-${width}x${height}.png` })
    console.log(`${OUT}/${PREFIX}-${(process.env.CARD ?? 'Wind').toLowerCase()}-${width}x${height}.png`)
  }
  await page.context().close()
}
await browser.close()
/* eslint-enable no-undef */
