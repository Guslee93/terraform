import { expect, it } from 'vitest'
import { frameBounds, validateFrame } from './frame'
import { project } from './projection'
const frame = { latitude: 59.9225, longitude: 10.7595, sizeMetres: 400, id: 'test', title: 'Test' }
it('returns matching geographic and ENU bounds', () => {
  const bounds = frameBounds(frame)
  expect(bounds.enu).toEqual([-200, -200, 200, 200])
  const [w, s, e, n] = bounds.lonLat
  expect(project(s, w, frame.latitude, frame.longitude)[0]).toBeCloseTo(-200, 7)
  expect(project(n, e, frame.latitude, frame.longitude)[1]).toBeCloseTo(200, 7)
})
it.each([{ latitude: NaN }, { latitude: 53.9 }, { latitude: 71.6 }, { longitude: 3.9 }, { longitude: 32.1 }, { sizeMetres: 99 }, { sizeMetres: 801 }, { id: '../oops' }, { title: ' ' }])('rejects invalid frames %j', (invalid) => {
  expect(() => validateFrame({ ...frame, ...invalid })).toThrow()
})
it('accepts boundary values and returns a copy', () => {
  expect(validateFrame({ ...frame, latitude: 54, longitude: 4, sizeMetres: 100 })).toBeDefined()
  expect(validateFrame({ ...frame, latitude: 71.5, longitude: 32, sizeMetres: 800 })).toBeDefined()
  expect(validateFrame(frame)).not.toBe(frame)
})
it('expresses clipping bounds in a supplied offset origin', () => {
  const origin={latitude:59.921,longitude:10.758}
  const {lonLat:[w,s,e,n],enu}=frameBounds(frame,origin)
  expect(enu).toEqual([...project(s,w,origin.latitude,origin.longitude),...project(n,e,origin.latitude,origin.longitude)])
})
