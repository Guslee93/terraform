// @vitest-environment node
import { readFileSync } from 'node:fs'
import { afterEach, expect, it, vi } from 'vitest'
import type { Position } from 'geojson'
import grunerlokkaTerrain from './__fixtures__/terrain/grunerlokka.json'
import { importSite } from './assemble'
import { extractLandCover, extractTileWater } from './context'
import { frameBounds } from './frame'
import { parseOsmXml, type OsmAreaSource } from './osm'
import { kartverketProvider, parseKartverketSamples, type TerrainProvider } from './terrain'
import { fixtureTiles, grunerlokka } from './testFixtures'
import { illustrativeTrees, mappedTrees, parseOsmTrees, placeTrees, resampleRow } from './trees'
import { dropTreesOnWater } from '../sites/treePlacement'
import { pointInPolygon } from '../../lib/polygon'
import { unproject } from './projection'
import type { TileFeature } from './tiles'

afterEach(() => vi.unstubAllGlobals())

const terrain: TerrainProvider = {
  ...kartverketProvider(),
  sample: async () => grunerlokkaTerrain.batches.flatMap((batch) => parseKartverketSamples(batch.response, batch.response.punkter.map((p) => [p.x, p.y]))),
}

const osmFixtureXml = readFileSync(new URL('./__fixtures__/osm/frame.xml', import.meta.url), 'utf8')

/** The OpenStreetMap source of the fixture answer. */
function osmSource(answer = osmFixtureXml): OsmAreaSource {
  return {
    name: 'OpenStreetMap API',
    attribution: '© OpenStreetMap contributors · ODbL 1.0',
    url: 'https://api.openstreetmap.org/api/0.6',
    license: 'ODbL 1.0',
    fetchArea: vi.fn(async () => parseOsmXml(answer)),
  }
}

it('reads the mapped trees of the answer: single trees and tree rows', () => {
  const lines = parseOsmTrees(parseOsmXml(osmFixtureXml))
  expect(lines).toHaveLength(2)
  expect(lines[0]).toHaveLength(1)
  expect(lines[1]).toHaveLength(2)
})

it('resamples a tree row every 8 m including both ends', () => {
  expect(resampleRow([[0, 0], [24, 0]])).toEqual([[0, 0], [8, 0], [16, 0], [24, 0]])
})

it('drops trees outside the frame, inside buildings and within 1 m of another', () => {
  const footprint: [number, number][] = [[0, 0], [10, 0], [10, 10], [0, 10]]
  const placed = placeTrees([[5, 5], [20, 20], [20.2, 20.1], [9999, 0]], [{ id: 'b', sourceId: 'b', footprint, height: 9, minHeight: 0 }], grunerlokka)
  expect(placed).toEqual([[20, 20]])
})

it('uses the mapped trees of the answer and credits the source', async () => {
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Tests must not use the network') }))
  const source = osmSource()
  const result = await importSite(grunerlokka, { tiles: fixtureTiles, terrain: [terrain], osm: source })
  expect(source.fetchArea).toHaveBeenCalledWith(frameBounds(grunerlokka).lonLat, undefined)
  // The fixture holds one single tree and one tree row of two trees, resampled every 8 m.
  expect(result.sitePackage.trees).toHaveLength(4)
  expect(result.warnings.some((w) => w.code === 'trees-unavailable')).toBe(false)
  expect(result.sitePackage.manifest.sources.map((s) => s.title)).toContain('OpenStreetMap API')
})

it('falls back to illustrative trees and says why when the source fails', async () => {
  const source: OsmAreaSource = {
    name: 'OpenStreetMap API', attribution: '©',
    fetchArea: async () => { throw new Error('OpenStreetMap API: HTTP 429') },
  }
  const result = await importSite(grunerlokka, { tiles: fixtureTiles, terrain: [terrain], osm: source })
  expect(result.sitePackage.trees.length).toBeGreaterThan(0)
  expect(result.warnings.find((w) => w.code === 'trees-unavailable')?.message).toMatch(/illustrative.*HTTP 429/)
  expect(result.sitePackage.manifest.sources.map((s) => s.title)).not.toContain('OpenStreetMap API')
})

it('thins evenly across the frame when more trees than the cap are available', () => {
  const points: [number, number][] = []
  for (let x = -198; x <= 198; x += 3) for (let y = -198; y <= 198; y += 3) points.push([x, y])
  const placed = placeTrees(points, [], grunerlokka)
  expect(points.length).toBeGreaterThan(3000)
  expect(placed).toHaveLength(3000)
  expect(Math.min(...placed.map((p) => p[0]))).toBeLessThan(-180)
  expect(Math.max(...placed.map((p) => p[0]))).toBeGreaterThan(180)
})

it('drops the grid trees that a park polygon puts on the water (ADR-0024)', () => {
  // A park polygon that runs into a lake: the tile's park and water polygons are simplified
  // independently, so the park keeps its ground over the water and the grid lands on it.
  const square = (east: number, north: number, size: number): Position[] => {
    const corners: [number, number][] = [[east, north], [east + size, north], [east + size, north + size], [east, north + size], [east, north]]
    return corners.map(([x, y]) => {
      const [lat, lon] = unproject(x, y, grunerlokka.latitude, grunerlokka.longitude)
      return [lon, lat]
    })
  }
  const features: TileFeature[] = [
    { layer: 'landcover', properties: { class: 'grass', subclass: 'park' }, geometry: { type: 'Polygon', coordinates: [square(-150, -150, 300)] } },
    { layer: 'water', properties: { class: 'water' }, geometry: { type: 'Polygon', coordinates: [square(-50, -50, 100)] } },
  ]
  const areas = extractLandCover(features, grunerlokka)
  const water = extractTileWater(features, grunerlokka)
  expect(water).toHaveLength(1)

  const grid = illustrativeTrees(features, grunerlokka)
  // The grid really does fall on the water: the park polygon covers the lake.
  expect(grid.some((tree) => water.some((area) => pointInPolygon(tree, area.ring)))).toBe(true)

  const kept = dropTreesOnWater(grid, [...areas, ...water])
  expect(kept.some((tree) => water.some((area) => pointInPolygon(tree, area.ring)))).toBe(false)
  // The park outside the lake keeps its canopy.
  expect(kept.length).toBeGreaterThan(0)
  expect(kept.length).toBeLessThan(grid.length)
})

it('places the mapped trees in local metres', () => {
  const [lat, lon] = unproject(-150, 120, grunerlokka.latitude, grunerlokka.longitude)
  const placed = mappedTrees([[[lon, lat]]], grunerlokka)
  expect(placed[0]![0]).toBeCloseTo(-150, 0)
  expect(placed[0]![1]).toBeCloseTo(120, 0)
})
