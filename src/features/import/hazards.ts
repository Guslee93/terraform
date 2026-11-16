import { HAZARD_KINDS, HAZARDS, type HazardKind, type HazardLayer, type Hazards } from '../analysis/hazards'
import type { Bounds, Origin } from './frame'
import { clipRing, ringArea, simplifyRing } from './geometry'
import { gmlMembers, gmlPolygons } from './gml'
import { requestBytes } from './request'

/**
 * NVE's and Kartverket's hazard maps as local ENU polygons (ADR-0036). One converter for the
 * curated build step and the live import; WGS84 from the WFS, the app's own projection per vertex.
 */

/** More features than this in one answer means it may be cut short: refuse it. */
export const HAZARD_MAX_FEATURES = 2000
const SIMPLIFY_M = 1
const MIN_RING_M2 = 4

/** GetFeature for one hazard kind over a WGS84 box [west, south, east, north]. */
export function hazardRequestUrl(kind: HazardKind, lonLat: Bounds): string {
  const [west, south, east, north] = lonLat.map((value) => value.toFixed(7))
  const { service, typeName } = HAZARDS[kind]
  return `${service}?service=WFS&version=2.0.0&request=GetFeature&typeNames=${encodeURIComponent(typeName)}&srsName=urn:ogc:def:crs:EPSG::4326&count=${HAZARD_MAX_FEATURES}&bbox=${south},${west},${north},${east},urn:ogc:def:crs:EPSG::4326`
}

/**
 * One hazard layer from a WFS answer: every polygon clipped to `extent` and simplified at 1 m. A
 * feature whose box touches the request but whose area does not reach the extent leaves nothing,
 * so "mapped" always means an area inside the extent.
 */
export function hazardLayerFromGml(gml: string, kind: HazardKind, origin: Origin, extent: Bounds): HazardLayer {
  const members = gmlMembers(gml, HAZARDS[kind].dataset)
  if (members.length >= HAZARD_MAX_FEATURES) throw new Error(`${HAZARDS[kind].dataset}: the answer reached the ${HAZARD_MAX_FEATURES}-feature limit and may be incomplete`)
  const polygons: [number, number][][][] = []
  const dates: string[] = []
  for (const member of members) {
    let kept = false
    for (const rings of gmlPolygons(member, origin)) {
      const clipped: [number, number][][] = []
      for (const [index, ring] of rings.entries()) {
        const cut = clipRing(ring, extent)
        const simple = cut.length >= 3 ? simplifyRing(cut, SIMPLIFY_M) : []
        const ok = simple.length >= 3 && ringArea(simple) >= MIN_RING_M2
        // An outline that is clipped away takes its holes with it.
        if (index === 0 && !ok) break
        if (ok) clipped.push(simple.map(([x, y]) => [Number(x.toFixed(1)), Number(y.toFixed(1))]))
      }
      if (clipped.length > 0) { polygons.push(clipped); kept = true }
    }
    const updated = /<app:oppdateringsdato>(\d{4}-\d{2}-\d{2})/.exec(member)?.[1]
    if (kept && updated) dates.push(updated)
  }
  return { kind, updated: dates.sort().at(-1) ?? null, polygons }
}

/** The live hazard maps for an import frame. */
export interface HazardSource {
  covers(lat: number, lon: number): boolean
  /** A kind whose service fails is left out of `layers` and named in `failures`. */
  fetchHazards(lonLat: Bounds, origin: Origin, extent: Bounds, signal?: AbortSignal): Promise<{ hazards: Hazards; failures: string[] }>
}

export function geonorgeHazards(): HazardSource {
  return {
    covers: (lat, lon) => lat >= 57.9 && lat <= 71.5 && lon >= 4 && lon <= 31.5,
    async fetchHazards(lonLat, origin, extent, signal) {
      const failures: string[] = []
      // The four services are asked together: the slowest has taken 20 s for one Oslo frame.
      const layers = await Promise.all(HAZARD_KINDS.map(async (kind) => {
        try {
          const bytes = await requestBytes(hazardRequestUrl(kind, lonLat), HAZARDS[kind].dataset, signal, 45_000)
          return hazardLayerFromGml(new TextDecoder().decode(bytes), kind, origin, extent)
        } catch (error) {
          if (signal?.aborted) throw error
          failures.push(error instanceof Error ? error.message : `${HAZARDS[kind].dataset}: request failed`)
          return null
        }
      }))
      return { hazards: { retrieved: new Date().toISOString().slice(0, 10), layers: layers.filter((layer): layer is HazardLayer => layer !== null) }, failures }
    },
  }
}
