import { expect, it } from 'vitest'
import { extractLandCover, extractRoads, extractTileWater } from './context'
import { unproject } from './projection'
import type { TileFeature } from './tiles'
import { isSimpleRing } from '../../lib/polygon'
const frame = {latitude:59.92,longitude:10.75,sizeMetres:400,id:'test',title:'Test'}
const coords = (points: number[][]) => points.map(([x,y]) => unproject(x!,y!,frame.latitude,frame.longitude).reverse())
const road = (points: number[][], className='minor', brunnel='', subclass?: string): TileFeature => ({layer:'transportation', properties:{class:className,brunnel,...(subclass?{subclass}:{})}, geometry:{type:'LineString',coordinates:coords(points)}})
const polygon = (layer: string, properties: Record<string, string|number|boolean>, points: number[][]): TileFeature => ({layer, properties, geometry:{type:'Polygon',coordinates:[coords(points)]}})
it('deduplicates buffered runs within 0.5 m only in the same class', () => {
  const result = extractRoads([road([[0,0],[100,0]]),road([[25,0.4],[75,0.4]]),road([[0,0],[100,0]],'primary'),road([[25,0.6],[75,0.6]])],frame)
  expect(result).toHaveLength(3)
  expect(result.map(r=>r.width)).toEqual([6,12,6])
})
it('clips roads and skips tunnels and unmapped classes', () => {
  const result = extractRoads([road([[-250,0],[250,0]],'path'),road([[0,0],[100,0]],'minor','tunnel'),road([[0,0],[100,0]],'rail')],frame)
  expect(result).toHaveLength(1)
  expect(result[0]).toMatchObject({width:2.5,highway:'footway',centreline:[[-200,0],[200,0]]})
})
it('gives each path subclass its own width and skips transit platforms', () => {
  const result = extractRoads([
    road([[0,0],[100,0]],'path','','pedestrian'),
    road([[0,10],[100,10]],'path','','footway'),
    road([[0,20],[100,20]],'path','','cycleway'),
    road([[0,30],[100,30]],'path','','steps'),
    road([[0,40],[100,40]],'path','','platform'),
  ],frame)
  expect(result.map(r=>[r.highway,r.width])).toEqual([['pedestrian',5],['footway',2.5],['cycleway',2.5],['steps',2]])
})
it('maps park, grass, wood and bare ground, and repairs their clipped rings', () => {
  const features: TileFeature[] = [['park',''],['landcover','grass'],['landcover','wood'],['water',''],['landcover','sand']].map(([layer,kind])=>({layer:layer!,properties:{class:kind!},geometry:{type:'Polygon',coordinates:[coords([[0,0],[10,10],[0,10],[10,0],[0,0]])]}}))
  const result = extractLandCover(features,frame)
  expect(result.map(a=>a.kind)).toEqual(['nature','nature','grass','grass','wood','wood','bare','bare'])
  expect(result.every(a=>isSimpleRing(a.ring))).toBe(true)
})
it('keeps the water out of the land cover and in the tile water, which is the fallback', () => {
  // The tiles generalise the water to the tile grid, so the mapped outline replaces it (ADR-0027).
  const features: TileFeature[] = [polygon('water',{class:'water'},[[0,0],[10,10],[0,10],[10,0],[0,0]])]
  expect(extractLandCover(features,frame)).toEqual([])
  expect(extractTileWater(features,frame).map(a=>a.kind)).toEqual(['water','water'])
})
it('maps the greenery the tiles already carry instead of dropping it', () => {
  // The frame is 400 m across, so the polygons are laid out inside it.
  const cases: [string, Record<string, string>, string][] = [
    ['landcover',{class:'grass',subclass:'scrub'},'scrub'],
    ['landcover',{class:'wetland'},'wetland'],
    ['landcover',{class:'farmland'},'field'],
    ['landcover',{class:'grass',subclass:'allotments'},'field'],
    ['landcover',{class:'grass',subclass:'garden'},'park'],
    ['landcover',{class:'grass',subclass:'flowerbed'},'park'],
    ['landcover',{class:'grass',subclass:'village_green'},'park'],
    ['landcover',{class:'rock',subclass:'bare_rock'},'bare'],
    ['landcover',{class:'sand',subclass:'beach'},'bare'],
    ['landuse',{class:'pitch'},'pitch'],
    ['landuse',{class:'playground'},'pitch'],
    ['landuse',{class:'cemetery'},'cemetery'],
  ]
  const features: TileFeature[] = cases.map(([layer,properties],index)=>{
    const x = -180 + (index % 6) * 60
    const y = -180 + Math.floor(index / 6) * 60
    return polygon(layer!,properties!,[[x,y],[x+30,y],[x+30,y+30],[x,y+30],[x,y]])
  })
  const result = extractLandCover(features,frame)
  expect(result.map(a=>a.kind)).toEqual(cases.map(([, , kind])=>kind))
})
it('does not paint institutional land use as green space', () => {
  const features: TileFeature[] = [
    polygon('landuse',{class:'school'},[[-180,-180],[-150,-180],[-150,-150],[-180,-150],[-180,-180]]),
    polygon('landuse',{class:'hospital'},[[-120,-180],[-90,-180],[-90,-150],[-120,-150],[-120,-180]]),
    polygon('landuse',{class:'residential'},[[-60,-180],[-30,-180],[-30,-150],[-60,-150],[-60,-180]]),
  ]
  expect(extractLandCover(features,frame)).toEqual([])
})
it('reads an urban park from the land cover subclass and a protected area from the park layer', () => {
  const features: TileFeature[] = [
    polygon('landcover',{class:'grass',subclass:'park'},[[0,0],[20,0],[20,20],[0,20],[0,0]]),
    polygon('landcover',{class:'grass',subclass:'grass'},[[30,0],[50,0],[50,20],[30,20],[30,0]]),
    polygon('park',{class:'protected_area'},[[60,0],[80,0],[80,20],[60,20],[60,0]]),
  ]
  const result = extractLandCover(features,frame)
  expect(result.map(a=>a.kind)).toEqual(['park','grass','nature'])
})
it('draws a pedestrian area as a paved ground tint', () => {
  const features: TileFeature[] = [
    polygon('transportation',{class:'path',subclass:'pedestrian'},[[0,0],[30,0],[30,30],[0,30],[0,0]]),
    polygon('transportation',{class:'path',subclass:'platform'},[[40,0],[50,0],[50,10],[40,10],[40,0]]),
  ]
  const result = extractLandCover(features,frame)
  expect(result.map(a=>a.kind)).toEqual(['plaza'])
})
it('draws a waterway mapped as a line as a water surface', () => {
  const line: TileFeature = {layer:'waterway',properties:{class:'river'},geometry:{type:'LineString',coordinates:coords([[-200,0],[200,0]])}}
  const drain: TileFeature = {layer:'waterway',properties:{class:'drain'},geometry:{type:'LineString',coordinates:coords([[-200,10],[200,10]])}}
  const result = extractTileWater([line,drain],frame)
  expect(result.map(a=>a.kind)).toEqual(['water'])
  expect(result[0]!.ring.length).toBeGreaterThanOrEqual(3)
})
it('ignores a class that names an Object.prototype member', () => {
  const stream: TileFeature = {layer:'waterway',properties:{class:'constructor'},geometry:{type:'LineString',coordinates:coords([[-50,0],[50,0]])}}
  expect(extractRoads([road([[0,0],[100,0]],'constructor'),road([[0,10],[100,10]],'path','','toString')],frame)).toEqual([])
  expect(extractLandCover([stream],frame)).toEqual([])
  expect(extractTileWater([stream],frame)).toEqual([])
})
