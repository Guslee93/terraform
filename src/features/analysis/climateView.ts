import type { Vec2 } from '../../lib/coordinates'
import { sampleGrid, type FootprintBuilding } from './grid'
import type { FlowResult } from './flowRunner'
import { FLOW_DISCLAIMER, sampleVelocity } from './lbm'
import { LAWSON_NORCONSULT, SAFETY } from './comfort'
import { computeNoise, NOISE_BAND_LABEL, NOISE_DISCLAIMER, type NoiseBand, type NoiseRoad } from './noise'

export type ClimateMode = 'off' | 'wind' | 'noise'

/** What the wind overlay shows: speed relative to open ground, or the activity the local speed suits. */
export type WindDisplay = 'ratio' | 'activity' | 'delta'
export type WindSettings = {
  /** Compass bearing the wind blows FROM. */
  readonly from: number
  readonly display: WindDisplay
  /** Reference wind speed at 10 m, m/s. */
  readonly refSpeed: number
  /** Apply the rule-based downwash boost at tall-building bases. */
  readonly downwash: boolean
  /** Analysis circle: the flow is solved only around it, at finer resolution. Centre null = study-area centre. */
  readonly centre: Vec2 | null
  readonly radius: number
}
export const DEFAULT_WIND: WindSettings = { from: 270, display: 'activity', refSpeed: 6, downwash: true, centre: null, radius: 100 }
export type WindBaseline = { readonly flow: FlowResult; readonly circle: { readonly centre: Vec2; readonly radius: number }; readonly from: number }
export function captureBaseline(flow: FlowResult, circle: WindBaseline['circle'], from: number): WindBaseline {
  return { flow: { ...flow, frame: { ...flow.frame, centre: [...flow.frame.centre], flow: [...flow.frame.flow] }, velocity: flow.velocity.slice(), solid: flow.solid.slice() }, circle: { centre: [...circle.centre], radius: circle.radius }, from }
}
export function baselineMatches(baseline: WindBaseline, circle: WindBaseline['circle'], from: number): boolean {
  return baseline.from === from && baseline.circle.radius === circle.radius && baseline.circle.centre.every((v, i) => v === circle.centre[i])
}
export const CIRCLE_RADIUS = { min: 60, max: 250, step: 10 } as const
/** Heatmap cell size inside the analysis circle (m). */
export const WIND_CELL_M = 4

type Band = { readonly band: string; readonly below: number; readonly label: string; readonly colour: string }
const pick = (bands: readonly Band[], value: number) => bands.find((b) => value < b.below)!

/** Speed ratio (local ÷ undisturbed) bands; one ramp, calm blue → red, shared by heatmap and particles. */
export type SpeedBand = 'calm' | 'reduced' | 'open' | 'faster' | 'fast'
export const SPEED_BANDS: ReadonlyArray<Band & { band: SpeedBand }> = [
  { band: 'calm', below: 0.5, label: 'Calm (< 0.5×)', colour: '#3B6EA8' },
  { band: 'reduced', below: 0.8, label: 'Reduced (0.5–0.8×)', colour: '#4FA3A5' },
  { band: 'open', below: 1.1, label: 'Like open ground (0.8–1.1×)', colour: '#E6DC9C' },
  { band: 'faster', below: 1.3, label: 'Faster (1.1–1.3×)', colour: '#E39A4C' },
  { band: 'fast', below: Infinity, label: 'Much faster (> 1.3×)', colour: '#C2452F' },
]
export const speedBand = (ratio: number) => pick(SPEED_BANDS, ratio)

export const DELTA_BANDS: readonly Band[] = [
  { band: 'much-calmer', below: -0.3, label: 'Calmer (≤ −0.3)', colour: '#1E3A8A' },
  { band: 'calmer', below: -0.1, label: 'Calmer (−0.3 to −0.1)', colour: '#93C5FD' },
  { band: 'same', below: 0.1, label: 'No change (±0.1)', colour: '#E5E7EB' },
  { band: 'windier', below: 0.3, label: 'Windier (+0.1 to +0.3)', colour: '#FCA5A5' },
  { band: 'much-windier', below: Infinity, label: 'Windier (≥ +0.3)', colour: '#B91C1C' },
]
export const deltaBand = (delta: number) => DELTA_BANDS[delta <= -0.3 ? 0 : delta < -0.1 ? 1 : delta <= 0.1 ? 2 : delta < 0.3 ? 3 : 4]!
export const DELTA_NOTE = 'Calmer / No change / Windier vs baseline'

/** Momentary activity bands from the Lawson thresholds and the first safety threshold (m/s, pedestrian level). */
const [SIT, STAND, STROLL, WALK] = LAWSON_NORCONSULT.thresholds
export const ACTIVITY_BANDS: readonly Band[] = [
  { band: 'sit', below: SIT, label: `Sitting (< ${SIT} m/s)`, colour: '#3B6EA8' },
  { band: 'stand', below: STAND, label: `Standing (${SIT}–${STAND} m/s)`, colour: '#4FA3A5' },
  { band: 'stroll', below: STROLL, label: `Strolling (${STAND}–${STROLL} m/s)`, colour: '#E6DC9C' },
  { band: 'walk', below: WALK, label: `Walking (${STROLL}–${WALK} m/s)`, colour: '#E39A4C' },
  { band: 'uncomfortable', below: SAFETY.thresholds[0], label: `Uncomfortable (${WALK}–${SAFETY.thresholds[0]} m/s)`, colour: '#C2452F' },
  { band: 'unsafe', below: Infinity, label: `Unsafe (> ${SAFETY.thresholds[0]} m/s)`, colour: '#6E1A2A' },
]
export const ACTIVITY_NOTE = 'Activity at this wind only (Lawson thresholds) — not an annual comfort rating.'

export const NOISE_COLOUR: Record<NoiseBand, string> = {
  quiet: '#9DB8A0',
  moderate: '#D4D08A',
  loud: '#E0B25C',
  'very-loud': '#CC7340',
  extreme: '#9C2F2F',
}

export type ClimateOverlay = {
  readonly cellM: number
  readonly cells: readonly { readonly x: number; readonly y: number; readonly colour: string }[]
}

export type LegendEntry = { readonly label: string; readonly colour: string; readonly count: number; readonly share: number }

export type ClimateView = {
  readonly overlay: ClimateOverlay
  readonly legend: readonly LegendEntry[]
  readonly disclaimer: string
  /** Cells that received a value (building interiors and silent areas are left out). */
  readonly assessed: number
}

function tally<K extends string>(
  keys: readonly (K | null)[],
  order: readonly K[],
  label: Record<K, string>,
  colour: Record<K, string>,
): { legend: LegendEntry[]; assessed: number } {
  const assessed = keys.filter((key) => key !== null).length
  return {
    assessed,
    legend: order.map((key) => {
      const count = keys.filter((candidate) => candidate === key).length
      return { label: label[key], colour: colour[key], count, share: assessed === 0 ? 0 : count / assessed }
    }),
  }
}

const NOISE_ORDER: readonly NoiseBand[] = ['quiet', 'moderate', 'loud', 'very-loud', 'extreme']

export function buildClimateView(
  mode: Exclude<ClimateMode, 'off'>,
  studyArea: readonly Vec2[],
  buildings: readonly FootprintBuilding[],
  roads: readonly NoiseRoad[],
  flow: FlowResult | null,
  wind: WindSettings = DEFAULT_WIND,
  cellM = 10,
  baseline: WindBaseline | null = null,
): ClimateView {
  if (mode === 'wind') {
    const bands = wind.display === 'delta' ? DELTA_BANDS : wind.display === 'activity' ? ACTIVITY_BANDS : SPEED_BANDS
    const scale = wind.display === 'activity' ? wind.refSpeed : 1
    const compatible = baseline && baselineMatches(baseline, { centre: wind.centre ?? baseline.circle.centre, radius: wind.radius }, wind.from)
    const cells = flow && (wind.display !== 'delta' || compatible)
      ? sampleGrid(studyArea, WIND_CELL_M).flatMap((c) => {
          const v = sampleVelocity(flow.frame, flow.velocity, flow.solid, [c.x, c.y])
          if (!v) return []
          if (wind.display === 'delta' && baseline) {
            const before = sampleVelocity(baseline.flow.frame, baseline.flow.velocity, baseline.flow.solid, [c.x, c.y])
            return before ? [{ ...c, b: deltaBand(Math.hypot(...v) - Math.hypot(...before)) }] : []
          }
          return [{ ...c, b: pick(bands, Math.hypot(...v) * scale) }]
        })
      : []
    return {
      overlay: { cellM: WIND_CELL_M, cells: cells.map((c) => ({ x: c.x, y: c.y, colour: c.b.colour })) },
      legend: bands.map((b) => {
        const count = cells.filter((c) => c.b.band === b.band).length
        return { label: b.label, colour: b.colour, count, share: cells.length ? count / cells.length : 0 }
      }),
      disclaimer: wind.display === 'activity' ? `${ACTIVITY_NOTE} ${FLOW_DISCLAIMER}` : FLOW_DISCLAIMER,
      assessed: cells.length,
    }
  }
  const cells = computeNoise(studyArea, roads, buildings, cellM)
  const { legend, assessed } = tally(cells.map((c) => c.band), NOISE_ORDER, NOISE_BAND_LABEL, NOISE_COLOUR)
  return {
    overlay: { cellM, cells: cells.flatMap((c) => (c.band ? [{ x: c.x, y: c.y, colour: NOISE_COLOUR[c.band] }] : [])) },
    legend,
    disclaimer: NOISE_DISCLAIMER,
    assessed,
  }
}
