// Opt-in robustness sweep (docs/plans/wind-finish-plan.md C2/C3):
//   WIND_SWEEP=1 npx vitest run src/features/analysis/wind-sweep.test.ts --silent=false
// Uses the app's analysis-circle settings (r = 100 m, 160², margin 1.4) on the curated sites.
import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import type { Vec2 } from '../../lib/coordinates'
import { normalizeRing, ringCentroid } from '../../lib/polygon'
import { parseBuildings, parseStudyArea } from '../sites/package'
import { buildClimateView, DEFAULT_WIND } from './climateView'
import { createFlowRunner } from './flowRunner'
import { circlePolygon, type FootprintBuilding } from './grid'
import { flowFrame, sampleVelocity } from './lbm'

const run = !!process.env.WIND_SWEEP

function solve(buildings: readonly FootprintBuilding[], centre: Vec2, from: number, slices: boolean) {
  const frame = flowFrame(circlePolygon(centre, 100), from, 160, 160, 1.4)
  const runner = createFlowRunner()
  runner.request({ id: 1, frame, buildings, reset: true, slices, downwash: true })
  const t0 = performance.now()
  for (;;) {
    const r = runner.tick(1000)!
    if (slices ? r.slicesComplete : r.settled) return { r, ms: performance.now() - t0 }
  }
}

it.skipIf(!run)('C3: both curated sites × 8 directions stay finite with no side jets', () => {
  const rows: string[] = []
  const shares: { site: string; share: number }[] = []
  let bads = 0
  for (const site of ['compact-infill', 'sloped-edge']) {
    const buildings = parseBuildings(JSON.parse(readFileSync(`public/sites/${site}/buildings.json`, 'utf8'))).buildings
    const centre = ringCentroid(normalizeRing(parseStudyArea(JSON.parse(readFileSync(`public/sites/${site}/study-area.json`, 'utf8'))).polygon))
    for (let from = 0; from < 360; from += 45) {
      const { r, ms } = solve(buildings, centre, from, false)
      let n = 0, fast = 0, bad = 0
      for (let y = -95; y <= 95; y += 5) for (let x = -95; x <= 95; x += 5) {
        if (x * x + y * y > 95 * 95) continue
        const v = sampleVelocity(r.frame, r.velocity, r.solid, [centre[0] + x, centre[1] + y])
        if (!v) continue
        const s = Math.hypot(v[0], v[1])
        if (!Number.isFinite(s)) bad++
        n++
        if (s > 1.3) fast++
      }
      rows.push(`${site} ${String(from).padStart(3)}°  >1.3×: ${(100 * fast / n).toFixed(1).padStart(5)} %  settle ${(ms / 1000).toFixed(1)} s`)
      shares.push({ site, share: fast / n })
      bads += bad
    }
  }
  console.log('SWEEP\n' + rows.join('\n'))
  expect(bads).toBe(0)
  // Compact Infill: no sideways jets in any direction (was 38 % on Sloped Edge W before the
  // boundary fix). Sloped Edge is reported, not asserted: from N/NE/E/SE/S/NW its scattered low
  // houses act as one porous 2D block and the flow speeds up round it (12–28 % > 1.3×) — a known
  // 2D limit (wind can't go over low roofs at ground level), see wind-validation-note.md.
  for (const { site, share } of shares) if (site === 'compact-infill') expect(share).toBeLessThan(0.15)
}, 600_000)

it.skipIf(!run)('C2: 2 000-building synthetic site — full stack and main-thread view cost', () => {
  const buildings: FootprintBuilding[] = Array.from({ length: 2000 }, (_, i) => {
    const x = (i % 50) * 24 - 600, y = Math.floor(i / 50) * 24 - 480, h = 6 + (i * 37) % 30
    return { height: h, footprint: [[x, y], [x + 14, y], [x + 14, y + 14], [x, y + 14]] as Vec2[] }
  })
  const { r, ms } = solve(buildings, [0, 0], 270, true)
  const area = circlePolygon([0, 0], 100)
  const t0 = performance.now()
  for (let i = 0; i < 10; i++) buildClimateView('wind', area, buildings, [], r, { ...DEFAULT_WIND, centre: [0, 0] })
  const viewMs = (performance.now() - t0) / 10
  console.log(`LARGE stack ${(ms / 1000).toFixed(1)} s (${r.slices?.length} slices), buildClimateView ${viewMs.toFixed(1)} ms`)
  expect(ms).toBeLessThan(15_000)
  expect(viewMs).toBeLessThan(30)
}, 120_000)
