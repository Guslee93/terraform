import { describe, expect, it } from 'vitest'
import {
  pointInPolygon,
  polygonArea,
  sampleTerrainHeight,
  terrainHeightRange,
  terrainRelief,
} from './geometry'
import type { TerrainData } from './package'

const terrain: TerrainData = {
  schemaVersion: 1,
  siteId: 'fixture',
  cols: 2,
  rows: 2,
  minX: 0,
  maxX: 10,
  minY: 0,
  maxY: 10,
  originElevation: 0,
  heights: [
    [0, 10],
    [20, 30],
  ],
  source: 'fixture',
}

describe('terrain sampling', () => {
  it('samples corners and the centre of a planar cell', () => {
    expect(sampleTerrainHeight(terrain, 0, 0)).toBe(0)
    expect(sampleTerrainHeight(terrain, 10, 10)).toBe(30)
    expect(sampleTerrainHeight(terrain, 5, 5)).toBe(15)
  })

  it('follows the drawn mesh triangles on a twisted cell, not a bilinear patch', () => {
    // One raised corner: the mesh diagonal runs between the two low corners, so the centre stays at 0
    // (a bilinear patch would say 2.5 and float everything draped there).
    const twisted: TerrainData = { ...terrain, heights: [[0, 0], [0, 10]] }
    expect(sampleTerrainHeight(twisted, 5, 5)).toBe(0)
    expect(sampleTerrainHeight(twisted, 2, 2)).toBe(0)
    expect(sampleTerrainHeight(twisted, 7.5, 7.5)).toBe(5)
    expect(sampleTerrainHeight(twisted, 10, 5)).toBe(5)
  })

  it('measures the relief inside a circle', () => {
    expect(terrainRelief(terrain, [5, 5], 5)).toBe(20)
    expect(terrainRelief({ ...terrain, heights: [[3, 3], [3, 3]] }, [5, 5], 5)).toBe(0)
  })

  it('clamps points outside the grid', () => {
    expect(sampleTerrainHeight(terrain, -50, -50)).toBe(0)
    expect(sampleTerrainHeight(terrain, 50, 50)).toBe(30)
  })

  it('reports the height range', () => {
    expect(terrainHeightRange(terrain)).toEqual({ min: 0, max: 30 })
  })
})

describe('polygon helpers', () => {
  const square = [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
    [0, 0],
  ] as const

  it('computes the closed-ring area', () => {
    expect(polygonArea(square)).toBe(100)
  })

  it('tests point containment without relying on winding', () => {
    expect(pointInPolygon([5, 5], square)).toBe(true)
    expect(pointInPolygon([15, 5], square)).toBe(false)
  })
})
