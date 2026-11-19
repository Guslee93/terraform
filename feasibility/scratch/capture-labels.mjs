// Screenshot each analysis card of the current build (2089fd4) for the label review, and dump the
// visible panel text. Read-only.   npm run build && node feasibility/scratch/capture-labels.mjs
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

const PORT = 4176
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore' })
for (let i = 0; i < 60; i++) {
  try { if ((await fetch(`http://127.0.0.1:${PORT}/`)).ok) break } catch { /* not up */ }
  await new Promise((r) => setTimeout(r, 500))
}
const out = new URL('./evidence/', import.meta.url).pathname
const browser = await chromium.launch({ headless: false })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
await page.goto(`http://127.0.0.1:${PORT}/studio/compact-infill`)
await page.getByTestId('analysis-card-sun').waitFor({ timeout: 60000 })
await page.waitForTimeout(5000)
const text = {}
for (const card of ['sun', 'wind', 'noise']) {
  const loc = page.getByTestId(`analysis-card-${card}`)
  if (!(await loc.count())) { text[card] = 'card not found'; continue }
  await loc.click()
  await page.waitForTimeout(card === 'wind' ? 12000 : 3000)
  await page.screenshot({ path: `${out}labels-${card}.png` })
  text[card] = await page.locator('main, body').first().innerText()
}
writeFileSync(`${out}labels-text.json`, JSON.stringify(text, null, 1))
await browser.close()
server.kill()
console.log('done')
