import { profileFactor } from './windProfile'
import type { Vec2 } from '../../lib/coordinates'
import { sampleGrid, type FootprintBuilding } from './grid'
import type { FlowResult } from './flowRunner'
import { FLOW_DISCLAIMER, sampleVelocity } from './lbm'
import { LAWSON_NORCONSULT, SAFETY } from './comfort'
import { computeNoise, NOISE_BAND_LABEL, NOISE_DISCLAIMER, type NoiseBand, type NoiseRoad } from './noise'

export type ClimateMode = 'off' | 'wind' | 'noise'

/** What the wind overlay shows: speed relative to open ground, or the activity the local speed suits. */
export type WindDisplay = 'ratio' | 'activity' | 'delta' | 'worst'
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
  readonly streamlineHeight: number | null
  readonly streamlineOpacity: number
}
export const DEFAULT_WIND: WindSettings = { from: 270, display: 'activity', refSpeed: 6, downwash: true, centre: null, radius: 100, streamlineHeight: null, streamlineOpacity: 0.65 }
export type WindBaseline = { readonly flow: FlowResult; readonly circle: { readonly centre: Vec2; readonly radius: number }; readonly from: number; readonly downwash: boolean }
export function captureBaseline(flow: FlowResult, circle: WindBaseline['circle'], from: number, downwash = false): WindBaseline {
  return { flow: { ...flow, frame: { ...flow.frame, centre: [...flow.frame.centre], flow: [...flow.frame.flow] }, velocity: flow.velocity.slice(), solid: flow.solid.slice(), ...(flow.slices ? { slices: flow.slices.map((slice) => ({ ...slice, velocity: slice.velocity.slice(), solid: slice.solid.slice() })) } : {}) }, circle: { centre: [...circle.centre], radius: circle.radius }, from, downwash }
}
/** A delta is only meaningful with the same circle, direction and model settings (downwash rule on/off). */
export function baselineMatches(baseline: WindBaseline, circle: WindBaseline['circle'], from: number, downwash = baseline.downwash): boolean {
  return baseline.from === from && baseline.downwash === downwash && baseline.circle.radius === circle.radius && baseline.circle.centre.every((v, i) => v === circle.centre[i])
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

/** Continuous Direction ramp in m/s; interpolation is in display sRGB. */
export const WIND_RAMP = [
  { speed: 0, colour: '#F5F7FB' }, { speed: 2, colour: '#BFD3F2' },
  { speed: 4, colour: '#5B8DEF' }, { speed: 6, colour: '#2F49D1' },
  { speed: 8, colour: '#7B2FD1' }, { speed: 10, colour: '#C21FB3' },
] as const
export function windSpeedColour(speed: number): string {
  const value = Math.max(0, Math.min(10, speed))
  const index = Math.min(4, Math.floor(value / 2))
  const a = WIND_RAMP[index]!, b = WIND_RAMP[index + 1]!
  const t = (value - a.speed) / 2
  return '#' + [1, 3, 5].map((offset) => {
    const lo = parseInt(a.colour.slice(offset, offset + 2), 16)
    const hi = parseInt(b.colour.slice(offset, offset + 2), 16)
    return Math.round(lo + (hi - lo) * t).toString(16).padStart(2, '0')
  }).join('').toUpperCase()
}

/**
 * Local speed in m/s. Field ratios are relative to the free stream at the 2 m pedestrian slice
 * (upper slices are pre-scaled by the profile), while the slider sets the reference wind at 10 m.
 * So m/s = ratio × refSpeed × profileFactor(2) (≈ 0.70 for the indicative urban profile).
 */
export const PEDESTRIAN_TO_REF = profileFactor(2) / profileFactor(10)
export const localSpeedMs = (ratio: number, refSpeed10m: number) => ratio * refSpeed10m * PEDESTRIAN_TO_REF

/** Shared by ground and roofs; delta requires a compatible sample at the same height. */
export function windColour(ratio: number, wind: WindSettings, before?: number): string | null {
  if (wind.display === 'delta') return before === undefined ? null : deltaBand(ratio - before).colour
  const ms = localSpeedMs(ratio, wind.refSpeed)
  return wind.display === 'ratio' ? windSpeedColour(ms) : pick(ACTIVITY_BANDS, ms).colour
}

export const DELTA_BANDS: readonly Band[] = [
  { band: 'much-calmer', below: -0.3, label: 'Calmer (≤ −0.3)', colour: '#1E3A8A' },
  { band: 'calmer', below: -0.1, label: 'Calmer (−0.3 to −0.1)', colour: '#93C5FD' },
  { band: 'same', below: 0.1, label: 'No change (±0.1)', colour: '#E5E7EB' },
  { band: 'windier', below: 0.3, label: 'Windier (+0.1 to +0.3)', colour: '#FCA5A5' },
  { band: 'much-windier', below: Infinity, label: 'Windier (≥ +0.3)', colour: '#B91C1C' },
]
export const deltaBand = (delta: number) => DELTA_BANDS[delta <= -0.3 ? 0 : delta < -0.1 ? 1 : delta <= 0.1 ? 2 : delta < 0.3 ? 3 : 4]!
export const DELTA_NOTE = 'Calmer / No change / Windier vs baseline'

/** Momentary activity bands: the five Lawson thresholds (A–E) and the first safety threshold (m/s, pedestrian level). */
const [SIT, STAND, STROLL, WALK, UNCOMFORTABLE] = LAWSON_NORCONSULT.thresholds
export const ACTIVITY_BANDS: readonly Band[] = [
  { band: 'sit', below: SIT, label: `Sitting (< ${SIT} m/s)`, colour: '#3B6EA8' },
  { band: 'stand', below: STAND, label: `Standing (${SIT}–${STAND} m/s)`, colour: '#4FA3A5' },
  { band: 'stroll', below: STROLL, label: `Strolling (${STAND}–${STROLL} m/s)`, colour: '#E6DC9C' },
  { band: 'walk', below: WALK, label: `Walking (${STROLL}–${WALK} m/s)`, colour: '#E39A4C' },
  { band: 'uncomfortable', below: UNCOMFORTABLE, label: `Uncomfortable (${WALK}–${UNCOMFORTABLE} m/s)`, colour: '#C2452F' },
  { band: 'very-uncomfortable', below: SAFETY.thresholds[0], label: `Very uncomfortable (${UNCOMFORTABLE}–${SAFETY.thresholds[0]} m/s)`, colour: '#962838' },
  { band: 'unsafe', below: Infinity, label: `Unsafe (> ${SAFETY.thresholds[0]} m/s)`, colour: '#6E1A2A' },
]
/** Direction legend: m/s bins coloured from the continuous ramp at each bin's midpoint. */
export const DIRECTION_BANDS: readonly Band[] = [0, 2, 4, 6, 8, 10].map((lo) => ({
  band: `ms-${lo}`,
  below: lo === 10 ? Infinity : lo + 2,
  label: lo === 10 ? '10 m/s and above' : `${lo}–${lo + 2} m/s`,
  colour: windSpeedColour(lo + 1),
}))

/** Particle colour: the same scale as the map; a neutral dark blue in Delta (no per-particle baseline). */
export function particleColour(ratio: number, wind: WindSettings): string {
  return wind.display === 'delta' ? '#1E3A8A' : windColour(ratio, wind)!
}

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
  /** Optional complete lattice including the circle-edge halo, clipped by the renderer. */
  readonly lattice?: readonly { readonly x: number; readonly y: number; readonly colour: string }[]
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

/** Worst case over the all-directions sweep (ADR-0015): per open-ground cell, the highest ratio. */
export type WorstCase = { readonly cells: Float32Array; readonly maxRatio: Float32Array; /** Directions solved so far (progressive sweep). */ readonly solved?: number }
export const WORST_NOTE = 'Worst case over 8 wind directions, each weighted equally — not measured climate frequency.'
/** Threshold for the rose's "share above": too windy to stand comfortably (Lawson B/C boundary, 4 m/s). */
export const ROSE_THRESHOLD_MS = LAWSON_NORCONSULT.thresholds[1]

export function buildClimateView(
  mode: Exclude<ClimateMode, 'off'>,
  studyArea: readonly Vec2[],
  buildings: readonly FootprintBuilding[],
  roads: readonly NoiseRoad[],
  flow: FlowResult | null,
  wind: WindSettings = DEFAULT_WIND,
  cellM = 10,
  baseline: WindBaseline | null = null,
  worst: WorstCase | null = null,
): ClimateView {
  if (mode === 'wind' && wind.display === 'worst') {
    const points: { x: number; y: number; colour: string; band: string }[] = []
    if (worst) for (let i = 0; i < worst.maxRatio.length; i++) {
      const r = worst.maxRatio[i]!
      if (!Number.isFinite(r)) continue
      const b = pick(ACTIVITY_BANDS, localSpeedMs(r, wind.refSpeed))
      points.push({ x: worst.cells[2 * i]!, y: worst.cells[2 * i + 1]!, colour: b.colour, band: b.band })
    }
    return {
      overlay: { cellM: WIND_CELL_M, lattice: points, cells: points },
      legend: ACTIVITY_BANDS.map((b) => {
        const count = points.filter((p) => p.band === b.band).length
        return { label: b.label, colour: b.colour, count, share: points.length ? count / points.length : 0 }
      }),
      // Mid-sweep the map covers fewer than 8 directions: say so rather than claim all 8.
      disclaimer: `${WORST_NOTE}${worst && worst.solved !== undefined && worst.solved < 8 ? ` Partial: ${worst.solved} of 8 directions solved so far.` : ''} ${ACTIVITY_NOTE} ${FLOW_DISCLAIMER}`,
      assessed: points.length,
    }
  }
  if (mode === 'wind') {
    const bands = wind.display === 'delta' ? DELTA_BANDS : wind.display === 'activity' ? ACTIVITY_BANDS : DIRECTION_BANDS
    const scale = wind.display === 'delta' ? 1 : localSpeedMs(1, wind.refSpeed)
    const compatible = baseline && baselineMatches(baseline, { centre: wind.centre ?? baseline.circle.centre, radius: wind.radius }, wind.from, wind.downwash)
    const cells = flow && (wind.display !== 'delta' || compatible)
      ? sampleGrid(studyArea, WIND_CELL_M).flatMap((c) => {
          const v = sampleVelocity(flow.frame, flow.velocity, flow.solid, [c.x, c.y])
          if (!v) return []
          if (wind.display === 'delta' && baseline) {
            const before = sampleVelocity(baseline.flow.frame, baseline.flow.velocity, baseline.flow.solid, [c.x, c.y])
            return before ? [{ ...c, b: deltaBand(Math.hypot(...v) - Math.hypot(...before)) }] : []
          }
          return [{ ...c, b: { ...pick(bands, Math.hypot(...v) * scale), colour: windColour(Math.hypot(...v), wind)! } }]
        })
      : []
    // A one-cell halo lets the mesh reach the exact circular shader clip boundary.
    const xs = studyArea.map((p) => p[0]), ys = studyArea.map((p) => p[1])
    const minX = Math.min(...xs) - WIND_CELL_M, maxX = Math.max(...xs) + WIND_CELL_M
    const minY = Math.min(...ys) - WIND_CELL_M, maxY = Math.max(...ys) + WIND_CELL_M
    const lattice = flow && (wind.display !== 'delta' || compatible)
      ? sampleGrid([[minX, minY], [maxX, minY], [maxX, maxY], [minX, maxY]], WIND_CELL_M).flatMap((c) => {
          const v = sampleVelocity(flow.frame, flow.velocity, flow.solid, [c.x, c.y])
          if (!v) return []
          const before = baseline && wind.display === 'delta' ? sampleVelocity(baseline.flow.frame, baseline.flow.velocity, baseline.flow.solid, [c.x, c.y]) : null
          const colour = windColour(Math.hypot(...v), wind, before ? Math.hypot(...before) : undefined)
          return colour ? [{ ...c, colour }] : []
        }) : []
    return {
      overlay: { cellM: WIND_CELL_M, lattice, cells: cells.map((c) => ({ x: c.x, y: c.y, colour: c.b.colour })) },
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
