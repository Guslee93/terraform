import type { Vec2 } from '../../lib/coordinates'
import type { FootprintBuilding } from './grid'
import { computeNoise, NOISE_BAND_LABEL, NOISE_DISCLAIMER, type NoiseBand, type NoiseRoad } from './noise'
import { computeWind, WIND_CLASS_LABEL, WIND_DISCLAIMER, type WindClass } from './wind'

export type ClimateMode = 'off' | 'wind' | 'noise'

export const WIND_COLOUR: Record<WindClass, string> = {
  sheltered: '#4C7A9B',
  moderate: '#8FB3A8',
  exposed: '#E0B25C',
  'very-exposed': '#C2552F',
}

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

const WIND_ORDER: readonly WindClass[] = ['sheltered', 'moderate', 'exposed', 'very-exposed']
const NOISE_ORDER: readonly NoiseBand[] = ['quiet', 'moderate', 'loud', 'very-loud', 'extreme']

export function buildClimateView(
  mode: Exclude<ClimateMode, 'off'>,
  studyArea: readonly Vec2[],
  buildings: readonly FootprintBuilding[],
  roads: readonly NoiseRoad[],
  windFromBearingDeg: number,
  cellM = 10,
): ClimateView {
  if (mode === 'wind') {
    const cells = computeWind(studyArea, buildings, windFromBearingDeg, cellM)
    const { legend, assessed } = tally(cells.map((c) => c.cls), WIND_ORDER, WIND_CLASS_LABEL, WIND_COLOUR)
    return {
      overlay: { cellM, cells: cells.flatMap((c) => (c.cls ? [{ x: c.x, y: c.y, colour: WIND_COLOUR[c.cls] }] : [])) },
      legend,
      disclaimer: WIND_DISCLAIMER,
      assessed,
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
