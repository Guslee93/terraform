import type { Vec2 } from '../../lib/coordinates'

/** The analysis circle the wind and sun-hours analyses share (ADR-0031): local ENU centre, radius in metres. */
export type AnalysisCircle = { readonly centre: Vec2; readonly radius: number }

export const insideCircle = (x: number, y: number, circle: AnalysisCircle) =>
  (x - circle.centre[0]) ** 2 + (y - circle.centre[1]) ** 2 <= circle.radius * circle.radius

/**
 * Whether a footprint touches the circle: a corner inside it, an edge passing within the radius
 * (a long building crossing the rim with no corner inside), or the circle centre inside the footprint.
 */
export function footprintTouchesCircle(footprint: readonly (readonly [number, number])[], centre: Vec2, radius: number): boolean {
  const [cx, cy] = centre, r2 = radius * radius
  let inside = false
  for (let i = 0, j = footprint.length - 1; i < footprint.length; j = i++) {
    const [ax, ay] = footprint[j]!, [bx, by] = footprint[i]!
    // Closest point of edge a→b to the centre.
    const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((cx - ax) * dx + (cy - ay) * dy) / len2))
    if ((ax + t * dx - cx) ** 2 + (ay + t * dy - cy) ** 2 <= r2) return true
    // Even-odd ray cast for the centre inside the footprint.
    if ((ay > cy) !== (by > cy) && cx < ax + ((cy - ay) / (by - ay)) * dx) inside = !inside
  }
  return inside
}

