import { NOISE_METRICS, type NoiseMetric, type NoisePolygon, type OfficialNoise } from '../analysis/officialNoise'
import { requestBytes } from './request'
import type { Bounds, Origin } from './frame'
import { clipRing, ringArea, simplifyRing, toLocal, type Ring } from './geometry'

/**
 * Statens vegvesen's strategic road-noise map as local ENU polygons (ADR-0034). One converter for
 * the curated build step and the live import. The WFS is asked for WGS84, and every vertex goes
 * through the app's own projection (`toLocal`), so the bands register with the terrain and the
 * buildings; UTM offsets are never used as ENU (feasibility 09 §1).
 */

export const NOISE_WFS_URL = 'https://www.vegvesen.no/kart/ogc/norstoy_1_0/ows'
export const NOISE_DATASET_UUID = '4bbae38e-4718-481d-9827-237cd5e115c8'
export const NOISE_TYPE_NAME: Record<NoiseMetric, string> = { Lden: 'norstoy_1_0:Strategiskstoykart_lden', Lnight: 'norstoy_1_0:Strategiskstoykart_lnight' }

/** GetFeature for one metric over a WGS84 box [west, south, east, north], answered in WGS84 GeoJSON. */
export function noiseRequestUrl(metric: NoiseMetric, lonLat: Bounds): string {
  const bbox = lonLat.map((value) => value.toFixed(7)).join(',')
  return `${NOISE_WFS_URL}?service=WFS&version=2.0.0&request=GetFeature&typeNames=${NOISE_TYPE_NAME[metric]}&outputFormat=application/json&srsName=EPSG:4326&bbox=${bbox},EPSG:4326`
}

/** Vertices closer than this are one vertex: far below the accuracy of a strategic noise map. */
const SIMPLIFY_M = 0.4
const MIN_RING_M2 = 2

/**
 * The features of one metric as ENU polygons clipped to `extent` ([minX, minY, maxX, maxY]), and
 * the calculation year the features carry. Features run for kilometres past any site, so each
 * ring is clipped to the extent; holes (buildings) are kept as rings of their polygon.
 */
export function noiseFromGeoJson(collection: unknown, metric: NoiseMetric, origin: Origin, extent: Bounds): { polygons: NoisePolygon[]; dataYear: number | null } {
  const features = (collection as { features?: unknown } | null)?.features
  if (!Array.isArray(features)) throw new Error('Noise map: not a GeoJSON feature collection')
  const polygons: NoisePolygon[] = []
  const years = new Set<number>()
  for (const feature of features as { properties?: Record<string, unknown>; geometry?: { type?: string; coordinates?: unknown } }[]) {
    const bandLow = Number(feature.properties?.['STØYINTERVALL'])
    if (!Number.isInteger(bandLow) || bandLow % 5 !== 0) throw new Error(`Noise map: unexpected band "${String(feature.properties?.['STØYINTERVALL'])}"`)
    const year = Number(feature.properties?.['BEREGNETÅR'])
    if (Number.isInteger(year)) years.add(year)
    const geometry = feature.geometry
    const parts = geometry?.type === 'Polygon' ? [geometry.coordinates] : geometry?.type === 'MultiPolygon' ? geometry.coordinates : null
    if (!Array.isArray(parts)) throw new Error('Noise map: expected polygon geometry')
    for (const part of parts as number[][][][]) {
      const rings: Ring[] = []
      for (const [index, ring] of part.entries()) {
        const clipped = clipRing(toLocal(ring, origin), extent)
        const simple = clipped.length >= 3 ? simplifyRing(clipped, SIMPLIFY_M) : []
        const kept = simple.length >= 3 && ringArea(simple) >= MIN_RING_M2
        // An outline that is clipped or filtered away takes its holes with it.
        if (index === 0 && !kept) break
        if (kept) rings.push(simple.map(([x, y]) => [Number(x.toFixed(1)), Number(y.toFixed(1))]))
      }
      if (rings.length > 0) polygons.push({ metric, bandLow, rings })
    }
  }
  if (years.size > 1) throw new Error(`Noise map: features carry more than one calculation year (${[...years].join(', ')})`)
  return { polygons, dataYear: [...years][0] ?? null }
}

/** The live road-noise map for an import frame. */
export interface NoiseSource {
  covers(lat: number, lon: number): boolean
  /** Null when the service maps nothing in the frame: there is no strategic noise map there. */
  fetchNoise(lonLat: Bounds, origin: Origin, extent: Bounds, signal?: AbortSignal): Promise<OfficialNoise | null>
}

export function statensVegvesenNoise(): NoiseSource {
  return {
    // The same coverage hint as the Kartverket providers: the map is Norwegian.
    covers: (lat, lon) => lat >= 57.9 && lat <= 71.5 && lon >= 4 && lon <= 31.5,
    async fetchNoise(lonLat, origin, extent, signal) {
      const polygons: NoisePolygon[] = []
      const years = new Set<number>()
      for (const metric of NOISE_METRICS) {
        const bytes = await requestBytes(noiseRequestUrl(metric, lonLat), 'Statens vegvesen noise map', signal)
        const converted = noiseFromGeoJson(JSON.parse(new TextDecoder().decode(bytes)), metric, origin, extent)
        polygons.push(...converted.polygons)
        if (converted.dataYear !== null) years.add(converted.dataYear)
      }
      const dataYear = [...years][0]
      if (polygons.length === 0 || dataYear === undefined) return null
      // The year shown is the features' own; two years in one frame cannot be shown as one.
      if (years.size > 1) throw new Error('Statens vegvesen noise map: more than one calculation year in the frame')
      return { dataYear, polygons }
    },
  }
}
