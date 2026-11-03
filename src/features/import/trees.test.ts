// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest'
import grunerlokkaTerrain from './__fixtures__/terrain/grunerlokka.json'
import { importSite } from './assemble'
import { frameBounds } from './frame'
import { kartverketProvider, parseKartverketSamples, type TerrainProvider } from './terrain'
import { fixtureTiles, grunerlokka } from './testFixtures'
import { parseOverpassTrees, placeTrees, resampleRow, type TreeSource } from './trees'
import { unproject } from './projection'

afterEach(() => vi.unstubAllGlobals())

const terrain: TerrainProvider = {
  ...kartverketProvider(),
  sample: async () => grunerlokkaTerrain.batches.flatMap((batch) => parseKartverketSamples(batch.response, batch.response.punkter.map((p) => [p.x, p.y]))),
}

it('parses Overpass nodes and tree rows, ignoring malformed elements', () => {
  expect(parseOverpassTrees({ elements: [
    { type: 'node', lat: 59.92, lon: 10.75 },
    { type: 'node', lat: 'x', lon: 10.75 },
    { type: 'way', geometry: [{ lat: 59.921, lon: 10.751 }, { lat: 59.922, lon: 10.752 }] },
    null,
  ] })).toEqual([[[10.75, 59.92]], [[10.751, 59.921], [10.752, 59.922]]])
  expect(() => parseOverpassTrees({})).toThrow(/missing elements/)
})

it('resamples a tree row every 8 m including both ends', () => {
  expect(resampleRow([[0, 0], [24, 0]])).toEqual([[0, 0], [8, 0], [16, 0], [24, 0]])
})

it('drops trees outside the frame, inside buildings and within 1 m of another', () => {
  const footprint: [number, number][] = [[0, 0], [10, 0], [10, 10], [0, 10]]
  const placed = placeTrees([[5, 5], [20, 20], [20.2, 20.1], [9999, 0]], [{ id: 'b', sourceId: 'b', footprint, height: 9, minHeight: 0 }], grunerlokka)
  expect(placed).toEqual([[20, 20]])
})

it('uses mapped trees when the source answers and credits it', async () => {
  vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Tests must not use the network') }))
  const [lat, lon] = unproject(-150, 120, grunerlokka.latitude, grunerlokka.longitude)
  const source: TreeSource = { name: 'Overpass API', attribution: '© OpenStreetMap contributors', fetchTrees: vi.fn(async (): Promise<[number, number][][]> => [[[lon, lat]]]) }
  const result = await importSite(grunerlokka, { tiles: fixtureTiles, terrain: [terrain], trees: source })
  expect(source.fetchTrees).toHaveBeenCalledWith(frameBounds(grunerlokka).lonLat, undefined)
  expect(result.sitePackage.trees).toHaveLength(1)
  expect(result.sitePackage.trees[0]![0]).toBeCloseTo(-150, 0)
  expect(result.sitePackage.trees[0]![1]).toBeCloseTo(120, 0)
  expect(result.warnings.some((w) => w.code === 'trees-unavailable')).toBe(false)
  expect(result.sitePackage.manifest.sources.map((s) => s.title)).toContain('Overpass API')
})

it('falls back to illustrative trees and says why when the source fails', async () => {
  const source: TreeSource = { name: 'Overpass API', attribution: '©', fetchTrees: async () => { throw new Error('Overpass API: HTTP 504') } }
  const result = await importSite(grunerlokka, { tiles: fixtureTiles, terrain: [terrain], trees: source })
  expect(result.sitePackage.trees.length).toBeGreaterThan(0)
  expect(result.warnings.find((w) => w.code === 'trees-unavailable')?.message).toMatch(/illustrative.*HTTP 504/)
  expect(result.sitePackage.manifest.sources.map((s) => s.title)).not.toContain('Overpass API')
})
