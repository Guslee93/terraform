import { describe, expect, it } from 'vitest'
import compactBuildings from '../../../public/sites/compact-infill/buildings.json'
import compactLandcover from '../../../public/sites/compact-infill/landcover.json'
import compactManifest from '../../../public/sites/compact-infill/manifest.json'
import compactRoads from '../../../public/sites/compact-infill/roads.json'
import compactStudyArea from '../../../public/sites/compact-infill/study-area.json'
import compactTerrain from '../../../public/sites/compact-infill/terrain.json'
import compactTrees from '../../../public/sites/compact-infill/trees.json'
import slopedBuildings from '../../../public/sites/sloped-edge/buildings.json'
import slopedLandcover from '../../../public/sites/sloped-edge/landcover.json'
import slopedManifest from '../../../public/sites/sloped-edge/manifest.json'
import slopedRoads from '../../../public/sites/sloped-edge/roads.json'
import slopedStudyArea from '../../../public/sites/sloped-edge/study-area.json'
import slopedTerrain from '../../../public/sites/sloped-edge/terrain.json'
import slopedTrees from '../../../public/sites/sloped-edge/trees.json'
import { SitePackageError, parseSiteManifest } from './manifest'
import { parseBuildings, parseLandCover, parseRoads, parseStudyArea, parseTerrain, parseTrees } from './package'
import { pointInPolygon } from '../../lib/polygon'

const PACKAGES = [
  {
    id: 'compact-infill',
    manifest: compactManifest,
    terrain: compactTerrain,
    buildings: compactBuildings,
    studyArea: compactStudyArea,
  },
  {
    id: 'sloped-edge',
    manifest: slopedManifest,
    terrain: slopedTerrain,
    buildings: slopedBuildings,
    studyArea: slopedStudyArea,
  },
]

describe.each(PACKAGES)('$id package', ({ id, manifest, terrain, buildings, studyArea }) => {
  it('parses the manifest and all three assets', () => {
    const parsedManifest = parseSiteManifest(manifest)
    const parsedTerrain = parseTerrain(terrain)
    const parsedBuildings = parseBuildings(buildings)
    const parsedStudyArea = parseStudyArea(studyArea)

    expect(parsedManifest.id).toBe(id)
    expect(parsedTerrain.siteId).toBe(id)
    expect(parsedBuildings.siteId).toBe(id)
    expect(parsedStudyArea.siteId).toBe(id)
  })

  it('matches declared statistics', () => {
    const parsedManifest = parseSiteManifest(manifest)
    const parsedTerrain = parseTerrain(terrain)
    const parsedBuildings = parseBuildings(buildings)

    expect(parsedManifest.statistics.buildingCount).toBe(parsedBuildings.buildings.length)
    expect(parsedManifest.statistics.terrainSamples).toBe(
      parsedTerrain.cols * parsedTerrain.rows,
    )
    expect(parsedBuildings.buildings.length).toBeGreaterThan(0)
  })

  it('records both sources and five camera presets', () => {
    const parsed = parseSiteManifest(manifest)
    expect(parsed.sources.map((source) => source.license)).toEqual(
      expect.arrayContaining(['ODbL 1.0', 'CC BY 4.0']),
    )
    expect(Object.keys(parsed.cameraPresets)).toEqual([
      'isometric',
      'top',
      'north',
      'south',
      'eyeLevel',
    ])
  })

  it('uses a closed study boundary that is explicitly not cadastral', () => {
    const parsed = parseStudyArea(studyArea)
    expect(parsed.label).toMatch(/not a cadastral parcel/i)
    expect(parsed.polygon[0]).toEqual(parsed.polygon[parsed.polygon.length - 1])
  })
})

describe('package validation', () => {
  it('rejects unsupported manifest schemas', () => {
    expect(() => parseSiteManifest({ ...compactManifest, schemaVersion: 2 })).toThrow(
      SitePackageError,
    )
  })

  it('rejects a terrain grid with the wrong row count', () => {
    const broken = structuredClone(compactTerrain)
    broken.heights.pop()
    expect(() => parseTerrain(broken)).toThrow(/row count/)
  })

  it('rejects an open study boundary', () => {
    const broken = structuredClone(compactStudyArea)
    broken.polygon.pop()
    expect(() => parseStudyArea(broken)).toThrow(/closed/)
  })
})

describe('optional roads and trees (ADR-0005 §5)', () => {
  it('parses both packaged context files', () => {
    for (const [roads, trees, id] of [
      [compactRoads, compactTrees, 'compact-infill'],
      [slopedRoads, slopedTrees, 'sloped-edge'],
    ] as const) {
      const parsedRoads = parseRoads(roads)
      const parsedTrees = parseTrees(trees)
      expect(parsedRoads.siteId).toBe(id)
      expect(parsedTrees.siteId).toBe(id)
      expect(parsedRoads.roads.length).toBeGreaterThan(0)
      expect(parsedTrees.trees.length).toBeGreaterThan(0)
      for (const road of parsedRoads.roads) {
        expect(road.centreline.length).toBeGreaterThanOrEqual(2)
        expect(road.width).toBeGreaterThan(0)
      }
    }
  })

  it('keeps manifests valid with and without the optional paths', () => {
    expect(parseSiteManifest(compactManifest).assetPaths.roads).toBe('roads.json')
    const required = Object.fromEntries(
      Object.entries(compactManifest.assetPaths).filter(([key]) => key !== 'roads' && key !== 'trees'),
    )
    const legacy = parseSiteManifest({ ...compactManifest, assetPaths: required })
    expect(legacy.assetPaths.roads).toBeUndefined()
    expect(legacy.assetPaths.trees).toBeUndefined()
  })

  it('rejects a road with fewer than two points or a non-positive width', () => {
    const base = { schemaVersion: 1, siteId: 'x' }
    expect(() =>
      parseRoads({ ...base, roads: [{ id: 'a', highway: 'service', width: 4, centreline: [[0, 0]] }] }),
    ).toThrow(SitePackageError)
    expect(() =>
      parseRoads({
        ...base,
        roads: [{ id: 'a', highway: 'service', width: 0, centreline: [[0, 0], [1, 1]] }],
      }),
    ).toThrow(SitePackageError)
  })

  it('rejects a malformed tree point', () => {
    expect(() => parseTrees({ schemaVersion: 1, siteId: 'x', trees: [[1]] })).toThrow(
      SitePackageError,
    )
  })
})

describe('optional land cover', () => {
  const area = { id: 'way/1', kind: 'park', ring: [[0, 0], [10, 0], [0, 10]] }
  const data = { schemaVersion: 1, siteId: 'x', areas: [area] }

  it('parses both packaged files with open CCW rings inside the terrain extent', () => {
    for (const [raw, terrain] of [
      [compactLandcover, compactTerrain], [slopedLandcover, slopedTerrain],
    ] as const) {
      const parsed = parseLandCover(raw)
      expect(parsed.siteId).toBe(terrain.siteId)
      expect(parsed.areas.length).toBeGreaterThan(0)
      const ids = parsed.areas.map((item) => item.id)
      expect(ids).toEqual([...ids].sort())
      for (const { ring } of parsed.areas) {
        expect(ring[0]).not.toEqual(ring[ring.length - 1])
        let twiceArea = 0
        ring.forEach(([east, north], index) => {
          expect(east).toBeGreaterThanOrEqual(terrain.minX)
          expect(east).toBeLessThanOrEqual(terrain.maxX)
          expect(north).toBeGreaterThanOrEqual(terrain.minY)
          expect(north).toBeLessThanOrEqual(terrain.maxY)
          const next = ring[(index + 1) % ring.length]
          if (next) twiceArea += east * next[1] - north * next[0]
        })
        expect(twiceArea).toBeGreaterThanOrEqual(8)
      }
    }
  })

  it('accepts each kind and up to 5000 areas', () => {
    for (const kind of ['water', 'park', 'grass', 'wood']) {
      expect(parseLandCover({ ...data, areas: [{ ...area, kind }] }).areas[0]?.kind).toBe(kind)
    }
    expect(parseLandCover({ ...data, areas: Array.from({ length: 5000 }, () => area) }).areas).toHaveLength(5000)
  })

  it('parses the optional manifest path and permits its absence', () => {
    expect(parseSiteManifest(compactManifest).assetPaths.landcover).toBe('landcover.json')
    const paths = Object.fromEntries(Object.entries(compactManifest.assetPaths).filter(([key]) => key !== 'landcover'))
    expect(parseSiteManifest({ ...compactManifest, assetPaths: paths }).assetPaths.landcover).toBeUndefined()
  })

  it.each([null, '', 3])('rejects an invalid optional manifest path: %s', (landcover) => {
    expect(() => parseSiteManifest({
      ...compactManifest, assetPaths: { ...compactManifest.assetPaths, landcover },
    })).toThrow(/manifest.assetPaths.landcover/)
  })

  it('rejects unknown kinds', () => {
    expect(() => parseLandCover({ ...data, areas: [{ ...area, kind: 'sand' }] })).toThrow(/unknown land cover kind/)
  })

  it.each([[], [[0, 0]], [[0, 0], [1, 1]]])('rejects a ring with fewer than three points: %j', (...ring) => {
    expect(() => parseLandCover({ ...data, areas: [{ ...area, ring }] })).toThrow(/at least three points/)
  })

  it.each([NaN, Infinity, -Infinity])('rejects non-finite coordinates: %s', (coordinate) => {
    for (const point of [[coordinate, 0], [0, coordinate]]) {
      expect(() => parseLandCover({ ...data, areas: [{ ...area, ring: [point, [10, 0], [0, 10]] }] })).toThrow(/finite number/)
    }
  })

  it('rejects zero-area rings', () => {
    expect(() => parseLandCover({ ...data, areas: [{ ...area, ring: [[0, 0], [1, 1], [2, 2]] }] })).toThrow(/positive area/)
  })

  it('rejects more than 5000 areas', () => {
    expect(() => parseLandCover({ ...data, areas: Array.from({ length: 5001 }, () => area) })).toThrow(/too many areas/)
  })

  it('rejects malformed envelopes and points', () => {
    for (const broken of [null, { ...data, schemaVersion: 2 }, { ...data, siteId: '' },
      { ...data, areas: null }, { ...data, areas: [{ ...area, ring: [[1], [10, 0], [0, 10]] }] }]) {
      expect(() => parseLandCover(broken)).toThrow(SitePackageError)
    }
  })
})

describe('shipped packages place no tree on water (ADR-0024)', () => {
  it('keeps every tree of both curated sites off the painted water', () => {
    for (const [trees, landcover, id] of [
      [compactTrees, compactLandcover, 'compact-infill'],
      [slopedTrees, slopedLandcover, 'sloped-edge'],
    ] as const) {
      const water = parseLandCover(landcover).areas.filter((area) => area.kind === 'water')
      expect(water.length).toBeGreaterThan(0)
      const points = parseTrees(trees).trees
      expect(points.length).toBeGreaterThan(0)
      const onWater = points.filter((point) => water.some((area) => pointInPolygon(point, area.ring)))
      expect({ id, onWater: onWater.length }).toEqual({ id, onWater: 0 })
    }
  })
})
