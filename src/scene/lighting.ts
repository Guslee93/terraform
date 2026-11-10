import { enuToThreeXyz, type ThreeVec3 } from '../lib/coordinates'
import { RENDER_PROFILES, type RenderProfile } from './renderQuality'

type SunDirection = { azimuthDeg: number; elevationDeg: number }

export type LightRig = {
  night: boolean
  sun: (SunDirection & { intensity: number; castShadow: boolean }) | null
  ambient: number
  /** scene.environmentIntensity for the procedural room IBL (soft fill + faint specular). */
  environment: number
  hemisphere: { sky: string; ground: string; intensity: number }
}

export function lightRig(sun: SunDirection, profile: RenderProfile): LightRig {
  if (sun.elevationDeg <= 0) {
    return {
      night: true,
      sun: null,
      ambient: 0.2,
      environment: 0.6,
      hemisphere: { sky: '#C9D3E0', ground: '#B9BEC4', intensity: 0.7 },
    }
  }
  return {
    night: false,
    sun: {
      ...sun,
      intensity: 3.2 * Math.min(sun.elevationDeg / 6, 1),
      castShadow: RENDER_PROFILES[profile].shadows,
    },
    ambient: 0.08,
    environment: 0.22,
    hemisphere: { sky: '#EEF3FA', ground: '#D2D5D8', intensity: 1.35 },
  }
}

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
