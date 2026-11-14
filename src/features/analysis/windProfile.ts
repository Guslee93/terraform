import type { FootprintBuilding } from './grid'

/** The lift reaches at least this high (m), and the tallest roof plus `LIFT_CLEARANCE_M` beyond it. */
export const MIN_LIFT_TOP_M = 30
/** Headroom above the tallest roof (m), so the open flow over every roof can be seen. */
export const LIFT_CLEARANCE_M = 5
/** No lift above this (m), however tall the buildings. */
export const MAX_LIFT_TOP_M = 120

/**
 * The top of the lift for a building set (ADR-0029): 5 m above the tallest roof, at least 30 m,
 * at most 120 m. The map can be lifted to any whole metre from 2 m up to here.
 */
export function liftTop(buildings: readonly FootprintBuilding[]): number {
  const tallest = buildings.reduce((max, b) => Math.max(max, b.height), 0)
  return Math.min(MAX_LIFT_TOP_M, Math.max(MIN_LIFT_TOP_M, Math.ceil(tallest) + LIFT_CLEARANCE_M))
}

/**
 * The heights the solver solves (ADR-0029): 2 m, then each whole metre where a roof ends — the
 * only heights where the set of buildings blocking the wind changes. A building blocks a slice
 * when it is taller than the slice (`sliceObstacles`), so a roof at 12.4 m stops blocking at 13 m.
 * Between two of these heights the obstacles are the same, so the flow there is the solve below
 * scaled by the wind profile — exact within this model, nothing interpolated.
 */
export function sliceHeightsFor(buildings: readonly FootprintBuilding[]): number[] {
  const top = liftTop(buildings)
  const breaks = new Set<number>()
  for (const building of buildings) {
    const h = Math.ceil(building.height)
    if (h > 2 && h <= top) breaks.add(h)
  }
  return [2, ...[...breaks].sort((a, b) => a - b)]
}

/** The solved height whose flow covers `z`: the highest of `heights` (ascending, from 2 m) at or below it. */
export function coveringHeight(heights: readonly number[], z: number): number {
  let covering = heights[0] ?? 2
  for (const h of heights) if (h <= z) covering = h
  return covering
}

/**
 * Buildings that can touch a solve frame: the footprint's bounding box comes within the frame's
 * half-diagonal of its centre (a conservative circle, since the frame turns with the wind; a long
 * building crossing it with no corner inside still counts). Roofs outside it cannot change the
 * flow inside, so they add no solve height.
 */
export function buildingsNearFrame<T extends FootprintBuilding>(buildings: readonly T[], centre: readonly [number, number], halfDiagonal: number): T[] {
  const [cx, cy] = centre
  return buildings.filter((b) => {
    const xs = b.footprint.map((p) => p[0]), ys = b.footprint.map((p) => p[1])
    const nx = Math.max(Math.min(...xs), Math.min(cx, Math.max(...xs)))
    const ny = Math.max(Math.min(...ys), Math.min(cy, Math.max(...ys)))
    return (nx - cx) ** 2 + (ny - cy) ** 2 <= halfDiagonal * halfDiagonal
  })
}
/** Indicative urban power law, not a measured site wind profile. */
export const ALPHA = 0.22

export function profileFactor(z: number): number {
  return (z / 10) ** ALPHA
}

export function sliceObstacles(buildings: readonly FootprintBuilding[], z: number): FootprintBuilding[] {
  return buildings.filter((building) => building.height > z)
}
