// Screenshots of each analysis card of the built app, for the build/foundation work packages.
//   npm run build && node scripts/capture-build.mjs <prefix> [site]
// Writes docs/screenshots/build-<prefix>-<card>.png at 1440 × 900.
import { spawn } from 'node:child_process'
import { chromium } from '@playwright/test'

const [prefix = 'labels', site = 'compact-infill'] = process.argv.slice(2)
const PORT = 4177
const BASE = `http://127.0.0.1:${PORT}`
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore' })
try {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(BASE)).ok) break } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500))
  }
  const browser = await chromium.launch({ headless: false })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.goto(`${BASE}/studio/${site}`)
  await page.getByTestId('analysis-card-sun').waitFor({ timeout: 60000 })
  for (const card of ['sun', 'wind', 'noise']) {
    const button = page.getByTestId(`analysis-card-${card}`)
    // The open card is the analysis on the map; a click on an open card would close it.
    if ((await button.getAttribute('aria-expanded')) !== 'true') await button.click()
    await page.waitForTimeout(card === 'wind' ? 14000 : 6000)
    await button.evaluate((el) => el.scrollIntoView({ block: 'start' }))
    await page.waitForTimeout(300)
    await page.screenshot({ path: `docs/screenshots/build-${prefix}-${card}${site === 'compact-infill' ? '' : `-${site}`}.png` })
  }
  await browser.close()
} finally {
  server.kill()
}
