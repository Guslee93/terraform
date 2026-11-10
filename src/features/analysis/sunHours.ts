import type { Vec2 } from '../../lib/coordinates'
import { insideAnyBuilding, sampleGrid, type FootprintBuilding, type GridCell } from './grid'
import { blockedAlong, prepareScene, type SunSample } from './shadowRay'

/**
 * Ground sun hours for one local date (ADR-0021). Geometric direct-sun screening: clear sky,
 * buildings only, terrain does not cast shade. Never a daylight factor or a compliance result.
 */

export const SUN_HOURS_DISCLAIMER =
  'Indicative sun hours — geometric, clear sky, buildings only. Not a daylight assessment.'

/**
 * Bands are shares of the day's possible sun (sampled sunrise→sunset), not fixed hours: a fixed
 * "8 h and above" top band would paint all open ground one colour in an Oslo summer (~19 h day).
 */
export type SunHoursBand = '0-20' | '20-40' | '40-60' | '60-80' | '80+'

export const SUN_HOURS_ORDER: readonly SunHoursBand[] = ['0-20', '20-40', '40-60', '60-80', '80+']

export const SUN_HOURS_BAND_LABEL: Record<SunHoursBand, string> = {
  '0-20': 'Under 20 % of the day',
  '20-40': '20–40 % of the day',
  '40-60': '40–60 % of the day',
  '60-80': '60–80 % of the day',
  '80+': '80 % or more of the day',
}

export const SUN_HOURS_COLOUR: Record<SunHoursBand, string> = {
  '0-20': '#EDE6D2',
  '20-40': '#E8D48A',
  '40-60': '#E0B25C',
  '60-80': '#CC7340',
  '80+': '#9C2F2F',
}

/** `dayHours` is the day's possible sun (sun above the horizon); 0 puts everything in the lowest band. */
export function sunHoursBand(hours: number, dayHours: number): SunHoursBand {
  const share = dayHours > 0 ? hours / dayHours : 0
  if (share < 0.2) return '0-20'
  if (share < 0.4) return '20-40'
  if (share < 0.6) return '40-60'
  if (share < 0.8) return '60-80'
  return '80+'
}

export type SunHoursCell = GridCell & {
  /** Hours of direct sun, or null inside a building footprint. */
  readonly hours: number | null
  readonly band: SunHoursBand | null
}

/**
 * Hours of direct sun per ground cell. A 15-minute sample counts when the sun is above the horizon
 * and no building blocks the ray; hours = unblocked samples × stepMin / 60.
 */
export function computeSunHours(
  studyArea: readonly Vec2[],
  buildings: readonly FootprintBuilding[],
  samples: readonly SunSample[],
  cellM = 10,
  stepMin = 15,
): SunHoursCell[] {
  const prepared = prepareScene(buildings)
  const stepHours = stepMin / 60
  const dayHours = samples.length * stepHours
  return sampleGrid(studyArea, cellM).map((cell) => {
    if (insideAnyBuilding(cell.x, cell.y, buildings)) {
      return { ...cell, hours: null, band: null }
    }
    const point = [cell.x, cell.y, 0] as const
    let sunlit = 0
    for (const sample of samples) {
      if (!blockedAlong(point, sample.enu, prepared)) sunlit += 1
    }
    const hours = sunlit * stepHours
    return { ...cell, hours, band: sunHoursBand(hours, dayHours) }
  })
}

/** Median of the assessed cells, or null when every cell is inside a building. */
export function medianSunHours(cells: readonly SunHoursCell[]): number | null {
  const values = cells.flatMap((cell) => (cell.hours === null ? [] : [cell.hours]))
  if (values.length === 0) return null
  values.sort((a, b) => a - b)
  const middle = Math.floor(values.length / 2)
  if (values.length % 2 === 1) return values[middle] ?? null
  const lower = values[middle - 1]
  const upper = values[middle]
  return lower === undefined || upper === undefined ? null : (lower + upper) / 2
}
