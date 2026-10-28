import { expect, it } from 'vitest'
import { extractLandCover, extractRoads } from './context'
import { unproject } from './projection'
import type { TileFeature } from './tiles'
import { isSimpleRing } from '../../lib/polygon'
const frame = {latitude:59.92,longitude:10.75,sizeMetres:400,id:'test',title:'Test'}
const coords = (points: number[][]) => points.map(([x,y]) => unproject(x!,y!,frame.latitude,frame.longitude).reverse())
const road = (points: number[][], className='minor', brunnel=''): TileFeature => ({layer:'transportation', properties:{class:className,brunnel}, geometry:{type:'LineString',coordinates:coords(points)}})
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
it('maps park, grass, wood and water and repairs their clipped rings', () => {
  const features: TileFeature[] = [['park',''],['landcover','grass'],['landcover','wood'],['water',''],['landcover','sand']].map(([layer,kind])=>({layer:layer!,properties:{class:kind!},geometry:{type:'Polygon',coordinates:[coords([[0,0],[10,10],[0,10],[10,0],[0,0]])]}}))
  const result = extractLandCover(features,frame)
  expect(result.map(a=>a.kind)).toEqual(['park','park','grass','grass','wood','wood','water','water'])
  expect(result.every(a=>isSimpleRing(a.ring))).toBe(true)
})
