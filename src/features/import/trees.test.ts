// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest'
import grunerlokkaTerrain from './__fixtures__/terrain/grunerlokka.json'
import { importSite } from './assemble'
import { frameBounds } from './frame'
import { kartverketProvider, parseKartverketSamples, type TerrainProvider } from './terrain'
import { fixtureTiles, grunerlokka } from './testFixtures'
import { overpassTrees, parseOverpassTrees, placeTrees, resampleRow, type TreeSource } from './trees'
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

it('posts the tree query and fails over to the next endpoint when one is throttled', async () => {
  const calls: { url: string; method?: string }[] = []
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url: String(url), method: init?.method })
    if (calls.length === 1) return new Response('', { status: 429 })
    return new Response(JSON.stringify({ elements: [{ type: 'node', lat: 59.92, lon: 10.75 }] }))
  }))
  const source = overpassTrees()
  const lines = await source.fetchTrees([10.75, 59.92, 10.76, 59.93])
  expect(lines).toEqual([[[10.75, 59.92]]])
  expect(calls[0]!.method).toBe('POST')
  expect(calls[0]!.url).toContain('overpass-api.de')
  expect(calls.length).toBeGreaterThan(1)
  expect(calls[1]!.url).not.toBe(calls[0]!.url)
})

it('gives up on the tree step inside its budget and names every endpoint it tried', async () => {
  const calls: string[] = []
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    calls.push(String(url))
    return new Response('', { status: 503 })
  }))
  const source = overpassTrees()
  await expect(source.fetchTrees([10.75, 59.92, 10.76, 59.93])).rejects.toThrow(/Overpass API:.*503.*503/s)
  expect(calls.length).toBeGreaterThan(0)
  expect(calls.length).toBeLessThanOrEqual(6)
})

it('treats an Overpass timeout remark as a failure, not as an area without trees', () => {
  expect(() => parseOverpassTrees({ elements: [], remark: 'runtime error: Query timed out' })).toThrow(/timed out/)
  expect(parseOverpassTrees({ elements: [] })).toEqual([])
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
