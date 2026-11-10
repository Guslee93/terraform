import { describe, expect, it } from 'vitest'
import type { Vec2 } from '../../lib/coordinates'
import { rotateRing } from '../../lib/polygon'
import { parseRoof, ringSideOfRidge, ringWithRidgeVertices, roofHeightAt, type Roof } from '../sites/roof'
import { fitRoof, roofSamplePoints, type RoofSample } from './roofFit'

const rect = (w: number, d: number): Vec2[] => [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]]
/** Deterministic ±0.15 m "lidar noise". */
const noise = (index: number) => (((index * 7919) % 31) / 31 - 0.5) * 0.3
const measure = (footprint: readonly Vec2[], z: (x: number, y: number) => number): RoofSample[] =>
  roofSamplePoints(footprint).map(([x, y], index) => ({ x, y, z: z(x, y) + noise(index) }))

describe('roof model', () => {
  const roof: Roof = { shape: 'gabled', ridge: [[-10, 0], [10, 0]], ridgeHeight: 12, pitchDeg: 45 }

  it('falls away from the ridge at the pitch on both sides', () => {
    expect(roofHeightAt(roof, 3, 0)).toBeCloseTo(12)
    expect(roofHeightAt(roof, 0, 4)).toBeCloseTo(8)
    expect(roofHeightAt(roof, 0, -4)).toBeCloseTo(8)
  })

  it('splits a ring along the ridge and adds wall vertices where edges cross it', () => {
    const ring = rect(20, 10)
    const left = ringSideOfRidge(ring, roof, 1)
    const right = ringSideOfRidge(ring, roof, -1)
    expect(left.every(([, y]) => y >= -1e-9)).toBe(true)
    expect(right.every(([, y]) => y <= 1e-9)).toBe(true)
    expect(left).toHaveLength(4)
    expect(ringWithRidgeVertices(ring, roof)).toHaveLength(6)
  })

  it('rejects a persisted roof that would leave no wall', () => {
    expect(parseRoof(roof, rect(20, 10), 'roof').ridgeHeight).toBe(12)
    expect(() => parseRoof({ ...roof, ridgeHeight: 6 }, rect(20, 10), 'roof')).toThrow(/eave/)
    expect(() => parseRoof({ ...roof, pitchDeg: 80 }, rect(20, 10), 'roof')).toThrow(/pitchDeg/)
    expect(() => parseRoof({ ...roof, shape: 'dome' }, rect(20, 10), 'roof')).toThrow(/shape/)
  })
})

describe('roof fitting from measured heights', () => {
  it('calls a level roof flat at its measured height', () => {
    expect(fitRoof(rect(20, 12), measure(rect(20, 12), () => 15))).toEqual({ kind: 'flat', height: expect.closeTo(15, 0) })
  })

  it('recovers a gable: ridge along the long axis, pitch and ridge height', () => {
    const footprint = rect(24, 12)
    const fit = fitRoof(footprint, measure(footprint, (_, y) => 14 - Math.tan((35 * Math.PI) / 180) * Math.abs(y)))
    expect(fit?.kind).toBe('gabled')
    if (fit?.kind !== 'gabled') return
    expect(fit.roof.pitchDeg).toBeGreaterThan(32)
    expect(fit.roof.pitchDeg).toBeLessThan(38)
    expect(fit.roof.ridgeHeight).toBeCloseTo(14, 0)
    const [[ax, ay], [bx, by]] = fit.roof.ridge
    expect(Math.abs(ay)).toBeLessThan(0.8)
    expect(Math.abs(by)).toBeLessThan(0.8)
    expect(Math.abs(bx - ax)).toBeCloseTo(24, 0)
    // The analysis height is the mean roof height, between eave and ridge.
    expect(fit.height).toBeGreaterThan(10)
    expect(fit.height).toBeLessThan(14)
    // What the fit returns must survive the package parser.
    expect(() => parseRoof(fit.roof, footprint, 'roof')).not.toThrow()
  })

  it('finds the ridge on a building that is not axis-aligned', () => {
    const footprint = rotateRing(rect(24, 12), Math.PI / 6)
    const along: Vec2 = [Math.cos(Math.PI / 6), Math.sin(Math.PI / 6)]
    const fit = fitRoof(footprint, measure(footprint, (x, y) => 14 - 0.7 * Math.abs(-x * along[1] + y * along[0])))
    expect(fit?.kind).toBe('gabled')
    if (fit?.kind !== 'gabled') return
    const [[ax, ay], [bx, by]] = fit.roof.ridge
    const length = Math.hypot(bx - ax, by - ay)
    expect(Math.abs(((bx - ax) * along[0] + (by - ay) * along[1]) / length)).toBeGreaterThan(0.99)
  })

  it('fits a single-slope roof as a gable with its ridge on one wall', () => {
    const footprint = rect(20, 10)
    const fit = fitRoof(footprint, measure(footprint, (_, y) => 9 + 0.4 * (y + 5)))
    expect(fit?.kind).toBe('gabled')
    if (fit?.kind !== 'gabled') return
    // Samples stop 1.5 m short of the wall, so the ridge lands within a step of it.
    expect(fit.roof.ridge[0][1]).toBeGreaterThan(3.5)
  })

  it('ignores a chimney when fitting', () => {
    const footprint = rect(24, 12)
    const samples = measure(footprint, (x, y) => (Math.hypot(x - 5, y - 1) < 1.2 ? 19 : 14 - 0.7 * Math.abs(y)))
    expect(fitRoof(footprint, samples)?.kind).toBe('gabled')
  })

  it('reports a stepped roof as complex, flat at the measured median', () => {
    const footprint = rect(30, 12)
    const fit = fitRoof(footprint, measure(footprint, (x) => (x < 0 ? 7 : 16)))
    expect(fit?.kind).toBe('complex')
  })

  it('gives no answer when the surface model shows ground, not a building', () => {
    const footprint = rect(20, 12)
    expect(fitRoof(footprint, measure(footprint, () => 0.3))).toBeNull()
    expect(fitRoof(footprint, measure(footprint, (x) => (x < 2 ? 0.2 : 12)))).toBeNull()
    expect(fitRoof(footprint, roofSamplePoints(footprint).map(([x, y]) => ({ x, y, z: null })))).toBeNull()
  })

  it('keeps sample points inside and off the outline', () => {
    const points = roofSamplePoints(rect(20, 12))
    expect(points.length).toBeGreaterThan(40)
    expect(points.length).toBeLessThanOrEqual(260)
    expect(points.every(([x, y]) => Math.abs(x) <= 8.5 && Math.abs(y) <= 4.5)).toBe(true)
  })
})
