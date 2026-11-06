import type { FootprintBuilding } from './grid'

export const SLICE_HEIGHTS_M = [2, 10, 20, 35] as const
/** Indicative urban power law, not a measured site wind profile. */
export const ALPHA = 0.22

export function profileFactor(z: number): number {
  return (z / 10) ** ALPHA
}

export function sliceObstacles(buildings: readonly FootprintBuilding[], z: number): FootprintBuilding[] {
  return buildings.filter((building) => building.height > z)
}
