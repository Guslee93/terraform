import { validateFrame, type ImportFrame } from './frame'

export const FRAME_SIZES = [200, 400, 600] as const
export type FrameSize = (typeof FRAME_SIZES)[number]

/** Screen size of a square frame on a 512 px-tile web-mercator map (MapLibre). */
export function framePixels(sizeMetres: number, latitude: number, zoom: number): number {
  const metresPerPixel = (40075016.686 * Math.cos((latitude * Math.PI) / 180)) / (512 * 2 ** zoom)
  return sizeMetres / metresPerPixel
}

/** `400 × 400 m · 16 ha` */
export function frameReadout(sizeMetres: number): string {
  const hectares = (sizeMetres * sizeMetres) / 10_000
  return `${sizeMetres} × ${sizeMetres} m · ${Number.isInteger(hectares) ? hectares : hectares.toFixed(1)} ha`
}

/** A validated frame for the map centre, or the reason it cannot be imported. */
export function frameAt(latitude: number, longitude: number, sizeMetres: number, title: string, now = Date.now()): { frame: ImportFrame } | { error: string } {
  try {
    return { frame: validateFrame({ latitude, longitude, sizeMetres, id: `import-${now.toString(36)}`, title: title.trim() || 'Custom area' }) }
  } catch {
    return { error: 'Move the map to the Nordics. Import covers latitude 54–71.5° and longitude 4–32°.' }
  }
}
