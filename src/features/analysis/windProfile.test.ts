import { describe, expect, it } from 'vitest'
import { ALPHA, buildingsNearFrame, coveringHeight, liftTop, profileFactor, sliceHeightsFor, sliceObstacles } from './windProfile'
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
    expect(sliceHeightsFor([b(12.4), b(12.9), b(13), b(21), b(1.5), b(2)])).toEqual([2, 13, 21])
    expect(sliceHeightsFor([])).toEqual([2])
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
