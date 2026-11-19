import { ACTIVITY_BANDS, ROSE_THRESHOLD_MS, type ClimateView } from '../../features/analysis/climateView'
import { largestBand, NO_NOISE_MAP, type NoiseMetric, type NoiseShares } from '../../features/analysis/officialNoise'
import type { CircleSunHours } from '../../features/analysis/circleSunHours'
import { medianRoofSolar, type RoofSolarValue } from '../../features/analysis/roofSolar'
import { medianVsc, type VscValue } from '../../features/analysis/vsc'
import { compassPoint, type SunState } from '../../features/analysis/sun'
import { shortDate } from './SunPanel'
import { formatNumber } from './format'
import type { RunoffSummary } from '../../features/analysis/runoff'
import type { SnowClimate } from '../../features/analysis/snowClimate'

/** A value with its unit: the value reads dark, the unit grey (ADR-0016 card style). */
export type Part = readonly [value: string, unit: string]

/** What one analysis card shows. `value: null` renders "—" with `hint`; never a made-up number. */
export type AnalysisStat = {
  readonly value: string | null
  readonly unit: string
  readonly hint?: string
  readonly secondary: readonly Part[]
}

/** Sun hours read in 0.5 h steps: context heights move the result by more than 0.1 h (feasibility 09 §5). */
export const roundToHalf = (hours: number) => Math.round(hours * 2) / 2

const empty = (hint: string): AnalysisStat => ({ value: null, unit: '', hint, secondary: [] })

export function sunStat(state: SunState, clock: string): AnalysisStat {
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

/**
 * Median hours of direct sun on the open ground in the analysis circle (ADR-0031); the date names
 * the result. While the worker computes, no number: the hint says so.
 */
export function circleSunStat(result: CircleSunHours | null, computing: boolean, date: string): AnalysisStat {
  const median = result?.median.ground ?? null
  if (!result || (computing && median === null)) return { ...empty('Computing…'), secondary: [[shortDate(date), '']] }
  if (median === null) return { ...empty('No open ground in the circle'), secondary: [[shortDate(date), '']] }
  return {
    value: formatNumber(roundToHalf(median), 1),
    unit: ' h',
    secondary: [['median ground · ', ''], [shortDate(date), '']],
  }
}

/** Median VSC on the user's façades under the CIE overcast sky. */
export function vscStat(values: readonly VscValue[]): AnalysisStat {
  const median = medianVsc(values)
  if (median === null) return empty('Draw a block to see façades')
  return {
    value: formatNumber(median, 1),
    unit: ' %',
    secondary: [['median · ', ''], ['overcast sky', '']],
  }
}

/** Median clear-sky annual irradiation across roofs; an upper bound, not a yield estimate. */
export function roofSolarStat(values: readonly RoofSolarValue[] | null): AnalysisStat {
  if (!values || values.length === 0) return empty('Computing roof solar…')
  const median = medianRoofSolar(values)
  if (median === null) return empty('No roofs to assess')
  return {
    value: formatNumber(median),
    unit: ' kWh',
    secondary: [['/m²·yr · ', ''], ['clear sky', '']],
  }
}

/**
 * The mapped band covering the largest share of the open ground in the study area (ADR-0034).
 * A band, never a single level; without a map the card says so instead of implying quiet.
 */
export function noiseStat(shares: NoiseShares, metric: NoiseMetric, dataYear: number | null): AnalysisStat {
  if (!shares.mapped || dataYear === null) return empty(NO_NOISE_MAP)
  const largest = largestBand(shares)
  if (!largest) return empty('No mapped band in the study area')
  const top = largest.bandLow >= 75
  return {
    value: top ? '≥ 75' : `${largest.bandLow}–${largest.bandLow + 5}`,
    unit: ' dB',
    secondary: [['', 'band with the largest share of open ground · '], [`${metric} ${dataYear}`, '']],
  }
}

/**
 * Share of open ground at or above the stand threshold (4 m/s), from a Comfort (activity) view,
 * at the chosen wind. `view` must be built with display 'activity'.
 */
export function windStat(view: ClimateView | null, from: number, refSpeed: number, solving: boolean, lifted = false): AnalysisStat {
  if (!view) return empty(solving ? 'Solving the flow…' : 'Select to solve the flow')
  if (view.assessed === 0) return empty('Solving the flow…')
  const above = view.legend.reduce((sum, entry, index) => sum + ((ACTIVITY_BANDS[index]?.below ?? 0) > ROSE_THRESHOLD_MS ? entry.share : 0), 0)
  // The figure is a share at the wind the user chose, never a comfort result (feasibility 09 §5).
  // It is always a 2 m figure; while the map shows another height the card says so.
  const secondary: Part[] = [
    ['', `of open ground ≥ ${ROSE_THRESHOLD_MS} m/s${lifted ? ' at 2 m' : ''}, at `],
    [`${compassPoint(from)} ${refSpeed} m/s`, ' (your input)'],
  ]
  return { value: formatNumber(above * 100), unit: '%', secondary }
}

/**
 * The share of the open ground with no surface way out in the model (ADR-0038): hollows in the
 * terrain and courtyards closed in by buildings. The one figure the runoff screening shows, a
 * property of the ground's and the buildings' shape. Never a depth or a volume of water.
 */
export function waterStat(summary: RunoffSummary | null, available: boolean, active: boolean, computing: boolean): AnalysisStat {
  if (!available) return empty('Needs the 1 m terrain')
  if (!active) return empty('Select to trace the runoff')
  if (!summary || computing) return empty('Tracing where the water runs…')
  return { value: formatNumber(summary.depressionShare * 100), unit: '%', secondary: [['', 'of the open ground lies in depressions or enclosed courtyards · '], ['screening', '']] }
}

/** Days with snow on the ground in a median winter (ADR-0039): climate context, not a site measurement. */
export function snowStat(snow: SnowClimate | null): AnalysisStat {
  if (!snow) return empty('No winter climate data for this site')
  return { value: formatNumber(snow.snowDays.median), unit: ' days', secondary: [['', 'with snow on the ground in a median winter · '], [`${snow.winters[0]!.winter}–${snow.winters.at(-1)!.winter}`, '']] }
}
