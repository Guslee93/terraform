import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { pointInPolygon } from '../../../src/lib/polygon'
import type { Vec2 } from '../../../src/lib/coordinates'
import { decodeTerrainRaster, parseTerrainRasterHeader, type TerrainRaster } from '../../../src/features/analysis/terrainTools'
import { parseBuildings } from '../../../src/features/sites/package'

/**
 * Shared helpers for the runoff ↔ WhiteboxTools reference comparison (feasibility IT-7, TF-VIS-007).
 * Everything here is a plain-Node/TypeScript dev script; none of it is part of the app build.
 */

export const BUILDING_RAISE_M = 10

export type AscGrid = {
  cols: number
  rows: number
  xllcorner: number
  yllcorner: number
  cellsize: number
  nodata: number
  values: Float64Array
}

export const sha256OfBuffer = (buffer: ArrayBuffer | Uint8Array): string =>
  createHash('sha256').update(new Uint8Array(buffer as ArrayBuffer)).digest('hex')

export const sha256OfFile = (path: string): string => sha256OfBuffer(readFileSync(path))

export const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T

export const writeJson = (path: string, value: unknown): void =>
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`)

/**
 * ESRI ASCII grid, the format WhiteboxTools reads for `.asc`. Rows are written north-first: row 0
 * is the north edge and is the first data line in the file, matching `TerrainRaster` (ADR-0037:
 * "row 0 is the north edge"). `xllcorner`/`yllcorner` are the south-west corner of the lower-left
 * cell, which for the terrain tile equals `minX`/`minY` because those are grid edges, not centres
 * (a cell centre is `minX + (col + 0.5) * dx`, `maxY - (row + 0.5) * dy`).
 *
 * Heights are written at full float precision (`String(value)`) so the grid WhiteboxTools sees is
 * bit-for-bit the same numbers the app's Float64 `ground` array holds after the burn-in.
 */
export function writeAsc(
  path: string,
  cols: number,
  rows: number,
  xllcorner: number,
  yllcorner: number,
  cellsize: number,
  nodata: number,
  values: ArrayLike<number>,
): void {
  const lines: string[] = [
    `ncols ${cols}`,
    `nrows ${rows}`,
    `xllcorner ${xllcorner}`,
    `yllcorner ${yllcorner}`,
    `cellsize ${cellsize}`,
    `NODATA_value ${nodata}`,
  ]
  for (let row = 0; row < rows; row += 1) {
    const parts: string[] = []
    for (let col = 0; col < cols; col += 1) parts.push(String(values[row * cols + col]))
    lines.push(parts.join(' '))
  }
  writeFileSync(path, `${lines.join('\n')}\n`)
}

/** Reads an ESRI ASCII grid written by `writeAsc` or by WhiteboxTools; data lines are north-first. */
export function readAsc(path: string): AscGrid {
  const text = readFileSync(path, 'utf8')
  const lines = text.split(/\r?\n/)
  let cols = 0
  let rows = 0
  let xllcorner = 0
  let yllcorner = 0
  let cellsize = 0
  let nodata = -9999
  const data: string[] = []
  let inData = false
  for (const raw of lines) {
    const line = raw.trim()
    if (line === '') continue
    const lower = line.toLowerCase()
    if (!inData && lower.startsWith('ncols')) cols = Number(line.split(/\s+/)[1])
    else if (!inData && lower.startsWith('nrows')) rows = Number(line.split(/\s+/)[1])
    else if (!inData && lower.startsWith('xllcorner')) xllcorner = Number(line.split(/\s+/)[1])
    else if (!inData && lower.startsWith('yllcorner')) yllcorner = Number(line.split(/\s+/)[1])
    else if (!inData && lower.startsWith('cellsize')) cellsize = Number(line.split(/\s+/)[1])
    else if (!inData && lower.startsWith('nodata')) nodata = Number(line.split(/\s+/)[1])
    else {
      inData = true
      data.push(line)
    }
  }
  const values = new Float64Array(cols * rows)
  let at = 0
  for (const line of data) {
    for (const token of line.split(/\s+/)) {
      if (token === '') continue
      values[at] = Number(token)
      at += 1
    }
  }
  if (at !== cols * rows) throw new Error(`${path}: expected ${cols * rows} cells, read ${at}`)
  return { cols, rows, xllcorner, yllcorner, cellsize, nodata, values }
}

/** Loads a curated site's 1 m terrain tile exactly as `runoff.test.ts` does. */
export function loadTerrainRaster(siteId: string): TerrainRaster {
  const header = parseTerrainRasterHeader(readJson(`public/sites/${siteId}/terrain1m.json`))
  const bytes = readFileSync(`public/sites/${siteId}/terrain1m.bin`)
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  return decodeTerrainRaster(header, buffer)
}

/** The Compact Infill context footprints exactly as the studio passes them to the worker (no drawn blocks). */
export function loadFootprints(siteId: string): Vec2[][] {
  const buildings = parseBuildings(readJson(`public/sites/${siteId}/buildings.json`)).buildings
  return buildings.map((building) => building.footprint.map(([east, north]) => [east, north] as Vec2))
}

/**
 * The burn-in from `computeRunoff` (runoff.ts), whose own burn loop is not exported, mirrored
 * line-for-line so the `.asc` WhiteboxTools consumes is the same ground the app fills. Each cell
 * whose centre lies inside a footprint is raised `BUILDING_RAISE_M` metres; cells without data
 * (NaN) are listed as outlets and never raised, exactly as in the source.
 */
export function burnFootprints(
  raster: Pick<TerrainRaster, 'cols' | 'rows' | 'minX' | 'minY' | 'maxX' | 'maxY' | 'heights'>,
  footprints: readonly (readonly Vec2[])[],
): { ground: Float64Array; building: Uint8Array; cells: number } {
  const { cols, rows } = raster
  const count = cols * rows
  const dx = (raster.maxX - raster.minX) / cols
  const dy = (raster.maxY - raster.minY) / rows
  const ground = new Float64Array(count)
  const outlet = new Uint8Array(count)
  let cells = 0
  for (let index = 0; index < count; index += 1) {
    const height = raster.heights[index]!
    if (Number.isNaN(height)) { outlet[index] = 1; ground[index] = -1e9 } else { ground[index] = height; cells += 1 }
  }
  const building = new Uint8Array(count)
  for (const footprint of footprints) {
    if (footprint.length < 3) continue
    const xs = footprint.map((point) => point[0]), ys = footprint.map((point) => point[1])
    const col0 = Math.max(0, Math.floor((Math.min(...xs) - raster.minX) / dx)), col1 = Math.min(cols - 1, Math.floor((Math.max(...xs) - raster.minX) / dx))
    const row0 = Math.max(0, Math.floor((raster.maxY - Math.max(...ys)) / dy)), row1 = Math.min(rows - 1, Math.floor((raster.maxY - Math.min(...ys)) / dy))
    for (let row = row0; row <= row1; row += 1) {
      for (let col = col0; col <= col1; col += 1) {
        const index = row * cols + col
        if (building[index] || outlet[index]) continue
        if (pointInPolygon([raster.minX + (col + 0.5) * dx, raster.maxY - (row + 0.5) * dy], footprint)) { building[index] = 1; ground[index]! += BUILDING_RAISE_M }
      }
    }
  }
  return { ground, building, cells }
}

/** Classification copied verbatim from `runoffClass` in runoff.ts, on top of an arbitrary accumulation/hollow. */
export function classify(
  building: Uint8Array,
  accumulation: ArrayLike<number>,
  hollow: ArrayLike<number>,
  cellArea: number,
  index: number,
  FLOW_PATH_M2 = 500,
  MAIN_FLOW_PATH_M2 = 5000,
  DEPRESSION_MIN_M = 0.05,
): 0 | 1 | 2 | 3 {
  if (building[index]) return 0
  const area = accumulation[index]! * cellArea
  if (area >= MAIN_FLOW_PATH_M2) return 3
  if (area >= FLOW_PATH_M2) return 2
  return hollow[index]! > DEPRESSION_MIN_M ? 1 : 0
}
