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
 * The heights the solver solves. First (ADR-0029) 2 m and each whole metre where a roof ends —
 * where the set of buildings blocking the wind changes. A building blocks a slice when it is
 * taller than the slice (`sliceObstacles`), so a roof at 12.4 m stops blocking at 13 m.
 *
 * Then (ADR-0030) within each band between two of those, where the blocking buildings stay the
 * same, the whole metres where the gap up to their median roof has halved, down to a 1 m gap: the
 * refill length a solve uses (`refillLength`) is then at most twice the one at any metre it covers
 * with a gap of 1 m or more. Under a 1 m gap the refill length is under about 8 m, two cells of the
 * upper-slice grid. Bands deep under the roofs, where the refill barely acts, add few solves; the
 * metres just under a roof add the most. The 2 m solve has no refill (the pedestrian field), and
 * covers only metres at least half as far below the roofs as 2 m itself.
 *
 * Every metre between two solves is the solve below scaled by the wind profile; nothing is
 * interpolated between two solves.
 */
export function sliceHeightsFor(buildings: readonly FootprintBuilding[]): number[] {
  const top = liftTop(buildings)
  const breaks = new Set<number>()
  for (const building of buildings) {
    const h = Math.ceil(building.height)
    if (h > 2 && h <= top) breaks.add(h)
  }
  const bands = [2, ...[...breaks].sort((a, b) => a - b)]
  const heights = new Set(bands)
  bands.forEach((bottom, i) => {
    const end = bands[i + 1] ?? top + 1
    const roof = medianRoofAbove(buildings, bottom)
    if (roof === null) return
    for (let gap = (roof - bottom) / 2; gap >= 1; gap /= 2) {
      const z = Math.ceil(roof - gap)
      if (z > bottom && z < end) heights.add(z)
    }
  })
  return [...heights].sort((a, b) => a - b)
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
/**
 * Vertical turbulence intensity σw/U near roof level, for the refill rule (ADR-0030). Urban field
 * and wind-tunnel studies put it at about 0.1–0.25 in the roughness sublayer; the low end is used,
 * so a wake refills no sooner than the slow end of that range.
 */
export const VERTICAL_TURBULENCE_INTENSITY = 0.12

/**
 * How far downwind (m) a wake in the slice solved at `z` refills with air from above (ADR-0030):
 * the gap from the slice up to the roofs that cast its wakes — the median roof among the buildings
 * still taller than the slice — over the vertical turbulence intensity. A slice just under the
 * roofs refills within metres; one deep below them barely at all. Null when nothing is taller than
 * the slice: there is no wake to refill. Every metre the solve covers shares this length, so a
 * wake is never shorter than at the bottom of its band of heights.
 */
export function refillLength(buildings: readonly FootprintBuilding[], z: number): number | null {
  const roof = medianRoofAbove(buildings, z)
  return roof === null ? null : (roof - z) / VERTICAL_TURBULENCE_INTENSITY
}

/** The median roof height of the buildings taller than `z`, or null when none is. */
export function medianRoofAbove(buildings: readonly FootprintBuilding[], z: number): number | null {
  const roofs = sliceObstacles(buildings, z).map((b) => b.height).sort((a, b) => a - b)
  if (roofs.length === 0) return null
  const mid = roofs.length >> 1
  return roofs.length % 2 ? roofs[mid]! : (roofs[mid - 1]! + roofs[mid]!) / 2
}

/** Indicative urban power law, not a measured site wind profile. */
export const ALPHA = 0.22

export function profileFactor(z: number): number {
  return (z / 10) ** ALPHA
}

export function sliceObstacles(buildings: readonly FootprintBuilding[], z: number): FootprintBuilding[] {
  return buildings.filter((building) => building.height > z)
}
