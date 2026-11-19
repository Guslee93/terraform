import type { TerrainRaster } from '../features/analysis/terrainTools'
import type { TerrainData } from '../features/sites/package'

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
