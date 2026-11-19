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
  maxRise: number
  profile: number[]
}

async function openView(page: Page, site: string) {
  await page.goto(`/lab/${site}?style=identity&stage=C&state=neutral&preset=overview`)
  await expect(page.getByRole('region', { name: /3D site viewport/ })).toBeVisible({ timeout: budget(120_000) })
  await page.waitForTimeout(9000) // settle: 1 m tile worker, contours, speckled trees, haze
}

/** Screenshot, then analyse the pixels inside the page (no new dependency). */
async function measure(page: Page, site: string): Promise<EdgeResult> {
  const screenshot = await page.screenshot()
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
    const hook = (window as Window & { __terraformEdgeTest?: { bounds: { minX: number; maxX: number; minY: number; maxY: number }; project: (e: number, n: number, h: number) => [number, number] } }).__terraformEdgeTest
    if (!hook) throw new Error('edge-test hook not exposed')

    const { bounds } = hook
    const centreX = (bounds.minX + bounds.maxX) / 2
    const centreY = (bounds.minY + bounds.maxY) / 2
    const project = (e: number, n: number) => hook.project(e, n, 0)

    // 1. Edge visibility: sample along the four tile edges (≥ 200 points), 6 px inside vs outside.
    const edgeDiffs: number[] = []
    const centre = project(centreX, centreY)
    const corners = [
      project(bounds.minX, bounds.minY),
      project(bounds.maxX, bounds.minY),
      project(bounds.maxX, bounds.maxY),
      project(bounds.minX, bounds.maxY),
    ]
    const edges = [
      [corners[0]!, corners[1]!],
      [corners[1]!, corners[2]!],
      [corners[2]!, corners[3]!],
      [corners[3]!, corners[0]!],
    ] as const
    const stepsPerEdge = 50
    for (const [a, b] of edges) {
      for (let s = 0; s <= stepsPerEdge; s += 1) {
        const t = s / stepsPerEdge
        const x = a[0] + (b[0] - a[0]) * t
        const y = a[1] + (b[1] - a[1]) * t
        // Away from the tile centre = outside; toward = inside.
        const dx = x - centre[0]
        const dy = y - centre[1]
        const len = Math.hypot(dx, dy) || 1
        const nx = dx / len
        const ny = dy / len
        const inside = lum(x - nx * 6, y - ny * 6)
        const outside = lum(x + nx * 6, y + ny * 6)
        edgeDiffs.push(Math.abs(inside - outside))
      }
    }
    const sorted = [...edgeDiffs].sort((p, q) => p - q)
    const edgeMean = edgeDiffs.reduce((sum, d) => sum + d, 0) / edgeDiffs.length
    const edgeP95 = sorted[Math.floor(sorted.length * 0.95)]!

    // 2. Outward profile: 8 rays from the site centre to the frame edge, 10 steps each.
    const profile: number[] = []
    for (let ray = 0; ray < 8; ray += 1) {
      const angle = (ray / 8) * Math.PI * 2
      for (let step = 1; step <= 10; step += 1) {
        const t = step / 10
        // Ray endpoint at the frame edge in that direction (screen space).
        const tx = centre[0] + Math.cos(angle) * Math.hypot(img.width, img.height)
        const ty = centre[1] + Math.sin(angle) * Math.hypot(img.width, img.height)
        const x = centre[0] + (tx - centre[0]) * t
        const y = centre[1] + (ty - centre[1]) * t
        // Median of a 3×3 patch (skips isolated buildings/roads).
        const patch: number[] = []
        for (let oy = -1; oy <= 1; oy += 1) for (let ox = -1; ox <= 1; ox += 1) patch.push(lum(x + ox, y + oy))
        patch.sort((p, q) => p - q)
        profile.push(patch[4]!)
      }
    }
    let maxRise = 0
    for (let ray = 0; ray < 8; ray += 1) {
      for (let step = 1; step < 10; step += 1) {
        const rise = profile[ray * 10 + step]! - profile[ray * 10 + (step - 1)]!
        maxRise = Math.max(maxRise, rise)
      }
    }
    return { site: '', edgeMean, edgeP95, maxRise, profile }
  }, screenshot.toString('base64')).then((r) => ({ ...r, site }))
}

for (const site of SITES) {
  test(`${site}: edge difference and outward profile`, async ({ page }) => {
    await openView(page, site)
    const result = await measure(page, site)
    console.log(`[IDENTITY_EDGE ${site}] edgeMean ${result.edgeMean.toFixed(2)} edgeP95 ${result.edgeP95.toFixed(2)} maxRise ${result.maxRise.toFixed(2)}`)
    // Acceptance targets (T1): edge ≤ 3 avg, ≤ 8 p95; profile never rises > 4 between steps.
    expect(result.edgeMean).toBeLessThanOrEqual(3)
    expect(result.edgeP95).toBeLessThanOrEqual(8)
    expect(result.maxRise).toBeLessThanOrEqual(4)
  })
}
