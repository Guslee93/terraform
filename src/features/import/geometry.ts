import { featureCollection, polygon, simplify, union, unkinkPolygon } from '@turf/turf'
import type { Geometry, Position } from 'geojson'
import { isSimpleRing, normalizeRing, polygonArea } from '../../lib/polygon'
import type { Bounds, Origin } from './frame'
import { project } from './projection'
export type Point2 = [number, number]
export type Ring = Point2[]
const same = (a: Point2, b: Point2) => a[0] === b[0] && a[1] === b[1]
export const ringArea = polygonArea
export function toRing(points: readonly Position[]): Ring {
  return points.map((point) => {
    const [x, y] = point
    if (x === undefined || y === undefined || !Number.isFinite(x) || !Number.isFinite(y)) throw new Error('Invalid geometry coordinate')
    return [x, y]
  })
}
export function outerRings(geometry: Geometry): Ring[] {
  const rings = geometry.type === 'Polygon' ? [geometry.coordinates[0]] : geometry.type === 'MultiPolygon' ? geometry.coordinates.map((p) => p[0]) : []
  return rings.flatMap((r) => r ? [toRing(r)] : [])
}
export function toLocal(points: readonly Position[], origin: Origin): Ring {
  return toRing(points).map(([lon, lat]) => {
    const [x, y] = project(lat, lon, origin.latitude, origin.longitude)
    return [Number(x.toFixed(7)), Number(y.toFixed(7))]
  })
}
function openRing(points: Ring): Ring {
  const ring = points.filter((p, i) => i === 0 || !same(p, points[i - 1]!))
  if (ring.length > 1 && same(ring[0]!, ring[ring.length - 1]!)) ring.pop()
  return ring
}
/** Sutherland–Hodgman; open output. Repair afterwards if a concavity splits. */
export function clipRing(points: Ring, extent: Bounds): Ring {
  let ring = openRing(points)
  const edges: [0 | 1, number, number][] = [[0, extent[0], 1], [0, extent[2], -1], [1, extent[1], 1], [1, extent[3], -1]]
  for (const [axis, boundary, direction] of edges) {
    if (!ring.length) break
    const clipped: Ring = []
    let previous = ring[ring.length - 1]!
    let previousInside = direction * (previous[axis] - boundary) >= 0
    for (const current of ring) {
      const currentInside = direction * (current[axis] - boundary) >= 0
      if (currentInside !== previousInside) {
        const fraction = (boundary - previous[axis]) / (current[axis] - previous[axis])
        const other = axis === 0 ? 1 : 0
        const point: Point2 = [0, 0]
        point[axis] = boundary
        point[other] = previous[other] + fraction * (current[other] - previous[other])
        clipped.push(point)
      }
      if (currentInside) clipped.push(current)
      previous = current
      previousInside = currentInside
    }
    ring = openRing(clipped)
  }
  return ring.length >= 3 ? ring : []
}
function clipSegment(a: Point2, b: Point2, extent: Bounds): [Point2, Point2] | null {
  const [minX, minY, maxX, maxY] = extent
  const dx = b[0] - a[0], dy = b[1] - a[1]
  let t0 = 0, t1 = 1
  const tests: Point2[] = [[-dx, a[0] - minX], [dx, maxX - a[0]], [-dy, a[1] - minY], [dy, maxY - a[1]]]
  for (const [p, q] of tests) {
    if (p === 0) { if (q < 0) return null; continue }
    const t = q / p
    if (p < 0) t0 = Math.max(t0, t)
    else t1 = Math.min(t1, t)
    if (t0 > t1) return null
  }
  if (t0 === t1) return null
  return [[a[0] + dx * t0, a[1] + dy * t0], [a[0] + dx * t1, a[1] + dy * t1]]
}
/** Liang–Barsky, retaining disconnected line runs. */
export function clipPolyline(points: Ring, extent: Bounds): Ring[] {
  const runs: Ring[] = []
  let current: Ring = []
  for (let i = 1; i < points.length; i++) {
    const b = points[i]!
    const clipped = clipSegment(points[i - 1]!, b, extent)
    if (!clipped) {
      if (current.length >= 2) runs.push(current)
      current = []
      continue
    }
    const [start, end] = clipped
    const last = current[current.length - 1]
    if (last && Math.hypot(last[0] - start[0], last[1] - start[1]) < 1e-6) current.push(end)
    else { if (current.length >= 2) runs.push(current); current = [start, end] }
    if (!same(end, b)) { runs.push(current); current = [] }
  }
  if (current.length >= 2) runs.push(current)
  return runs
}
const closed = (ring: Ring) => [...ring, ring[0]!]
/**
 * Turn a polyline into a closed ribbon polygon of the given width, so a watercourse mapped
 * as a line can be drawn as a surface instead of being dropped.
 */
export function lineToRibbon(points: Ring, width: number): Ring {
  if (points.length < 2) return []
  const half = width / 2
  const left: Ring = []
  const right: Ring = []
  for (let i = 0; i < points.length; i++) {
    const [x, y] = points[i]!
    const before = points[i - 1] ?? points[i]!
    const after = points[i + 1] ?? points[i]!
    let dx = after[0] - before[0]
    let dy = after[1] - before[1]
    const length = Math.hypot(dx, dy)
    if (length < 1e-9) { dx = 1; dy = 0 } else { dx /= length; dy /= length }
    const nx = -dy * half, ny = dx * half
    left.push([x + nx, y + ny])
    right.push([x - nx, y - ny])
  }
  return [...left, ...right.reverse()]
}
export function simplifyRing(ring: Ring, tolerance = 0.3): Ring {
  if (ring.length < 3) return []
  return openRing(toRing(simplify(polygon([closed(ring)]), { tolerance, highQuality: true }).geometry.coordinates[0]!))
}
/** Planar union in local metres, including fragments within a single tile. */
export function mergeRings(rings: Ring[]): Ring[] {
  if (rings.length <= 1) return rings
  let result
  try {
    result = union(featureCollection(rings.map((ring) => polygon([closed(ring)]))))
  } catch {
    // ponytail: polyclip can fail numerically on many-part features (OSM 89997840 in the
    // Grünerløkka quick pick). The inputs are already repaired simple rings, so keep them
    // unmerged rather than failing the whole import; seam fragments then stay separate parts.
    return rings
  }
  if (!result) throw new Error('Building union returned empty geometry')
  return outerRings(result.geometry).map(openRing)
}
/** Never emit a ring that the existing building parser cannot accept. */
export function repairRing(points: Ring, minimumArea = 12): Ring[] {
  const ring = openRing(points)
  if (ring.length < 3) return []
  if (ring.some(point => !point.every(Number.isFinite))) throw new Error('Cannot repair nonfinite ring coordinates')
  const normalize = (r: Ring): Ring => normalizeRing(r).map(([x, y]) => [x, y])
  // unkink handles proper crossings. Sutherland–Hodgman can also leave a
  // doubled boundary bridge when clipping a U shape into disconnected parts.
  // Planar self-union removes those zero-width bridges and repeated touches,
  // which unkink either retains or rejects as duplicate vertices.
  const dissolve = (r: Ring): Ring[] => {
    const shape = polygon([closed(openRing(r))])
    const result = union(featureCollection([shape, shape]))
    return result ? outerRings(result.geometry).map(normalize) : []
  }
  let candidates: Ring[]
  if (isSimpleRing(ring)) candidates = [ring]
  else {
    try { candidates = unkinkPolygon(polygon([closed(ring)])).features.flatMap(f => outerRings(f.geometry)) }
    catch { candidates = dissolve(ring) }
  }
  return candidates.map(normalize).flatMap(r => isSimpleRing(r) ? [r] : dissolve(r)).filter(r => {
    if (ringArea(r) === 0 || ringArea(r) < minimumArea) return false
    if (!isSimpleRing(r)) throw new Error('Ring repair could not produce a simple polygon')
    return true
  })
}
