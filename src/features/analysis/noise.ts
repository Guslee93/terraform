import { segmentsIntersect, pointInPolygon } from '../../lib/polygon'
import type { Vec2 } from '../../lib/coordinates'
import { insideAnyBuilding, sampleGrid, type FootprintBuilding, type GridCell } from './grid'

export const NOISE_DISCLAIMER = 'Indicative road-noise screening — not a noise survey'

/**
 * Nominal level (dB) at 10 m from the road, by OSM highway class. Indicative constants chosen for
 * relative ranking, not measured traffic data. Classes absent here (footways, paths…) are silent.
 */
export const ROAD_LEVEL_AT_10M: Readonly<Record<string, number>> = {
  motorway: 78,
  trunk: 74,
  primary: 70,
  secondary: 66,
  tertiary: 62,
  residential: 55,
  unclassified: 55,
  living_street: 48,
  service: 50,
}

/** Fixed loss when a building of at least this height lies on the line to the road. */
export const SCREEN_LOSS_DB = 10
export const SCREEN_MIN_HEIGHT_M = 3
export const NOISE_REFERENCE_M = 10

export type NoiseRoad = { readonly highway: string; readonly centreline: readonly Vec2[] }
export type NoiseBand = 'quiet' | 'moderate' | 'loud' | 'very-loud' | 'extreme'
export type NoiseCell = GridCell & { readonly db: number | null; readonly band: NoiseBand | null }

export const NOISE_BAND_LABEL: Record<NoiseBand, string> = {
  quiet: 'Below 45 dB',
  moderate: '45–55 dB',
  loud: '55–65 dB',
  'very-loud': '65–75 dB',
  extreme: 'Above 75 dB',
}

export function noiseBand(db: number): NoiseBand {
  if (db < 45) return 'quiet'
  if (db < 55) return 'moderate'
  if (db < 65) return 'loud'
  if (db < 75) return 'very-loud'
  return 'extreme'
}

function closestOnSegment(p: Vec2, a: Vec2, b: Vec2): Vec2 {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len2 = dx * dx + dy * dy
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2))
  return [a[0] + t * dx, a[1] + t * dy]
}

function screened(from: Vec2, to: Vec2, buildings: readonly FootprintBuilding[]): boolean {
  return buildings.some((b) => {
    if (b.height < SCREEN_MIN_HEIGHT_M || pointInPolygon(from, b.footprint)) return false
    return b.footprint.some((v, i) =>
      segmentsIntersect(from, to, v, b.footprint[(i + 1) % b.footprint.length] as Vec2),
    )
  })
}

/**
 * Level at one point: energy sum over roads, one source per road at its closest point.
 * ponytail: closest-point-per-road ignores road length, so long roads read slightly quiet;
 * sample sources along the centreline if that matters.
 */
export function noiseAt(x: number, y: number, roads: readonly NoiseRoad[], buildings: readonly FootprintBuilding[]): number | null {
  let energy = 0
  for (const road of roads) {
    const level = ROAD_LEVEL_AT_10M[road.highway]
    if (level === undefined) continue
    let best: Vec2 | null = null
    let bestD = Infinity
    for (let i = 0; i + 1 < road.centreline.length; i++) {
      const c = closestOnSegment([x, y], road.centreline[i] as Vec2, road.centreline[i + 1] as Vec2)
      const d = Math.hypot(c[0] - x, c[1] - y)
      if (d < bestD) {
        bestD = d
        best = c
      }
    }
    if (!best) continue
    const r = Math.max(bestD, NOISE_REFERENCE_M) // no gain closer than the reference distance
    let db = level - 10 * Math.log10(r / NOISE_REFERENCE_M) // line source: 3 dB per doubling
    if (screened([x, y], best, buildings)) db -= SCREEN_LOSS_DB
    energy += 10 ** (db / 10)
  }
  return energy === 0 ? null : 10 * Math.log10(energy)
}

export function computeNoise(
  studyArea: readonly Vec2[],
  roads: readonly NoiseRoad[],
  buildings: readonly FootprintBuilding[],
  cellM = 10,
): NoiseCell[] {
  return sampleGrid(studyArea, cellM).map((c) => {
    const db = insideAnyBuilding(c.x, c.y, buildings) ? null : noiseAt(c.x, c.y, roads, buildings)
    return { ...c, db, band: db === null ? null : noiseBand(db) }
  })
}
