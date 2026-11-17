/* global window, document, requestAnimationFrame, WebGLRenderingContext, WebGL2RenderingContext */
import { spawn, execFileSync } from 'node:child_process'
import { access, mkdir, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { chromium, expect } from '@playwright/test'

const root = fileURLToPath(new URL('../', import.meta.url))
const options = { runs: 3, 'window-ms': 6000, label: new Date().toISOString().slice(0, 10) }
for (const argument of process.argv.slice(2)) {
  const match = /^--(runs|window-ms|label)=(.+)$/.exec(argument)
  if (!match) throw new Error(`Unknown option: ${argument}. Use --runs=N --window-ms=N --label=NAME`)
  const [, key, value] = match
  if (key === 'label') {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(value)) throw new Error('Label must be a filename, using letters, digits, dots, underscores or hyphens.')
    options.label = value
  } else {
    const number = Number(value)
    if (!Number.isSafeInteger(number) || number <= 0) throw new Error(`${key} must be a positive safe integer`)
    options[key] = number
  }
}
const timeout = 60_000
const sites = ['compact-infill', 'sloped-edge']
const states = ['idle', 'orbit', 'sun', 'wind', 'water', 'slope']
const windowMetrics = ['durationMs', 'fps', 'frameMsP50', 'frameMsP95', 'frameMsP99', 'frameMsMax', 'longTasksCount', 'longTaskMsMax', 'drawCallsPerFrameP50', 'drawCallsPerFrameMax', 'heapMbBefore', 'heapMbAfter']
/** Orbit drag path: pixel amplitude and the time (ms) per radian. */
const ORBIT = { dx: 200, dy: 40, periodMs: 800 }
/** Time allowed for a camera preset move (CameraRig: 0.75 s) and the damping to settle. */
const PRESET_SETTLE_MS = 1500
const missing = (reason) => ({ value: null, reason })
const measured = (value) => ({ value })
const message = (error) => error instanceof Error ? error.message : String(error)
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Installed before the app. Count each native call once, even if prototypes inherit a wrapper.
function probe() {
  const state = window.__terraformPerf = { draws: 0, frames: [], longTasks: [], drawSupported: false, longTaskSupported: false }
  const wrapped = new Set()
  for (const proto of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) {
    for (const name of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
      const original = proto[name]
      if (!original || wrapped.has(original)) continue
      const wrapper = function (...args) { state.draws += 1; return original.apply(this, args) }
      wrapped.add(wrapper)
      proto[name] = wrapper
      state.drawSupported = true
    }
  }
  if (PerformanceObserver.supportedEntryTypes.includes('longtask')) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) state.longTasks.push({ t: entry.startTime, duration: entry.duration })
    })
    observer.observe({ type: 'longtask', buffered: true })
    state.longTaskSupported = true
    state.flush = () => {
      for (const entry of observer.takeRecords()) state.longTasks.push({ t: entry.startTime, duration: entry.duration })
    }
  }
  const tick = (t) => { state.frames.push({ t, draws: state.draws }); requestAnimationFrame(tick) }
  requestAnimationFrame(tick)
}

function percentile(values, fraction) {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)]
}
/**
 * Worst mean frame interval (ms) over any span of at least `spanMs`, using for each end frame the
 * shortest span that reaches `spanMs`. A window shorter than `spanMs` uses its whole length.
 * Null with fewer than two frames.
 */
function maxSlidingMean(frames, spanMs) {
  if (frames.length < 2) return null
  if (frames.at(-1).t - frames[0].t < spanMs) return (frames.at(-1).t - frames[0].t) / (frames.length - 1)
  let worst = 0
  let start = 0
  for (let end = 1; end < frames.length; end += 1) {
    if (frames[end].t - frames[0].t < spanMs) continue
    while (start < end - 1 && frames[end].t - frames[start + 1].t >= spanMs) start += 1
    worst = Math.max(worst, (frames[end].t - frames[start].t) / (end - start))
  }
  return worst
}
function summarise(state, from, to) {
  const frames = state.frames.filter((frame) => frame.t >= from && frame.t <= to)
  const intervals = frames.slice(1).map((frame, i) => frame.t - frames[i].t)
  const draws = frames.slice(1).map((frame, i) => frame.draws - frames[i].draws)
  const tasks = state.longTasks.filter((task) => task.t >= from && task.t < to && task.duration > 50)
  const frameMetric = (value) => intervals.length ? measured(value) : missing('Fewer than two animation frames in the window')
  const drawMetric = (p) => state.drawSupported ? frameMetric(percentile(draws, p)) : missing('WebGL draw instrumentation unavailable')
  return {
    durationMs: measured(to - from),
    fps: frameMetric(1000 * intervals.length / intervals.reduce((sum, dt) => sum + dt, 0)),
    // ADR-0018: Auto drops a render tier for the session when a 3 s window averages over 33 ms per frame.
    // The app uses consecutive windows; the worst sliding 3 s mean here is at least as strict.
    max3sMeanFrameMs: frameMetric(maxSlidingMean(frames, 3000)),
    downgradeRisk: frameMetric((maxSlidingMean(frames, 3000) ?? 0) > 33),
    frameMsP50: frameMetric(percentile(intervals, 0.5)),
    frameMsP95: frameMetric(percentile(intervals, 0.95)),
    frameMsP99: frameMetric(percentile(intervals, 0.99)),
    frameMsMax: frameMetric(percentile(intervals, 1)),
    longTasksCount: state.longTaskSupported ? measured(tasks.length) : missing('Long Task API unavailable'),
    longTaskMsMax: !state.longTaskSupported ? missing('Long Task API unavailable') : tasks.length ? measured(Math.max(...tasks.map((task) => task.duration))) : missing('No long tasks greater than 50 ms observed'),
    drawCallsPerFrameP50: drawMetric(0.5), drawCallsPerFrameMax: drawMetric(1),
  }
}

async function openAnalysis(page, id) {
  const card = page.getByTestId(`analysis-card-${id}`)
  if (await card.getAttribute('aria-expanded') !== 'true') await card.click()
  await expect(card).toHaveAttribute('aria-expanded', 'true')
}
async function computingFinished(page) {
  // Allow React effects to start before checking; require a quiet interval, bounded overall.
  const start = performance.now()
  let quietSince = null
  while (performance.now() - start < timeout) {
    const visible = await page.getByText(/Computing|Tracing where the water runs/i).filter({ visible: true }).count()
    if (visible) quietSince = null
    else quietSince ??= performance.now()
    if (quietSince !== null && performance.now() - quietSince >= 1000) return
    await delay(100)
  }
  throw new Error('Visible Computing or water-tracing text did not settle within 60000 ms')
}
async function revealControl(page, control) {
  // Same Parameters/details structure as e2e/studio-helpers.ts; only open ancestors.
  const groups = page.getByRole('complementary', { name: 'Parameters' }).locator('details').filter({ has: control })
  for (const group of await groups.all()) {
    if (!await group.evaluate((element) => element.open)) await group.locator('summary').first().click()
  }
  await control.waitFor({ state: 'visible', timeout })
}
async function heap(cdp) {
  try {
    const result = (await cdp.send('Performance.getMetrics')).metrics.find((metric) => metric.name === 'JSHeapUsedSize')
    return result ? measured(result.value / 1e6) : missing('CDP did not return JSHeapUsedSize')
  } catch (error) { return missing(message(error)) }
}
async function windowStats(page, cdp, orbit = false) {
  const heapMbBefore = await heap(cdp)
  const box = orbit ? await page.locator('canvas').first().boundingBox() : null
  if (orbit && !box) throw new Error('Canvas has no bounding box')
  if (orbit) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
  }
  const from = await page.evaluate(() => {
    window.__terraformPerf.frames = []
    window.__terraformPerf.longTasks = []
    return performance.now()
  })
  const deadline = performance.now() + options['window-ms']
  try {
    if (orbit) {
      // The path is a function of elapsed time, and it ends at the same point every run, so a slower
      // build cannot finish on a different (cheaper or dearer) view.
      const begin = performance.now()
      const at = (ms) => [box.x + box.width / 2 + ORBIT.dx * Math.sin(ms / ORBIT.periodMs), box.y + box.height / 2 + ORBIT.dy * Math.cos(ms / ORBIT.periodMs)]
      while (performance.now() < deadline) {
        await page.mouse.move(...at(performance.now() - begin))
        await delay(Math.min(80, Math.max(0, deadline - performance.now())))
      }
      await page.mouse.move(...at(options['window-ms']))
    } else await delay(options['window-ms'])
    const result = await page.evaluate(() => {
      window.__terraformPerf.flush?.()
      const { frames, longTasks, drawSupported, longTaskSupported } = window.__terraformPerf
      return { to: performance.now(), frames, longTasks, drawSupported, longTaskSupported }
    })
    return { ...summarise(result, from, result.to), heapMbBefore, heapMbAfter: await heap(cdp) }
  } finally { if (orbit) await page.mouse.up() }
}

async function exportTime(page) {
  const button = page.getByRole('button', { name: 'Image passes', exact: true })
  // The passes live in the inspector's Export group, opened by its "Export" button (e2e/simplified-studio.spec.ts).
  if (!await button.isVisible()) await page.getByRole('button', { name: 'Export', exact: true }).click()
  await button.waitFor({ state: 'visible', timeout })
  const downloads = []
  let start
  const collect = (download) => downloads.push({ filename: download.suggestedFilename(), ms: performance.now() - start })
  page.on('download', collect)
  let reason
  try {
    // Register before clicking; the listener above also catches downloads arriving in a burst.
    const first = page.waitForEvent('download', { timeout }).catch((error) => { reason = message(error) })
    start = performance.now()
    await button.click()
    await first
    while (downloads.length < 4 && performance.now() - start < timeout && !reason) await delay(100)
    if (downloads.length < 4) reason ??= 'Timeout before four downloads arrived; count and last-arrival time reflect only observed downloads'
  } finally { page.off('download', collect) }
  return { count: measured(downloads.length), ms: downloads.length ? measured(downloads.at(-1).ms) : missing(reason ?? 'No downloads observed'), downloads, ...(reason ? { reason } : {}) }
}
async function pointerLatency(page) {
  // Reuse drawMass's UI sequence. No numeric latency is inferred from an unrelated changed frame.
  await page.getByRole('button', { name: 'Plan', exact: true }).click()
  await page.waitForTimeout(500)
  // The tool rail only exists once "Add a block" is on (StudioShell testBuilding; e2e/studio-helpers.ts).
  const draw = page.getByRole('button', { name: 'Draw building', exact: true })
  if (!await draw.isVisible()) await page.getByRole('button', { name: 'Add a block' }).click()
  await draw.click()
  const box = await page.getByRole('region', { name: /3D site viewport/ }).boundingBox()
  if (!box) return missing('Cannot draw a block: viewport has no bounding box')
  for (const [dx, dy] of [[-60, -60], [60, -60], [60, 60], [-60, 60]]) {
    await page.mouse.click(box.x + box.width / 2 + dx, box.y + box.height / 2 + dy)
  }
  await page.getByRole('button', { name: 'Draw building', exact: true }).evaluate((button) => button.blur())
  await page.keyboard.press('Enter')
  await page.getByRole('spinbutton', { name: 'Storeys', exact: true }).waitFor()
  return missing('Block drawn, but a canvas change cannot reliably identify the block drag response rather than camera damping or analysis animation. Pixel readback also perturbs frame timing; no reliable pointer-to-scene latency measurement is available without app instrumentation.')
}

async function runSite(browser, base, site, run) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, acceptDownloads: true })
  const unavailable = 'Run did not reach this measurement'
  const result = {
    site, run, windows: Object.fromEntries(states.map((state) => [state, missing(unavailable)])), pageErrors: [],
    load: Object.fromEntries(['fcpMs', 'timeToCanvasMs', 'timeToDefaultCardMs'].map((key) => [key, missing(unavailable)])),
    gpu: null, softwareRenderer: null, rendererReason: unavailable,
    export: missing(unavailable), pointerLatencyMs: missing(unavailable),
  }
  try {
    await context.addInitScript(probe)
    const page = await context.newPage()
    page.setDefaultTimeout(timeout)
    page.on('pageerror', (error) => result.pageErrors.push(message(error)))
    const cdp = await context.newCDPSession(page)
    await cdp.send('Performance.enable')
    await page.goto(`${base}/studio/${site}`, { waitUntil: 'commit', timeout })
    // Concurrent waits avoid attributing a later canvas wait to an already-visible card.
    const observed = async (locator) => {
      try { await locator.waitFor({ state: 'visible', timeout }); return measured(await page.evaluate(() => performance.now())) }
      catch (error) { return missing(message(error)) }
    }
    const [timeToCanvasMs, timeToDefaultCardMs] = await Promise.all([
      observed(page.locator('canvas').first()), observed(page.getByTestId('analysis-card-noise')),
    ])
    const fcp = await page.evaluate(() => performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null)
    result.load = { fcpMs: fcp === null ? missing('No first-contentful-paint entry') : measured(fcp), timeToCanvasMs, timeToDefaultCardMs }
    const gpu = await page.evaluate(() => {
      const canvas = document.querySelector('canvas')
      const gl = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl')
      const extension = gl?.getExtension('WEBGL_debug_renderer_info')
      return extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : null
    })
    result.gpu = gpu
    result.softwareRenderer = gpu === null ? null : /swiftshader|llvmpipe|software/i.test(gpu)
    delete result.rendererReason
    if (gpu === null) result.rendererReason = 'Unmasked renderer unavailable on the studio canvas'
    if (gpu === null || result.softwareRenderer) console.error(`${site} run ${run}: NOT a valid baseline (${gpu ?? 'GPU unknown'})`)
    for (const state of states) {
      try {
        if (state === 'idle' || state === 'orbit') await expect(page.getByTestId('analysis-card-noise')).toHaveAttribute('aria-expanded', 'true')
        // Every window except the orbit starts from the same view: the 3D preset, settled.
        if (state !== 'orbit') {
          const preset = page.getByRole('button', { name: '3D', exact: true })
          if (!await preset.isVisible()) await revealControl(page, preset)
          await preset.click()
          await page.waitForTimeout(PRESET_SETTLE_MS)
        }
        if (['sun', 'wind', 'water'].includes(state)) await openAnalysis(page, state)
        if (state === 'sun' || state === 'water') await computingFinished(page)
        if (state === 'slope') {
          const slope = page.getByRole('checkbox', { name: 'Slope', exact: true })
          await revealControl(page, slope)
          await slope.check()
          await expect(slope).toBeChecked()
        }
        result.windows[state] = measured(await windowStats(page, cdp, state === 'orbit'))
      } catch (error) { result.windows[state] = missing(message(error)) }
    }
    for (const [name, action] of [['export', exportTime], ['pointerLatencyMs', pointerLatency]]) {
      if (site !== 'compact-infill') result[name] = missing('Only measured on Compact Infill')
      else {
        try { result[name] = await action(page) } catch (error) { result[name] = missing(message(error)) }
      }
    }
  } catch (error) { result.failure = missing(message(error)) }
  finally { await context.close() }
  return result
}

function printSummary(results) {
  const rows = new Map()
  function visit(site, path, item) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return
    if ('value' in item) {
      if (item.value !== null && typeof item.value === 'object') return visit(site, path, item.value)
      if (typeof item.value === 'string' || typeof item.value === 'boolean') return
      const key = `${site} ${path}`
      if (!rows.has(key)) rows.set(key, [])
      if (typeof item.value === 'number') rows.get(key).push(item.value)
    } else for (const [key, value] of Object.entries(item)) visit(site, path ? `${path}.${key}` : key, value)
  }
  for (const result of results) {
    visit(result.site, 'load', result.load)
    for (const state of states) {
      const metrics = result.windows[state].value ?? Object.fromEntries(windowMetrics.map((key) => [key, missing(result.windows[state].reason)]))
      visit(result.site, `windows.${state}`, metrics)
    }
    visit(result.site, 'export', result.export.value === null ? { count: result.export, ms: result.export } : { count: result.export.count, ms: result.export.ms })
    visit(result.site, 'pointerLatencyMs', result.pointerLatencyMs)
  }
  console.table([...rows].map(([metric, values]) => {
    values.sort((a, b) => a - b)
    const middle = Math.floor(values.length / 2)
    return { metric, measuredRuns: values.length, median: values.length ? (values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2) : null, min: values[0] ?? null, max: values.at(-1) ?? null }
  }))
}

async function freePort() {
  const socket = createServer()
  await new Promise((resolve, reject) => { socket.once('error', reject); socket.listen(0, '127.0.0.1', resolve) })
  const port = socket.address().port
  await new Promise((resolve, reject) => socket.close((error) => error ? reject(error) : resolve()))
  return port
}
let server
let browser
function killServer(signal = 'SIGTERM') {
  if (!server?.pid) return
  try { process.kill(-server.pid, signal) } catch (error) { if (error.code !== 'ESRCH') console.error(message(error)) }
}
// npx launches a child: terminate the process group, not just the npx parent (macOS/Linux).
process.on('exit', () => killServer('SIGKILL'))
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { killServer(); process.exit(signal === 'SIGINT' ? 130 : 143) })
try {
  try { await access(new URL('../dist/index.html', import.meta.url)) }
  catch { throw new Error('Production dist/index.html is missing. Run npm run build before measuring.') }
  const port = await freePort()
  const base = `http://127.0.0.1:${port}`
  let serverError
  server = spawn('npx', ['vite', 'preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'], { cwd: root, detached: true, stdio: ['ignore', 'pipe', 'pipe'] })
  let serverOutput = ''
  for (const stream of [server.stdout, server.stderr]) stream.on('data', (data) => { serverOutput = (serverOutput + data).slice(-8000) })
  server.on('error', (error) => { serverError = error })
  const start = performance.now()
  while (true) {
    if (serverError) throw serverError
    if (server.exitCode !== null) throw new Error(`Vite preview exited: ${serverOutput}`)
    try { if ((await fetch(base, { signal: AbortSignal.timeout(1000) })).ok) break } catch { /* bounded readiness polling */ }
    if (performance.now() - start > timeout) throw new Error(`Vite preview did not start: ${serverOutput}`)
    await delay(200)
  }
  browser = await chromium.launch({ headless: false, args: ['--enable-precise-memory-info'] })
  const report = {
    commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    machine: os.cpus()[0]?.model ? measured(os.cpus()[0].model) : missing('CPU model unavailable'),
    os: { platform: os.platform(), release: os.release(), arch: os.arch() },
    browserVersion: browser.version(), recordedAt: new Date().toISOString(),
    settings: { ...options, viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, renderPreference: 'auto (fixed by StudioShell; resolves to High on a hardware GPU, see downgradeRisk)', fixedHigh: missing('Not verifiable: StudioShell.tsx hardcodes renderPreference="auto" and a downgrade between windows is not sampled. Forcing High needs an app change.'), headless: false, timeoutMs: timeout, sites }, results: [],
  }
  await mkdir(new URL('../docs/perf/', import.meta.url), { recursive: true })
  const output = new URL(`../docs/perf/${options.label}.json`, import.meta.url)
  // Checkpoint after every run, retaining completed measurements if a later run fails.
  for (const site of sites) for (let run = 1; run <= options.runs; run += 1) {
    console.log(`Measuring ${site}, run ${run}/${options.runs}`)
    report.results.push(await runSite(browser, base, site, run))
    await writeFile(output, JSON.stringify(report, null, 2) + '\n')
  }
  printSummary(report.results)
  console.log(`Wrote ${fileURLToPath(output)}`)
} catch (error) {
  console.error(message(error))
  process.exitCode = 1
} finally {
  try { await browser?.close() } finally { killServer() }
}
