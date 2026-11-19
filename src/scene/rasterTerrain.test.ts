import { describe, expect, it } from 'vitest'
import { decimateRaster, type TerrainRaster } from '../features/analysis/terrainTools'
import { rasterToTerrainData } from './rasterTerrain'

const base = {
  schemaVersion: 1 as const,
  siteId: 'demo',
  minX: 0,
  maxX: 4,
  minY: 0,
  maxY: 4,
  originElevation: 12,
  source: 'kartverket',
}

const raster: TerrainRaster = {
  cols: 4,
  rows: 4,
  minX: 0,
  minY: 0,
  maxX: 4,
  maxY: 4,
  originElevation: 12,
  heights: new Float32Array(16).map((_, i) => (i % 4) + Math.floor(i / 4)),
}

describe('rasterToTerrainData (Run 9 T4)', () => {
  it('keeps the ENU frame: a ground point keeps its east/north', () => {
    const terrain = rasterToTerrainData(raster, { ...base, cols: 2, rows: 2, heights: [[0, 0], [0, 0]] })
    expect([terrain.minX, terrain.maxX, terrain.minY, terrain.maxY]).toEqual([0, 4, 0, 4])
    expect(terrain.originElevation).toBe(12)
    // Sample the drawn surface at an arbitrary ENU point; it stays inside the same frame.
    expect(terrain.heights[1]?.[2]).toBe(raster.heights[1 * 4 + 2])
  })

  it('decimation preserves the origin elevation and metadata', () => {
    const coarse = decimateRaster(raster, 2)
    const terrain = rasterToTerrainData(coarse, { ...base, cols: 4, rows: 4, heights: Array.from({ length: 4 }, () => Array(4).fill(0)) })
    expect(terrain.cols).toBe(2)
    expect(terrain.rows).toBe(2)
    expect(terrain.originElevation).toBe(12)
  })
})
