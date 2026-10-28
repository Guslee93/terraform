import type { Vec2 } from './coordinates'
import { pointInPolygon } from './polygon'

/**
 * Filter points that fall outside all given rings (polygons).
 * A point on a ring edge is treated as inside (removed).
 * Input order is preserved.
 *
 * @param points  — input points in reading order
 * @param rings   — zero or more closed rings (closing vertex optional)
 * @returns       points that are outside every ring
 */
export function pointsOutsideRings(
  points: readonly Vec2[],
  rings: readonly (readonly Vec2[])[],
): Vec2[] {
  if (rings.length === 0) return [...points]
  return points.filter((point) =>
    rings.every((ring) => !pointInPolygon(point, ring)),
  )
}