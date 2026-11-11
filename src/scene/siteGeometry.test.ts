import { describe, expect, it } from 'vitest'
import { parseBuildings, type Road, type TerrainData } from '../features/sites/package'
import { EdgesGeometry } from 'three'
import { roofBase } from './roofGeometry'
import { roofSolarGeometry } from './RoofSolar'
import { createContextGeometry, createRoadGeometry, createTerrainGeometry, drapePolyline, ROAD_LIFT } from './siteGeometry'

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

describe('createContextGeometry roofs (ADR-0022)', () => {
  const building = (roof?: object) =>
    parseBuildings({
      schemaVersion: 1,
      siteId: 'test',
      buildings: [{ id: 'b', kind: 'other', height: 10, baseElevation: 2, area: 200, withinStudyArea: true, footprint: [[-10, -5], [10, -5], [10, 5], [-10, 5]], ...(roof ? { roof } : {}) }],
    }).buildings
  const heights = (geometry: ReturnType<typeof createContextGeometry>) => {
    const position = geometry.getAttribute('position')
    return Array.from({ length: position.count }, (_, index) => position.getY(index))
  }

  it('keeps a building without a roof as a flat box', () => {
    expect(Math.max(...heights(createContextGeometry(building())))).toBeCloseTo(12)
  })

  it('raises a gable to its ridge, with eaves at the pitch below it and one ridge line', () => {
    const geometry = createContextGeometry(building({ shape: 'gabled', ridge: [[-10, 0], [10, 0]], ridgeHeight: 12, pitchDeg: 45 }))
    const ys = heights(geometry)
    expect(Math.max(...ys)).toBeCloseTo(14, 1) // base 2 + ridge 12
    // Eaves: 5 m from the ridge at 45° is 5 m lower (the outline is inset a few centimetres).
    expect(ys.some((y) => Math.abs(y - 9) < 0.2)).toBe(true)
    expect(ys.some((y) => y > 2.5 && y < 8.8)).toBe(false)
    // The two roof planes meet in exactly one visible edge along the ridge, with no stray diagonals.
    const edges = new EdgesGeometry(geometry, 30).getAttribute('position')
    let ridgeEdges = 0
    for (let index = 0; index < edges.count; index += 2) {
      if (edges.getY(index) > 13.9 && edges.getY(index + 1) > 13.9) ridgeEdges += 1
    }
    expect(ridgeEdges).toBe(1)
    geometry.dispose()
  })
})

describe('roof overlays on a slope', () => {
  const footprint: [number, number][] = [[0, 0], [10, 0], [10, 10], [0, 10]]
  // Terrain climbs 1 m per metre north: 5 m at the centroid, 0 m at the building's lowest corner.
  const slope = (_east: number, north: number) => north

  it('measures a context building from its own base, not the terrain at its centre', () => {
    expect(roofBase({ footprint, baseElevation: -0.3 }, slope)).toBe(-0.3)
    const geometry = roofSolarGeometry([{ footprint, height: 8, baseElevation: -0.3 }], [{ kwhPerM2: 900, sampleCount: 1, analysed: true }], slope)
    const position = geometry.getAttribute('position')
    // Roof top is at −0.3 + 8 = 7.7; the overlay sits 0.3 m above it, not 5 m higher.
    for (let index = 0; index < position.count; index += 1) expect(position.getY(index)).toBeCloseTo(8, 5)
    geometry.dispose()
  })

  it('still seats a drawn mass (no base) on the terrain at its centroid', () => {
    expect(roofBase({ footprint }, slope)).toBe(5)
  })
})
