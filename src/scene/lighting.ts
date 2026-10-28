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

export type ShadowFrustum = { halfExtent: number; near: number; far: number; distance: number }

/** Clearance (m) between the shadow camera and the nearest point it must cover. */
const SHADOW_NEAR_MARGIN = 20

/**
 * Orthographic shadow camera that just covers a site of `horizontalRadius` metres around the
 * origin whose geometry stays within `verticalExtent` metres of z = 0. Every receiver and caster
 * lies inside a sphere of radius hypot(horizontal, vertical), so a box that covers that sphere
 * from any sun direction is enough; a fixed ±520 m box wasted most of the shadow map.
 */
export function fitShadowFrustum(horizontalRadius: number, verticalExtent: number): ShadowFrustum {
  const radius = Math.hypot(horizontalRadius, verticalExtent)
  const distance = radius + SHADOW_NEAR_MARGIN
  return { halfExtent: radius, near: SHADOW_NEAR_MARGIN, far: distance + radius, distance }
}
