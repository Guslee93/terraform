import { project, unproject } from './projection'
export type ImportFrame = { latitude: number; longitude: number; sizeMetres: number; id: string; title: string }
/** [west, south, east, north] in either coordinate system. */
export type Bounds = readonly [number, number, number, number]
export type Origin = Pick<ImportFrame, 'latitude' | 'longitude'>
export function validateFrame(frame: ImportFrame): ImportFrame {
  if (!Number.isFinite(frame.latitude) || frame.latitude < 54 || frame.latitude > 71.5) throw new Error('Frame latitude must be 54–71.5')
  if (!Number.isFinite(frame.longitude) || frame.longitude < 4 || frame.longitude > 32) throw new Error('Frame longitude must be 4–32')
  if (!Number.isFinite(frame.sizeMetres) || frame.sizeMetres < 100 || frame.sizeMetres > 800) throw new Error('Frame size must be 100–800 metres')
  if (typeof frame.id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,79}$/.test(frame.id)) throw new Error('Frame id must be a lowercase slug (1–80 characters)')
  if (typeof frame.title !== 'string' || !frame.title.trim()) throw new Error('Frame title is required')
  return { ...frame }
}
export function frameBounds(frame: ImportFrame, origin: Origin = frame): { lonLat: Bounds; enu: Bounds } {
  validateFrame(frame)
  const h = frame.sizeMetres / 2
  const [south, west] = unproject(-h, -h, frame.latitude, frame.longitude)
  const [north, east] = unproject(h, h, frame.latitude, frame.longitude)
  const [minX, minY] = project(south, west, origin.latitude, origin.longitude)
  const [maxX, maxY] = project(north, east, origin.latitude, origin.longitude)
  // Exact symmetric extent when using the default origin avoids round-trip noise.
  return { lonLat: [west, south, east, north], enu: origin.latitude === frame.latitude && origin.longitude === frame.longitude ? [-h, -h, h, h] : [minX, minY, maxX, maxY] }
}
