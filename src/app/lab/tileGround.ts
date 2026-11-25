/**
 * Sharp keyed satellite ground for the Visual Lab (ADR-0041 §3): MapTiler's satellite tiles, read
 * live in the browser with the owner's own key (free plan: non-commercial). Web Mercator tiles are
 * north-up, so the ENU tile is an axis-aligned rectangle in tile space. Pure maths here; the hook
 * that fetches and stitches lives in LocalPhotoPanel.tsx.
 */
import { unproject } from '../../features/import/projection'
import type { Extent } from '../../scene/photoPlacement'

/** Shown on screen whenever the imagery is (MapTiler terms: attribution with a link). */
export const MAPTILER_CREDIT = '© MapTiler'
export const MAPTILER_COPYRIGHT_URL = 'https://www.maptiler.com/copyright/'

const EARTH_CIRCUMFERENCE_M = 2 * Math.PI * 6378137

/** Fractional Web Mercator tile coordinates of a WGS84 point at `zoom`. */
export function tileXY(latitude: number, longitude: number, zoom: number): [number, number] {
  const n = 2 ** zoom
  const phi = (latitude * Math.PI) / 180
  const x = ((longitude + 180) / 360) * n
  const y = ((1 - Math.log(Math.tan(phi) + 1 / Math.cos(phi)) / Math.PI) / 2) * n
  return [x, y]
}

/** Ground metres per pixel of a `tileSizePx` tile at `zoom` and `latitude`. */
export function groundResolution(latitude: number, zoom: number, tileSizePx: number): number {
  return (EARTH_CIRCUMFERENCE_M * Math.cos((latitude * Math.PI) / 180)) / (tileSizePx * 2 ** zoom)
}

export type TilePlan = {
  readonly zoom: number
  /** Every tile to fetch, in row-major order from the north-west. */
  readonly tiles: readonly { readonly x: number; readonly y: number }[]
  readonly minTileX: number
  readonly minTileY: number
  /** The ENU tile's rectangle inside the stitched mosaic, in tile units from (minTileX, minTileY). */
  readonly crop: { readonly left: number; readonly top: number; readonly width: number; readonly height: number }
}

/**
 * The tiles that cover the ENU `extent` around `origin`, at the coarsest zoom whose ground
 * resolution is at least `targetMetresPerPixel` (capped at `maxZoom`).
 */
export function tilePlan(
  origin: { readonly latitude: number; readonly longitude: number },
  extent: Extent,
  { targetMetresPerPixel = 0.3, tileSizePx = 512, maxZoom = 19 } = {},
): TilePlan {
  let zoom = 0
  while (zoom < maxZoom && groundResolution(origin.latitude, zoom, tileSizePx) > targetMetresPerPixel) zoom += 1
  const [south, west] = unproject(extent.minX, extent.minY, origin.latitude, origin.longitude)
  const [north, east] = unproject(extent.maxX, extent.maxY, origin.latitude, origin.longitude)
  const [left, top] = tileXY(north, west, zoom)
  const [right, bottom] = tileXY(south, east, zoom)
  const minTileX = Math.floor(left)
  const minTileY = Math.floor(top)
  const tiles: { x: number; y: number }[] = []
  for (let y = minTileY; y <= Math.floor(bottom); y += 1) {
    for (let x = minTileX; x <= Math.floor(right); x += 1) tiles.push({ x, y })
  }
  return {
    zoom,
    tiles,
    minTileX,
    minTileY,
    crop: { left: left - minTileX, top: top - minTileY, width: right - left, height: bottom - top },
  }
}

/** MapTiler's documented raster tile URL for the satellite dataset. */
export function mapTilerTileUrl(zoom: number, x: number, y: number, key: string): string {
  return `https://api.maptiler.com/tiles/satellite-v2/${zoom}/${x}/${y}.jpg?key=${encodeURIComponent(key)}`
}
