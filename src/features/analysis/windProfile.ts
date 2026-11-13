import type { FootprintBuilding } from './grid'

/** Standard slice heights above terrain (m), ADR-0028. The disc snaps to these only. */
export const SLICE_HEIGHTS_M = [2, 5, 10, 15, 20, 25, 30] as const
/** Highest extra slice for tall buildings (m); taller roofs use this one. */
export const MAX_TOP_SLICE_M = 120

/**
 * The slice heights for a building set: the standard seven, plus one top slice just above the
 * tallest building when it exceeds the highest standard slice, 30 m (rounded up to 5 m, +5 m
 * clearance, capped at 120 m), so tall roofs get a colour (ADR-0028).
 */
export function sliceHeightsFor(buildings: readonly FootprintBuilding[]): number[] {
  const tallest = buildings.reduce((max, b) => Math.max(max, b.height), 0)
  const top = Math.max(...SLICE_HEIGHTS_M)
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
