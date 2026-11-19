// Serve this folder with Vite and screenshot the registration viewer (top + oblique).
//   node feasibility/scratch/registration/capture.mjs
import { spawn } from 'node:child_process'
import { chromium } from '@playwright/test'

const root = new URL('.', import.meta.url).pathname
const PORT = 4175
const server = spawn('npx', ['vite', root, '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore' })
for (let i = 0; i < 60; i++) {
  try { if ((await fetch(`http://127.0.0.1:${PORT}/`)).ok) break } catch { /* not up */ }
  await new Promise((r) => setTimeout(r, 500))
}
const browser = await chromium.launch({ headless: false })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
page.on('pageerror', (e) => console.error('pageerror', e))
for (const view of ['top', 'oblique']) {
  await page.goto(`http://127.0.0.1:${PORT}/?view=${view}`)
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 })
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${root}../evidence/registration-${view}.png` })
  console.log('captured', view)
}
await browser.close()
server.kill()
