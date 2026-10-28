import type { Vec2 } from './coordinates'

/**
 * Footprint bounding dimensions (status report §15.3b D9).
 *
 * `footprintDimensions` returns the minimum-area axis-aligned-in-model-frame
 * bounding rectangle of a footprint ring, found by testing the direction of
 * every convex-hull edge (rotating-calipers theorem: an optimal rectangle
 * always has one side flush with a hull edge). O(h × n) for a hull of h edges
 * and n vertices; fine for the ≤ 200-vertex v1 footprint budget.
 *
 * Axes follow the local ENU frame (east = +x, north = +y, ADR-0002):
 * - `width` ≥ `depth`; the width axis is the bounding rectangle's long side.
 * - `rotation` is the angle of the width axis from east, counter-clockwise,
 *   normalised to `[0, π)`.
 * - Area ties resolve to the smallest rotation.
 *
 * Pure module: no React or Three.js types.
 */

export type FootprintDimensions = {
  width: number
  depth: number
  rotation: number
}

const EPSILON = 1e-9

/** Twice the signed area of triangle (o, a, b); positive = counter-clockwise. */
function cross(o: Vec2, a: Vec2, b: Vec2): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
}

/** Convex hull (Andrew's monotone chain); collinear points are dropped. */
function convexHull(vertices: readonly Vec2[]): Vec2[] {
  const points = [...vertices].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  if (points.length <= 1) return points

  const lower: Vec2[] = []
  for (const point of points) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2]!, lower[lower.length - 1]!, point) <= 0
    ) {
      lower.pop()
    }
    lower.push(point)
  }

  const upper: Vec2[] = []
  for (let index = points.length - 1; index >= 0; index -= 1) {
    const point = points[index]!
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2]!, upper[upper.length - 1]!, point) <= 0
    ) {
      upper.pop()
    }
    upper.push(point)
  }

  // The first/last points repeat; drop them and join the two chains.
  lower.pop()
  upper.pop()
  return [...lower, ...upper]
}

/** Wrap an angle into `[0, π)`. */
function normalizeAngle(angle: number): number {
  const wrapped = angle % (2 * Math.PI)
  const positive = wrapped < 0 ? wrapped + 2 * Math.PI : wrapped
  return positive >= Math.PI ? positive - Math.PI : positive
}

/**
 * Minimum-area bounding rectangle of a footprint.
 *
 * Fewer than 3 vertices (or a ring whose hull is a point or a line) yields
 * `{ width: 0, depth: 0, rotation: 0 }`.
 */
export function footprintDimensions(vertices: readonly Vec2[]): FootprintDimensions {
  const ZERO: FootprintDimensions = { width: 0, depth: 0, rotation: 0 }
  if (vertices.length < 3) return ZERO

  const hull = convexHull(vertices)
  if (hull.length < 3) return ZERO

  let best: FootprintDimensions | null = null
  let bestArea = Number.POSITIVE_INFINITY

  for (let edge = 0; edge < hull.length; edge += 1) {
    const start = hull[edge]!
    const end = hull[(edge + 1) % hull.length]!
    const dx = end[0] - start[0]
    const dy = end[1] - start[1]
    if (Math.hypot(dx, dy) <= EPSILON) continue

    // Project every hull vertex onto the edge axis and its perpendicular.
    const edgeAngle = Math.atan2(dy, dx)
    const cos = Math.cos(edgeAngle)
    const sin = Math.sin(edgeAngle)
    let minAlong = Number.POSITIVE_INFINITY
    let maxAlong = Number.NEGATIVE_INFINITY
    let minAcross = Number.POSITIVE_INFINITY
    let maxAcross = Number.NEGATIVE_INFINITY
    for (const [east, north] of hull) {
      const along = east * cos + north * sin
      const across = -east * sin + north * cos
      minAlong = Math.min(minAlong, along)
      maxAlong = Math.max(maxAlong, along)
      minAcross = Math.min(minAcross, across)
      maxAcross = Math.max(maxAcross, across)
    }

    const extentAlong = maxAlong - minAlong
    const extentAcross = maxAcross - minAcross
    // The long side is the width axis; rotation always refers to that axis.
    const width = Math.max(extentAlong, extentAcross)
    const depth = Math.min(extentAlong, extentAcross)
    const widthAngle =
      extentAlong >= extentAcross ? edgeAngle : edgeAngle + Math.PI / 2
    const rotation = normalizeAngle(widthAngle)
    const area = width * depth

    if (
      best === null ||
      area < bestArea - EPSILON ||
      (Math.abs(area - bestArea) <= EPSILON && rotation < best.rotation - EPSILON)
    ) {
      best = { width, depth, rotation }
      bestArea = area
    }
  }

  return best ?? ZERO
}