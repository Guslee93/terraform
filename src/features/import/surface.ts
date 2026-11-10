import { checkAbort, requestBytes } from './request'

/**
 * Surface heights (roofs, tree tops) for an import frame (ADR-0022). One raster per site from
 * Kartverket's national surface model (DOM, 1 m lidar), read with a small uncompressed-TIFF reader
 * so no GeoTIFF dependency is needed.
 */

/** Absolute heights in the source's vertical datum, row 0 at the frame's north edge. NaN = no data. */
export type SurfaceRaster = { readonly width: number; readonly height: number; readonly heights: Float32Array }
export interface SurfaceSource {
  name: string
  attribution: string
  url: string
  license: string
  /** Must match the terrain provider's datum, or roof heights would not sit on the terrain. */
  verticalDatum: string
  covers(lat: number, lon: number): boolean
  fetchSurface(bounds: readonly [west: number, south: number, east: number, north: number], pixels: number, signal?: AbortSignal): Promise<SurfaceRaster>
}

export const KARTVERKET_DOM_URL = 'https://wcs.geonorge.no/skwms1/wcs.hoyde-dom-nhm-25833'
export const SURFACE_MAX_PIXELS = 800

/**
 * Minimal TIFF reader for what the Kartverket WCS returns: one uncompressed 32-bit float band, in
 * tiles or strips, either byte order. Anything else is refused rather than guessed at.
 */
export function decodeFloatTiff(buffer: ArrayBuffer): SurfaceRaster {
  const fail = (message: string): never => { throw new Error(`Surface raster: ${message}`) }
  const view = new DataView(buffer)
  if (buffer.byteLength < 8) fail('file too short')
  const mark = view.getUint16(0)
  const little = mark === 0x4949
  if (!little && mark !== 0x4d4d) fail('not a TIFF')
  if (view.getUint16(2, little) !== 42) fail('unsupported TIFF variant')
  const directory = view.getUint32(4, little)
  if (directory + 2 > buffer.byteLength) fail('directory out of range')
  const tags = new Map<number, number[]>()
  const count = view.getUint16(directory, little)
  for (let entry = 0; entry < count; entry += 1) {
    const at = directory + 2 + entry * 12
    if (at + 12 > buffer.byteLength) fail('directory out of range')
    const type = view.getUint16(at + 2, little)
    const length = view.getUint32(at + 4, little)
    const size = type === 3 ? 2 : type === 4 ? 4 : 0
    if (!size) continue // only SHORT and LONG tags describe the layout
    const start = length * size <= 4 ? at + 8 : view.getUint32(at + 8, little)
    if (start + length * size > buffer.byteLength) fail('tag data out of range')
    tags.set(view.getUint16(at, little), Array.from({ length }, (_, index) =>
      size === 2 ? view.getUint16(start + index * 2, little) : view.getUint32(start + index * 4, little)))
  }
  const one = (tag: number, fallback?: number): number => tags.get(tag)?.[0] ?? fallback ?? fail(`missing tag ${tag}`)
  const width = one(256)
  const height = one(257)
  if (width < 1 || height < 1 || width * height > 4_000_000) fail('unexpected dimensions')
  if (one(259, 1) !== 1) fail('compressed data is not supported')
  if (one(258) !== 32 || one(339, 1) !== 3 || one(277, 1) !== 1) fail('expected one 32-bit float band')

  const heights = new Float32Array(width * height).fill(Number.NaN)
  const tiled = tags.has(324)
  const blockWidth = tiled ? one(322) : width
  const blockHeight = tiled ? one(323) : one(278, height)
  const offsets = tags.get(tiled ? 324 : 273) ?? fail('missing data offsets')
  const across = Math.ceil(width / blockWidth)
  if (blockWidth < 1 || blockHeight < 1 || offsets.length < across * Math.ceil(height / blockHeight)) fail('block layout mismatch')
  offsets.forEach((offset, block) => {
    const left = (block % across) * blockWidth
    const top = Math.floor(block / across) * blockHeight
    for (let row = 0; row < blockHeight && top + row < height; row += 1) {
      for (let col = 0; col < blockWidth && left + col < width; col += 1) {
        const at = offset + (row * blockWidth + col) * 4
        if (at + 4 > buffer.byteLength) fail('pixel data out of range')
        const value = view.getFloat32(at, little)
        // Sentinels (−3.4e38, −9999…) and anything outside the planet's land surface are "no data".
        if (Number.isFinite(value) && value > -500 && value < 9000) heights[(top + row) * width + left + col] = value
      }
    }
  })
  return { width, height, heights }
}

/** Surface height at a local ENU position inside a square frame centred on the origin, or null. */
export function sampleSurface(raster: SurfaceRaster, frameSize: number, x: number, y: number): number | null {
  const col = Math.floor(((x + frameSize / 2) / frameSize) * raster.width)
  const row = Math.floor(((frameSize / 2 - y) / frameSize) * raster.height)
  if (col < 0 || row < 0 || col >= raster.width || row >= raster.height) return null
  const value = raster.heights[row * raster.width + col]
  return value === undefined || Number.isNaN(value) ? null : value
}

export function kartverketSurface(): SurfaceSource {
  return {
    name: 'Kartverket surface model (DOM)', attribution: '© Kartverket · CC BY 4.0', url: KARTVERKET_DOM_URL, license: 'CC BY 4.0', verticalDatum: 'NN2000',
    // Same coverage hint as the Kartverket terrain provider; outside Norway the raster is empty.
    covers: (lat, lon) => lat >= 57.9 && lat <= 71.5 && lon >= 4 && lon <= 31.5,
    async fetchSurface(bounds, pixels, signal) {
      checkAbort(signal)
      const size = Math.max(16, Math.min(SURFACE_MAX_PIXELS, Math.round(pixels)))
      const query = `service=WCS&version=1.0.0&request=GetCoverage&coverage=nhm_dom_topo_25833&crs=EPSG:4326&bbox=${bounds.map((value) => value.toFixed(8)).join(',')}&width=${size}&height=${size}&format=GeoTIFF`
      const raster = decodeFloatTiff(await requestBytes(`${KARTVERKET_DOM_URL}?${query}`, 'Kartverket surface model', signal))
      if (raster.width !== size || raster.height !== size) throw new Error('Kartverket surface model: raster size mismatch')
      return raster
    },
  }
}
