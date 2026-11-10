import { ACTIVITY_BANDS, ROSE_THRESHOLD_MS, type ClimateView } from '../../features/analysis/climateView'
import { ROAD_LEVEL_AT_10M, type NoiseCell, type NoiseRoad } from '../../features/analysis/noise'
import { medianSunHours, type SunHoursCell } from '../../features/analysis/sunHours'
import { medianRoofSolar, type RoofSolarValue } from '../../features/analysis/roofSolar'
import { medianFacadeSun, type FacadeSunValue } from '../../features/analysis/facadeSun'
import { medianVsc, type VscValue } from '../../features/analysis/vsc'
import { compassPoint, type SunState } from '../../features/analysis/sun'
import { shortDate } from './SunPanel'
import { formatNumber } from './format'

/** A value with its unit: the value reads dark, the unit grey (ADR-0016 card style). */
export type Part = readonly [value: string, unit: string]

/** What one dock card shows. `value: null` renders "—" with `hint`; never a made-up number. */
export type DockStat = {
  readonly value: string | null
  readonly unit: string
  readonly hint?: string
  readonly secondary: readonly Part[]
}

const empty = (hint: string): DockStat => ({ value: null, unit: '', hint, secondary: [] })

export function sunStat(state: SunState, clock: string): DockStat {
  if (state.belowHorizon) return { ...empty('Sun below horizon'), secondary: [[clock, ' local']] }
  return {
    value: formatNumber(state.elevationDeg),
    unit: '°',
    secondary: [
      ['az ', ''],
      [`${Math.round(state.azimuthDeg)}°`, ` ${compassPoint(state.azimuthDeg)} · `],
      [clock, ' local'],
    ],
  }
}

/** Median assessed ground hours for the selected date; the date names the result. */
export function sunHoursStat(cells: readonly SunHoursCell[], date: string): DockStat {
  const median = medianSunHours(cells)
  if (median === null) return { ...empty('No assessed ground'), secondary: [[shortDate(date), '']] }
  return {
    value: formatNumber(median, 1),
    unit: ' h',
    secondary: [['median · ', ''], [shortDate(date), '']],
  }
}

/** Median direct-sun hours on the user's façades for the selected date. */
export function facadeSunStat(values: readonly FacadeSunValue[], date: string): DockStat {
  const median = medianFacadeSun(values)
  if (median === null) {
    return { ...empty('Draw a block to see façades'), secondary: [[shortDate(date), '']] }
  }
  return {
    value: formatNumber(median, 1),
    unit: ' h',
    secondary: [['median · ', ''], [shortDate(date), '']],
  }
}

/** Median VSC on the user's façades under the CIE overcast sky. */
export function vscStat(values: readonly VscValue[]): DockStat {
  const median = medianVsc(values)
  if (median === null) return empty('Draw a block to see façades')
  return {
    value: formatNumber(median, 1),
    unit: ' %',
    secondary: [['median · ', ''], ['overcast sky', '']],
  }
}

/** Median clear-sky annual irradiation across roofs; an upper bound, not a yield estimate. */
export function roofSolarStat(values: readonly RoofSolarValue[] | null): DockStat {
  if (!values || values.length === 0) return empty('Computing roof solar…')
  const median = medianRoofSolar(values)
  if (median === null) return empty('No roofs to assess')
  return {
    value: formatNumber(median),
    unit: ' kWh',
    secondary: [['/m²·yr · ', ''], ['clear sky', '']],
  }
}

/** Peak ground level in the study grid and the loudest mapped road class. */
export function noiseStat(cells: readonly NoiseCell[], roads: readonly NoiseRoad[]): DockStat {
  const levels = cells.flatMap((cell) => (cell.db === null ? [] : [cell.db]))
  if (levels.length === 0) return empty('No mapped roads in the study area')
  const loudest = roads.reduce<string | null>((best, road) => {
    const level = ROAD_LEVEL_AT_10M[road.highway]
    if (level === undefined) return best
    return best === null || level > (ROAD_LEVEL_AT_10M[best] ?? -Infinity) ? road.highway : best
  }, null)
  return {
    value: formatNumber(Math.max(...levels)),
    unit: ' dB',
    secondary: [['peak', loudest ? ' · ' : ' in study area'], ...(loudest ? [[loudest.replace(/_/g, ' '), ' road'] as const] : [])],
  }
}

/**
 * Share of open ground at or above the stand threshold (4 m/s), from a Comfort (activity) view,
 * and the windiest class present. `view` must be built with display 'activity'.
 */
export function windStat(view: ClimateView | null, from: number, refSpeed: number, solving: boolean): DockStat {
  if (!view) return empty(solving ? 'Solving the flow…' : 'Select to solve the flow')
  if (view.assessed === 0) return empty('Solving the flow…')
  const above = view.legend.reduce((sum, entry, index) => sum + ((ACTIVITY_BANDS[index]?.below ?? 0) > ROSE_THRESHOLD_MS ? entry.share : 0), 0)
  const worst = [...view.legend].reverse().find((entry) => entry.count > 0)
  // Direction and speed sit beside the cards (quick controls); the card names the windiest class.
  const secondary: Part[] = worst
    ? [['', 'worst '], [worst.label.split(' (')[0] ?? worst.label, '']]
    : [['', `${compassPoint(from)} ${from}° at ${refSpeed} m/s`]]
  return { value: formatNumber(above * 100), unit: '%', secondary }
}
