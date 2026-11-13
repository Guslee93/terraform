import type { Vec2 } from '../../lib/coordinates'
import { PEDESTRIAN_HEIGHT_M } from './climateView'

/**
 * The wind lift (ADR-0028 phase 3): renderer-free rules for the handle, the stepped height control,
 * the dashed rings at the other heights and the buildings that fade below the lifted disc.
 */

/** The solved height nearest `z` (ties go to the lower one); the disc only ever rests on these. */
export function nearestHeight(z: number, heights: readonly number[]): number {
  if (heights.length === 0) return PEDESTRIAN_HEIGHT_M
  return heights.reduce((best, h) => (Math.abs(h - z) < Math.abs(best - z) ? h : best), heights[0]!)
}

/** A dragged height kept between the lowest and the highest solved height. */
export function clampLift(z: number, heights: readonly number[]): number {
  if (heights.length === 0) return PEDESTRIAN_HEIGHT_M
  return Math.min(Math.max(z, Math.min(...heights)), Math.max(...heights))
}

/** The next solved height up (`step` 1) or down (`step` −1), staying at the ends. */
export function stepHeight(current: number, heights: readonly number[], step: 1 | -1): number {
  const sorted = [...heights].sort((a, b) => a - b)
  const index = sorted.indexOf(nearestHeight(current, sorted))
  return sorted[Math.min(sorted.length - 1, Math.max(0, index + step))] ?? current
}

/**
 * Where the handle sits: the point of the circle's edge nearest the viewer, in plan. A viewer
 * straight above the centre has no nearest edge; the handle then sits on the south edge.
 */
export function liftAnchor(centre: Vec2, radius: number, viewer: Vec2): Vec2 {
  const dx = viewer[0] - centre[0], dy = viewer[1] - centre[1]
  const length = Math.hypot(dx, dy)
  if (length < 1e-6) return [centre[0], centre[1] - radius]
  return [centre[0] + (dx / length) * radius, centre[1] + (dy / length) * radius]
}

/**
 * The other solved heights, drawn as dashed rings while the disc is lifted or being dragged. At
 * rest on the ground there is nothing to compare against, so no rings.
 */
export function ghostHeights(heights: readonly number[], current: number, dragging: boolean): number[] {
  if (!dragging && current <= PEDESTRIAN_HEIGHT_M) return []
  return heights.filter((h) => h !== current)
}

type Footprinted = { readonly height: number; readonly footprint: readonly (readonly [number, number])[] }

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

/**
 * Buildings that fade while the disc is lifted: touching the analysis circle and no taller than
 * the shown slice, because at that height they no longer block the wind (`sliceObstacles` keeps
 * only buildings taller than the slice). Nothing fades at 2 m.
 */
export function fadedBuildings(buildings: readonly Footprinted[], circle: { readonly centre: Vec2; readonly radius: number }, heightM: number): Set<number> {
  const faded = new Set<number>()
  if (heightM <= PEDESTRIAN_HEIGHT_M) return faded
  buildings.forEach((building, index) => {
    if (building.height <= heightM && footprintTouchesCircle(building.footprint, circle.centre, circle.radius)) faded.add(index)
  })
  return faded
}

/** The spoken value of a height stop. */
export const heightText = (z: number) => `${z} metres above terrain`
