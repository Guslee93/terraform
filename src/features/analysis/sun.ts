import { getPosition, getTimes } from 'suncalc'
import type { Vec3 } from '../../lib/coordinates'
import { formatLocalLabel, resolveLocalTime, type LocalDate, type LocalTime } from './time'

/**
 * Geometric sun direction only (AGENTS.md §7 claim policy). `belowHorizon` is a rendering state and
 * `dayModel` is the scrubber's frame of reference. The screening analyses built on these vectors live
 * in `shadowRay.ts`, `sunHours.ts`, `roofSolar.ts`, `facadeSun.ts` and `vsc.ts` (ADR-0021); each
 * carries its own disclaimer and none is a daylight, compliance or verified-sunlight statement.
 */

/** Default sun for a fresh scene: 21 June, 15:00 Oslo summer time (UTC+2), the Hektar view. */
export const DEMO_SUN_INSTANT = new Date(Date.UTC(2026, 5, 21, 13, 0))
export const DEFAULT_TIME_ZONE = 'Europe/Oslo'

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

/** Unit vector from the site towards the sun in local ENU metres (ADR-0002). */
export function sunDirectionEnu({ azimuthDeg, elevationDeg }: SunDirection): Vec3 {
  const azimuth = (azimuthDeg * Math.PI) / 180
  const elevation = (elevationDeg * Math.PI) / 180
  const horizontal = Math.cos(elevation)
  return [Math.sin(azimuth) * horizontal, Math.cos(azimuth) * horizontal, Math.sin(elevation)]
}

export type SunState = SunDirection & {
  readonly instant: Date
  /** `2026-06-21 15:00 CEST` style, in the requested zone. */
  readonly localLabel: string
  /** Elevation at or below 0°: direct sun off, `Sun below horizon` shown (FR-066). */
  readonly belowHorizon: boolean
  /** Unit vector towards the sun, or null while below the horizon. */
  readonly directionEnu: Vec3 | null
}

export const SUN_BELOW_HORIZON_LABEL = 'Sun below horizon'

/** Deterministic in its inputs (QA-10): no clock, no randomness, no cached state. */
export function sunState(
  instant: Date,
  latitude: number,
  longitude: number,
  timeZone: string = DEFAULT_TIME_ZONE,
): SunState {
  const direction = sunDirection(instant, latitude, longitude)
  const belowHorizon = !(direction.elevationDeg > 0)
  return {
    ...direction,
    instant: new Date(instant.getTime()),
    localLabel: formatLocalLabel(instant, timeZone),
    belowHorizon,
    directionEnu: belowHorizon ? null : sunDirectionEnu(direction),
  }
}

const COMPASS_POINTS = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
] as const

export type CompassPoint = (typeof COMPASS_POINTS)[number]

/** 16-point compass name for an azimuth in degrees clockwise from north. */
export function compassPoint(azimuthDeg: number): CompassPoint {
  const index = Math.round((((azimuthDeg % 360) + 360) % 360) / 22.5) % 16
  return COMPASS_POINTS[index] ?? 'N'
}

/**
 * Readout text for FR-063. Below the horizon it is exactly `Sun below horizon`: no elevation,
 * no direction, and never a sun-hours figure (QA-11).
 */
export function describeSunState(state: SunState): string {
  if (state.belowHorizon) return SUN_BELOW_HORIZON_LABEL
  return `Elevation ${state.elevationDeg.toFixed(1)}° · azimuth ${Math.round(state.azimuthDeg)}° (${compassPoint(state.azimuthDeg)})`
}

export type DayModel =
  | {
      readonly kind: 'normal'
      readonly sunrise: Date
      readonly sunset: Date
      readonly solarNoon: Date
      /** Sunrise to sunset, geometric, no obstructions. Not a sunlight-hours claim. */
      readonly daylightMinutes: number
    }
  | { readonly kind: 'polar-day'; readonly solarNoon: Date }
  | { readonly kind: 'polar-night'; readonly solarNoon: Date }

function validDate(value: unknown): value is Date {
  return value instanceof Date && Number.isFinite(value.getTime())
}

/**
 * The sun's day for a local date: sunrise/sunset when both occur, otherwise polar day or polar
 * night decided by the elevation at solar noon (suncalc returns no events for either).
 */
export function dayModel(
  date: LocalDate | string,
  latitude: number,
  longitude: number,
  timeZone: string = DEFAULT_TIME_ZONE,
): DayModel {
  const noon = resolveLocalTime(date, '12:00', timeZone).instant
  const times = getTimes(noon, latitude, longitude)
  const solarNoon = validDate(times.solarNoon) ? times.solarNoon : noon
  if (validDate(times.sunrise) && validDate(times.sunset)) {
    return {
      kind: 'normal',
      sunrise: times.sunrise,
      sunset: times.sunset,
      solarNoon,
      daylightMinutes: Math.max(0, (times.sunset.getTime() - times.sunrise.getTime()) / 60_000),
    }
  }
  const atNoon = sunDirection(solarNoon, latitude, longitude)
  return { kind: atNoon.elevationDeg > 0 ? 'polar-day' : 'polar-night', solarNoon }
}

export type DatePreset = { readonly id: 'spring-equinox' | 'summer-solstice' | 'autumn-equinox' | 'winter-solstice'; readonly label: string; readonly date: LocalDate }

/** FR-065. Dates for 2026, the demo year; the geometry differs by minutes in other years. */
export const DATE_PRESETS: readonly DatePreset[] = [
  { id: 'spring-equinox', label: 'Spring equinox', date: '2026-03-20' },
  { id: 'summer-solstice', label: 'Summer solstice', date: '2026-06-21' },
  { id: 'autumn-equinox', label: 'Autumn equinox', date: '2026-09-22' },
  { id: 'winter-solstice', label: 'Winter solstice', date: '2026-12-21' },
]

export type TimePresetId = 'morning' | 'noon' | 'evening'

export type TimePreset = { readonly id: TimePresetId; readonly label: string; readonly time: LocalTime }

/**
 * FR-063 presets in local wall-clock time. `noon` is 12:00 on the clock, not solar noon
 * (which `dayModel().solarNoon` gives); the readout shows the resulting elevation either way.
 */
export const TIME_PRESETS: readonly TimePreset[] = [
  { id: 'morning', label: 'Morning', time: '09:00' },
  { id: 'noon', label: 'Noon', time: '12:00' },
  { id: 'evening', label: 'Evening', time: '18:00' },
]
