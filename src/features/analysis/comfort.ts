import { pointInPolygon, ringCentroid } from '../../lib/polygon'
import type { Vec2 } from '../../lib/coordinates'
import { gridToWorld, worldToGrid, type FlowFrame } from './lbm'
import type { FootprintBuilding } from './grid'

/**
 * Wind comfort domain — Lawson (Norconsult variant) classes, the safety threshold and the
 * rule-based downwash boost. Renderer-free: no React, no Three.js (guardrail 3).
 *
 * A 2D flow slice cannot solve downwash, so it is an explicit named rule (ADR-0014 §4), not a
 * physical result. Every number here is a criterion constant, never a measurement.
 * ponytail: the downwash rule is geometric — it never exceeds 1.3 and only fires for buildings
 * that stand well above their neighbours. No turbulence statistics, no vertical flow.
 */

export const COMFORT_DISCLAIMER = 'Indicative wind comfort (Lawson, Norconsult variant) — 2D screening, not engineering'
/** Criterion name shown in the legend (PRD R4). */
export const COMFORT_CRITERION = 'Lawson (Norconsult variant)'
/** Criterion name for the safety overlay — indicative, not a code check. */
export const SAFETY_CRITERION = 'Lawson safety, indicative'

export type LawsonClass = 'A' | 'B' | 'C' | 'D' | 'E'
export type ComfortClass = LawsonClass | 'unsafe'

/**
 * Lawson comfort criterion, Norconsult variant: an activity class holds when its wind speed
 * threshold is exceeded for at most 5 % of the time. Thresholds are m/s at pedestrian level.
 */
export const LAWSON_NORCONSULT = {
  thresholds: [2, 4, 6, 8, 10],
  classes: ['A', 'B', 'C', 'D', 'E'],
  activities: ['sit', 'stand', 'stroll', 'walk', 'uncomfortable'],
  exceedance: 0.05,
} as const

/**
 * Lawson safety thresholds (m/s). The first one drives the unsafe test; the second is the
 * gust limit quoted alongside it.
 */
export const SAFETY = {
  thresholds: [15, 20],
  /** P(speed > 15 m/s) above this marks the cell unsafe: 0.0003 of the year ≈ 2.5 h/yr. */
  unsafeExceedance: 0.0003,
} as const

export const COMFORT_CLASS_LABEL: Record<ComfortClass, string> = {
  A: 'A — sit',
  B: 'B — stand',
  C: 'C — stroll',
  D: 'D — walk',
  E: 'E — uncomfortable',
  unsafe: 'Unsafe — Lawson safety, indicative',
}

/** Pedestrian-level wind speed (m/s) for a speed ratio and a 10 m reference wind speed. */
export function localSpeed(ratio: number, refSpeed10m: number): number {
  return ratio * refSpeed10m
}

/** Pedestrian-level wind speed (m/s) for every cell of a ratio field. */
export function localSpeedField(ratios: Float32Array, refSpeed10m: number): Float32Array {
  const out = new Float32Array(ratios.length)
  for (let i = 0; i < ratios.length; i++) out[i] = ratios[i]! * refSpeed10m
  return out
}

/* ------------------------------------------------------------------ downwash rule */

/** Neighbourhood radius for the mean-height comparison (m). */
export const DOWNWASH_NEIGHBOUR_RADIUS_M = 100
/** A building qualifies when its height is at least this multiple of the local mean height. */
export const DOWNWASH_HEIGHT_FACTOR = 2
/** A building qualifies on height alone at or above this (m). */
export const DOWNWASH_ABSOLUTE_HEIGHT_M = 30
/** Boost ring width as a fraction of the building height. */
export const DOWNWASH_RING_WIDTH_FACTOR = 0.5
/** Ring width cap (m) so very tall buildings do not flood the domain. */
export const DOWNWASH_MAX_RING_WIDTH_M = 25
/** Hard cap on the speed multiplier. */
export const DOWNWASH_MAX_BOOST = 1.3
/** Directional weight given to an upwind corner (the upwind face itself is 1). */
export const DOWNWASH_CORNER_WEIGHT = 0.9

/**
 * True when a building is tall enough to shed downwash onto the pedestrian level: either
 * H ≥ 2 × the mean height of the buildings within 100 m, or H ≥ 30 m.
 *
 * The building counts itself in that mean, so a low-rise block among low-rise blocks never
 * qualifies — only a building that stands out against its surroundings does.
 */
export function downwashQualifies(building: FootprintBuilding, buildings: readonly FootprintBuilding[]): boolean {
  if (building.height >= DOWNWASH_ABSOLUTE_HEIGHT_M) return true
  const centre = ringCentroid(building.footprint)
  let sum = 0
  let count = 0
  for (const other of buildings) {
    const otherCentre = ringCentroid(other.footprint)
    if (Math.hypot(otherCentre[0] - centre[0], otherCentre[1] - centre[1]) <= DOWNWASH_NEIGHBOUR_RADIUS_M) {
      sum += other.height
      count += 1
    }
  }
  if (count === 0) return false
  return building.height >= DOWNWASH_HEIGHT_FACTOR * (sum / count)
}

/**
 * Per-cell speed multiplier (default 1) for the downwash rule, length `frame.nx * frame.ny`.
 *
 * A qualifying building boosts the ring around its footprint: full weight on the upwind face,
 * slightly less on the upwind corners, nothing in the lee. The boost falls off linearly to
 * zero at the edge of the ring and is capped at `DOWNWASH_MAX_BOOST`.
 */
export function downwashBoost(buildings: readonly FootprintBuilding[], frame: FlowFrame): Float32Array {
  const field = new Float32Array(frame.nx * frame.ny).fill(1)
  // Centroids once; only buildings whose ring can reach the frame are candidates, and only
  // neighbours within the 100 m radius of a candidate count (large imported sites stay cheap).
  const centres = buildings.map((b) => ringCentroid(b.footprint))
  const reach = (Math.hypot(frame.nx, frame.ny) * frame.dx) / 2 + DOWNWASH_MAX_RING_WIDTH_M + DOWNWASH_NEIGHBOUR_RADIUS_M
  const near = buildings.map((_, i) => Math.hypot(centres[i]![0] - frame.centre[0], centres[i]![1] - frame.centre[1]) <= reach)
  const nearIdx = near.flatMap((ok, i) => (ok ? [i] : []))
  const qualifies = (i: number) => {
    const building = buildings[i]!
    if (building.height >= DOWNWASH_ABSOLUTE_HEIGHT_M) return true
    let sum = 0
    let count = 0
    for (const j of nearIdx) {
      if (Math.hypot(centres[j]![0] - centres[i]![0], centres[j]![1] - centres[i]![1]) <= DOWNWASH_NEIGHBOUR_RADIUS_M) {
        sum += buildings[j]!.height
        count += 1
      }
    }
    return count > 0 && building.height >= DOWNWASH_HEIGHT_FACTOR * (sum / count)
  }
  for (const i of nearIdx) {
    const building = buildings[i]!
    if (Math.hypot(centres[i]![0] - frame.centre[0], centres[i]![1] - frame.centre[1]) > reach - DOWNWASH_NEIGHBOUR_RADIUS_M) continue
    if (!qualifies(i)) continue
    const ring = Math.min(DOWNWASH_RING_WIDTH_FACTOR * building.height, DOWNWASH_MAX_RING_WIDTH_M)
    if (!(ring > 0) || building.footprint.length < 3) continue
    const bounds = footprintBounds(building.footprint)
    if (!bounds) continue
    const [x0, x1, y0, y1] = gridBounds(frame, bounds, ring)
    for (let gy = y0; gy <= y1; gy++) {
      for (let gx = x0; gx <= x1; gx++) {
        const p = gridToWorld(frame, [gx + 0.5, gy + 0.5])
        if (pointInPolygon(p, building.footprint)) continue
        const near = nearestOnBoundary(building.footprint, p)
        if (near.dist > ring) continue
        const falloff = 1 - near.dist / ring
        const dx = p[0] - near.point[0]
        const dy = p[1] - near.point[1]
        const length = Math.hypot(dx, dy)
        if (!(length > 0)) continue
        // Outward normal: how much the cell faces into the oncoming wind.
        const facing = Math.max(0, -((dx / length) * frame.flow[0] + (dy / length) * frame.flow[1]))
        const weight = near.isVertex && facing > 0 ? Math.max(facing, DOWNWASH_CORNER_WEIGHT) : facing
        const multiplier = 1 + (DOWNWASH_MAX_BOOST - 1) * weight * falloff
        const i = gy * frame.nx + gx
        if (multiplier > field[i]!) field[i] = multiplier
      }
    }
  }
  return field
}

type Bounds = { readonly minX: number; readonly maxX: number; readonly minY: number; readonly maxY: number }

function footprintBounds(poly: readonly Vec2[]): Bounds | null {
  if (poly.length < 3) return null
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const p of poly) {
    if (p[0] < minX) minX = p[0]
    if (p[0] > maxX) maxX = p[0]
    if (p[1] < minY) minY = p[1]
    if (p[1] > maxY) maxY = p[1]
  }
  return { minX, maxX, minY, maxY }
}

/** Grid cell range covering a world box grown by `pad` metres. */
function gridBounds(frame: FlowFrame, bounds: Bounds, pad: number): [number, number, number, number] {
  const corners: Vec2[] = [
    [bounds.minX - pad, bounds.minY - pad],
    [bounds.maxX + pad, bounds.minY - pad],
    [bounds.maxX + pad, bounds.maxY + pad],
    [bounds.minX - pad, bounds.maxY + pad],
  ]
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const corner of corners) {
    const g = worldToGrid(frame, corner)
    if (g[0] < minX) minX = g[0]
    if (g[0] > maxX) maxX = g[0]
    if (g[1] < minY) minY = g[1]
    if (g[1] > maxY) maxY = g[1]
  }
  const x0 = Math.max(0, Math.floor(minX))
  const x1 = Math.min(frame.nx - 1, Math.ceil(maxX))
  const y0 = Math.max(0, Math.floor(minY))
  const y1 = Math.min(frame.ny - 1, Math.ceil(maxY))
  return [x0, x1, y0, y1]
}

type NearestOnBoundary = { readonly dist: number; readonly point: Vec2; readonly isVertex: boolean }

/** Closest point on a closed polygon boundary, and whether it is a corner rather than an edge. */
function nearestOnBoundary(poly: readonly Vec2[], p: Vec2): NearestOnBoundary {
  let best: NearestOnBoundary = { dist: Infinity, point: poly[0]!, isVertex: false }
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!
    const b = poly[(i + 1) % poly.length]!
    const ex = b[0] - a[0]
    const ey = b[1] - a[1]
    const lenSq = ex * ex + ey * ey
    let t = lenSq > 0 ? ((p[0] - a[0]) * ex + (p[1] - a[1]) * ey) / lenSq : 0
    t = Math.max(0, Math.min(1, t))
    const point: Vec2 = [a[0] + t * ex, a[1] + t * ey]
    const dist = Math.hypot(p[0] - point[0], p[1] - point[1])
    if (dist < best.dist) {
      best = { dist, point, isVertex: t <= 0 || t >= 1 }
    }
  }
  return best
}

/* ------------------------------------------------------------------ annual combine */

/** One sector of a wind rose: direction the wind comes FROM, its share of the year and its Weibull fit. */
export type WindRoseSector = {
  /** Compass bearing the wind comes from (0 = north, 90 = east). */
  readonly fromDeg: number
  /** Share of the year this sector covers; the rose sums to 1. */
  readonly frequency: number
  readonly weibullK: number
  readonly weibullC: number
}

export type WindRose = readonly WindRoseSector[]

/** Speed-ratio field for one wind direction. */
export type DirectionRatio = {
  /** Compass bearing the wind comes from (0 = north, 90 = east). */
  readonly fromDeg: number
  /** |u| / u0 per cell for that direction. */
  readonly ratio: Float32Array
}

/** Degrees of slack when matching a rose sector to a ratio field. */
export const DIRECTION_MATCH_TOLERANCE_DEG = 0.5

/**
 * Probability that the pedestrian-level wind speed exceeds `threshold` (m/s), per cell.
 *
 * Per direction the speed is Weibull distributed around the reference wind speed, scaled by
 * the local speed ratio: P(speed > t) = exp(-(t / (ratio · c))^k). The annual probability is
 * the frequency-weighted sum over the rose.
 */
export function exceedanceProbability(
  ratiosByDirection: readonly DirectionRatio[],
  rose: readonly WindRoseSector[],
  threshold: number,
): Float32Array {
  validateRose(rose)
  const t = Math.max(0, threshold)
  const matched = rose.map((sector) => {
    const direction = findDirection(ratiosByDirection, sector.fromDeg)
    if (!direction) {
      throw new Error(`wind comfort: no speed-ratio field for wind from ${sector.fromDeg}°`)
    }
    return { sector, ratio: direction.ratio }
  })
  const size = matched[0]!.ratio.length
  const out = new Float32Array(size)
  for (const { sector, ratio } of matched) {
    if (ratio.length !== size) throw new Error('wind comfort: speed-ratio fields must share one grid')
    if (sector.frequency === 0) continue
    for (let i = 0; i < size; i++) {
      const scale = ratio[i]! * sector.weibullC
      if (!(scale > 0)) continue
      out[i] = out[i]! + sector.frequency * Math.exp(-Math.pow(t / scale, sector.weibullK))
    }
  }
  return out
}

function findDirection(ratios: readonly DirectionRatio[], fromDeg: number): DirectionRatio | undefined {
  let best: DirectionRatio | undefined
  let bestDelta = DIRECTION_MATCH_TOLERANCE_DEG
  for (const direction of ratios) {
    const delta = Math.abs(wrapDegrees(direction.fromDeg - fromDeg))
    if (delta <= bestDelta) {
      best = direction
      bestDelta = delta
    }
  }
  return best
}

function wrapDegrees(deg: number): number {
  let value = deg
  while (value > 180) value -= 360
  while (value < -180) value += 360
  return value
}

function validateRose(rose: readonly WindRoseSector[]): void {
  if (rose.length === 0) throw new Error('wind comfort: wind rose has no sectors')
  let sum = 0
  for (const sector of rose) {
    if (!Number.isFinite(sector.frequency) || sector.frequency < 0) {
      throw new Error(`wind comfort: bad frequency for ${sector.fromDeg}°`)
    }
    if (!Number.isFinite(sector.weibullK) || sector.weibullK <= 0) {
      throw new Error(`wind comfort: bad Weibull k for ${sector.fromDeg}°`)
    }
    if (!Number.isFinite(sector.weibullC) || sector.weibullC <= 0) {
      throw new Error(`wind comfort: bad Weibull c for ${sector.fromDeg}°`)
    }
    sum += sector.frequency
  }
  if (Math.abs(sum - 1) > 1e-6) {
    throw new Error(`wind comfort: wind rose frequencies sum to ${sum}, expected 1`)
  }
}

/* ------------------------------------------------------------------ classification */

/**
 * Criterion limits rounded to float32, so a probability field holding exactly 5 % (or exactly
 * 0.0003) still satisfies the comparison the criterion states.
 */
const EXCEEDANCE_LIMIT = Math.fround(LAWSON_NORCONSULT.exceedance)
const UNSAFE_LIMIT = Math.fround(SAFETY.unsafeExceedance)

/** Exceedance probabilities the classifier needs, one field per criterion threshold. */
export type ComfortFields = {
  /** P(speed > t) for each t in `LAWSON_NORCONSULT.thresholds`, in the same order. */
  readonly byThreshold: readonly Float32Array[]
  /** P(speed > `SAFETY.thresholds[0]`), the unsafe test. */
  readonly aboveSafety: Float32Array
}

/** Build every exceedance field the classifier needs from one rose and its ratio fields. */
export function comfortFields(ratiosByDirection: readonly DirectionRatio[], rose: readonly WindRoseSector[]): ComfortFields {
  const byThreshold = LAWSON_NORCONSULT.thresholds.map((t) => exceedanceProbability(ratiosByDirection, rose, t))
  const aboveSafety = exceedanceProbability(ratiosByDirection, rose, SAFETY.thresholds[0])
  return { byThreshold, aboveSafety }
}

/**
 * Lawson class per cell: the lowest class whose threshold is exceeded at most 5 % of the time.
 * A cell is `unsafe` when P(speed > 15 m/s) exceeds `SAFETY.unsafeExceedance` (≈ 2.5 h/yr).
 */
export function lawsonClass(fields: ComfortFields): ComfortClass[] {
  const size = fields.aboveSafety.length
  const out: ComfortClass[] = new Array<ComfortClass>(size)
  for (let i = 0; i < size; i++) {
    if (fields.aboveSafety[i]! > UNSAFE_LIMIT) {
      out[i] = 'unsafe'
      continue
    }
    let cls: ComfortClass = 'E'
    for (let c = 0; c < LAWSON_NORCONSULT.thresholds.length; c++) {
      const probability = fields.byThreshold[c]
      if (!probability) continue
      if (probability[i]! <= EXCEEDANCE_LIMIT) {
        cls = LAWSON_NORCONSULT.classes[c] ?? 'E'
        break
      }
    }
    out[i] = cls
  }
  return out
}
