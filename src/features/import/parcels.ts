import type { Parcel } from '../analysis/parcels'
import type { Bounds, Origin } from './frame'
import { project } from './projection'
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

function ring(posList: string, origin: Origin): [number, number][] {
  const values = posList.trim().split(/\s+/).map(Number)
  if (values.length < 8 || values.length % 2 !== 0 || values.some((value) => !Number.isFinite(value))) throw new Error('Parcels: malformed coordinate list')
  const points: [number, number][] = []
  for (let index = 0; index < values.length; index += 2) {
    const [x, y] = project(values[index]!, values[index + 1]!, origin.latitude, origin.longitude)
    points.push([Number(x.toFixed(2)), Number(y.toFixed(2))])
  }
  // GML rings repeat their first point; the package stores open rings.
  const first = points[0]!, last = points[points.length - 1]!
  if (first[0] === last[0] && first[1] === last[1]) points.pop()
  return points
}

/**
 * The parcels of a GML 3.2 answer that touch `extent` ([minX, minY, maxX, maxY], local ENU). A
 * parcel is kept whole, never clipped: its area must be the area of the registered outline.
 */
export function parcelsFromGml(gml: string, origin: Origin, extent: Bounds): Parcel[] {
  if (!gml.includes('FeatureCollection')) throw new Error('Parcels: not a WFS feature collection')
  const members = gml.split('<wfs:member>').slice(1)
  if (members.length >= PARCEL_MAX_FEATURES) throw new Error(`Parcels: the answer reached the ${PARCEL_MAX_FEATURES}-feature limit and may be incomplete`)
  const parcels: Parcel[] = []
  for (const member of members) {
    const teigId = tag(member, 'teigId')
    if (!teigId) throw new Error('Parcels: a feature has no teigId')
    const [municipality, gnr, bnr] = [tag(member, 'kommunenummer'), tag(member, 'gardsnummer'), tag(member, 'bruksnummer')]
    const matrikkel = municipality && gnr && bnr && Number(gnr) > 0 ? `${municipality}-${gnr}/${bnr}` : null
    const updated = tag(member, 'oppdateringsdato')?.slice(0, 10) ?? null
    const polygons = member.split('<gml:Polygon').slice(1)
    polygons.forEach((polygon, index) => {
      const rings = [...polygon.matchAll(/<gml:(exterior|interior)>[\s\S]*?<gml:posList[^>]*>([^<]+)<\/gml:posList>/g)]
        // The outline first, then its holes.
        .sort((a, b) => Number(b[1] === 'exterior') - Number(a[1] === 'exterior'))
        .map((match) => ring(match[2]!, origin))
      const outline = rings[0]
      if (!outline || outline.length < 3) return
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
