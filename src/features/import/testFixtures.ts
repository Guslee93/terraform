/// <reference types="node" />
import { readFileSync } from 'node:fs'
import type { ImportFrame } from './frame'
import { decodeTile, type TileSource } from './tiles'

export const grunerlokka: ImportFrame = { latitude: 59.9225, longitude: 10.7595, sizeMetres: 400, id: 'import-grunerlokka', title: 'Grünerløkka, Oslo' }
export const bjorvika: ImportFrame = { latitude: 59.9075, longitude: 10.753, sizeMetres: 400, id: 'import-bjorvika', title: 'Bjørvika, Oslo' }
export function tileBytes(z: number, x: number, y: number): ArrayBuffer {
  return Uint8Array.from(readFileSync(new URL(`./__fixtures__/tiles/${z}-${x}-${y}.pbf`, import.meta.url))).buffer
}
export const fixtureTiles: TileSource = {
  name: 'Recorded OpenFreeMap', attribution: '© OpenMapTiles © OpenStreetMap contributors · ODbL 1.0',
  url: 'https://tiles.openfreemap.org/planet/20261025_080012_pt', license: 'ODbL 1.0',
  async fetchTile(z, x, y) { return tileBytes(z, x, y) },
}
export const tileFeatures = (y: number) => decodeTile(tileBytes(14, 8681, y), 14, 8681, y)
