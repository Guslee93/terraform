/* global document */
// Reference captures for the visual upgrade (TF-VIS-010).
//
//   npm run build && node scripts/capture-reference.mjs [label]
//
// Drives the production build through `vite preview`, opens the studio for each site, date and
// state, screenshots every camera preset and — for the isometric (3D) preset — also triggers the
// Image passes (still / depth / white / analysis) and saves the downloads. Writes
// docs/screenshots/vis/<label>/<site>-<preset>-<state>-<date>.png plus a manifest.json beside them.
//
// Render quality is NOT forced: StudioShell hard-codes renderPreference="auto" (§6 of the run
// book), so the manifest records "auto" rather than pretending the tier was pinned.
import { spawn, execFileSync } from 'node:child_process'
import { access, mkdir, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { chromium, expect } from '@playwright/test'

const root = fileURLToPath(new URL('../', import.meta.url))
// CLI: `node scripts/capture-reference.mjs [label] [--smoke]`. `--smoke` bounds the run to one site
// and one date (and the export passes of a single state) so a software-rendered proof run finishes;
// the full matrix is the default and is what the owner runs on the reference machine.
const args = process.argv.slice(2)
const smoke = args.includes('--smoke')
const label = args.find((arg) => !arg.startsWith('--')) ?? 'baseline'
if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(label)) {
  throw new Error(`Label must be a filename using letters, digits, dots, underscores or hyphens; got "${label}".`)
}
const timeout = 120_000
const PRESET_SETTLE_MS = 1500

const sites = ['compact-infill', 'sloped-edge']
const presets = [
  { button: '3D', slug: 'isometric' },
  { button: 'Plan', slug: 'top' },
  { button: 'Street', slug: 'eyeLevel' },
]
const dates = [
  { date: '2026-06-21', minute: 900, slug: '2026-06-21' },
  { date: '2026-12-21', minute: 720, slug: '2026-12-21' },
]
const states = ['neutral', 'sun', 'wind', 'noise', 'water', 'slope', 'mass']
const passes = ['still', 'depth', 'white', 'analysis']

const message = (error) => (error instanceof Error ? error.message : String(error))
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function freePort() {
  const socket = createServer()
  await new Promise((resolve, reject) => { socket.once('error', reject); socket.listen(0, '127.0.0.1', resolve) })
  const port = socket.address().port
  await new Promise((resolve, reject) => socket.close((error) => (error ? reject(error) : resolve())))
  return port
}

let server
let browser
function killServer(signal = 'SIGTERM') {
  if (!server?.pid) return
  try { process.kill(-server.pid, signal) } catch (error) { if (error.code !== 'ESRCH') console.error(message(error)) }
}
process.on('exit', () => killServer('SIGKILL'))
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => { killServer(); process.exit(signal === 'SIGINT' ? 130 : 143) })
}

const parameters = (page) => page.getByRole('complementary', { name: 'Parameters' })

/** Open an analysis card by its id (sun, wind, noise, water, snow); no-op when already open. */
async function openAnalysis(page, id) {
  const card = page.getByTestId(`analysis-card-${id}`)
  if ((await card.getAttribute('aria-expanded')) !== 'true') await card.click()
  await expect(card).toHaveAttribute('aria-expanded', 'true')
}

/** Close whichever analysis card is open, if any (activeCard toggles to null). */
async function closeAnalysis(page) {
  const open = page.locator('[data-testid^="analysis-card-"][aria-expanded="true"]')
  if (await open.count()) await open.first().click()
  await expect(page.locator('[data-testid^="analysis-card-"][aria-expanded="true"]')).toHaveCount(0)
}

/** Open a collapsed Parameters <details> group so `control` is visible. */
async function revealControl(page, control) {
  const groups = parameters(page).locator('details').filter({ has: control })
  for (const group of await groups.all()) {
    if (!(await group.evaluate((element) => element.open))) await group.locator('summary').first().click()
  }
  await control.waitFor({ state: 'visible', timeout })
}

/** Wait until no "Computing" / "Tracing where the water runs" text is visible for a quiet second. */
async function computingFinished(page) {
  const start = performance.now()
  let quietSince = null
  while (performance.now() - start < timeout) {
    const visible = await page.getByText(/Computing|Tracing where the water runs/i).filter({ visible: true }).count()
    if (visible) quietSince = null
    else quietSince ??= performance.now()
    if (quietSince !== null && performance.now() - quietSince >= 1000) return
    await delay(100)
  }
  throw new Error('Visible Computing or water-tracing text did not settle within the timeout')
}

/** Set the sun date and time through the Sun card (open for this, then left to the state). */
async function setSunDateTime(page, date) {
  await openAnalysis(page, 'sun')
  await page.getByLabel('Local date').fill(date.date)
  await page.getByRole('slider', { name: 'Local time' }).fill(String(date.minute))
}

/** Wind state: direction view (not speed classes) at the pedestrian height (2 m is the default). */
async function setWindDirectionView(page) {
  const group = page.getByRole('group', { name: 'Wind map shows' })
  await group.getByRole('button', { name: 'Direction', exact: true }).click()
}

/** Slope layer on/off through the Parameters panel. */
async function setSlope(page, on) {
  const slope = page.getByRole('checkbox', { name: 'Slope', exact: true })
  await revealControl(page, slope)
  if ((await slope.isChecked()) !== on) await slope.click()
  await expect(slope).toBeChecked({ checked: on })
}

/** Draw one block the way the editor does (Add a block → Draw building → four corners → Enter). */
async function drawMass(page) {
  // Drawing needs the plan (top) view; a perspective view misses the ground plane (studio-helpers).
  await page.getByRole('button', { name: 'Plan', exact: true }).click()
  await page.waitForTimeout(500)
  const draw = page.getByRole('button', { name: 'Draw building', exact: true })
  if (!(await draw.isVisible())) await page.getByRole('button', { name: 'Add a block', exact: true }).click()
  await draw.click()
  const box = await page.getByRole('region', { name: /3D site viewport/ }).boundingBox()
  if (!box) throw new Error('Cannot draw a block: viewport has no bounding box')
  for (const [dx, dy] of [[-60, -60], [60, -60], [60, 60], [-60, 60]]) {
    await page.mouse.click(box.x + box.width / 2 + dx, box.y + box.height / 2 + dy)
  }
  await draw.evaluate((button) => button.blur())
  await page.keyboard.press('Enter')
  await page.getByRole('spinbutton', { name: 'Storeys', exact: true }).waitFor()
}

/** Apply one capture state; leaves the map in that state. `mass` must run last (it persists). */
async function applyState(page, state) {
  if (state === 'neutral') {
    await closeAnalysis(page)
    await setSlope(page, false)
  } else if (state === 'sun') {
    await openAnalysis(page, 'sun')
    await setSlope(page, false)
  } else if (state === 'wind') {
    await openAnalysis(page, 'wind')
    await setWindDirectionView(page)
    await setSlope(page, false)
  } else if (state === 'noise') {
    await openAnalysis(page, 'noise')
    await setSlope(page, false)
  } else if (state === 'water') {
    await openAnalysis(page, 'water')
    await setSlope(page, false)
  } else if (state === 'slope') {
    await closeAnalysis(page)
    await setSlope(page, true)
  } else if (state === 'mass') {
    await closeAnalysis(page)
    await setSlope(page, false)
    await drawMass(page)
  }
}

/** Click a camera preset and wait for the camera move + damping to settle. */
async function setPreset(page, preset) {
  const button = page.getByRole('button', { name: preset.button, exact: true })
  if (!(await button.isVisible())) await revealControl(page, button)
  await button.click()
  await page.waitForTimeout(PRESET_SETTLE_MS)
}

/**
 * Trigger the four Image passes (still / depth / white / analysis) in the isometric view and save
 * each download. The app names them `terraform-<site>-<pass>.png`; we re-home them with the state
 * and date so a whole capture set sits in one directory.
 */
async function exportPasses(page, site, state, dateSlug, outDir) {
  const button = page.getByRole('button', { name: 'Image passes', exact: true })
  if (!(await button.isVisible())) await page.getByRole('button', { name: 'Export', exact: true }).click()
  await button.waitFor({ state: 'visible', timeout })
  const downloads = []
  const collect = (download) => downloads.push(download)
  page.on('download', collect)
  let reason = null
  const saved = []
  try {
    const first = page.waitForEvent('download', { timeout }).catch((error) => { reason = message(error) })
    await button.click()
    await first
    // The app emits still/depth/white/analysis together, but omits the analysis pass when no
    // analysis layer is on the map (neutral, mass). Collect until downloads stop for a moment
    // rather than expecting a fixed count.
    const start = performance.now()
    let lastSeen = downloads.length
    let quietSince = null
    while (performance.now() - start < timeout && !reason) {
      if (downloads.length > lastSeen) { lastSeen = downloads.length; quietSince = null }
      else quietSince ??= performance.now()
      if (quietSince !== null && performance.now() - quietSince >= 1500) break
      await delay(100)
    }
    for (const download of downloads) {
      const name = download.suggestedFilename()
      const pass = passes.find((candidate) => name.endsWith(`-${candidate}.png`))
      if (!pass) continue
      const file = `${site}-isometric-${state}-${dateSlug}-${pass}.png`
      await download.saveAs(`${outDir}/${file}`)
      saved.push({ file, site, preset: 'isometric', state, date: dateSlug, kind: 'export', pass })
    }
  } finally {
    page.off('download', collect)
  }
  return saved
}

async function gpuRenderer(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas') ?? document.createElement('canvas')
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    const extension = gl?.getExtension('WEBGL_debug_renderer_info')
    return extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : null
  })
}

async function runSite(browser, base, site, date, outDir, captures) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    reducedMotion: 'reduce',
    acceptDownloads: true,
  })
  await context.addInitScript(() => {
    // Keep the first-run guide out of the frame; it is not part of the reference look.
    globalThis.localStorage.setItem('terraform:studio-guide-dismissed:v1', 'true')
  })
  const page = await context.newPage()
  page.setDefaultTimeout(timeout)
  try {
    await page.goto(`${base}/studio/${site}`, { waitUntil: 'commit', timeout })
    await page.getByRole('region', { name: /3D site viewport/ }).waitFor({ timeout })
    await setSunDateTime(page, date)
    for (const state of states) {
      await applyState(page, state)
      await computingFinished(page)
      for (const preset of presets) {
        await setPreset(page, preset)
        const file = `${site}-${preset.slug}-${state}-${date.slug}.png`
        await page.screenshot({ path: `${outDir}/${file}` })
        captures.push({ file, site, preset: preset.slug, state, date: date.slug, kind: 'viewport' })
        if (preset.slug === 'isometric' && !(smoke && state !== 'neutral')) {
          captures.push(...(await exportPasses(page, site, state, date.slug, outDir)))
        }
      }
    }
    return null
  } catch (error) {
    return message(error)
  } finally {
    await context.close()
  }
}

try {
  try { await access(new URL('../dist/index.html', import.meta.url)) } catch {
    throw new Error('Production dist/index.html is missing. Run `npm run build` before capturing.')
  }
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
  const outDir = fileURLToPath(new URL(`../docs/screenshots/vis/${label}/`, import.meta.url))
  await mkdir(outDir, { recursive: true })

  const gpu = await (async () => {
    const page = await browser.newPage()
    try { return await gpuRenderer(page) } finally { await page.close() }
  })()
  const softwareRenderer = gpu === null || /swiftshader|llvmpipe|software/i.test(gpu)
  if (gpu === null || softwareRenderer) {
    console.error(`NOT a valid baseline (${gpu ?? 'GPU unknown'}); run will be marked softwareRenderer`)
  }

  const manifest = {
    commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    browserVersion: browser.version(),
    gpu,
    softwareRenderer,
    renderPreference: 'auto (fixed by StudioShell; not forced)',
    recordedAt: new Date().toISOString(),
    machine: os.cpus()[0]?.model ?? null,
    os: { platform: os.platform(), release: os.release(), arch: os.arch() },
    settings: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, reducedMotion: 'reduce', smoke, sites: smoke ? ['compact-infill'] : sites, presets, dates: smoke ? [dates[0]] : dates, states, passes },
    captures: [],
    failures: [],
  }

  const siteList = smoke ? ['compact-infill'] : sites
  const dateList = smoke ? [dates[0]] : dates
  for (const date of dateList) {
    for (const site of siteList) {
      console.log(`Capturing ${site} @ ${date.date}`)
      const failure = await runSite(browser, base, site, date, outDir, manifest.captures)
      if (failure) manifest.failures.push({ site, date: date.date, error: failure })
    }
  }

  await writeFile(`${outDir}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(`Wrote ${manifest.captures.length} captures to ${outDir}`)
} catch (error) {
  console.error(message(error))
  process.exitCode = 1
} finally {
  try { await browser?.close() } finally { killServer() }
}
