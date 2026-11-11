import { expect, it } from 'vitest'
import { isSimpleRing } from '../../lib/polygon'
import { clipRing, clipPolyline, repairRing, ringArea, simplifyRing, type Ring } from './geometry'
it('clips a concave L ring without replacing it by its hull', () => {
  const ring: Ring = [[-10,-10],[20,-10],[20,5],[5,5],[5,20],[-10,20]]
  const result = clipRing(ring, [0,0,10,10])
  expect(ringArea(result)).toBe(75)
  expect(isSimpleRing(result)).toBe(true)
})
it('repairs a bow-tie into two simple rings, before applying the area cutoff', () => {
  const repaired = repairRing([[0,0],[10,10],[0,10],[10,0]])
  expect(repaired).toHaveLength(2)
  expect(repaired.map(ringArea)).toEqual([25,25])
  expect(repaired.every(isSimpleRing)).toBe(true)
  expect(repairRing([[0,0],[2,2],[0,2],[2,0]])).toEqual([])
})
it('normalizes closure and drops degenerate/tiny rings', () => {
  expect(repairRing([[0,0],[4,0],[4,4],[0,4],[0,0]])[0]).toHaveLength(4)
  expect(repairRing([[0,0],[1,0],[2,0]])).toEqual([])
  expect(repairRing([])).toEqual([])
})
it('simplifies in metres', () => {
  expect(simplifyRing([[0,0],[5,0.1],[10,0],[10,10],[0,10]])).toHaveLength(4)
})
it('clips segments and retains disconnected runs', () => {
  expect(clipPolyline([[-2,0],[2,0]], [-1,-1,1,1])).toEqual([[[-1,0],[1,0]]])
  expect(clipPolyline([[-2,2],[2,2]], [-1,-1,1,1])).toEqual([])
  expect(clipPolyline([[0,0],[2,0],[2,2],[0,0]], [-1,-1,1,1])).toHaveLength(2)
})
it('repairs a concave clip into disconnected parts without losing their area', () => {
  const ring: Ring = [[0,0],[30,0],[30,30],[20,30],[20,10],[10,10],[10,30],[0,30]]
  const clipped = clipRing(ring,[-10,15,40,25])
  const repaired = repairRing(clipped)
  expect(repaired).toHaveLength(2)
  expect(repaired.map(ringArea)).toEqual([100,100])
  expect(repaired.every(isSimpleRing)).toBe(true)
})
it('repairs repeated touching vertices instead of throwing in unkinkPolygon', () => {
  const repaired = repairRing([[0,0],[10,0],[10,10],[5,5],[0,10],[5,5]])
  expect(repaired.map(ringArea)).toEqual([50])
  expect(repaired.every(isSimpleRing)).toBe(true)
})
it('keeps a polyline that never leaves the extent as one run', () => {
  // a + (b - a) can miss b by one float step; that must not read as "left the extent".
  let seed = 1
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  for (let n = 0; n < 200; n++) {
    const line: Ring = Array.from({length:10},():[number,number]=>[(random()-0.5)*380,(random()-0.5)*380])
    expect(clipPolyline(line,[-200,-200,200,200])).toHaveLength(1)
  }
})
