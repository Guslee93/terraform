import type { Vec2 } from '../../lib/coordinates'
import { PEDESTRIAN_HEIGHT_M } from './climateView'
import type { FlowResult } from './flowRunner'
import { MIN_LIFT_TOP_M } from './windProfile'
import { footprintTouchesCircle } from './circle'

export { footprintTouchesCircle }

/** Every whole metre from 2 m to `top`. */
const metres = (top: number) => Array.from({ length: Math.max(0, top - PEDESTRIAN_HEIGHT_M + 1) }, (_, i) => PEDESTRIAN_HEIGHT_M + i)

/** Every height the map can be lifted to for this flow: each whole metre from 2 m to the lift top (ADR-0029). */
export function liftHeights(flow: FlowResult | null): number[] {
  return metres(flow?.liftTopM ?? MIN_LIFT_TOP_M)
}

/**
 * The heights ready to show: slices are solved bottom-up, so every metre below the first unsolved
 * slice height is ready — right after the ground solve, everything up to the first roof. All of
 * them once the stack is complete; only 2 m without a stack.
 */
export function readyLiftHeights(flow: FlowResult | null): number[] {
  if (!flow?.slices?.length || !flow.sliceHeights) return [PEDESTRIAN_HEIGHT_M]
  const top = flow.liftTopM ?? MIN_LIFT_TOP_M
  const next = flow.sliceHeights[flow.slices.length]
  return metres(next === undefined ? top : Math.min(top, next - 1))
}

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
 * Dashed rings that show the scale of the stack the disc moves through: 2 m and every 5 m among
 * the ready heights (a ring per metre would be a blur), while the disc is lifted or being dragged.
 * At rest on the ground there is nothing to compare against, so no rings.
 */
export function ghostHeights(heights: readonly number[], current: number, dragging: boolean): number[] {
  if (!dragging && current <= PEDESTRIAN_HEIGHT_M) return []
  return heights.filter((h) => h !== current && (h === PEDESTRIAN_HEIGHT_M || h % 5 === 0))
}

type Footprinted = { readonly height: number; readonly footprint: readonly (readonly [number, number])[] }

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

/**
 * How the moving air is drawn. Above 2 m — or while the disc is being lifted — it is always the
 * particle animation the ground shows, at the disc's height: the owner's call (2026-11-13), and the
 * long 3D streamlines are a pedestrian-height view. At rest on 2 m the existing choice stands:
 * streamlines when switched on or under reduced motion, particles otherwise.
 */
export function windFlowStyle({ lifted, streamlinesOn, reducedMotion }: { lifted: boolean; streamlinesOn: boolean; reducedMotion: boolean }): 'particles' | 'streamlines' {
  if (lifted) return 'particles'
  return streamlinesOn || reducedMotion ? 'streamlines' : 'particles'
}

/** The spoken value of a height stop. */
export const heightText = (z: number) => `${z} metres above terrain`
