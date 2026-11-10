import type { Vec2 } from '../../lib/coordinates'

/**
 * A measured roof shape on a context building (ADR-0022). Only gables are represented; a building
 * without `roof` is a flat extrusion at `height`. Local ENU metres, heights above `baseElevation`.
 *
 * The roof surface is `ridgeHeight − tan(pitch) × distance from the ridge line`, on both sides of an
 * infinite line through `ridge`, so one formula serves any footprint shape.
 */
export type Roof = {
  readonly shape: 'gabled'
  /** Two points on the ridge line (its extent inside the footprint). */
  readonly ridge: readonly [Vec2, Vec2]
  readonly ridgeHeight: number
  readonly pitchDeg: number
}

export const ROOF_MIN_PITCH_DEG = 8
export const ROOF_MAX_PITCH_DEG = 65
/** Lowest wall a gable may leave at its widest point; below this the fit is not a believable roof. */
export const ROOF_MIN_EAVE_M = 2

/** Signed perpendicular distance from the ridge line (positive on its left). */
export function ridgeOffset(roof: Roof, x: number, y: number): number {
  const [[ax, ay], [bx, by]] = roof.ridge
  const dx = bx - ax
  const dy = by - ay
  const length = Math.hypot(dx, dy)
  return length === 0 ? 0 : ((x - ax) * -dy + (y - ay) * dx) / length
}

/** Roof surface height above the building's base at a plan position. */
export function roofHeightAt(roof: Roof, x: number, y: number): number {
  return roof.ridgeHeight - Math.tan((roof.pitchDeg * Math.PI) / 180) * Math.abs(ridgeOffset(roof, x, y))
}

/** Lowest roof height over the footprint's vertices: the eave at the widest point. */
export function roofEaveMin(footprint: readonly Vec2[], roof: Roof): number {
  return Math.min(...footprint.map(([x, y]) => roofHeightAt(roof, x, y)))
}

/**
 * The part of a ring on one side of the ridge line (Sutherland–Hodgman against a half-plane).
 * `side` is +1 for the ridge's left, −1 for its right. Crossing points land exactly on the ridge,
 * so the two halves share that edge. A concave ring that crosses the ridge more than twice comes
 * back as one ring with zero-width bridges along the ridge, which triangulate to nothing.
 */
export function ringSideOfRidge(ring: readonly Vec2[], roof: Roof, side: 1 | -1): Vec2[] {
  const output: Vec2[] = []
  ring.forEach((b, index) => {
    const a = ring[(index + ring.length - 1) % ring.length]
    if (!a) return
    const da = ridgeOffset(roof, a[0], a[1]) * side
    const db = ridgeOffset(roof, b[0], b[1]) * side
    if (da >= 0 !== db >= 0) {
      const t = da / (da - db)
      output.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])])
    }
    if (db >= 0) output.push(b)
  })
  // A vertex that sits on the ridge is emitted twice; duplicates would triangulate into zero-area faces.
  return output.filter((point, index) => {
    const previous = output[(index + output.length - 1) % output.length]
    return !previous || Math.hypot(point[0] - previous[0], point[1] - previous[1]) > 1e-6
  })
}

/** The ring with a vertex added wherever an edge crosses the ridge, so walls can follow the gable. */
export function ringWithRidgeVertices(ring: readonly Vec2[], roof: Roof): Vec2[] {
  const output: Vec2[] = []
  ring.forEach((a, index) => {
    const b = ring[(index + 1) % ring.length]
    if (!b) return
    output.push(a)
    const da = ridgeOffset(roof, a[0], a[1])
    const db = ridgeOffset(roof, b[0], b[1])
    if (da * db < 0) {
      const t = da / (da - db)
      output.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])])
    }
  })
  return output
}

/** Validates a persisted roof against its footprint. Throws with `path` in the message. */
export function parseRoof(value: unknown, footprint: readonly Vec2[], path: string): Roof {
  const fail = (message: string): never => {
    throw new Error(`${path}: ${message}`)
  }
  if (typeof value !== 'object' || value === null) return fail('expected an object')
  const root = value as Record<string, unknown>
  if (root.shape !== 'gabled') return fail('unknown roof shape')
  const number = (key: string): number => {
    const entry = root[key]
    if (typeof entry !== 'number' || !Number.isFinite(entry)) return fail(`${key} must be a finite number`)
    return entry
  }
  const ridgeRaw = root.ridge
  if (!Array.isArray(ridgeRaw) || ridgeRaw.length !== 2) return fail('ridge must be two points')
  const point = (entry: unknown): Vec2 => {
    if (!Array.isArray(entry) || entry.length !== 2) return fail('ridge point must be [east, north]')
    const [x, y] = entry as unknown[]
    if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) {
      return fail('ridge point must be finite')
    }
    return [x, y]
  }
  const a = point(ridgeRaw[0])
  const b = point(ridgeRaw[1])
  if (Math.hypot(b[0] - a[0], b[1] - a[1]) < 0.5) fail('ridge is too short')
  const roof: Roof = { shape: 'gabled', ridge: [a, b], ridgeHeight: number('ridgeHeight'), pitchDeg: number('pitchDeg') }
  if (roof.pitchDeg < ROOF_MIN_PITCH_DEG || roof.pitchDeg > ROOF_MAX_PITCH_DEG) fail('pitchDeg outside 8–65°')
  if (roof.ridgeHeight <= 0 || roof.ridgeHeight > 200) fail('ridgeHeight outside 0–200 m')
  if (roofEaveMin(footprint, roof) < ROOF_MIN_EAVE_M - 0.01) fail('eave below 2 m at the widest point')
  return roof
}
