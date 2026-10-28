import { enuToThreeXyz, type ThreeVec3 } from '../lib/coordinates'

/** Default sun until M3 feeds a real Oslo sun: south-west, 35° up, so two façades read lit/unlit. */
export const DEFAULT_SUN = { azimuthDeg: 225, elevationDeg: 35 } as const

/**
 * Directional-light position for a sun at the given azimuth (degrees clockwise from north)
 * and elevation, `distance` metres from the origin, in the renderer frame.
 */
export function sunPosition(azimuthDeg: number, elevationDeg: number, distance: number): ThreeVec3 {
  const azimuth = (azimuthDeg * Math.PI) / 180
  const elevation = (elevationDeg * Math.PI) / 180
  const horizontal = Math.cos(elevation) * distance
  return enuToThreeXyz([
    Math.sin(azimuth) * horizontal,
    Math.cos(azimuth) * horizontal,
    Math.sin(elevation) * distance,
  ])
}
