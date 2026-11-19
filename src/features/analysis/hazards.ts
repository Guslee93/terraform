import type { Vec2 } from '../../lib/coordinates'
import { pointInPolygon } from '../../lib/polygon'
import { sampleGrid } from './grid'

/**
 * Mapped hazards as presence facts (ADR-0036): whether an authority has mapped a hazard area here,
 * nearby, or not at all. Authority data shown as published. The studio never turns an absence into
 * "safe" and never states a depth, a probability or a safety class (feasibility 08 R1, R11).
 * Renderer-free.
 */

export const HAZARD_KINDS = ['flood-zones', 'flood-susceptibility', 'quick-clay', 'storm-surge'] as const
export type HazardKind = (typeof HAZARD_KINDS)[number]

export type HazardDefinition = {
  readonly owner: 'NVE' | 'Kartverket'
  /** What the fact is about, in the panel. */
  readonly label: string
  readonly dataset: string
  /** Geonorge WFS service and feature type. */
  readonly service: string
  readonly typeName: string
  /** What the map is, and is not, in one sentence. */
  readonly note: string
}

const GEONORGE_WFS = 'https://wfs.geonorge.no/skwms1/wfs.'
export const HAZARDS: Readonly<Record<HazardKind, HazardDefinition>> = {
  'flood-zones': {
    owner: 'NVE', label: 'Flood zones', dataset: 'Flomsoner (detailed flood-zone maps)',
    service: `${GEONORGE_WFS}flomsoner`, typeName: 'app:FlomAreal',
    note: 'Detailed flood-zone maps exist for selected river reaches only; most rivers have none.',
  },
  'flood-susceptibility': {
    owner: 'NVE', label: 'Flood susceptibility areas', dataset: 'Flom aktsomhetsområder',
    service: `${GEONORGE_WFS}flomaktsomhetsomrader`, typeName: 'app:FlomAktsomhetOmr',
    note: 'A national screening map of where flood hazard must be assessed; not a flood-zone map.',
  },
  'quick-clay': {
    owner: 'NVE', label: 'Quick-clay susceptibility areas', dataset: 'Aktsomhetskart for kvikkleireskred',
    service: `${GEONORGE_WFS}aktsomhetskartforkvikkleireskred`, typeName: 'app:AktsomhetsOmrKvikkleireskred',
    note: 'A screening map of where quick-clay hazard must be assessed; not a mapped hazard zone.',
  },
  'storm-surge': {
    owner: 'Kartverket', label: 'Storm surge, 200-year level in the 2100 climate', dataset: 'Stormflo og havnivå',
    service: `${GEONORGE_WFS}stormflo_havniva`, typeName: 'app:Stormflo200År_KlimaÅr2100',
    note: 'Modelled areas, not suited to detailed studies or decisions at detail level (publisher).',
  },
}

/** One hazard layer of a package. `polygons` are outlines with their holes, local ENU, clipped to the extent. */
export type HazardLayer = {
  readonly kind: HazardKind
  /** The newest update date among the features in the extent, YYYY-MM-DD; null when there are none. */
  readonly updated: string | null
  readonly polygons: readonly (readonly (readonly Vec2[])[])[]
}

export type Hazards = {
  /** The date the services were asked, YYYY-MM-DD. */
  readonly retrieved: string
  /** A kind that could not be asked is absent: the panel says "not checked", never "not mapped". */
  readonly layers: readonly HazardLayer[]
}

export type HazardStatus = 'here' | 'nearby' | 'not-mapped' | 'not-checked'

const inside = (rings: readonly (readonly Vec2[])[], x: number, y: number): boolean => {
  let within = false
  for (const ring of rings) if (pointInPolygon([x, y], ring)) within = !within
  return within
}

/**
 * Where a hazard is mapped relative to `area`: inside it, elsewhere in the package extent, or not
 * at all. A 5 m sample grid of the area and the polygon's own corners decide "inside".
 */
export function hazardStatus(layer: HazardLayer | undefined, area: readonly Vec2[]): HazardStatus {
  if (!layer) return 'not-checked'
  if (layer.polygons.length === 0) return 'not-mapped'
  const samples = sampleGrid(area, 5)
  const touches = layer.polygons.some((rings) =>
    samples.some((cell) => inside(rings, cell.x, cell.y)) || (rings[0] ?? []).some((point) => pointInPolygon(point, area)))
  return touches ? 'here' : 'nearby'
}

export type HazardFact = { readonly kind: HazardKind; readonly status: HazardStatus; readonly label: string; readonly statement: string; readonly source: string; readonly note: string }

/** The four facts for an area, in a fixed order. Wording per feasibility 08 §1: never "safe", never "no risk". */
export function hazardFacts(hazards: Hazards, area: readonly Vec2[]): HazardFact[] {
  return HAZARD_KINDS.map((kind) => {
    const definition = HAZARDS[kind]
    const layer = hazards.layers.find((entry) => entry.kind === kind)
    const status = hazardStatus(layer, area)
    const statement = status === 'here' ? 'Mapped here'
      : status === 'nearby' ? 'Mapped nearby (within the site extent)'
        : status === 'not-mapped' ? `Not mapped by ${definition.owner}`
          : 'Not checked: the service did not answer'
    const dated = layer?.updated ? `, map updated ${layer.updated}` : ''
    return { kind, status, label: definition.label, statement, source: `Source: ${definition.owner} (${definition.dataset}), retrieved ${hazards.retrieved}${dated}`, note: definition.note }
  })
}

export const HAZARD_DISCLAIMER = '“Not mapped” means the authority has no mapped area here. It is not a statement that the site is safe.'

export function parseHazards(value: unknown): Hazards & { siteId: string } {
  const fail = (path: string, message: string): never => { throw new Error(`${path}: ${message}`) }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) fail('hazards', 'expected an object')
  const root = value as Record<string, unknown>
  if (root.schemaVersion !== 1) fail('hazards.schemaVersion', 'unsupported schema version')
  if (typeof root.siteId !== 'string' || root.siteId === '') fail('hazards.siteId', 'expected a string')
  const date = (entry: unknown, path: string): string => (typeof entry === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(entry) ? entry : fail(path, 'expected a YYYY-MM-DD date'))
  if (!Array.isArray(root.layers) || root.layers.length > HAZARD_KINDS.length) fail('hazards.layers', 'expected at most one layer per kind')
  const seen = new Set<string>()
  const layers = (root.layers as unknown[]).map((entry, index): HazardLayer => {
    const path = `hazards.layers[${index}]`
    if (typeof entry !== 'object' || entry === null) fail(path, 'expected an object')
    const item = entry as Record<string, unknown>
    if (!HAZARD_KINDS.includes(item.kind as HazardKind)) fail(`${path}.kind`, 'unknown hazard kind')
    if (seen.has(item.kind as string)) fail(`${path}.kind`, 'listed twice')
    seen.add(item.kind as string)
    if (!Array.isArray(item.polygons) || item.polygons.length > 20_000) fail(`${path}.polygons`, 'expected an array')
    const polygons = (item.polygons as unknown[]).map((polygon, polygonIndex) => {
      if (!Array.isArray(polygon) || polygon.length === 0) fail(`${path}.polygons[${polygonIndex}]`, 'expected at least one ring')
      return (polygon as unknown[]).map((ring, ringIndex) => {
        if (!Array.isArray(ring) || ring.length < 3) fail(`${path}.polygons[${polygonIndex}][${ringIndex}]`, 'expected at least three points')
        return (ring as unknown[]).map((point): Vec2 => {
          const [east, north] = Array.isArray(point) && point.length === 2 ? (point as unknown[]) : []
          if (typeof east !== 'number' || typeof north !== 'number' || !Number.isFinite(east) || !Number.isFinite(north)) return fail(`${path}.polygons[${polygonIndex}][${ringIndex}]`, 'expected [east, north] points')
          return [east, north]
        })
      })
    })
    return { kind: item.kind as HazardKind, updated: item.updated === null || item.updated === undefined ? null : date(item.updated, `${path}.updated`), polygons }
  })
  return { siteId: root.siteId as string, retrieved: date(root.retrieved, 'hazards.retrieved'), layers }
}
