/**
 * Winter climate context for a site (ADR-0039): how much snow the area has had on the ground, from
 * NVE's snow model on the seNorge grid (1 km, daily), read from NVE's grid time-series API. A screening context for the neighbourhood, modelled
 * for open terrain: not a measurement at the site, and never snowdrift, accumulation around
 * buildings or a snow load (feasibility 07 Tier 3, 08 §3). Renderer-free.
 */

/** A day counts as "snow on the ground" from this depth. */
export const SNOW_COVER_MIN_CM = 5
export const SNOW_OWNER = 'NVE'
export const SNOW_NOTE = 'Winter climate context from a 1 km snow model for open terrain — not a measurement at the site.'
export const SNOW_LIMITS = 'Not snowdrift, not snow accumulating on or around buildings, and not a snow load. Those need a specialist study.'

export type Winter = {
  /** "1990/91": the winter starting in the autumn of the first year. */
  readonly winter: string
  /** Days with at least `SNOW_COVER_MIN_CM` of snow. */
  readonly snowDays: number
  /** The deepest snow of the winter, cm. */
  readonly maxDepthCm: number
}

export type Spread = { readonly median: number; readonly min: number; readonly max: number }

export type SnowClimate = {
  /** The model cell the series is for: its centre in EPSG:25833 and its altitude. */
  readonly cell: { readonly x: number; readonly y: number; readonly altitudeM: number }
  /** First and last winter of the period, as the years they start and end in. */
  readonly period: { readonly from: number; readonly to: number }
  readonly winters: readonly Winter[]
  readonly snowDays: Spread
  readonly maxDepthCm: Spread
  /** Mean snow depth by month over the period, October to May, cm. */
  readonly monthlyMeanDepthCm: readonly { readonly month: string; readonly value: number }[]
}

const MONTHS = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'] as const
const MONTH_INDEX = [9, 10, 11, 0, 1, 2, 3, 4]

function spread(values: readonly number[]): Spread {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = sorted.length / 2
  const median = sorted.length % 2 ? sorted[Math.floor(middle)]! : (sorted[middle - 1]! + sorted[middle]!) / 2
  return { median, min: sorted[0]!, max: sorted[sorted.length - 1]! }
}

/**
 * Winter statistics from a daily snow-depth series (cm). `firstDay` is the date of `daily[0]`; a
 * winter runs from 1 September to 31 August. Days without a value (`null`) are left out, and a
 * winter with more than 10 of them is dropped rather than summarised from part of a season.
 */
export function winterStatistics(daily: readonly (number | null)[], firstDay: string): Pick<SnowClimate, 'period' | 'winters' | 'snowDays' | 'maxDepthCm' | 'monthlyMeanDepthCm'> {
  const start = Date.parse(`${firstDay}T00:00:00Z`)
  if (Number.isNaN(start)) throw new Error('snow: the first day is not a date')
  const seasons = new Map<number, { days: number; snowDays: number; max: number; missing: number }>()
  // Monthly means sum every day in the series, including any partial winters at the ends that the
  // per-winter statistics below then drop. This equals "means over whole winters only" only when
  // the series starts on 1 September and ends on 31 August — as scripts/site-assets/snow.build.ts
  // requests it.
  const monthly = MONTHS.map(() => ({ sum: 0, count: 0 }))
  daily.forEach((depth, index) => {
    const date = new Date(start + index * 86_400_000)
    const year = date.getUTCMonth() >= 8 ? date.getUTCFullYear() : date.getUTCFullYear() - 1
    const season = seasons.get(year) ?? { days: 0, snowDays: 0, max: 0, missing: 0 }
    seasons.set(year, season)
    season.days += 1
    if (depth === null || !Number.isFinite(depth)) { season.missing += 1; return }
    if (depth >= SNOW_COVER_MIN_CM) season.snowDays += 1
    season.max = Math.max(season.max, depth)
    const month = MONTH_INDEX.indexOf(date.getUTCMonth())
    if (month >= 0) { monthly[month]!.sum += depth; monthly[month]!.count += 1 }
  })
  const winters = [...seasons]
    // Whole winters only: a season cut by the ends of the series, or with gaps, is not summarised.
    .filter(([, season]) => season.days >= 365 && season.missing <= 10)
    .sort((a, b) => a[0] - b[0])
    .map(([year, season]): Winter => ({ winter: `${year}/${String((year + 1) % 100).padStart(2, '0')}`, snowDays: season.snowDays, maxDepthCm: Math.round(season.max) }))
  if (winters.length === 0) throw new Error('snow: the series holds no whole winter')
  const first = Number(winters[0]!.winter.slice(0, 4))
  return {
    period: { from: first, to: first + winters.length },
    winters,
    snowDays: spread(winters.map((winter) => winter.snowDays)),
    maxDepthCm: spread(winters.map((winter) => winter.maxDepthCm)),
    monthlyMeanDepthCm: MONTHS.map((month, index) => ({ month, value: Number((monthly[index]!.count ? monthly[index]!.sum / monthly[index]!.count : 0).toFixed(1)) })),
  }
}

export function parseSnowClimate(value: unknown): SnowClimate & { siteId: string } {
  const fail = (path: string, message: string): never => { throw new Error(`${path}: ${message}`) }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) fail('snow', 'expected an object')
  const root = value as Record<string, unknown>
  if (root.schemaVersion !== 1) fail('snow.schemaVersion', 'unsupported schema version')
  if (typeof root.siteId !== 'string' || root.siteId === '') fail('snow.siteId', 'expected a string')
  const number = (entry: unknown, path: string): number => (typeof entry === 'number' && Number.isFinite(entry) && entry >= 0 ? entry : fail(path, 'expected a non-negative number'))
  const record = (entry: unknown, path: string): Record<string, unknown> => (typeof entry === 'object' && entry !== null && !Array.isArray(entry) ? (entry as Record<string, unknown>) : fail(path, 'expected an object'))
  const range = (entry: unknown, path: string): Spread => {
    const item = record(entry, path)
    return { median: number(item.median, `${path}.median`), min: number(item.min, `${path}.min`), max: number(item.max, `${path}.max`) }
  }
  const cell = record(root.cell, 'snow.cell')
  const period = record(root.period, 'snow.period')
  if (!Array.isArray(root.winters) || root.winters.length === 0 || root.winters.length > 200) fail('snow.winters', 'expected 1 to 200 winters')
  const winters = (root.winters as unknown[]).map((entry, index): Winter => {
    const item = record(entry, `snow.winters[${index}]`)
    if (typeof item.winter !== 'string' || !/^\d{4}\/\d{2}$/.test(item.winter)) fail(`snow.winters[${index}].winter`, 'expected "1990/91"')
    const snowDays = number(item.snowDays, `snow.winters[${index}].snowDays`)
    if (snowDays > 366) fail(`snow.winters[${index}].snowDays`, 'more days than a year has')
    return { winter: item.winter as string, snowDays, maxDepthCm: number(item.maxDepthCm, `snow.winters[${index}].maxDepthCm`) }
  })
  if (!Array.isArray(root.monthlyMeanDepthCm) || root.monthlyMeanDepthCm.length !== MONTHS.length) fail('snow.monthlyMeanDepthCm', 'expected October to May')
  const monthlyMeanDepthCm = (root.monthlyMeanDepthCm as unknown[]).map((entry, index) => {
    const item = record(entry, `snow.monthlyMeanDepthCm[${index}]`)
    if (item.month !== MONTHS[index]) fail(`snow.monthlyMeanDepthCm[${index}].month`, `expected ${MONTHS[index]}`)
    return { month: MONTHS[index]!, value: number(item.value, `snow.monthlyMeanDepthCm[${index}].value`) }
  })
  return {
    siteId: root.siteId as string,
    cell: { x: number(cell.x, 'snow.cell.x'), y: number(cell.y, 'snow.cell.y'), altitudeM: number(cell.altitudeM, 'snow.cell.altitudeM') },
    period: { from: number(period.from, 'snow.period.from'), to: number(period.to, 'snow.period.to') },
    winters,
    snowDays: range(root.snowDays, 'snow.snowDays'),
    maxDepthCm: range(root.maxDepthCm, 'snow.maxDepthCm'),
    monthlyMeanDepthCm,
  }
}

/** "winters 1990/91 to 2019/20". */
export const periodLabel = (snow: Pick<SnowClimate, 'winters'>) => `winters ${snow.winters[0]!.winter} to ${snow.winters.at(-1)!.winter}`
