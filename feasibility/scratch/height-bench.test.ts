/**
 * Throwaway: replace the curated site's estimated heights (OSM levels × 3.2 + 0.4) with the app's
 * own DOM roof fit (src/features/import/roofFit.ts, ADR-0022, unchanged), then measure how much
 * that changes sun hours in the default analysis circle (circleSunHours.ts, unchanged).
 * Needs dtm_enu.bin / dom_enu.bin from the resample step (north-up local ENU, 1 m).
 * Run: npx vitest run --config feasibility/scratch/vitest.config.ts height-bench
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { it } from 'vitest'
import { computeCircleSunHours } from '../../src/features/analysis/circleSunHours'
import type { FootprintBuilding } from '../../src/features/analysis/grid'
import { daySunSamples, type SunLocation } from '../../src/features/analysis/shadowRay'
import { fitRoof, roofSamplePoints } from '../../src/features/import/roofFit'
import type { Vec2 } from '../../src/lib/coordinates'

const here = (f: string) => new URL(f, import.meta.url)
const meta = JSON.parse(readFileSync(here('./enu_raster.json'), 'utf8')) as { half: number; size: number; originElevation: number }
const load = (f: string) => new Float32Array(readFileSync(here(f)).buffer.slice(0))
const dtm = load('./dtm_enu.bin')
const dom = load('./dom_enu.bin')
function at(r: Float32Array, x: number, y: number): number | null {
  const c = Math.floor(x + meta.half), row = Math.floor(meta.half - y)
  if (c < 0 || row < 0 || c >= meta.size || row >= meta.size) return null
  const v = r[row * meta.size + c]!
  return Number.isFinite(v) ? v : null
}
const pkg = (f: string) => JSON.parse(readFileSync(here(`../../public/sites/compact-infill/${f}`), 'utf8'))

it('measured heights vs estimated heights', () => {
  const all = pkg('buildings.json').buildings as { id: string; footprint: Vec2[]; height: number; baseElevation: number }[]
  const inside = all.filter((b) => b.footprint.every(([x, y]) => Math.abs(x) < meta.half - 5 && Math.abs(y) < meta.half - 5))
  const kinds: Record<string, number> = { flat: 0, gabled: 0, complex: 0, unmeasured: 0 }
  const rows = inside.map((b) => {
    // Same base rule as the import path: lowest terrain under the outline and centroid, minus 0.3 m.
    const cx = b.footprint.reduce((s, p) => s + p[0], 0) / b.footprint.length
    const cy = b.footprint.reduce((s, p) => s + p[1], 0) / b.footprint.length
    const ground = [...b.footprint, [cx, cy] as Vec2].map(([x, y]) => at(dtm, x, y)).filter((v): v is number => v !== null)
    const baseAbs = Math.min(...ground) - 0.3
    const fit = fitRoof(b.footprint, roofSamplePoints(b.footprint).map(([x, y]) => {
      const z = at(dom, x, y)
      return { x, y, z: z === null ? null : z - baseAbs }
    }))
    kinds[fit ? fit.kind : 'unmeasured']! += 1
    return { id: b.id, estimated: b.height, measured: fit ? Math.min(200, Math.max(2.5, fit.height)) : null, kind: fit?.kind ?? 'unmeasured',
      roof: fit?.kind === 'gabled' ? fit.roof : undefined, footprint: b.footprint, baseRel: b.baseElevation }
  })
  const d = rows.filter((r) => r.measured !== null).map((r) => r.measured! - r.estimated).sort((a, b) => a - b)
  const q = (p: number) => +d[Math.floor(p * (d.length - 1))]!.toFixed(2)
  const abs = d.map(Math.abs).sort((a, b) => a - b)

  // Sun-hours impact: equinox and midsummer, default circle r = 100 m at the origin.
  const location: SunLocation = { latitude: 59.9235, longitude: 10.758, timeZone: 'Europe/Oslo' }
  const asBuildings = (useMeasured: boolean): FootprintBuilding[] => rows.map((r) => ({
    footprint: r.footprint, baseElevation: r.baseRel,
    height: useMeasured && r.measured !== null ? r.measured : r.estimated,
    ...(useMeasured && r.roof ? { roof: r.roof } : {}),
  }))
  const impact: Record<string, unknown> = {}
  for (const date of ['2026-03-20', '2026-06-21'] as const) {
    const samples = daySunSamples(date, location, 15)
    const circle = { centre: [0, 0] as Vec2, radius: 100 }
    const a = computeCircleSunHours(asBuildings(false), circle, samples)
    const b = computeCircleSunHours(asBuildings(true), circle, samples)
    let n = 0, sumAbs = 0, over1 = 0
    for (let i = 0; i < a.surface.hours.length; i++) {
      const x = a.surface.hours[i]!, y = b.surface.hours[i]!
      if (!Number.isFinite(x) || !Number.isFinite(y) || a.surface.surface[i] !== -1 || b.surface.surface[i] !== -1) continue
      n++; sumAbs += Math.abs(y - x); if (Math.abs(y - x) >= 1) over1++
    }
    impact[date] = { groundCells: n, meanAbsDiffH: +(sumAbs / n).toFixed(2), shareCellsChangedAtLeast1h: +(over1 / n).toFixed(3),
      medianEstimated: a.median, medianMeasured: b.median, possibleHours: +a.possibleHours.toFixed(2) }
  }
  const result = {
    buildingsTested: rows.length, fitKinds: kinds,
    measuredMinusEstimatedM: { n: d.length, p10: q(0.1), median: q(0.5), p90: q(0.9), meanAbs: +(abs.reduce((s, v) => s + v, 0) / abs.length).toFixed(2), shareWithin3m: +(abs.filter((v) => v <= 3).length / abs.length).toFixed(3) },
    sunHoursImpact: impact,
  }
  console.info(JSON.stringify(result, null, 1))
  writeFileSync(here('./evidence/height-bench.json'), JSON.stringify({ ...result, rows: rows.map(({ footprint: _f, roof: _r, ...r }) => r) }, null, 1))
}, 600_000)
