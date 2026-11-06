import type { Vec2 } from '../../lib/coordinates'
import { sampleGrid, type FootprintBuilding } from './grid'
import type { FlowResult } from './flowRunner'
import { FLOW_DISCLAIMER, sampleVelocity } from './lbm'
import { LAWSON_NORCONSULT, SAFETY } from './comfort'
import { computeNoise, NOISE_BAND_LABEL, NOISE_DISCLAIMER, type NoiseBand, type NoiseRoad } from './noise'

export type ClimateMode = 'off' | 'wind' | 'noise'

/** What the wind overlay shows: speed relative to open ground, or the activity the local speed suits. */
export type WindDisplay = 'ratio' | 'activity'
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
export const DEFAULT_WIND: WindSettings = { from: 270, display: 'ratio', refSpeed: 6, downwash: true, centre: null, radius: 100 }
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
): ClimateView {
  if (mode === 'wind') {
    const bands = wind.display === 'activity' ? ACTIVITY_BANDS : SPEED_BANDS
    const scale = wind.display === 'activity' ? wind.refSpeed : 1
    const cells = flow
      ? sampleGrid(studyArea, WIND_CELL_M).flatMap((c) => {
          const v = sampleVelocity(flow.frame, flow.velocity, flow.solid, [c.x, c.y])
          return v ? [{ ...c, b: pick(bands, Math.hypot(v[0], v[1]) * scale) }] : []
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
