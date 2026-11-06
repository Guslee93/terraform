import type { FootprintBuilding } from './grid'

export const SLICE_HEIGHTS_M = [2, 10, 20, 35] as const
/** Highest extra slice for tall buildings (m); taller roofs use this one. */
export const MAX_TOP_SLICE_M = 120

/**
 * The slice heights for a building set: the standard four, plus one top slice just above the
 * tallest building when it exceeds 35 m (rounded up to 5 m, +5 m clearance, capped at 120 m),
 * so tall roofs get a colour. Curated sites (all ≤ 35 m) keep exactly the standard four.
 */
export function sliceHeightsFor(buildings: readonly FootprintBuilding[]): number[] {
  const tallest = buildings.reduce((max, b) => Math.max(max, b.height), 0)
  const top = SLICE_HEIGHTS_M[3]
  if (tallest <= top) return [...SLICE_HEIGHTS_M]
  return [...SLICE_HEIGHTS_M, Math.min(MAX_TOP_SLICE_M, Math.ceil((tallest + 5) / 5) * 5)]
}
/** Indicative urban power law, not a measured site wind profile. */
export const ALPHA = 0.22

export function profileFactor(z: number): number {
  return (z / 10) ** ALPHA
}

export function sliceObstacles(buildings: readonly FootprintBuilding[], z: number): FootprintBuilding[] {
  return buildings.filter((building) => building.height > z)
}
