import type { Vec2 } from './coordinates'

/** Planar helpers for open rings in local metres. The closing vertex is not stored. */

export function signedArea(points: readonly Vec2[]): number {
  const count = points.length
  if (count < 3) return 0
  let area = 0
  for (let index = 0; index < count; index += 1) {
    const current = points[index]
    const next = points[(index + 1) % count]
    if (!current || !next) continue
    area += current[0] * next[1] - next[0] * current[1]
  }
  return area / 2
}

export function polygonArea(points: readonly Vec2[]): number {
  return Math.abs(signedArea(points))
}

export function ringIsClosed(points: readonly Vec2[]): boolean {
  const first = points[0]
  const last = points[points.length - 1]
  return Boolean(first && last && first[0] === last[0] && first[1] === last[1])
}

export function normalizeRing(points: readonly Vec2[]): Vec2[] {
  const cleaned: Vec2[] = []
  for (const point of points) {
    const previous = cleaned[cleaned.length - 1]
    if (!previous || previous[0] !== point[0] || previous[1] !== point[1]) {
      cleaned.push([point[0], point[1]])
    }
  }
  if (cleaned.length > 1 && ringIsClosed(cleaned)) cleaned.pop()
  if (cleaned.length < 3) return []
  if (signedArea(cleaned) < 0) cleaned.reverse()
  return cleaned
}

function orientation(a: Vec2, b: Vec2, c: Vec2): number {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
}

/** True when p lies on the closed segment a–b (exact arithmetic, no tolerance). */
function pointOnSegment(p: Vec2, a: Vec2, b: Vec2): boolean {
  return (
    orientation(a, b, p) === 0 &&
    p[0] >= Math.min(a[0], b[0]) &&
    p[0] <= Math.max(a[0], b[0]) &&
    p[1] >= Math.min(a[1], b[1]) &&
    p[1] <= Math.max(a[1], b[1])
  )
}

/** Rejects crossings, collinear overlaps, vertex-on-edge touches and fold-backs. */
export function isSimpleRing(points: readonly Vec2[]): boolean {
  const count = points.length
  if (count < 3) return false
  for (let index = 0; index < count; index += 1) {
    const point = points[index]
    const next = points[(index + 1) % count]
    if (!point || !next || (point[0] === next[0] && point[1] === next[1])) return false
  }
  for (let i = 0; i < count; i += 1) {
    const a = points[i]
    const b = points[(i + 1) % count]
    if (!a || !b) continue
    for (let j = i + 1; j < count; j += 1) {
      const c = points[j]
      const d = points[(j + 1) % count]
      if (!c || !d) continue
      // Adjacent edges share one vertex; they may only meet there.
      if (j === i + 1) {
        if (pointOnSegment(d, a, b) || pointOnSegment(a, c, d)) return false
        continue
      }
      if ((j + 1) % count === i) {
        if (pointOnSegment(c, a, b) || pointOnSegment(b, c, d)) return false
        continue
      }
      const o1 = orientation(a, b, c)
      const o2 = orientation(a, b, d)
      const o3 = orientation(c, d, a)
      const o4 = orientation(c, d, b)
      if (
        ((o1 > 0 && o2 < 0) || (o1 < 0 && o2 > 0)) &&
        ((o3 > 0 && o4 < 0) || (o3 < 0 && o4 > 0))
      ) {
        return false
      }
      if (
        pointOnSegment(c, a, b) ||
        pointOnSegment(d, a, b) ||
        pointOnSegment(a, c, d) ||
        pointOnSegment(b, c, d)
      ) {
        return false
      }
    }
  }
  return true
}

export function pointInPolygon(point: Vec2, polygon: readonly Vec2[]): boolean {
  let inside = false
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const a = polygon[index]
    const b = polygon[previous]
    if (!a || !b) continue
    const intersects =
      a[1] > point[1] !== b[1] > point[1] &&
      point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1] || Number.EPSILON) + a[0]
    if (intersects) inside = !inside
  }
  return inside
}

export function ringCentroid(points: readonly Vec2[]): Vec2 {
  if (points.length === 0) return [0, 0]
  let east = 0
  let north = 0
  for (const point of points) {
    east += point[0]
    north += point[1]
  }
  return [east / points.length, north / points.length]
}

export function translateRing(points: readonly Vec2[], east: number, north: number): Vec2[] {
  return points.map(([x, y]) => [x + east, y + north] as const)
}

export function rotateRing(points: readonly Vec2[], radians: number, origin?: Vec2): Vec2[] {
  const pivot = origin ?? ringCentroid(points)
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  return points.map(([x, y]) => {
    const dx = x - pivot[0]
    const dy = y - pivot[1]
    return [pivot[0] + dx * cos - dy * sin, pivot[1] + dx * sin + dy * cos] as const
  })
}
