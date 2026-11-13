// @vitest-environment node
import { readFileSync } from 'node:fs'
import { afterEach, expect, it, vi } from 'vitest'
import { osmApiArea, parseOsmXml, wayPoints } from './osm'

afterEach(() => vi.unstubAllGlobals())

export const osmFixtureXml = readFileSync(new URL('./__fixtures__/osm/frame.xml', import.meta.url), 'utf8')

it('reads the nodes, ways, relations and tags of an OpenStreetMap answer', () => {
  const data = parseOsmXml(osmFixtureXml)
  expect(data.nodes).toHaveLength(19)
  expect(data.ways).toHaveLength(7)
  expect(data.relations).toHaveLength(1)
  expect(data.nodes.find((node) => node.id === '7')?.tags).toEqual({ natural: 'tree' })
  expect(data.ways.find((way) => way.id === '100')?.tags).toEqual({ natural: 'water', water: 'river', name: 'Akerselva' })
  expect(data.relations[0]?.members).toEqual([{ type: 'way', ref: '103', role: 'outer' }, { type: 'way', ref: '104', role: 'outer' }])
})

it('ignores what it cannot read instead of failing the whole answer', () => {
  const data = parseOsmXml('<osm><node id="1" lat="x" lon="1"/><node id="2" lat="1" lon="2"/><way id="3"><nd ref="2"/></way><way id="4"><nd ref="404"/></way></osm>')
  expect(data.nodes).toHaveLength(1)
  expect(data.ways).toHaveLength(2)
  expect(wayPoints(data, data.ways[0]!)).toEqual([[2, 1]])
  expect(wayPoints(data, data.ways[1]!)).toEqual([])
})

it('asks the API for one bounding box and decodes the answer', async () => {
  const calls: string[] = []
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    calls.push(String(url))
    return new Response(osmFixtureXml, { status: 200 })
  }))
  const source = osmApiArea()
  const data = await source.fetchArea([10.75, 59.92, 10.76, 59.93])
  expect(calls).toHaveLength(1)
  expect(calls[0]).toContain('api.openstreetmap.org/api/0.6/map?bbox=10.75,59.92,10.76,59.93')
  expect(data.ways).toHaveLength(7)
  expect(source.attribution).toContain('OpenStreetMap')
  expect(source.license).toBe('ODbL 1.0')
})

it('reports an unavailable API instead of answering with nothing', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 429 })))
  await expect(osmApiArea().fetchArea([10.75, 59.92, 10.76, 59.93])).rejects.toThrow(/OpenStreetMap API: HTTP 429/)
})

it('waits once and repeats a rate-limited request', async () => {
  const calls: string[] = []
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    calls.push(String(url))
    if (calls.length === 1) return new Response('', { status: 429 })
    return new Response(osmFixtureXml, { status: 200 })
  }))
  const data = await osmApiArea().fetchArea([10.75, 59.92, 10.76, 59.93])
  expect(calls).toHaveLength(2)
  expect(data.ways).toHaveLength(7)
})
