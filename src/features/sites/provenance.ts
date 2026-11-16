import { SitePackageError, type SiteSource } from './manifest'

/**
 * Layer provenance (ADR-0032): every layer the studio draws says who owns the data, which dataset
 * it is, under which licence, when it was retrieved, which year the data describe and what it must
 * not be used for. Renderer-free.
 */

export const LICENCES = ['CC BY 4.0', 'NLOD 1.0', 'ODbL 1.0', 'no conditions'] as const
export type Licence = (typeof LICENCES)[number]

/** Where each licence text lives; the fallback when a synthesised entry has no link of its own. */
export const LICENCE_URL: Record<Licence, string> = {
  'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
  'NLOD 1.0': 'https://data.norge.no/nlod/en/1.0',
  'ODbL 1.0': 'https://opendatacommons.org/licenses/odbl/1-0/',
  'no conditions': 'https://www.kartverket.no/en/api-and-data/terms-of-use',
}

/** The layers a package can carry. `heights` is separate from `buildings` on purpose (ADR-0033). */
export const LAYER_IDS = ['terrain', 'buildings', 'heights', 'roads', 'trees', 'landcover', 'noise', 'parcels', 'flood-zones', 'flood-susceptibility', 'quick-clay', 'storm-surge', 'terrain1m'] as const
export type LayerId = (typeof LAYER_IDS)[number]

export type LayerProvenance = {
  /** The layer this entry describes. */
  id: LayerId
  owner: string
  dataset: string
  /** Geonorge metadata uuid, where the dataset has one. */
  datasetUuid?: string
  url: string
  licence: Licence
  licenceUrl: string
  /** The credit line as the licensor asks for it. */
  attribution: string
  /** ISO date the data were fetched. */
  retrieved: string
  /** The year the data describe, read from the data themselves, never from catalogue prose. */
  dataYear?: number
  /** What the publisher says the data must not be used for. */
  useLimitation?: string
}

/** NLOD's default attribution wording (feasibility 09 §4). */
export const nlodAttribution = (owner: string) =>
  `Contains data under the Norwegian licence for Open Government data (NLOD) distributed by ${owner}`

function fail(path: string, message: string): never {
  throw new SitePackageError(message, path)
}

function text(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.trim() === '') fail(path, 'expected a non-empty string')
  return value
}

function link(value: unknown, path: string): string {
  const url = text(value, path)
  if (!/^https:\/\//.test(url)) fail(path, 'expected an https link')
  return url
}

export function parseLayerProvenance(value: unknown, path: string): LayerProvenance {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) fail(path, 'expected an object')
  const record = value as Record<string, unknown>
  const id = text(record.id, `${path}.id`)
  if (!(LAYER_IDS as readonly string[]).includes(id)) fail(`${path}.id`, `unknown layer "${id}"`)
  const licence = text(record.licence, `${path}.licence`)
  if (!(LICENCES as readonly string[]).includes(licence)) fail(`${path}.licence`, `unknown licence "${licence}"`)
  const retrieved = text(record.retrieved, `${path}.retrieved`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(retrieved)) fail(`${path}.retrieved`, 'expected a YYYY-MM-DD date')
  const dataYear = record.dataYear
  if (dataYear !== undefined && (typeof dataYear !== 'number' || !Number.isInteger(dataYear) || dataYear < 1900 || dataYear > 2100)) {
    fail(`${path}.dataYear`, 'expected a year')
  }
  return {
    id: id as LayerId,
    owner: text(record.owner, `${path}.owner`),
    dataset: text(record.dataset, `${path}.dataset`),
    ...(record.datasetUuid === undefined ? {} : { datasetUuid: text(record.datasetUuid, `${path}.datasetUuid`) }),
    url: link(record.url, `${path}.url`),
    licence: licence as Licence,
    licenceUrl: link(record.licenceUrl, `${path}.licenceUrl`),
    attribution: text(record.attribution, `${path}.attribution`),
    retrieved,
    ...(dataYear === undefined ? {} : { dataYear }),
    ...(record.useLimitation === undefined ? {} : { useLimitation: text(record.useLimitation, `${path}.useLimitation`) }),
  }
}

export function parseLayers(value: unknown, path: string): LayerProvenance[] {
  if (!Array.isArray(value)) fail(path, 'expected an array')
  const layers = value.map((entry, index) => parseLayerProvenance(entry, `${path}[${index}]`))
  const seen = new Set<string>()
  for (const layer of layers) {
    if (seen.has(layer.id)) fail(path, `layer "${layer.id}" is listed twice`)
    seen.add(layer.id)
  }
  return layers
}

/** The layers an older `sources` entry stands for, judged by its title. */
function layersOf(source: SiteSource): LayerId[] {
  if (/surface model|\bDOM\b/i.test(source.title)) return ['heights']
  if (/terrain|elevation|høyde|DTM/i.test(source.title)) return ['terrain']
  return ['buildings', 'roads', 'trees', 'landcover']
}

/**
 * Packages written before ADR-0032 list `sources` only. Each source with a known licence becomes
 * one entry per layer it stands for; a source that cannot be expressed (no link, an unlisted
 * licence) is returned in `unlisted`, so its credit is still shown as written.
 */
export function layersFromSources(sources: readonly SiteSource[]): { layers: LayerProvenance[]; unlisted: SiteSource[] } {
  const layers: LayerProvenance[] = []
  const unlisted: SiteSource[] = []
  for (const source of sources) {
    const licence = LICENCES.find((known) => source.license?.includes(known))
    if (!licence || !source.url || !/^https:\/\//.test(source.url) || !source.attribution || !source.acquiredAt) {
      unlisted.push(source)
      continue
    }
    for (const id of layersOf(source)) {
      if (layers.some((layer) => layer.id === id)) continue
      layers.push({
        id,
        owner: source.attribution.replace(/^©\s*/, '').split(' · ')[0] ?? source.attribution,
        dataset: source.title,
        url: source.url,
        licence,
        licenceUrl: LICENCE_URL[licence],
        attribution: source.attribution.split(' · ')[0] ?? source.attribution,
        retrieved: source.acquiredAt.slice(0, 10),
      })
    }
  }
  return { layers, unlisted }
}

/** A package's layers: the ones it declares, then the ones its older `sources` stand for. */
export function siteLayers(manifest: { readonly sources: readonly SiteSource[]; readonly layers?: readonly LayerProvenance[] }): { layers: LayerProvenance[]; unlisted: SiteSource[] } {
  const declared = manifest.layers ?? []
  const synthesised = layersFromSources(manifest.sources)
  return {
    layers: [...declared, ...synthesised.layers.filter((layer) => !declared.some((own) => own.id === layer.id))],
    unlisted: synthesised.unlisted,
  }
}

/** One credit per distinct source among `layers`: layers that share a dataset share a line. */
export type Credit = Omit<LayerProvenance, 'id'> & { readonly ids: readonly LayerId[] }

export function credits(layers: readonly LayerProvenance[], visible: ReadonlySet<LayerId>): Credit[] {
  const out: (Omit<LayerProvenance, 'id'> & { ids: LayerId[] })[] = []
  for (const { id, ...rest } of layers) {
    if (!visible.has(id)) continue
    const same = out.find((credit) => credit.dataset === rest.dataset && credit.owner === rest.owner && credit.licence === rest.licence)
    if (same) same.ids.push(id)
    else out.push({ ...rest, ids: [id] })
  }
  return out
}

/** The credit as one line of text, for exports: "© Kartverket · Kartverket DTM1 elevation · CC BY 4.0". */
export function creditLine(credit: Credit): string {
  return `${credit.attribution} · ${credit.dataset}${credit.dataYear === undefined ? '' : ` (${credit.dataYear})`} · ${credit.licence === 'no conditions' ? 'open data' : credit.licence}`
}

/** The scene's layer switches, as far as provenance cares. */
export type LayerSwitches = { readonly terrain: boolean; readonly ground: boolean; readonly context: boolean; readonly streets: boolean; readonly trees: boolean; readonly parcels?: boolean }

/** The layers on screen: the switched-on scene layers plus the overlays an open analysis draws. */
export function visibleLayerIds(switches: LayerSwitches, overlays: readonly LayerId[] = []): Set<LayerId> {
  const ids = new Set<LayerId>(overlays)
  if (switches.terrain) ids.add('terrain')
  if (switches.ground) ids.add('landcover')
  // Context buildings are OSM footprints at heights from another source: both are on screen.
  if (switches.context) { ids.add('buildings'); ids.add('heights') }
  if (switches.streets) ids.add('roads')
  if (switches.trees) ids.add('trees')
  if (switches.parcels) ids.add('parcels')
  return ids
}

/** The lines an export carries: one per visible credit, then any source the contract cannot express. */
export function exportCreditLines(manifest: Parameters<typeof siteLayers>[0], visible: ReadonlySet<LayerId>): string[] {
  const { layers, unlisted } = siteLayers(manifest)
  return [...credits(layers, visible).map(creditLine), ...unlisted.flatMap((source) => (source.attribution ? [source.attribution] : []))]
}

/** The package's building heights are measured from a surface model, not estimated from storeys. */
export function hasMeasuredHeights(manifest: Parameters<typeof siteLayers>[0]): boolean {
  return siteLayers(manifest).layers.some((layer) => layer.id === 'heights')
}
