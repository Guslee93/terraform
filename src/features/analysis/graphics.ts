/**
 * Shared analysis graphics (04 §4.1) — the single source of truth for every analysis colour and
 * numeric band boundary. Renderer-free: no React, no three import.
 *
 * Labels are deliberately NOT stored here. Labels that embed thresholds (Lawson wind classes,
 * runoff hollows/areas, noise dB bands) stay generated in their own modules (run book §7 T1), so
 * this registry carries identity, output class, colour and the band boundary only. The legend model
 * that attaches those labels is TF-VIS-040 (`legendFor`).
 */

import { LAWSON_NORCONSULT } from './comfort'

/** Why an analysis's output reads the way it does (03 §5.1). */
export type OutputClass = 'mapped' | 'calculated' | 'screening' | 'illustrative'

/** One colour band of a banded scale; `below` is the band's upper bound, exclusive. */
export type Band = { readonly id: string; readonly colour: string; readonly below: number }

export type Ramp = { readonly stops: readonly { readonly at: number; readonly colour: string }[] }

export type AnalysisGraphicId =
  | 'sun-hours'
  | 'roof-solar'
  | 'vsc'
  | 'wind-speed'
  | 'wind-comfort'
  | 'wind-delta'
  | 'noise'
  | 'slope'
  | 'runoff'

export type AnalysisGraphic = {
  readonly id: AnalysisGraphicId
  readonly outputClass: OutputClass
  readonly scale:
    | { readonly kind: 'ramp'; readonly ramp: Ramp; readonly unit: string }
    | { readonly kind: 'bands'; readonly bands: readonly Band[] }
}

const band = (id: string, colour: string, below: number): Band => ({ id, colour, below })
const ramp = (stops: readonly { at: number; colour: string }[]): Ramp => ({ stops })

/** The Lawson speed thresholds, so the wind-comfort band boundaries stay a single source. */
const [SIT, STAND, STROLL, WALK, UNCOMFORTABLE] = LAWSON_NORCONSULT.thresholds

export const GRAPHICS: Readonly<Record<AnalysisGraphicId, AnalysisGraphic>> = {
  'sun-hours': {
    id: 'sun-hours',
    outputClass: 'calculated',
    scale: {
      kind: 'ramp',
      unit: 'share of possible sun hours',
      ramp: ramp(
        ['#662506', '#993404', '#CC4C02', '#EC7014', '#FE9929', '#FEC44F', '#FEE391'].map(
          (colour, index) => ({ at: index / 6, colour }),
        ),
      ),
    },
  },
  'roof-solar': {
    id: 'roof-solar',
    outputClass: 'screening',
    scale: {
      kind: 'bands',
      bands: [
        band('0-300', '#E7E1D2', 300),
        band('300-600', '#E8D48A', 600),
        band('600-900', '#E0B25C', 900),
        band('900-1200', '#CC7340', 1200),
        band('1200+', '#9C2F2F', Infinity),
      ],
    },
  },
  vsc: {
    id: 'vsc',
    outputClass: 'screening',
    scale: {
      kind: 'bands',
      bands: [band('under-15', '#9C2F2F', 15), band('15-27', '#E0B25C', 27), band('27-plus', '#E8D48A', Infinity)],
    },
  },
  'wind-speed': {
    id: 'wind-speed',
    outputClass: 'screening',
    scale: {
      kind: 'ramp',
      unit: 'm/s',
      ramp: ramp([
        { at: 0, colour: '#F5F7FB' },
        { at: 2, colour: '#BFD3F2' },
        { at: 4, colour: '#5B8DEF' },
        { at: 6, colour: '#2F49D1' },
        { at: 8, colour: '#7B2FD1' },
        { at: 10, colour: '#C21FB3' },
      ]),
    },
  },
  'wind-comfort': {
    id: 'wind-comfort',
    outputClass: 'screening',
    scale: {
      kind: 'bands',
      bands: [
        band('sit', '#3B6EA8', SIT),
        band('stand', '#4FA3A5', STAND),
        band('stroll', '#E6DC9C', STROLL),
        band('walk', '#E39A4C', WALK),
        band('uncomfortable', '#C2452F', UNCOMFORTABLE),
        band('very-uncomfortable', '#962838', Infinity),
      ],
    },
  },
  'wind-delta': {
    id: 'wind-delta',
    outputClass: 'screening',
    scale: {
      kind: 'bands',
      bands: [
        band('much-calmer', '#1E3A8A', -0.3),
        band('calmer', '#93C5FD', -0.1),
        band('same', '#E5E7EB', 0.1),
        band('windier', '#FCA5A5', 0.3),
        band('much-windier', '#B91C1C', Infinity),
      ],
    },
  },
  noise: {
    id: 'noise',
    outputClass: 'mapped',
    scale: {
      kind: 'bands',
      bands: [
        band('db-45', '#C4D3C6', 50),
        band('db-50', '#9DB8A0', 55),
        band('db-55', '#D4D08A', 60),
        band('db-60', '#E0B25C', 65),
        band('db-65', '#CC7340', 70),
        band('db-70', '#9C2F2F', 75),
        band('db-75', '#6E1A2A', Infinity),
      ],
    },
  },
  slope: {
    id: 'slope',
    outputClass: 'calculated',
    scale: {
      kind: 'bands',
      bands: [
        band('under-5', '#E5E7EB', 5),
        band('5-15', '#E6DC9C', 15),
        band('15-30', '#E39A4C', 30),
        band('over-30', '#962838', Infinity),
      ],
    },
  },
  runoff: {
    id: 'runoff',
    outputClass: 'screening',
    // `below` mirrors the accumulating-area thresholds that separate flow path from main path; the
    // depression band is keyed on hollow depth, so its boundary is the area below which a hollow
    // reads as a depression in the legend order. Labels stay in runoff.ts.
    scale: {
      kind: 'bands',
      bands: [band('depression', '#93C5FD', 500), band('flow-path', '#3B6EA8', 5000), band('main-flow-path', '#1E3A8A', Infinity)],
    },
  },
}

/** The bands of a banded graphic, or [] when it is a ramp. */
export const bandsOf = (id: AnalysisGraphicId): readonly Band[] => {
  const scale = GRAPHICS[id].scale
  return scale.kind === 'bands' ? scale.bands : []
}

/** The ramp of a ramp graphic, or null when it is banded. */
export const rampOf = (id: AnalysisGraphicId): Ramp | null => {
  const scale = GRAPHICS[id].scale
  return scale.kind === 'ramp' ? scale.ramp : null
}

/** The colours of a ramp graphic, in stop order, or [] when it is banded. */
export const rampColours = (id: AnalysisGraphicId): readonly string[] => {
  const r = rampOf(id)
  return r ? r.stops.map((stop) => stop.colour) : []
}

/** Streamline endpoints (illustrative): slow deep blue → fast violet, from the wind family. */
export const STREAMLINE_COLOURS = { slow: '#1E3A8A', fast: '#7B2FD1' } as const

/**
 * Hex values used by more than one registered analysis, upper-cased and sorted. Expected non-empty
 * today (the design phase empties it in Gate 5). Streamlines and other renderer-only colours are
 * outside the registry and are not counted.
 */
export function sharedColours(): readonly string[] {
  const owners = new Map<string, Set<AnalysisGraphicId>>()
  for (const graphic of Object.values(GRAPHICS)) {
    const colours =
      graphic.scale.kind === 'ramp'
        ? graphic.scale.ramp.stops.map((stop) => stop.colour)
        : graphic.scale.bands.map((entry) => entry.colour)
    for (const colour of colours) {
      const key = colour.toUpperCase()
      const ids = owners.get(key) ?? new Set<AnalysisGraphicId>()
      ids.add(graphic.id)
      owners.set(key, ids)
    }
  }
  return [...owners]
    .filter(([, ids]) => ids.size > 1)
    .map(([hex]) => hex)
    .sort()
}

/** Whether the analysis on the map has data to show, is still solving, or is absent. */
export type LegendState = 'ready' | 'computing' | 'not-mapped' | 'unavailable-on-import'

/**
 * What `legendFor` needs beyond the graphic itself. The `claim` sentence is produced by the
 * analysis's existing caption function (windCaption, sunHoursDisclaimer, RUNOFF_NOTE,
 * noiseSourceLine, …) and passed in — those functions live in modules that import this one, so
 * importing them here would be a cycle. `legendFor` never authors claim text.
 */
export type LegendContext = {
  readonly claim: string
  readonly state?: LegendState
  /** Provenance / source lines, from the layer's provenance or source-line functions. */
  readonly sources?: readonly string[]
}

/** The plain model for the on-map legend of one analysis (04 §4.2); pure, no UI. */
export type LegendModel = {
  readonly id: AnalysisGraphicId
  readonly title: string
  readonly outputClass: OutputClass
  readonly classLabel: string
  readonly scale: AnalysisGraphic['scale']
  readonly claim: string
  readonly sources: readonly string[]
  readonly state: LegendState
}

export const CLASS_LABELS: Readonly<Record<OutputClass, string>> = {
  mapped: 'Mapped data',
  calculated: 'Calculated',
  screening: 'Screening',
  illustrative: 'Illustrative',
}

export const LEGEND_TITLES: Readonly<Record<AnalysisGraphicId, string>> = {
  'sun-hours': 'Sun hours',
  'roof-solar': 'Roof solar',
  vsc: 'Vertical sky component',
  'wind-speed': 'Wind speed',
  'wind-comfort': 'Wind comfort',
  'wind-delta': 'Wind change',
  noise: 'Road noise',
  slope: 'Slope',
  runoff: 'Runoff',
}

/**
 * Describes the legend of whichever analysis is on the map. The claim is the string the caption
 * blocks in `ViewportCanvas.tsx` show today for the same inputs; it is supplied, not authored, here.
 */
export function legendFor(id: AnalysisGraphicId, context: LegendContext): LegendModel {
  const graphic = GRAPHICS[id]
  return {
    id,
    title: LEGEND_TITLES[id],
    outputClass: graphic.outputClass,
    classLabel: CLASS_LABELS[graphic.outputClass],
    scale: graphic.scale,
    claim: context.claim,
    sources: context.sources ?? [],
    state: context.state ?? 'ready',
  }
}



