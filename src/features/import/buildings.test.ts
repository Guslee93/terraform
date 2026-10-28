// @vitest-environment node
import { expect, it } from 'vitest'
import { extractBuildings } from './buildings'
import { type Ring, ringArea } from './geometry'
import { unproject } from './projection'
import { isSimpleRing } from '../../lib/polygon'
import { grunerlokka, tileFeatures } from './testFixtures'
import type { TileFeature } from './tiles'
function feature(ring: Ring, id?: number, props: TileFeature['properties'] = {}): TileFeature {
  const coordinates = [...ring,ring[0]!].map(([x,y]) => unproject(x,y,grunerlokka.latitude,grunerlokka.longitude).reverse())
  return { layer:'building',id,properties:{render_height:20,render_min_height:5,...props},geometry:{type:'Polygon',coordinates:[coordinates]} }
}
const left: Ring = [[0,0],[5,0],[5,10],[0,10]]
const right: Ring = [[5,0],[10,0],[10,10],[5,10]]
it('unions same-id fragments within a tile and preserves height metadata', () => {
  const result = extractBuildings([feature(left,1),feature(right,1),feature(left,1)],grunerlokka)
  expect(result).toHaveLength(1)
  expect(ringArea(result[0]!.footprint)).toBeCloseTo(100,5)
  expect(result[0]).toMatchObject({sourceId:'1',height:15,minHeight:5})
})
it('does not merge anonymous buildings or emit hidden buildings', () => {
  expect(extractBuildings([feature(left),feature(right)],grunerlokka)).toHaveLength(2)
  for (const hide_3d of [1,true,'true','1']) expect(extractBuildings([feature(left,1,{hide_3d})],grunerlokka)).toEqual([])
})
it('rejects conflicting or invalid heights and applies minimum extrusion', () => {
  expect(() => extractBuildings([feature(left,1),feature(right,1,{render_height:21})],grunerlokka)).toThrow(/conflicting/)
  expect(() => extractBuildings([feature(left,1,{render_height:'bad'})],grunerlokka)).toThrow(/height/)
  expect(extractBuildings([feature(left,1,{render_height:6})],grunerlokka)[0]!.height).toBe(2.5)
})
it('repairs self-intersections and omits courtyard holes under the existing contract', () => {
  const bow = feature([[0,0],[10,10],[0,10],[10,0]],1)
  expect(extractBuildings([bow],grunerlokka)).toHaveLength(2)
  const outer = feature([[0,0],[20,0],[20,20],[0,20]],2)
  const hole = feature([[2,2],[2,4],[4,4],[4,2]])
  if (outer.geometry.type === 'Polygon' && hole.geometry.type === 'Polygon') outer.geometry.coordinates.push(hole.geometry.coordinates[0]!)
  expect(ringArea(extractBuildings([outer],grunerlokka)[0]!.footprint)).toBeCloseTo(400)
})
it('merges a real seam-crossing building east of Oslo S (MVT id 9090116012)', () => {
  const frame = {...grunerlokka, latitude:59.91097597079679,longitude:10.7536,sizeMetres:200}
  const north = tileFeatures(4765).filter(f=>f.layer==='building'&&f.id===9090116012)
  const south = tileFeatures(4766).filter(f=>f.layer==='building'&&f.id===9090116012)
  expect(north.length).toBeGreaterThan(0)
  expect(south.length).toBeGreaterThan(0)
  const merged = extractBuildings([...north,...south],frame)
  expect(merged).toHaveLength(1)
  const area = ringArea(merged[0]!.footprint)
  for (const fragments of [north,south]) {
    const partArea = extractBuildings(fragments,frame).reduce((sum,b)=>sum+ringArea(b.footprint),0)
    expect(area).toBeGreaterThan(partArea+1)
  }
  expect(isSimpleRing(merged[0]!.footprint)).toBe(true)
})
it('emits only simple rings for the complete recorded Grünerløkka frame', () => {
  const result = extractBuildings([...tileFeatures(4764),...tileFeatures(4765)],grunerlokka)
  expect(result.length).toBeGreaterThanOrEqual(192)
  expect(result.length).toBeLessThanOrEqual(212)
  expect(result.every(b => isSimpleRing(b.footprint) && ringArea(b.footprint)>=12)).toBe(true)
})
it('clips in the supplied origin rather than assuming the frame centre', () => {
  const shifted={latitude:grunerlokka.latitude,longitude:grunerlokka.longitude-0.003}
  const result=extractBuildings([feature([[180,0],[220,0],[220,20],[180,20]],5)],grunerlokka,shifted)
  expect(result).toHaveLength(1)
  expect(ringArea(result[0]!.footprint)).toBeCloseTo(400,4)
  expect(Math.max(...result[0]!.footprint.map(p=>p[0]))).toBeGreaterThan(300)
})
