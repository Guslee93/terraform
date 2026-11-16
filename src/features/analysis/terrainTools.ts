import type { Vec2 } from '../../lib/coordinates'

/**
 * Tools on the 1 m terrain (Kartverket DTM1) of a package (ADR-0037): elevation, Horn slope and a
 * profile along a line. Deterministic calculations on authority data (feasibility 08 §1): exact on
 * analytic surfaces, and only as good as a bare-earth lidar model between them. Not a survey.
 * Renderer-free.
 */

export type TerrainRasterHeader = {
  schemaVersion: 1
  siteId: string
  cols: number
  rows: number
  minX: number
  minY: number
  maxX: number
  maxY: number
  /** Heights in the file are centimetres above this elevation (the package origin, NN2000). */
  originElevation: number
  verticalDatum: string
}

/** Heights in metres relative to the package origin; row 0 is the north edge. NaN = no data. */
export type TerrainRaster = Omit<TerrainRasterHeader, 'schemaVersion' | 'siteId' | 'verticalDatum'> & { readonly heights: Float32Array }

export const TERRAIN_NO_DATA = -32768
export const TERRAIN_NOTE = 'Kartverket DTM1 (1 m bare-earth terrain from lidar) — not a survey'

export function parseTerrainRasterHeader(value: unknown): TerrainRasterHeader {
  const fail = (path: string, message: string): never => { throw new Error(`${path}: ${message}`) }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) fail('terrain1m', 'expected an object')
  const root = value as Record<string, unknown>
  if (root.schemaVersion !== 1) fail('terrain1m.schemaVersion', 'unsupported schema version')
  const number = (key: string): number => {
    const entry = root[key]
    if (typeof entry !== 'number' || !Number.isFinite(entry)) return fail(`terrain1m.${key}`, 'expected a finite number')
    return entry
  }
  const text = (key: string): string => {
    const entry = root[key]
    if (typeof entry !== 'string' || entry === '') return fail(`terrain1m.${key}`, 'expected a string')
    return entry
  }
  const cols = number('cols'), rows = number('rows')
  if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols < 2 || rows < 2 || cols * rows > 4_000_000) fail('terrain1m.cols', 'expected a grid of 2 × 2 to 4 000 000 cells')
  const header = { schemaVersion: 1 as const, siteId: text('siteId'), cols, rows, minX: number('minX'), minY: number('minY'), maxX: number('maxX'), maxY: number('maxY'), originElevation: number('originElevation'), verticalDatum: text('verticalDatum') }
  if (header.maxX <= header.minX || header.maxY <= header.minY) fail('terrain1m.bounds', 'max must exceed min')
  return header
}

/** The raster from its header and its Int16 little-endian centimetre file. */
export function decodeTerrainRaster(header: TerrainRasterHeader, buffer: ArrayBuffer): TerrainRaster {
  if (buffer.byteLength !== header.cols * header.rows * 2) throw new Error('terrain1m: the file size does not match the header')
  const view = new DataView(buffer)
  const heights = new Float32Array(header.cols * header.rows)
  for (let index = 0; index < heights.length; index += 1) {
    const centimetres = view.getInt16(index * 2, true)
    heights[index] = centimetres === TERRAIN_NO_DATA ? Number.NaN : centimetres / 100
  }
  const { cols, rows, minX, minY, maxX, maxY, originElevation } = header
  return { cols, rows, minX, minY, maxX, maxY, originElevation, heights }
}

const cellX = (raster: TerrainRaster) => (raster.maxX - raster.minX) / raster.cols
const cellY = (raster: TerrainRaster) => (raster.maxY - raster.minY) / raster.rows

/**
 * Elevation in metres relative to the package origin at a local ENU position: bilinear between the
 * four nearest cell centres. Null outside the raster or beside a cell without data.
 */
export function elevationAt(raster: TerrainRaster, x: number, y: number): number | null {
  const c = (x - raster.minX) / cellX(raster) - 0.5
  const r = (raster.maxY - y) / cellY(raster) - 0.5
  // Within half a cell of the edge the nearest row or column is used: no extrapolation.
  const c0 = Math.min(raster.cols - 2, Math.max(0, Math.floor(c)))
  const r0 = Math.min(raster.rows - 2, Math.max(0, Math.floor(r)))
  if (c < -0.5 || r < -0.5 || c > raster.cols - 0.5 || r > raster.rows - 0.5) return null
  const fc = Math.min(1, Math.max(0, c - c0))
  const fr = Math.min(1, Math.max(0, r - r0))
  const at = (row: number, col: number) => raster.heights[row * raster.cols + col]!
  const value = at(r0, c0) * (1 - fc) * (1 - fr) + at(r0, c0 + 1) * fc * (1 - fr) + at(r0 + 1, c0) * (1 - fc) * fr + at(r0 + 1, c0 + 1) * fc * fr
  return Number.isNaN(value) ? null : value
}

/** Slope in degrees for every cell (Horn 1981, the 3 × 3 weighted differences; edges repeat their neighbour). */
export function hornSlopeDeg(raster: TerrainRaster): Float32Array {
  const { cols, rows, heights } = raster
  const dx = cellX(raster), dy = cellY(raster)
  const out = new Float32Array(cols * rows)
  const at = (row: number, col: number) => heights[Math.min(rows - 1, Math.max(0, row)) * cols + Math.min(cols - 1, Math.max(0, col))]!
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const a = at(row - 1, col - 1), b = at(row - 1, col), c = at(row - 1, col + 1)
      const d = at(row, col - 1), f = at(row, col + 1)
      const g = at(row + 1, col - 1), h = at(row + 1, col), i = at(row + 1, col + 1)
      const dzdx = (c + 2 * f + i - (a + 2 * d + g)) / (8 * dx)
      const dzdy = (g + 2 * h + i - (a + 2 * b + c)) / (8 * dy)
      out[row * cols + col] = (Math.atan(Math.hypot(dzdx, dzdy)) * 180) / Math.PI
    }
  }
  return out
}

export type ProfilePoint = { readonly distance: number; readonly x: number; readonly y: number; /** Metres relative to the package origin; null off the raster. */ readonly elevation: number | null }

/** Elevations along a polyline at `stepM` spacing, each vertex included. */
export function terrainProfile(raster: TerrainRaster, line: readonly Vec2[], stepM = 1): ProfilePoint[] {
  const points: ProfilePoint[] = []
  let travelled = 0
  line.forEach((a, index) => {
    const b = line[index + 1]
    if (!b) {
      points.push({ distance: travelled, x: a[0], y: a[1], elevation: elevationAt(raster, a[0], a[1]) })
      return
    }
    const length = Math.hypot(b[0] - a[0], b[1] - a[1])
    const steps = Math.max(1, Math.ceil(length / stepM))
    for (let step = 0; step < steps; step += 1) {
      const t = step / steps
      const x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t
      points.push({ distance: travelled + length * t, x, y, elevation: elevationAt(raster, x, y) })
    }
    travelled += length
  })
  return points
}

/** Lowest and highest elevation of a profile, relative to the package origin; null when nothing was on the raster. */
export function profileRange(profile: readonly ProfilePoint[]): { min: number; max: number } | null {
  const values = profile.flatMap((point) => (point.elevation === null ? [] : [point.elevation]))
  return values.length ? { min: Math.min(...values), max: Math.max(...values) } : null
}

/**
 * Slope bands. Colours: a neutral-to-warm ramp from existing studio swatches; to be revisited in
 * the design phase (the plan pauses visual work).
 */
export const SLOPE_BANDS = [
  { below: 5, label: 'Under 5°', colour: '#E5E7EB' },
  { below: 15, label: '5–15°', colour: '#E6DC9C' },
  { below: 30, label: '15–30°', colour: '#E39A4C' },
  { below: Infinity, label: 'Over 30°', colour: '#962838' },
] as const
export const slopeBandIndex = (degrees: number) => SLOPE_BANDS.findIndex((band) => degrees < band.below)

/** Share of the raster's cells in each slope band (cells without data left out). */
export function slopeShares(slope: Float32Array): number[] {
  const counts = SLOPE_BANDS.map(() => 0)
  let total = 0
  for (const degrees of slope) {
    if (Number.isNaN(degrees)) continue
    counts[slopeBandIndex(degrees)]! += 1
    total += 1
  }
  return counts.map((count) => (total ? count / total : 0))
}

export const SLOPE_NOTE = 'Slope of the bare-earth terrain in 1 m cells. Kerbs, walls and embankments read as steep; buildings are not in the model.'
