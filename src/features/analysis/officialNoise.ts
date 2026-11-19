import type { Vec2 } from '../../lib/coordinates'
import { pointInPolygon, ringCentroid } from '../../lib/polygon'
import { footprintTester, sampleGrid, type FootprintBuilding } from './grid'

/**
 * The official strategic road-noise map (Statens vegvesen, CNOSSOS-EU), as mapped 5 dB bands
 * (ADR-0034). Authority data shown as published: the studio looks bands up, it computes no level.
 * The publisher's limitation is binding (feasibility 09 §2a): area bands only, never a value for a
 * building, never a verdict. Renderer-free.
 */

export const NOISE_METRICS = ['Lden', 'Lnight'] as const
export type NoiseMetric = (typeof NOISE_METRICS)[number]

/** One mapped area: `rings` are an outline and its holes (buildings), filled even-odd. Local ENU metres. */
export type NoisePolygon = { readonly metric: NoiseMetric; readonly bandLow: number; readonly rings: readonly (readonly Vec2[])[] }

export type OfficialNoise = {
  /** The calculation year carried by the features themselves (`BEREGNETÅR`), never catalogue prose. */
  readonly dataYear: number
  readonly polygons: readonly NoisePolygon[]
}

export const NOISE_OWNER = 'Statens vegvesen'
/** The publisher's use limitation, verbatim (Geonorge record 4bbae38e-4718-481d-9827-237cd5e115c8). */
export const NOISE_USE_LIMITATION = 'Datasettet skal ikke brukes til å vurdere behov for tiltak på enkeltbygg. Det må utføres egne beregninger for dette.'
/** Its short English form, shown with the layer and burned into exports. */
export const NOISE_LIMITATION = 'Not for assessing individual buildings.'
export const NO_NOISE_MAP = 'No strategic noise map here'
/** The only statement the studio makes about a drawn block in a mapped band (feasibility 09 §2a). */
export const NOISE_SENSITIVE_NOTE = 'Noise-sensitive development here requires a detailed noise calculation (Statens vegvesen; T-1442).'
/** Lden band from which the note above is shown. */
export const NOISE_SENSITIVE_FROM_DB = 55
export const NOISE_METRIC_NAME: Record<NoiseMetric, string> = { Lden: 'day–evening–night level', Lnight: 'night level' }

/** "Road noise, Lden 2021 (Statens vegvesen strategic noise map, CNOSSOS-EU). 5 dB bands. Not for…" */
export const noiseSourceLine = (metric: NoiseMetric, dataYear: number) =>
  `Road noise, ${metric} ${dataYear} (${NOISE_OWNER} strategic noise map, CNOSSOS-EU). 5 dB bands. ${NOISE_LIMITATION}`

/** The claim a closed card and the map caption carry. */
export const OFFICIAL_NOISE_NOTE = `Mapped road-noise bands, as published — static context, not an analysis of your design. ${NOISE_LIMITATION}`

/** The top band of the map is open-ended. */
const TOP_BAND_DB = 75
export const bandLabel = (bandLow: number) => (bandLow >= TOP_BAND_DB ? `${TOP_BAND_DB} dB and above` : `${bandLow}–${bandLow + 5} dB`)

/**
 * Band colours: the studio's existing noise swatches, one per 5 dB band, low to high.
 * To be revisited in the design phase (the plan pauses visual work).
 */
export const NOISE_BAND_COLOUR: Readonly<Record<number, string>> = {
  45: '#C4D3C6', 50: '#9DB8A0', 55: '#D4D08A', 60: '#E0B25C', 65: '#CC7340', 70: '#9C2F2F', 75: '#6E1A2A',
}
export const bandColour = (bandLow: number) => NOISE_BAND_COLOUR[Math.min(TOP_BAND_DB, Math.max(45, bandLow))] ?? '#9C2F2F'

export function parseOfficialNoise(value: unknown): OfficialNoise & { siteId: string } {
  const fail = (path: string, message: string): never => { throw new Error(`${path}: ${message}`) }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) fail('noise', 'expected an object')
  const root = value as Record<string, unknown>
  if (root.schemaVersion !== 1) fail('noise.schemaVersion', 'unsupported schema version')
  if (typeof root.siteId !== 'string' || root.siteId === '') fail('noise.siteId', 'expected a string')
  const dataYear = root.dataYear
  if (typeof dataYear !== 'number' || !Number.isInteger(dataYear) || dataYear < 1990 || dataYear > 2100) fail('noise.dataYear', 'expected a year')
  if (!Array.isArray(root.polygons) || root.polygons.length > 20_000) fail('noise.polygons', 'expected at most 20000 polygons')
  const polygons = (root.polygons as unknown[]).map((entry, index): NoisePolygon => {
    const path = `noise.polygons[${index}]`
    if (typeof entry !== 'object' || entry === null) fail(path, 'expected an object')
    const item = entry as Record<string, unknown>
    if (!NOISE_METRICS.includes(item.metric as NoiseMetric)) fail(`${path}.metric`, 'expected Lden or Lnight')
    const bandLow = item.bandLow
    if (typeof bandLow !== 'number' || !Number.isInteger(bandLow) || bandLow < 30 || bandLow > 90 || bandLow % 5 !== 0) fail(`${path}.bandLow`, 'expected a 5 dB band between 30 and 90')
    if (!Array.isArray(item.rings) || item.rings.length === 0) fail(`${path}.rings`, 'expected at least one ring')
    const rings = (item.rings as unknown[]).map((ring, ringIndex) => {
      if (!Array.isArray(ring) || ring.length < 3) fail(`${path}.rings[${ringIndex}]`, 'expected at least three points')
      return (ring as unknown[]).map((point, pointIndex): Vec2 => {
        const [east, north] = Array.isArray(point) && point.length === 2 ? (point as unknown[]) : []
        if (typeof east !== 'number' || typeof north !== 'number' || !Number.isFinite(east) || !Number.isFinite(north)) return fail(`${path}.rings[${ringIndex}][${pointIndex}]`, 'expected [east, north]')
        return [east, north]
      })
    })
    return { metric: item.metric as NoiseMetric, bandLow: bandLow as number, rings }
  })
  return { siteId: root.siteId as string, dataYear: dataYear as number, polygons }
}

/** A band lookup for one metric: the highest band whose area holds the point, or null when none does. */
export type BandLookup = (x: number, y: number) => number | null

export function bandLookup(polygons: readonly NoisePolygon[], metric: NoiseMetric): BandLookup {
  // Highest band first, so the first hit is the answer where bands are nested.
  const boxed = polygons.filter((polygon) => polygon.metric === metric).sort((a, b) => b.bandLow - a.bandLow).map((polygon) => {
    const outline = polygon.rings.flat()
    const xs = outline.map((point) => point[0])
    const ys = outline.map((point) => point[1])
    return { polygon, minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) }
  })
  return (x, y) => {
    for (const { polygon, minX, maxX, minY, maxY } of boxed) {
      if (x < minX || x > maxX || y < minY || y > maxY) continue
      // Even-odd over the outline and its holes: inside an odd number of rings is inside the area.
      let inside = false
      for (const ring of polygon.rings) if (pointInPolygon([x, y], ring)) inside = !inside
      if (inside) return polygon.bandLow
    }
    return null
  }
}

export type BandShare = { readonly bandLow: number; readonly count: number; readonly share: number }
export type NoiseShares = {
  /** Open-ground samples in the area. */
  readonly assessed: number
  /** Mapped bands present in the area, low to high. Shares are of all open ground. */
  readonly bands: readonly BandShare[]
  /** Open ground in no mapped band: below the map's lowest band, or not mapped. Never "quiet". */
  readonly unmapped: { readonly count: number; readonly share: number }
  /** False when the metric has no polygon anywhere in the package: there is no map here. */
  readonly mapped: boolean
}

/** Share of the open ground in `area` in each mapped band. Buildings are not ground. */
export function bandShares(noise: OfficialNoise | null, metric: NoiseMetric, area: readonly Vec2[], buildings: readonly FootprintBuilding[], cellM = 4): NoiseShares {
  const polygons = noise?.polygons.filter((polygon) => polygon.metric === metric) ?? []
  const lookup = bandLookup(polygons, metric)
  const built = footprintTester(buildings)
  const counts = new Map<number, number>()
  let assessed = 0
  let unmapped = 0
  for (const cell of sampleGrid(area, cellM)) {
    if (built(cell.x, cell.y)) continue
    assessed += 1
    const band = lookup(cell.x, cell.y)
    if (band === null) unmapped += 1
    else counts.set(band, (counts.get(band) ?? 0) + 1)
  }
  const share = (count: number) => (assessed ? count / assessed : 0)
  return {
    assessed,
    bands: [...counts].sort((a, b) => a[0] - b[0]).map(([bandLow, count]) => ({ bandLow, count, share: share(count) })),
    unmapped: { count: unmapped, share: share(unmapped) },
    mapped: polygons.length > 0,
  }
}

/** The mapped band covering the largest share of the open ground, or null when no band is present. */
export function largestBand(shares: NoiseShares): BandShare | null {
  return shares.bands.reduce<BandShare | null>((best, band) => (best === null || band.count > best.count ? band : best), null)
}

/**
 * Whether a drawn footprint touches a mapped Lden band at or above 55 dB: its corners, its centroid
 * and points every 2 m along its edges. A yes/no only: the studio never states a level for a block.
 */
export function footprintInSensitiveBand(lookup: BandLookup, footprint: readonly Vec2[]): boolean {
  const points: Vec2[] = footprint.length >= 3 ? [ringCentroid(footprint)] : []
  footprint.forEach((a, index) => {
    const b = footprint[(index + 1) % footprint.length]
    if (!b) return
    const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2))
    for (let step = 0; step < steps; step += 1) points.push([a[0] + ((b[0] - a[0]) * step) / steps, a[1] + ((b[1] - a[1]) * step) / steps])
  })
  return points.some(([x, y]) => (lookup(x, y) ?? 0) >= NOISE_SENSITIVE_FROM_DB)
}
