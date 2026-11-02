import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const HOST = '127.0.0.1'
const PORT = 5173
const BASE = `http://${HOST}:${PORT}`
const OUT = 'docs/screenshots'
const PREFIX = process.env.SHOT_PREFIX ?? 'm1'

const allViewports = [
  { name: '1440x900', width: 1440, height: 900 },
  { name: '1280x800', width: 1280, height: 800 },
  { name: '1024x800', width: 1024, height: 800 },
  { name: '1920x1080', width: 1920, height: 1080 },
  { name: '390x844', width: 390, height: 844 },
]
const viewports = process.env.SHOT_VIEWPORT
  ? allViewports.filter((viewport) => viewport.name === process.env.SHOT_VIEWPORT)
  : allViewports

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
  const page = await browser.newPage({ deviceScaleFactor: 1 })
  // Evidence screenshots always show the full look: headless Chromium renders in software,
  // where render quality "Auto" would drop to Low (no shadows, no AO).
  // eslint-disable-next-line no-undef -- runs in the page, not in Node
  await page.addInitScript(() => window.localStorage.setItem('terraform.renderQuality', 'high'))

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height })

    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
    await page.screenshot({
      path: `${OUT}/${PREFIX}-landing-${viewport.name}.png`,
      fullPage: false,
    })

    for (const site of ['compact-infill', 'sloped-edge']) {
      await page.goto(`${BASE}/studio/${site}`, { waitUntil: 'networkidle' })
      await page.waitForTimeout(1200)
      await page.screenshot({
        path: `${OUT}/${PREFIX}-${site}-${viewport.name}.png`,
        fullPage: false,
      })

      if (viewport.width >= 1280) {
        await page.getByRole('button', { name: 'Plan', exact: true }).click()
        await page.waitForTimeout(1000)
        await page.screenshot({
          path: `${OUT}/${PREFIX}-${site}-${viewport.name}-top.png`,
          fullPage: false,
        })
      }
    }
  }

  await browser.close()
  console.log(`Captured ${viewports.length * 3 + 3 * 2} screenshots in ${OUT}`)
} finally {
  server.kill('SIGTERM')
}
