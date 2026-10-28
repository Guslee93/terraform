import { VectorTile } from '@mapbox/vector-tile'
import { PbfReader } from 'pbf'
import type { Polygon, MultiPolygon, LineString, MultiLineString, Point } from 'geojson'
import type { Bounds } from './frame'
import { abortable, checkAbort, requestBytes } from './request'
export type TileFeature = {
  layer: string
  id?: number
  properties: Record<string, string | number | boolean>
  geometry: Polygon | MultiPolygon | LineString | MultiLineString | Point
}
export type Tile = { z: number; x: number; y: number }
export interface TileSource {
  name: string
  attribution: string
  url?: string
  license?: string
  fetchTile(z: number, x: number, y: number, signal?: AbortSignal): Promise<ArrayBuffer>
}
export function tileCover(bounds: Bounds, zoom: number): Tile[] {
  const [west, south, east, north] = bounds
  if (!Number.isInteger(zoom) || zoom < 0 || zoom > 22 || !bounds.every(Number.isFinite) || west > east || south > north || west <= -180 || east >= 180 || south <= -85 || north >= 85) throw new Error('Unsupported tile bounds or zoom')
  const n = 2 ** zoom
  const tx = (lon: number) => Math.floor((lon + 180) / 360 * n)
  const ty = (lat: number) => Math.floor((1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2 * n)
  const tiles: Tile[] = []
  if ((tx(east) - tx(west) + 1) * (ty(south) - ty(north) + 1) > 9) throw new Error('Frame exceeds the nine-tile import budget')
  for (let x = tx(west); x <= tx(east); x++) for (let y = ty(north); y <= ty(south); y++) tiles.push({ x, y, z: zoom })
  return tiles
}
/** Construct once per import. The TileJSON promise is shared by concurrent tile requests. */
export function openFreeMapSource(): TileSource {
  let template: Promise<string> | undefined
  return {
    name: 'OpenFreeMap', attribution: '© OpenMapTiles © OpenStreetMap contributors · tiles by OpenFreeMap · ODbL 1.0',
    url: 'https://tiles.openfreemap.org/planet', license: 'ODbL 1.0',
    async fetchTile(z, x, y, signal) {
      checkAbort(signal)
      template ??= requestBytes('https://tiles.openfreemap.org/planet', 'OpenFreeMap TileJSON', signal).then((buffer) => {
        const meta: unknown = JSON.parse(new TextDecoder().decode(buffer))
        if (typeof meta !== 'object' || meta === null || !('tiles' in meta) || !Array.isArray(meta.tiles)) throw new Error('OpenFreeMap TileJSON: missing tiles')
        const url: unknown = meta.tiles[0]
        if (typeof url !== 'string' || !url.startsWith('https://') || !['{z}', '{x}', '{y}'].every((token) => url.includes(token))) throw new Error('OpenFreeMap TileJSON: invalid XYZ template')
        return url
      })
      const url = await abortable(() => template!, signal)
      return await requestBytes(url.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y)), 'OpenFreeMap tile', signal)
    },
  }
}
/** Invalid property values are omitted; they never cross the importer boundary. */
export function validProperties(value: unknown): TileFeature['properties'] {
  const result: TileFeature['properties'] = {}
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return result
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string' || typeof entry === 'boolean' || (typeof entry === 'number' && Number.isFinite(entry))) {
      Object.defineProperty(result, key, { value: entry, enumerable: true, writable: true, configurable: true })
    }
  }
  return result
}
export function decodeTile(buffer: ArrayBuffer, z: number, x: number, y: number): TileFeature[] {
  const tile = new VectorTile(new PbfReader(new Uint8Array(buffer)))
  const features: TileFeature[] = []
  for (const [name, layer] of Object.entries(tile.layers)) {
    for (let i = 0; i < layer.length; i++) {
      const feature = layer.feature(i)
      if (feature.type === 0) continue
      const geometry = feature.toGeoJSON(x, y, z).geometry
      if (!['Polygon', 'MultiPolygon', 'LineString', 'MultiLineString', 'Point'].includes(geometry.type)) continue
      if (geometry.type === 'GeometryCollection' || geometry.type === 'MultiPoint') continue
      features.push({ layer: name, ...(feature.id === undefined || !Number.isSafeInteger(feature.id) ? {} : { id: feature.id }), properties: validProperties(feature.properties), geometry })
    }
  }
  return features
}
