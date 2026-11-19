import type { TerrainRaster } from '../features/analysis/terrainTools'
import type { TerrainData } from '../features/sites/package'

const cellX = (raster: TerrainRaster) => (raster.maxX - raster.minX) / raster.cols
const cellY = (raster: TerrainRaster) => (raster.maxY - raster.minY) / raster.rows

/**
 * A coarser raster: each new cell is the mean of a `step × step` source block (no-data cells
 * ignored; a block with no data yields no data). The result's cell centres coincide with the block
 * centres (the bounds shrink to the full blocks, handling odd sizes). Run 10 T4.
 */
export function decimateRaster(raster: TerrainRaster, step: number): TerrainRaster {
  const cols = Math.max(1, Math.floor(raster.cols / step))
  const rows = Math.max(1, Math.floor(raster.rows / step))
  const dx = cellX(raster)
  const dy = cellY(raster)
  const heights = new Float32Array(cols * rows)
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      let sum = 0
      let count = 0
      for (let r = 0; r < step; r += 1) {
        for (let c = 0; c < step; c += 1) {
          const value = raster.heights[(row * step + r) * raster.cols + (col * step + c)]!
          if (!Number.isNaN(value)) { sum += value; count += 1 }
        }
      }
      heights[row * cols + col] = count === 0 ? Number.NaN : sum / count
    }
  }
  return {
    ...raster,
    cols,
    rows,
    maxX: raster.minX + cols * step * dx,
    maxY: raster.minY + rows * step * dy,
    heights,
  }
}

/**
 * Bilinear sample of a per-cell grid (e.g. `hornSlopeDeg` output) at a local ENU position, mirroring
 * `elevationAt`. Null outside the raster or beside a cell without data.
 */
export function sampleGrid(values: Float32Array, raster: TerrainRaster, x: number, y: number): number | null {
  const c = (x - raster.minX) / cellX(raster) - 0.5
  const r = (raster.maxY - y) / cellY(raster) - 0.5
  const c0 = Math.min(raster.cols - 2, Math.max(0, Math.floor(c)))
  const r0 = Math.min(raster.rows - 2, Math.max(0, Math.floor(r)))
  if (c < -0.5 || r < -0.5 || c > raster.cols - 0.5 || r > raster.rows - 0.5) return null
  const fc = Math.min(1, Math.max(0, c - c0))
  const fr = Math.min(1, Math.max(0, r - r0))
  const at = (row: number, col: number) => values[row * raster.cols + col]!
  const value = at(r0, c0) * (1 - fc) * (1 - fr) + at(r0, c0 + 1) * fc * (1 - fr) + at(r0 + 1, c0) * (1 - fc) * fr + at(r0 + 1, c0 + 1) * fc * fr
  return Number.isNaN(value) ? null : value
}

/**
 * A `TerrainData` view of a (decimated) raster, so the existing terrain mesh, height sampling and
 * water-carving code can draw real 1 m relief without a second code path. Metadata (schema/site/
 * origin) comes from the 16 m `base`; the bounds and heights come from the raster. The runtime type
 * allows more than the import parser's 129 cells; the import limit only guards package files.
 */
export function rasterToTerrainData(raster: TerrainRaster, base: TerrainData): TerrainData {
  const rows: number[][] = []
  for (let row = 0; row < raster.rows; row += 1) {
    const values: number[] = []
    for (let col = 0; col < raster.cols; col += 1) values.push(raster.heights[row * raster.cols + col]!)
    rows.push(values)
  }
  return {
    schemaVersion: base.schemaVersion,
    siteId: base.siteId,
    originElevation: base.originElevation,
    source: base.source,
    minX: raster.minX,
    maxX: raster.maxX,
    minY: raster.minY,
    maxY: raster.maxY,
    cols: raster.cols,
    rows: raster.rows,
    heights: rows,
  }
}
