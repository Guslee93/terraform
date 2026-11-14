import { describe, expect, it } from 'vitest'
import { ALPHA, buildingsNearFrame, coveringHeight, liftTop, medianRoofAbove, profileFactor, refillLength, sliceHeightsFor, sliceObstacles, VERTICAL_TURBULENCE_INTENSITY } from './windProfile'
import { rasterize, type FlowFrame } from './lbm'

const frame: FlowFrame = { nx: 16, ny: 16, dx: 2, centre: [0, 0], flow: [1, 0] }
const block = { height: 15, footprint: [[-4, -4], [4, -4], [4, 4], [-4, 4]] as const }

describe('indicative urban height profile', () => {
  it('uses the specified power law', () => {
    expect(ALPHA).toBe(0.22)
    expect(profileFactor(10)).toBe(1)
    expect(profileFactor(20)).toBeCloseTo(1.165, 3)
  })
  it('keeps a 15 m block at 10 m and excludes it at and above its roof', () => {
    expect(rasterize(frame, sliceObstacles([block], 10))[8 * 16 + 8]).toBe(1)
    expect(rasterize(frame, sliceObstacles([block], 20))[8 * 16 + 8]).toBe(0)
    expect(sliceObstacles([block], 15)).toEqual([])
    expect(block.height).toBe(15)
  })
})

describe('solve heights where roofs end (ADR-0029)', () => {
  const b = (height: number, x = 0) => ({ height, footprint: [[x, 0], [x + 10, 0], [x + 10, 10], [x, 10]] as [number, number][] })
  it('solves 2 m and each whole metre where a roof ends, once per metre', () => {
    // 12.4 m stops blocking at 13 m; 12.9 m and 13 m end in the same metre; 2 m or lower never blocks above 2 m.
    const heights = sliceHeightsFor([b(12.4), b(12.9), b(13), b(21), b(1.5), b(2)])
    expect(heights).toEqual(expect.arrayContaining([2, 13, 21]))
    expect(heights).toEqual([...new Set(heights)].sort((x, y) => x - y))
    expect(heights.every((h) => Number.isInteger(h) && h >= 2 && h <= 21)).toBe(true)
    expect(sliceHeightsFor([])).toEqual([2])
  })
  it('adds, within each band, the metres where the gap up to the median roof halves (ADR-0030)', () => {
    // Band 2–12 m: median roof 12.95 m, gaps 5.5, 2.7, 1.4 m → 8, 11, 12. Band 13–20 m under the
    // 21 m roof: gaps 4, 2, 1 m → 17, 19, 20. Above 21 m nothing blocks: no band, no refill.
    expect(sliceHeightsFor([b(12.4), b(12.9), b(13), b(21), b(1.5), b(2)])).toEqual([2, 8, 11, 12, 13, 17, 19, 20, 21])
    // A lone 40 m tower: deep under its roof the refill barely acts, so the solves crowd its top.
    expect(sliceHeightsFor([b(40)])).toEqual([2, 21, 31, 36, 38, 39, 40])
  })
  it('keeps every solve’s refill length within twice that of each metre it covers', () => {
    for (const set of [[b(40)], [b(12.4), b(12.9), b(13), b(21)], [b(9), b(14), b(14.5), b(17), b(33), b(60)]]) {
      const heights = sliceHeightsFor(set)
      for (let z = 3; z <= liftTop(set); z++) {
        const covering = coveringHeight(heights, z)
        const here = refillLength(set, z), used = refillLength(set, covering)
        if (covering === 2 || here === null || here * VERTICAL_TURBULENCE_INTENSITY < 1) continue
        expect(used!).toBeLessThanOrEqual(2 * here + 1e-9)
      }
    }
  })
  it('lifts to 5 m above the tallest roof, at least 30 m, at most 120 m', () => {
    expect(liftTop([])).toBe(30)
    expect(liftTop([b(12)])).toBe(30)
    expect(liftTop([b(29.2)])).toBe(35)
    expect(liftTop([b(61)])).toBe(66)
    expect(liftTop([b(300)])).toBe(120)
    // A roof above the top adds no solve height.
    expect(sliceHeightsFor([b(300)])).toEqual([2])
  })
  it('finds the solved height that covers any metre', () => {
    const heights = [2, 13, 21]
    expect(coveringHeight(heights, 2)).toBe(2)
    expect(coveringHeight(heights, 12)).toBe(2)
    expect(coveringHeight(heights, 13)).toBe(13)
    expect(coveringHeight(heights, 20)).toBe(13)
    expect(coveringHeight(heights, 35)).toBe(21)
  })
  it('keeps only buildings whose bounding box comes near the frame', () => {
    const far = b(40, 1000), near = b(15, 90), long = { height: 25, footprint: [[-500, 95], [500, 95], [500, 99], [-500, 99]] as [number, number][] }
    expect(buildingsNearFrame([far, near, long], [0, 0], 100)).toEqual([near, long])
  })
})

describe('refill from above (ADR-0030)', () => {
  const b = (height: number) => ({ height, footprint: [[0, 0], [10, 0], [10, 10], [0, 10]] as [number, number][] })
  it('takes the median roof of the buildings still taller than the slice', () => {
    expect(medianRoofAbove([b(10), b(17), b(17), b(20)], 14)).toBe(17)
    expect(medianRoofAbove([b(16), b(20)], 14)).toBe(18)
    expect(medianRoofAbove([b(10), b(14)], 14)).toBeNull()
  })
  it('refills over the gap up to that roof divided by the vertical turbulence intensity', () => {
    expect(VERTICAL_TURBULENCE_INTENSITY).toBe(0.12)
    expect(refillLength([b(10), b(17), b(17), b(20)], 14)).toBeCloseTo(25, 9) // 3 m / 0.12
    // Deep under the roofs the wake refills far more slowly than just under them.
    expect(refillLength([b(17)], 4)!).toBeGreaterThan(4 * refillLength([b(17)], 14)!)
    expect(refillLength([b(10)], 12)).toBeNull()
  })
})
