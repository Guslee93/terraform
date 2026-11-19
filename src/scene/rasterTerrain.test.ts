import { describe, expect, it } from 'vitest'
import { elevationAt, type TerrainRaster } from '../features/analysis/terrainTools'
import { decimateRaster, rasterToTerrainData, sampleGrid } from './rasterTerrain'

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

/** A 1 m-cell raster whose cell-centre heights follow `z(east, north)`. */
function surface(z: (x: number, y: number) => number, size = 64): TerrainRaster {
  const heights = new Float32Array(size * size)
  for (let row = 0; row < size; row += 1) for (let col = 0; col < size; col += 1) heights[row * size + col] = z(col + 0.5, size - (row + 0.5))
  return { cols: size, rows: size, minX: 0, minY: 0, maxX: size, maxY: size, originElevation: 0, heights }
}

describe('rasterToTerrainData (Run 9 T4)', () => {
  it('keeps the ENU frame: a ground point keeps its east/north', () => {
    const terrain = rasterToTerrainData(raster, { ...base, cols: 2, rows: 2, heights: [[0, 0], [0, 0]] })
    expect([terrain.minX, terrain.maxX, terrain.minY, terrain.maxY]).toEqual([0, 4, 0, 4])
    expect(terrain.originElevation).toBe(12)
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

describe('decimateRaster (Run 10 T4, centre-aligned)', () => {
  it('reproduces a plane exactly at the new centres, by 2 and 3', () => {
    for (const step of [2, 3]) {
      const size = 60 // divisible by 2 and 3
      const raster = surface((x, y) => x + 2 * y, size)
      const coarse = decimateRaster(raster, step)
      // Sample the decimated surface at each block centre and compare to the plane.
      for (let row = 0; row < coarse.rows; row += 1) {
        for (let col = 0; col < coarse.cols; col += 1) {
          const east = (col + 0.5) * step
          const north = size - (row + 0.5) * step
          const expected = east + 2 * north
          expect(elevationAt(coarse, east, north)).toBeCloseTo(expected, 3)
        }
      }
    }
  })

  it('does not move a single raised cell', () => {
    const size = 64
    const raster = surface(() => 0, size)
    raster.heights[20 * size + 30] = 1 // raised cell at (row 20, col 30)
    const coarse = decimateRaster(raster, 2)
    // The block (row 10, col 15) contains the raised cell; it is the only non-zero cell.
    expect(coarse.heights[10 * coarse.cols + 15]).toBeCloseTo(0.25, 5)
    // The block centre coincides with the source block centre (not the source cell centre).
    const east = (15 + 0.5) * 2
    const north = size - (10 + 0.5) * 2
    expect(elevationAt(coarse, east, north)).toBeCloseTo(0.25, 5)
  })

  it('handles odd sizes by shrinking the bounds to full blocks', () => {
    const raster = surface((x) => x, 5) // 5 × 5
    const coarse = decimateRaster(raster, 2)
    expect(coarse.cols).toBe(2) // floor(5 / 2)
    expect(coarse.rows).toBe(2)
    expect(coarse.maxX).toBe(4) // 2 blocks × 2 m
    expect(coarse.maxY).toBe(4)
  })

  it('yields no data when a block has no data', () => {
    const size = 4
    const raster = surface(() => 0, size)
    // First 2×2 block (rows 0-1, cols 0-1) has no data.
    for (const index of [0, 1, 4, 5]) raster.heights[index] = Number.NaN
    const coarse = decimateRaster(raster, 2)
    expect(Number.isNaN(coarse.heights[0])).toBe(true)
    // Other blocks have data.
    expect(coarse.heights[1]).toBe(0)
  })
})

describe('sampleGrid', () => {
  it('is exact on a plane', () => {
    const raster = surface((x, y) => x + 2 * y, 64)
    // A plane's slope is constant, so a bilinear sample matches any interior cell.
    const slopes = new Float32Array(raster.cols * raster.rows).fill(5)
    expect(sampleGrid(slopes, raster, 10.5, 20.25)).toBeCloseTo(5, 5)
  })
})
