import type { Vec2 } from '../../lib/coordinates'
import { pointInPolygon, polygonArea } from '../../lib/polygon'
import { ROOF_MAX_PITCH_DEG, ROOF_MIN_EAVE_M, ROOF_MIN_PITCH_DEG, roofEaveMin, roofHeightAt, type Roof } from '../sites/roof'

/**
 * Roof shape from measured surface heights (ADR-0022). Pure geometry: the caller supplies heights
 * above the building's base at the points from `roofSamplePoints`.
 *
 * Three honest outcomes plus "no answer": flat, gabled, or `complex` (measured, but neither — drawn
 * flat at the measured height). `null` means the surface model does not show this building (ground
 * hits, too few points), so the caller keeps the height it already had.
 */
export type RoofSample = { readonly x: number; readonly y: number; readonly z: number | null }
export type RoofFit =
  | { readonly kind: 'flat'; readonly height: number }
  | { readonly kind: 'gabled'; readonly height: number; readonly roof: Roof }
  | { readonly kind: 'complex'; readonly height: number }

/** Below this a sample is ground or a courtyard, not roof. */
const GROUND_MAX_M = 2
const MIN_SAMPLES = 8
/** Footprints and lidar rarely line up to the metre, so samples stay this far inside the outline. */
const EDGE_INSET_M = 1.5
const FLAT_SPREAD_M = 1.5
/** A roof under 10° with this little relief is a low-slope "flat" roof with plant and parapets on it. */
const LOW_SLOPE_SPREAD_M = 3
const GABLE_MAX_RMSE_M = 1
/** The gable must explain most of the height variation, not just ride through noise. */
const GABLE_MAX_RMSE_SHARE = 0.7
const FIT_MIN_PITCH_DEG = Math.max(ROOF_MIN_PITCH_DEG, 10)
const FIT_MAX_PITCH_DEG = Math.min(ROOF_MAX_PITCH_DEG, 60)

const round = (value: number, decimals: number) => Number(value.toFixed(decimals))

function distanceToRing(x: number, y: number, ring: readonly Vec2[]): number {
  let best = Infinity
  ring.forEach((a, index) => {
    const b = ring[(index + 1) % ring.length]
    if (!b) return
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const len2 = dx * dx + dy * dy
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / len2))
    best = Math.min(best, Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy))
  })
  return best
}

/** Plan positions to measure: a grid of about 250 points at most, kept away from the outline. */
export function roofSamplePoints(footprint: readonly Vec2[]): Vec2[] {
  if (footprint.length < 3) return []
  const spacing = Math.max(1, Math.sqrt(polygonArea(footprint) / 250))
  const xs = footprint.map((point) => point[0])
  const ys = footprint.map((point) => point[1])
  const inside: { point: Vec2; edge: number }[] = []
  for (let y = Math.min(...ys) + spacing / 2; y < Math.max(...ys); y += spacing) {
    for (let x = Math.min(...xs) + spacing / 2; x < Math.max(...xs); x += spacing) {
      if (pointInPolygon([x, y], footprint)) inside.push({ point: [x, y], edge: distanceToRing(x, y, footprint) })
    }
  }
  // Narrow buildings have nothing 1.5 m from every wall; halve the inset rather than give up.
  for (const inset of [EDGE_INSET_M, EDGE_INSET_M / 2]) {
    const kept = inside.filter((entry) => entry.edge >= inset)
    if (kept.length >= MIN_SAMPLES * 1.5) return kept.map((entry) => entry.point)
  }
  return inside.map((entry) => entry.point)
}

type Axis = { readonly along: Vec2; readonly across: Vec2 }

/** The two directions of the footprint's minimum-area bounding rectangle. */
function boxAxes(footprint: readonly Vec2[]): [Axis, Axis] {
  let best: { area: number; along: Vec2 } = { area: Infinity, along: [1, 0] }
  footprint.forEach((a, index) => {
    const b = footprint[(index + 1) % footprint.length]
    if (!b) return
    const length = Math.hypot(b[0] - a[0], b[1] - a[1])
    if (length < 1e-6) return
    const ux = (b[0] - a[0]) / length
    const uy = (b[1] - a[1]) / length
    const u = footprint.map(([x, y]) => x * ux + y * uy)
    const v = footprint.map(([x, y]) => -x * uy + y * ux)
    const area = (Math.max(...u) - Math.min(...u)) * (Math.max(...v) - Math.min(...v))
    if (area < best.area) best = { area, along: [ux, uy] }
  })
  const [ux, uy] = best.along
  return [
    { along: [ux, uy], across: [-uy, ux] },
    { along: [-uy, ux], across: [-ux, -uy] },
  ]
}

type Measured = { readonly x: number; readonly y: number; readonly z: number }
type Gable = { readonly axis: Axis; readonly offset: number; readonly ridgeHeight: number; readonly slope: number; readonly rmse: number }

/** Least-squares `z = ridgeHeight − slope × |distance from ridge|` over both box axes and 17 ridge offsets. */
function bestGable(samples: readonly Measured[], footprint: readonly Vec2[]): Gable | null {
  let best: Gable | null = null
  for (const axis of boxAxes(footprint)) {
    const span = footprint.map(([x, y]) => x * axis.across[0] + y * axis.across[1])
    const min = Math.min(...span)
    const width = Math.max(...span) - min
    if (width < 2) continue
    // Offsets run wall to wall, so a single-slope (skillion) roof fits as a gable with its ridge on one wall.
    for (let step = 0; step <= 16; step += 1) {
      const offset = min + (width * step) / 16
      const t = samples.map((sample) => Math.abs(sample.x * axis.across[0] + sample.y * axis.across[1] - offset))
      const meanT = t.reduce((sum, value) => sum + value, 0) / t.length
      const meanZ = samples.reduce((sum, sample) => sum + sample.z, 0) / samples.length
      let covariance = 0
      let variance = 0
      samples.forEach((sample, index) => {
        covariance += ((t[index] ?? 0) - meanT) * (sample.z - meanZ)
        variance += ((t[index] ?? 0) - meanT) ** 2
      })
      if (variance < 1e-9) continue
      const slope = -covariance / variance
      if (!(slope > 0)) continue
      const ridgeHeight = meanZ + slope * meanT
      let squared = 0
      samples.forEach((sample, index) => {
        squared += (sample.z - (ridgeHeight - slope * (t[index] ?? 0))) ** 2
      })
      const rmse = Math.sqrt(squared / samples.length)
      if (!best || rmse < best.rmse) best = { axis, offset, ridgeHeight, slope, rmse }
    }
  }
  return best
}

const residual = (gable: Gable, sample: Measured) =>
  sample.z - (gable.ridgeHeight - gable.slope * Math.abs(sample.x * gable.axis.across[0] + sample.y * gable.axis.across[1] - gable.offset))

export function fitRoof(footprint: readonly Vec2[], samples: readonly RoofSample[]): RoofFit | null {
  const roofHits = samples.flatMap((sample): Measured[] =>
    sample.z !== null && Number.isFinite(sample.z) && sample.z >= GROUND_MAX_M ? [{ x: sample.x, y: sample.y, z: sample.z }] : [],
  )
  // Mostly ground: the footprint and the surface model disagree (new, demolished or a courtyard block).
  if (roofHits.length < MIN_SAMPLES || roofHits.length < samples.length * 0.6) return null
  const heights = roofHits.map((sample) => sample.z).sort((a, b) => a - b)
  const at = (share: number) => heights[Math.min(heights.length - 1, Math.floor(heights.length * share))] ?? 0
  const median = at(0.5)
  if (median < 2.5) return null
  // The gable is tried first: a low roof on a small building has little spread but a clean slope.
  const spreadM = at(0.9) - at(0.1)
  const level: RoofFit = { kind: 'flat', height: round(median, 1) }
  const unclear: RoofFit = spreadM <= FLAT_SPREAD_M ? level : { kind: 'complex', height: round(median, 1) }

  let gable = bestGable(roofHits, footprint)
  if (!gable) return unclear
  // One trimming pass: chimneys, dormers and overhanging trees should not tilt the roof.
  const first = gable
  const limit = Math.max(1, 2 * first.rmse)
  const trimmed = roofHits.filter((sample) => Math.abs(residual(first, sample)) <= limit)
  const used = trimmed.length >= roofHits.length * 0.8 && trimmed.length >= MIN_SAMPLES ? trimmed : roofHits
  if (used !== roofHits) gable = bestGable(used, footprint) ?? first

  const mean = used.reduce((sum, sample) => sum + sample.z, 0) / used.length
  const deviation = Math.sqrt(used.reduce((sum, sample) => sum + (sample.z - mean) ** 2, 0) / used.length)
  const pitchDeg = round((Math.atan(gable.slope) * 180) / Math.PI, 1)
  if (pitchDeg < FIT_MIN_PITCH_DEG) return spreadM <= LOW_SLOPE_SPREAD_M ? level : unclear
  if (pitchDeg > FIT_MAX_PITCH_DEG) return unclear
  if (gable.rmse > GABLE_MAX_RMSE_M || gable.rmse > GABLE_MAX_RMSE_SHARE * deviation) return unclear

  const { along, across } = gable.axis
  const reach = footprint.map(([x, y]) => x * along[0] + y * along[1])
  const end = (distance: number): Vec2 => [
    round(across[0] * gable.offset + along[0] * distance, 2),
    round(across[1] * gable.offset + along[1] * distance, 2),
  ]
  const roof: Roof = {
    shape: 'gabled',
    ridge: [end(Math.min(...reach)), end(Math.max(...reach))],
    ridgeHeight: round(gable.ridgeHeight, 2),
    pitchDeg,
  }
  if (roofEaveMin(footprint, roof) < ROOF_MIN_EAVE_M) return unclear
  // The flat-extrusion analyses (sun, wind, noise) use one height per building: the mean roof height.
  const height = samples.reduce((sum, sample) => sum + roofHeightAt(roof, sample.x, sample.y), 0) / samples.length
  return { kind: 'gabled', height: round(height, 1), roof }
}
