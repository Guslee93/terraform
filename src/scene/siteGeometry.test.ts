import { describe, expect, it } from 'vitest'
import type { Road, TerrainData } from '../features/sites/package'
import { createRoadGeometry, createTerrainGeometry, drapePolyline, ROAD_LIFT } from './siteGeometry'

/** 20 × 20 m terrain rising 1 m per metre towards the east. */
const RAMP: TerrainData = {
  schemaVersion: 1,
  siteId: 'fixture',
  cols: 3,
  rows: 3,
  minX: 0,
  maxX: 20,
  minY: 0,
  maxY: 20,
  originElevation: 0,
  heights: [
    [0, 10, 20],
    [0, 10, 20],
    [0, 10, 20],
  ],
  source: 'fixture',
}

const EAST_ROAD: Road = { id: 'r', highway: 'residential', width: 6, centreline: [[2, 10], [18, 10]] }

describe('createRoadGeometry', () => {
  it('builds a ribbon of the road width, draped on the terrain and lifted clear of it', () => {
    const geometry = createRoadGeometry([EAST_ROAD], RAMP)
    const position = geometry.getAttribute('position')
    expect(position.count).toBeGreaterThan(0)
    for (let index = 0; index < position.count; index += 1) {
      const east = position.getX(index)
      const north = -position.getZ(index)
      // Ribbon spans north 7…13 (width 6 about north = 10).
      expect(north).toBeGreaterThanOrEqual(7 - 1e-6)
      expect(north).toBeLessThanOrEqual(13 + 1e-6)
      // On the ramp, ground height equals east (clamped to the terrain), plus the lift.
      const ground = Math.min(Math.max(east, 0), 20)
      expect(position.getY(index)).toBeCloseTo(ground + ROAD_LIFT, 5)
    }
    // Faces wind counter-clockwise from above, so normals point up (lit by the sun, not culled).
    const normal = geometry.getAttribute('normal')
    for (let index = 0; index < normal.count; index += 1) expect(normal.getY(index)).toBeGreaterThan(0)
    geometry.dispose()
  })

  it('extends each segment by half its width so bends do not gap', () => {
    const geometry = createRoadGeometry([EAST_ROAD], RAMP)
    geometry.computeBoundingBox()
    expect(geometry.boundingBox?.min.x).toBeCloseTo(2 - 3, 5)
    expect(geometry.boundingBox?.max.x).toBeCloseTo(18 + 3, 5)
    geometry.dispose()
  })
})

describe('drapePolyline', () => {
  it('adds points along each edge so the line follows the terrain between corners', () => {
    // A 20 m edge across the ramp: corners at heights 0 and 20, but the middle must sit at 10.
    const points = drapePolyline([[0, 10], [20, 10]], RAMP, 4, 0.5)
    expect(points.length).toBe(6)
    for (const [x, y] of points) expect(y).toBeCloseTo(x + 0.5, 5)
    expect(points[0]).toEqual([0, 0.5, -10])
    expect(points.at(-1)).toEqual([20, 20.5, -10])
  })
})

describe('createTerrainGeometry UVs', () => {
  it('runs u east and v north so the land cover texture drapes north-up', () => {
    const geometry = createTerrainGeometry(RAMP)
    const uv = geometry.getAttribute('uv')
    const position = geometry.getAttribute('position')
    for (let index = 0; index < uv.count; index += 1) {
      expect(uv.getX(index)).toBeCloseTo(position.getX(index) / 20, 6)
      expect(uv.getY(index)).toBeCloseTo(-position.getZ(index) / 20, 6)
    }
    geometry.dispose()
  })
})
