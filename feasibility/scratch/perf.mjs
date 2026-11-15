// Throwaway Test 4: measure the CURRENT production build (tag pre-feasibility, 2089fd4) in headed
// Chromium on this machine's GPU. Read-only: drives the UI, changes nothing.
//
//   npm run build && node feasibility/scratch/perf.mjs
//
// Per site and run (fresh context, cold HTTP cache): FCP, time to canvas, time to the Sun card,
// then three 6 s windows: idle (default Sun card), camera orbit (mouse drag), Wind card open.
// Each window records frame intervals (rAF), long tasks (> 50 ms), WebGL draw calls per frame and
// the CDP JS heap. Writes feasibility/scratch/evidence/perf-<date>.json.
/* global window, document, performance, requestAnimationFrame, PerformanceObserver, WebGLRenderingContext, WebGL2RenderingContext */
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

const PORT = 4174
const BASE = `http://127.0.0.1:${PORT}`
const RUNS = 3
const WINDOW_MS = 6000
const SITES = ['compact-infill', 'sloped-edge']
const throttle = process.argv.includes('--cpu4x')

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { stdio: 'ignore' })
for (let i = 0; i < 60; i++) {
  try { if ((await fetch(BASE)).ok) break } catch { /* not up yet */ }
  await new Promise((r) => setTimeout(r, 500))
}

const probe = () => {
  const w = window
  w.__perf = { draws: 0, frames: [], longTasks: [] }
  for (const proto of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) {
    for (const name of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
      const orig = proto[name]
      if (!orig) continue
      proto[name] = function (...args) { w.__perf.draws += 1; return orig.apply(this, args) }
    }
  }
  new PerformanceObserver((list) => { for (const e of list.getEntries()) w.__perf.longTasks.push({ t: e.startTime, d: e.duration }) })
    .observe({ type: 'longtask', buffered: true })
  const tick = (t) => { w.__perf.frames.push({ t, draws: w.__perf.draws }); requestAnimationFrame(tick) }
  requestAnimationFrame(tick)
}

function summarise(frames, longTasks, from, to) {
  const f = frames.filter((x) => x.t >= from && x.t <= to)
  const dts = f.slice(1).map((x, i) => x.t - f[i].t).sort((a, b) => a - b)
  const draws = f.slice(1).map((x, i) => x.draws - f[i].draws).filter((d) => d > 0).sort((a, b) => a - b)
  const lt = longTasks.filter((x) => x.t >= from && x.t <= to)
  const pct = (a, p) => (a.length ? +a[Math.min(a.length - 1, Math.floor(p * a.length))].toFixed(1) : null)
  return {
    fps: dts.length ? +(1000 / (dts.reduce((a, b) => a + b, 0) / dts.length)).toFixed(1) : null,
    frameMsP50: pct(dts, 0.5), frameMsP95: pct(dts, 0.95), frameMsMax: pct(dts, 1),
    longTasks: lt.length, longTaskMsTotal: Math.round(lt.reduce((a, b) => a + b.d, 0)), longTaskMsMax: Math.round(Math.max(0, ...lt.map((x) => x.d))),
    drawCallsPerFrameP50: pct(draws, 0.5), drawCallsPerFrameMax: pct(draws, 1),
  }
}

const browser = await chromium.launch({ headless: false, args: ['--enable-precise-memory-info'] })
const results = []
for (const site of SITES) {
  for (let run = 0; run < RUNS; run++) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
    await context.addInitScript(probe)
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (e) => errors.push(String(e)))
    const cdp = await context.newCDPSession(page)
    await cdp.send('Performance.enable')
    if (throttle) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    const heap = async () => Math.round((await cdp.send('Performance.getMetrics')).metrics.find((m) => m.name === 'JSHeapUsedSize').value / 1e6)
    const t0 = Date.now()
    await page.goto(`${BASE}/studio/${site}`)
    await page.locator('canvas').first().waitFor({ timeout: 60000 })
    const tCanvas = Date.now() - t0
    await page.getByTestId('analysis-card-sun').waitFor({ timeout: 60000 })
    const tSunCard = Date.now() - t0
    const fcp = await page.evaluate(() => performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null)
    const gpu = await page.evaluate(() => {
      const gl = document.createElement('canvas').getContext('webgl2')
      const ext = gl?.getExtension('WEBGL_debug_renderer_info')
      return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown'
    })
    const now = () => page.evaluate(() => performance.now())
    const windowStats = async (label, action) => {
      const from = await now()
      const heapBefore = await heap()
      if (action) await action()
      await page.waitForTimeout(WINDOW_MS)
      const to = await now()
      const { frames, longTasks } = await page.evaluate(() => window.__perf)
      return { label, heapMbBefore: heapBefore, heapMbAfter: await heap(), ...summarise(frames, longTasks, from, to) }
    }
    const windows = []
    windows.push(await windowStats('settle+idle (Sun card default)'))
    windows.push(await windowStats('idle steady'))
    const box = await page.locator('canvas').first().boundingBox()
    windows.push(await windowStats('orbit drag', async () => {
      const cx = box.x + box.width / 2, cy = box.y + box.height / 2
      await page.mouse.move(cx, cy); await page.mouse.down()
      for (let i = 0; i < 60; i++) { await page.mouse.move(cx + 200 * Math.sin(i / 10), cy + 40 * Math.cos(i / 10)); await page.waitForTimeout(80) }
      await page.mouse.up()
    }))
    windows.push(await windowStats('wind card open (solve)', () => page.getByTestId('analysis-card-wind').click()))
    windows.push(await windowStats('wind steady'))
    results.push({ site, run, cpuThrottle: throttle ? 4 : 1, gpu, fcpMs: fcp && Math.round(fcp), timeToCanvasMs: tCanvas, timeToSunCardMs: tSunCard, windows, pageErrors: errors })
    console.log(site, run, JSON.stringify(results.at(-1).windows.map((w) => [w.label, w.fps, w.longTaskMsMax, w.drawCallsPerFrameP50])))
    await context.close()
  }
}
await browser.close()
server.kill()
const date = new Date().toISOString().slice(0, 10)
writeFileSync(new URL(`./evidence/perf-${date}${throttle ? '-cpu4x' : ''}.json`, import.meta.url), JSON.stringify({ commit: '2089fd4', viewport: '1440x900@2x', results }, null, 1))
