// Imports a real Oslo frame against the running dev server and captures the measured roofs (ADR-0022).
// Usage: npm run dev -- --port 5173, then `node scripts/capture-roofs.mjs`. Needs network (OpenFreeMap, Kartverket).
import { chromium } from '@playwright/test'

const BASE = process.env.BASE ?? 'http://localhost:5173'
const OUT = process.env.OUT ?? 'docs/screenshots'
const SITES = [
  { key: 'grunerlokka', lat: 59.9225, lon: 10.7595, label: 'Grünerløkka' },
  { key: 'kampen', lat: 59.9128, lon: 10.7806, label: 'Kampen' },
]

const browser = await chromium.launch()
try {
  for (const site of SITES) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
    await page.goto(`${BASE}/new?lat=${site.lat}&lon=${site.lon}&label=${encodeURIComponent(site.label)}`, { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Open in 3D' }).click()
    await page.waitForURL(/\/studio\/import\//, { timeout: 90_000 })
    await page.waitForTimeout(5000)
    const note = await page.getByText(/Roofs from/).first().textContent().catch(() => null)
    console.log(site.key, note)
    await page.screenshot({ path: `${OUT}/roofs-${site.key}-1440x900.png` })
    // Closer view: wheel in over the viewport centre.
    await page.mouse.move(540, 300)
    for (let i = 0; i < 6; i += 1) { await page.mouse.wheel(0, -240); await page.waitForTimeout(120) }
    await page.waitForTimeout(1500)
    await page.screenshot({ path: `${OUT}/roofs-${site.key}-close-1440x900.png` })
    // Roof overlays must follow the gables, not cut through them.
    await page.getByRole('group', { name: 'Analysis cards' }).getByRole('button', { name: /^Sun/ }).click()
    await page.getByRole('button', { name: 'Roof solar', exact: true }).first().click()
    await page.waitForTimeout(8000)
    await page.screenshot({ path: `${OUT}/roofs-${site.key}-solar-1440x900.png` })
    await page.close()
  }
} finally {
  await browser.close()
}
