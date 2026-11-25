/**
 * Free ground image for the Visual Lab (ADR-0041): Kartverket's Sentinel-2 cloudless mosaic of
 * Norway, open data under CC BY 4.0, read live from its WMS. 10 m per pixel: soft, but legal to show
 * anywhere. North-up in Web Mercator, so it maps onto the ENU tile without rotation.
 */
import { unproject } from '../../features/import/projection'
import type { Extent } from '../../scene/photoPlacement'

const WMS_URL = 'https://wms.geonorge.no/skwms1/wms.sentinel2'
const EARTH_RADIUS_M = 6378137

/** Kartverket's required credit (dataset metadata); the year is omitted — the WMS does not say which mosaic it serves. */
export const SENTINEL_CREDIT =
  'Laget av Sentinel-2-bilder fra Copernicus-programmet til EU, bearbeidet av Kartverket, basert på metoder utviklet fra CESBIO og CNES · CC BY 4.0'

/** Web Mercator (EPSG:3857) metres for a WGS84 point. */
export function webMercator(latitude: number, longitude: number): [number, number] {
  const x = (EARTH_RADIUS_M * longitude * Math.PI) / 180
  const y = EARTH_RADIUS_M * Math.log(Math.tan(Math.PI / 4 + (latitude * Math.PI) / 360))
  return [x, y]
}

/**
 * The WMS GetMap request whose image covers exactly the ENU tile `extent` around `origin`.
 * Fetched at `metresPerPixel` (5 m: twice the 10 m source, so the GPU's bilinear filter smooths it).
 */
export function sentinelRequest(
  origin: { readonly latitude: number; readonly longitude: number },
  extent: Extent,
  metresPerPixel = 5,
): { readonly url: string; readonly width: number; readonly height: number } {
  const [south, west] = unproject(extent.minX, extent.minY, origin.latitude, origin.longitude)
  const [north, east] = unproject(extent.maxX, extent.maxY, origin.latitude, origin.longitude)
  const [minX, minY] = webMercator(south, west)
  const [maxX, maxY] = webMercator(north, east)
  const width = Math.max(2, Math.ceil((extent.maxX - extent.minX) / metresPerPixel))
  const height = Math.max(2, Math.ceil((extent.maxY - extent.minY) / metresPerPixel))
  const params = new URLSearchParams({
    service: 'WMS',
    version: '1.3.0',
    request: 'GetMap',
    layers: 'sentinel2',
    styles: '',
    crs: 'EPSG:3857',
    bbox: [minX, minY, maxX, maxY].map((value) => value.toFixed(2)).join(','),
    width: String(width),
    height: String(height),
    format: 'image/jpeg',
  })
  return { url: `${WMS_URL}?${params.toString()}`, width, height }
}
