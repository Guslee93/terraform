import type { Parcel } from '../analysis/parcels'
import type { Bounds, Origin } from './frame'
import { gmlMembers, gmlPolygons } from './gml'
import { requestBytes } from './request'

/**
 * Kartverket's eiendomskart (matrikkel teig) as local ENU parcels (ADR-0035). Taken from the WFS
 * dataset (CC BY 4.0), never from the matrikkelkart WMS tiles (Geovekst rights, feasibility 09 §4).
 * The WFS is asked for WGS84 and every vertex goes through the app's own projection.
 */

export const PARCEL_WFS_URL = 'https://wfs.geonorge.no/skwms1/wfs.matrikkelen-eiendomskart-teig'
/** More parcels than this in one answer means the answer may be cut short: refuse it. */
export const PARCEL_MAX_FEATURES = 5000

/**
 * GetFeature for every parcel in a WGS84 box [west, south, east, north]. Always the whole extent:
 * a box of a few metres around a point returned no feature where a 25 m box returned the parcel
 * (feasibility IT-5), so a parcel is looked up in this answer, never by a request of its own.
 */
export function parcelRequestUrl(lonLat: Bounds): string {
  const [west, south, east, north] = lonLat.map((value) => value.toFixed(7))
  // urn:…:4326 is latitude first, in the box and in the answer.
  return `${PARCEL_WFS_URL}?service=WFS&version=2.0.0&request=GetFeature&typeNames=app:Teig&srsName=urn:ogc:def:crs:EPSG::4326&count=${PARCEL_MAX_FEATURES}&bbox=${south},${west},${north},${east},urn:ogc:def:crs:EPSG::4326`
}

const tag = (xml: string, name: string): string | null => new RegExp(`<app:${name}>([^<]*)</app:${name}>`).exec(xml)?.[1]?.trim() || null

/**
 * The parcels of a GML 3.2 answer that touch `extent` ([minX, minY, maxX, maxY], local ENU). A
 * parcel is kept whole, never clipped: its area must be the area of the registered outline.
 */
export function parcelsFromGml(gml: string, origin: Origin, extent: Bounds): Parcel[] {
  const members = gmlMembers(gml, 'Parcels')
  if (members.length >= PARCEL_MAX_FEATURES) throw new Error(`Parcels: the answer reached the ${PARCEL_MAX_FEATURES}-feature limit and may be incomplete`)
  const parcels: Parcel[] = []
  for (const member of members) {
    const teigId = tag(member, 'teigId')
    if (!teigId) throw new Error('Parcels: a feature has no teigId')
    const [municipality, gnr, bnr] = [tag(member, 'kommunenummer'), tag(member, 'gardsnummer'), tag(member, 'bruksnummer')]
    const matrikkel = municipality && gnr && bnr && Number(gnr) > 0 ? `${municipality}-${gnr}/${bnr}` : null
    const updated = tag(member, 'oppdateringsdato')?.slice(0, 10) ?? null
    gmlPolygons(member, origin).forEach((rings, index) => {
      const outline = rings[0]!
      const xs = outline.map((point) => point[0]), ys = outline.map((point) => point[1])
      if (Math.max(...xs) < extent[0] || Math.min(...xs) > extent[2] || Math.max(...ys) < extent[1] || Math.min(...ys) > extent[3]) return
      parcels.push({ id: index === 0 ? teigId : `${teigId}-${index + 1}`, matrikkel, updated: updated && /^\d{4}-\d{2}-\d{2}$/.test(updated) ? updated : null, rings })
    })
  }
  return parcels
}

/** The live parcel map for an import frame. */
export interface ParcelSource {
  covers(lat: number, lon: number): boolean
  fetchParcels(lonLat: Bounds, origin: Origin, extent: Bounds, signal?: AbortSignal): Promise<Parcel[]>
}

export function kartverketParcels(): ParcelSource {
  return {
    covers: (lat, lon) => lat >= 57.9 && lat <= 71.5 && lon >= 4 && lon <= 31.5,
    async fetchParcels(lonLat, origin, extent, signal) {
      const bytes = await requestBytes(parcelRequestUrl(lonLat), 'Kartverket eiendomskart', signal, 60_000)
      return parcelsFromGml(new TextDecoder().decode(bytes), origin, extent)
    },
  }
}
