// @vitest-environment node
import { afterEach, expect, it, vi } from 'vitest'
import { decodeTile, openFreeMapSource, tileCover, validProperties } from './tiles'
import { tileBytes, grunerlokka, bjorvika } from './testFixtures'
import { frameBounds } from './frame'
afterEach(() => vi.unstubAllGlobals())
it('covers both Oslo frames with the recorded z14 tiles', () => {
  expect(tileCover(frameBounds(grunerlokka).lonLat, 14).map(t => t.y)).toEqual([4764,4765])
  expect(tileCover(frameBounds(bjorvika).lonLat, 14)).toEqual([{z:14,x:8681,y:4766}])
  expect(() => tileCover([4,54,32,71],14)).toThrow(/budget/)
  expect(() => tileCover([10,60,9,61],14)).toThrow()
})
it('decodes real MVT geometry in longitude/latitude', () => {
  const features = decodeTile(tileBytes(14,8681,4765),14,8681,4765)
  expect(features.some(f => f.layer === 'building' && f.geometry.type === 'Polygon')).toBe(true)
  expect(features.every(f => Object.values(f.properties).every(v => ['string','number','boolean'].includes(typeof v)))).toBe(true)
})
it('drops malformed properties, including nonfinite numbers', () => {
  const props = validProperties({name:'test',height:4,hidden:false,nan:NaN,infinite:Infinity,nested:{},list:[],nil:null})
  expect(props).toEqual({name:'test',height:4,hidden:false})
  expect(validProperties(null)).toEqual({})
  expect(validProperties([])).toEqual({})
})
it('fetches TileJSON once per source instance, even with concurrent tile requests', async () => {
  const fetcher = vi.fn(async (url: string) => new Response(url.endsWith('/planet') ? JSON.stringify({tiles:['https://example.test/{z}/{x}/{y}.pbf']}) : new Uint8Array([1])))
  vi.stubGlobal('fetch',fetcher)
  const source = openFreeMapSource()
  await Promise.all([source.fetchTile(14,1,2),source.fetchTile(14,1,3)])
  expect(fetcher.mock.calls.filter(([url]) => url.endsWith('/planet'))).toHaveLength(1)
  expect(fetcher.mock.calls.map(([url]) => url)).toContain('https://example.test/14/1/3.pbf')
})
it('rejects malformed TileJSON with the source name', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ tiles: ['http://bad'] }))))
  await expect(openFreeMapSource().fetchTile(14,1,2)).rejects.toThrow(/OpenFreeMap TileJSON/)
})
