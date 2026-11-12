// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { carveTerrainForWater, computeWaterSurfaces, terrainCellSize, waterSurfaceLevel } from './waterSurface'
import type { LandCoverArea, TerrainData } from './package'

/** 5 × 5 grid over 0…40 m, so one cell is 10 m. */
function grid(height: (east: number, north: number) => number): TerrainData {
  const cols = 5
  const rows = 5
  const heights = Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => height(col * 10, row * 10)),
  )
  return {
    schemaVersion: 1,
    siteId: 'fixture',
    cols,
    rows,
    minX: 0,
    maxX: 40,
    minY: 0,
    maxY: 40,
    originElevation: 0,
    heights,
    source: 'fixture',
  }
}

function water(id: string, ring: [number, number][]): LandCoverArea {
  return { id, kind: 'water', ring }
}

const FLAT = grid(() => 10)
const POND = water('pond', [[10, 10], [30, 10], [30, 30], [10, 30]])

describe('computeWaterSurfaces', () => {
  it('reads the water level from the ground at the outline', () => {
    const surfaces = computeWaterSurfaces(FLAT, [POND])
    expect(surfaces).toHaveLength(1)
    expect(surfaces[0]?.id).toBe('pond')
    expect(surfaces[0]?.levels).toEqual([10, 10, 10, 10])
    expect(surfaces[0]?.ring).toEqual(POND.ring)
  })

  it('holds the surface flat across the body and lets it follow the ground along it', () => {
    // The ground rises towards the north; the river runs north to south across it.
    const slope = grid((_east, north) => north)
    const river = water('river', [[10, 0], [20, 0], [20, 40], [10, 40]])
    const [surface] = computeWaterSurfaces(slope, [river])
    // Both banks at the south end share one level, and both banks at the north end share another.
    expect(surface?.levels).toEqual([0, 0, 40, 40])
  })

  it('smooths a lumpy outline into one level, so the surface cannot bulge', () => {
    // The banks are uneven: one metre between them on either side of the body.
    const lumpy = grid((east) => (east === 10 ? 11 : 10))
    const body = water('body', [[10, 10], [30, 10], [30, 30], [10, 30]])
    const [surface] = computeWaterSurfaces(lumpy, [body])
    // One level for the whole body: the window covers it, so the two banks share a level.
    expect(surface?.levels.every((level) => level === 10.5)).toBe(true)
  })

  it('ignores anything that is not a mapped water body', () => {
    const park: LandCoverArea = { id: 'park', kind: 'park', ring: [[10, 10], [30, 10], [30, 30]] }
    expect(computeWaterSurfaces(FLAT, [park])).toEqual([])
    expect(computeWaterSurfaces(FLAT, [water('thin', [[10, 10], [30, 10]])])).toEqual([])
  })

  it('reports the size of a terrain cell', () => {
    expect(terrainCellSize(FLAT)).toBe(10)
  })
})

describe('carveTerrainForWater', () => {
  it('cuts the ground inside the body down to the water surface', () => {
    // The middle of the body is a hump the coarse model left between the channel and the bank.
    const humped = grid((east) => (east === 20 ? 16 : 10))
    const surfaces = computeWaterSurfaces(humped, [POND])
    const carved = carveTerrainForWater(humped, surfaces)
    expect(carved.heights[2]?.[2]).toBeCloseTo(9.9, 6)
    // The ground outside the body is left exactly as it was.
    expect(carved.heights[0]?.[0]).toBe(10)
    expect(carved.heights[4]?.[4]).toBe(10)
    expect(carved.heights[2]?.[0]).toBe(10)
  })

  it('leaves the package terrain untouched', () => {
    const humped = grid((east) => (east === 20 ? 16 : 10))
    const before = humped.heights.map((row) => [...row])
    carveTerrainForWater(humped, computeWaterSurfaces(humped, [POND]))
    expect(humped.heights).toEqual(before)
  })

  it('returns the same terrain when there is no water', () => {
    expect(carveTerrainForWater(FLAT, [])).toBe(FLAT)
  })

  it('puts the ground under the water below the water surface', () => {
    const humped = grid((east) => (east === 20 ? 16 : 10))
    const surfaces = computeWaterSurfaces(humped, [POND])
    const carved = carveTerrainForWater(humped, surfaces)
    expect(carved.heights[2]?.[2]).toBeLessThan(surfaces[0]!.levels[0]!)
  })
})

describe('waterSurfaceLevel', () => {
  it('reads the level of the nearest point on the outline', () => {
    const [surface] = computeWaterSurfaces(FLAT, [POND])
    expect(waterSurfaceLevel(surface!, 10, 10)).toBeCloseTo(10, 6)
    expect(waterSurfaceLevel(surface!, 20, 20)).toBeCloseTo(10, 6)
  })

  it('follows the surface along a body that descends', () => {
    const slope = grid((_east, north) => north)
    const river = water('river', [[10, 0], [20, 0], [20, 40], [10, 40]])
    const [surface] = computeWaterSurfaces(slope, [river])
    expect(waterSurfaceLevel(surface!, 15, 0)).toBeCloseTo(0, 6)
    expect(waterSurfaceLevel(surface!, 15, 40)).toBeCloseTo(40, 6)
  })
})
