/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { budget } from './budget'

// Run 10 T1 — objective "invisible tile edge" measurement (identity only). Opt-in because it opens
// the Lab and reads the canvas pixels. Measures (1) the mean/p95 luminance difference across the
// projected tile outline and (2) an outward luminance profile from the site centre. Acceptance is
// recorded in the ledger; the test itself only reports the numbers so a regression is visible.
test.skip(process.env.IDENTITY_EDGE !== '1', 'Opt-in: IDENTITY_EDGE=1')
test.use({ viewport: { width: 1440, height: 900 } })
test.setTimeout(budget(180_000))

const SITES = ['compact-infill', 'sloped-edge'] as const

type EdgeResult = {
  site: string
  edgeMean: number
  edgeP95: number
  /** Largest outward step AWAY from the background colour (luminance, 0–255). */
  maxAway: number
  profile: number[]
}

async function openView(page: Page, site: string) {
  await page.goto(`/lab/${site}?style=identity&stage=C&state=neutral&preset=overview`)
  await expect(page.getByRole('region', { name: /3D site viewport/ })).toBeVisible({ timeout: budget(120_000) })
  await page.waitForTimeout(9000) // settle: 1 m tile worker, contours, speckled trees, haze
}

/** Screenshot, then analyse the pixels inside the page (no new dependency). */
async function measure(page: Page, site: string): Promise<EdgeResult> {
  // Canvas only: the Lab panel and page chrome must never enter the measurement.
  const screenshot = await page.locator('section[aria-label="Studio viewport"] canvas').first().screenshot()
  return page.evaluate(async (pngBase64) => {
    const img = new Image()
    img.src = `data:image/png;base64,${pngBase64}`
    await img.decode()
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    const data = ctx.getImageData(0, 0, img.width, img.height).data
    const lum = (x: number, y: number): number => {
      const cx = Math.min(img.width - 1, Math.max(0, Math.round(x)))
      const cy = Math.min(img.height - 1, Math.max(0, Math.round(y)))
      const i = (cx + cy * img.width) * 4
      return 0.2126 * data[i]! + 0.7152 * data[i + 1]! + 0.0722 * data[i + 2]!
    }
    const hook = (window as Window & { __terraformEdgeTest?: { bounds: { minX: number; maxX: number; minY: number; maxY: number }; heightAt: (e: number, n: number) => number; project: (e: number, n: number, h: number) => [number, number] } }).__terraformEdgeTest
    if (!hook) throw new Error('edge-test hook not exposed')

    const { bounds } = hook
    const centreX = (bounds.minX + bounds.maxX) / 2
    const centreY = (bounds.minY + bounds.maxY) / 2
    // Project on the ground (not at height 0) so the outline is where the terrain edge is drawn.
    const project = (e: number, n: number) => hook.project(e, n, hook.heightAt(e, n))
    const onCanvas = (x: number, y: number) => x >= 8 && y >= 8 && x < img.width - 8 && y < img.height - 8
    // White massing is not ground: skip samples that land on a building. The threshold sits above
    // the background, which the overview's empty top band shows (a light mist is itself bright).
    const topBand: number[] = []
    for (let x = Math.floor(img.width * 0.25); x < img.width * 0.75; x += 4) for (let y = 10; y < 30; y += 4) topBand.push(lum(x, y))
    topBand.sort((p, q) => p - q)
    const BUILDING_LUM = Math.max(140, topBand[Math.floor(topBand.length / 2)]! + 20)

    // 1. Edge visibility: sample along the four tile edges (≥ 200 points), 6 px inside vs outside.
    const edgeDiffs: number[] = []
    const backgroundSamples: number[] = []
    const centre = project(centreX, centreY)
    const corners = [
      project(bounds.minX, bounds.minY),
      project(bounds.maxX, bounds.minY),
      project(bounds.maxX, bounds.maxY),
      project(bounds.minX, bounds.maxY),
    ]
    void corners
    const groundEdges = [
      [[bounds.minX, bounds.minY], [bounds.maxX, bounds.minY]],
      [[bounds.maxX, bounds.minY], [bounds.maxX, bounds.maxY]],
      [[bounds.maxX, bounds.maxY], [bounds.minX, bounds.maxY]],
      [[bounds.minX, bounds.maxY], [bounds.minX, bounds.minY]],
    ] as const
    const stepsPerEdge = 80
    for (const [a, b] of groundEdges) {
      for (let s = 0; s <= stepsPerEdge; s += 1) {
        const t = s / stepsPerEdge
        const [x, y] = project(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
        // Away from the tile centre = outside; toward = inside.
        const dx = x - centre[0]
        const dy = y - centre[1]
        const len = Math.hypot(dx, dy) || 1
        const nx = dx / len
        const ny = dy / len
        if (!onCanvas(x - nx * 6, y - ny * 6) || !onCanvas(x + nx * 6, y + ny * 6)) continue
        const inside = lum(x - nx * 6, y - ny * 6)
        const outside = lum(x + nx * 6, y + ny * 6)
        if (inside > BUILDING_LUM || outside > BUILDING_LUM) continue
        edgeDiffs.push(Math.abs(inside - outside))
        backgroundSamples.push(outside)
      }
    }
    if (edgeDiffs.length < 100) throw new Error(`only ${edgeDiffs.length} usable edge samples`)
    const sorted = [...edgeDiffs].sort((p, q) => p - q)
    const edgeMean = edgeDiffs.reduce((sum, d) => sum + d, 0) / edgeDiffs.length
    const edgeP95 = sorted[Math.floor(sorted.length * 0.95)]!

    // 2. Outward profile: ground rings around the tile centre (world circles at ground height), the
    // median ground luminance per ring. Single rays jump between grass and road; a ring median follows
    // the haze. Rings run from 40 % to 100 % of the tile's half-diagonal.
    const halfDiagonal = Math.hypot(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY) / 2
    const profile: number[] = []
    for (let ring = 4; ring <= 10; ring += 1) {
      const radius = (ring / 10) * halfDiagonal
      const samples: number[] = []
      for (let k = 0; k < 96; k += 1) {
        const angle = (k / 96) * Math.PI * 2
        const e = centreX + Math.cos(angle) * radius
        const n = centreY + Math.sin(angle) * radius
        if (e < bounds.minX || e > bounds.maxX || n < bounds.minY || n > bounds.maxY) continue
        const [x, y] = project(e, n)
        if (!onCanvas(x, y)) continue
        const value = lum(x, y)
        if (value <= BUILDING_LUM) samples.push(value)
      }
      if (samples.length < 12) continue
      samples.sort((p, q) => p - q)
      profile.push(samples[Math.floor(samples.length / 2)]!)
    }
    // The ground must move steadily toward the background colour (dark or light mist alike): its
    // distance from the background never grows by more than a few levels from one ring to the next.
    backgroundSamples.sort((p, q) => p - q)
    const background = backgroundSamples[Math.floor(backgroundSamples.length / 2)]!
    let maxAway = 0
    for (let i = 1; i < profile.length; i += 1) maxAway = Math.max(maxAway, Math.abs(profile[i]! - background) - Math.abs(profile[i - 1]! - background))
    return { site: '', edgeMean, edgeP95, maxAway, profile }
  }, screenshot.toString('base64')).then((r) => ({ ...r, site }))
}

for (const site of SITES) {
  test(`${site}: edge difference and outward profile`, async ({ page }) => {
    await openView(page, site)
    const result = await measure(page, site)
    console.log(`[IDENTITY_EDGE ${site}] edgeMean ${result.edgeMean.toFixed(2)} edgeP95 ${result.edgeP95.toFixed(2)} maxAway ${result.maxAway.toFixed(2)}`)
    // Acceptance targets (T1): edge ≤ 3 avg, ≤ 8 p95; profile never rises > 4 between steps.
    expect(result.edgeMean).toBeLessThanOrEqual(3)
    expect(result.edgeP95).toBeLessThanOrEqual(8)
    expect(result.maxAway).toBeLessThanOrEqual(4)
  })
}
