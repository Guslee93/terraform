import { getPosition } from 'suncalc'

/**
 * Fixed reference instant for the scene's sun until M3 adds date/time controls: 21 June, 15:00
 * Oslo summer time (UTC+2), the view the Hektar reference uses. Geometric sun direction only.
 */
export const DEMO_SUN_INSTANT = new Date(Date.UTC(2026, 5, 21, 13, 0))

export type SunDirection = {
  /** Degrees clockwise from north. */
  azimuthDeg: number
  /** Degrees above the horizon (refraction-corrected). */
  elevationDeg: number
}

/** Sun direction for a UTC instant and WGS84 position. suncalc 2 returns degrees, north-based. */
export function sunDirection(instant: Date, latitude: number, longitude: number): SunDirection {
  const { azimuth, altitude } = getPosition(instant, latitude, longitude)
  return { azimuthDeg: azimuth, elevationDeg: altitude }
}
