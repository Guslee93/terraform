/* global window, document, requestAnimationFrame, WebGLRenderingContext, WebGL2RenderingContext */
import { mkdir, writeFile } from 'node:fs/promises'
import os from 'node:os'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

// Run 8 T2: measure the Lab orbit frame cost with mesh trees (stage B) vs point-cloud trees
// (stage C), reusing measure-perf.mjs's draw-call probe and window statistics.
const root = fileURLToPath(new URL('../', import.meta.url))
const BASE = 'http://127.0.0.1:5173'
const RUNS = Number(process.argv[2] ?? 3)
const WINDOW_MS = 4000
const ORBIT = { dx: 200, dy: 40, periodMs: 800 }
const timeout = 120_000

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const message = (error) => (error instanceof Error ? error.message : String(error))

function probe() {
  const state = window.__terraformPerf = { draws: 0, frames: [] }
  for (const proto of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) {
    for (const name of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
      const original = proto[name]
      if (!original) continue
      proto[name] = function (...args) { state.draws += 1; return original.apply(this, args) }
    }
  }
  const tick = (t) => { state.frames.push({ t, draws: state.draws }); requestAnimationFrame(tick) }
  requestAnimationFrame(tick)
}

function percentile(values, fraction) {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)]
}

function summarise(state, from, to) {
  const frames = state.frames.filter((f) => f.t >= from && f.t <= to)
  const intervals = frames.slice(1).map((f, i) => f.t - frames[i].t)
  const draws = frames.slice(1).map((f, i) => f.draws - frames[i].draws)
  const p = (arr, f) => (arr.length ? percentile(arr, f) : null)
  return {
    fps: intervals.length ? 1000 * intervals.length / intervals.reduce((s, dt) => s + dt, 0) : null,
    frameMsP50: p(intervals, 0.5),
    frameMsP95: p(intervals, 0.95),
    frameMsP99: p(intervals, 0.99),
    drawCallsPerFrameP50: p(draws, 0.5),
  }
}

async function windowStats(page) {
  const box = await page.locator('canvas').first().boundingBox()
  if (!box) throw new Error('Canvas has no bounding box')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  const from = await page.evaluate(() => { window.__terraformPerf.frames = []; return performance.now() })
  const deadline = performance.now() + WINDOW_MS
  const begin = performance.now()
  const at = (ms) => [box.x + box.width / 2 + ORBIT.dx * Math.sin(ms / ORBIT.periodMs), box.y + box.height / 2 + ORBIT.dy * Math.cos(ms / ORBIT.periodMs)]
  try {
    while (performance.now() < deadline) {
      await page.mouse.move(...at(performance.now() - begin))
      await delay(Math.min(80, Math.max(0, deadline - performance.now())))
    }
    await page.mouse.move(...at(WINDOW_MS))
  } finally { await page.mouse.up() }
  const to = await page.evaluate(() => performance.now())
  const state = await page.evaluate(() => window.__terraformPerf)
  return summarise(state, from, to)
}

async function measure(browser, url, runs) {
  const results = []
  for (let run = 1; run <= runs; run += 1) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
    page.on('pageerror', () => {})
    await page.addInitScript(probe)
    await page.goto(BASE + url, { waitUntil: 'commit', timeout })
    await page.getByRole('region', { name: /3D site viewport/ }).waitFor({ timeout })
    await page.waitForTimeout(7000) // settle: 1 m tile worker + points
    const stats = await windowStats(page)
    results.push(stats)
    console.log(`  ${url} run ${run}:`, JSON.stringify(stats))
    await page.close()
  }
  return results
}

function medianOf(results, key) {
  const values = results.map((r) => r[key]).filter((v) => v !== null)
  if (!values.length) return null
  return percentile(values, 0.5)
}

try {
  const browser = await chromium.launch({ headless: false })
  const gpu = await (async () => {
    const page = await browser.newPage()
    await page.goto(`${BASE}/lab/compact-infill`, { waitUntil: 'commit', timeout })
    const name = await page.evaluate(() => {
      const c = document.querySelector('canvas'); const gl = c?.getContext('webgl2') ?? c?.getContext('webgl')
      const e = gl?.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : null
    })
    await page.close()
    return name
  })()

  const report = {
    machine: os.cpus()[0]?.model ?? 'unknown',
    os: { platform: os.platform(), release: os.release(), arch: os.arch() },
    browser: browser.version(),
    gpu,
    commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    recordedAt: new Date().toISOString(),
    viewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
    windowMs: WINDOW_MS,
    pointCountCompactInfill: 42596, // full set (Run 7 measurement)
    stages: {},
  }

  for (const [stage, url] of [
    ['B', '/lab/compact-infill?style=identity&stage=B&state=neutral&preset=isometric'],
    ['C', '/lab/compact-infill?style=identity&stage=C&state=neutral&preset=isometric'],
  ]) {
    console.log(`Measuring stage ${stage}…`)
    const runs = await measure(browser, url, RUNS)
    report.stages[stage] = {
      runs,
      median: {
        fps: medianOf(runs, 'fps'),
        frameMsP50: medianOf(runs, 'frameMsP50'),
        frameMsP95: medianOf(runs, 'frameMsP95'),
        frameMsP99: medianOf(runs, 'frameMsP99'),
        drawCallsPerFrameP50: medianOf(runs, 'drawCallsPerFrameP50'),
      },
    }
  }

  await mkdir(new URL('../docs/perf/', import.meta.url), { recursive: true })
  const output = new URL('../docs/perf/run8-lab-points.json', import.meta.url)
  await writeFile(output, JSON.stringify(report, null, 2) + '\n')
  console.log(`Wrote ${fileURLToPath(output)}`)
  console.log('median p95: B', report.stages.B.median.frameMsP95, 'C', report.stages.C.median.frameMsP95)
} catch (error) {
  console.error(message(error))
  process.exitCode = 1
}
