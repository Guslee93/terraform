import { describe, expect, it } from 'vitest'
import { ALPHA, profileFactor, sliceObstacles, SLICE_HEIGHTS_M } from './windProfile'
import { rasterize, type FlowFrame } from './lbm'

const frame: FlowFrame = { nx: 16, ny: 16, dx: 2, centre: [0, 0], flow: [1, 0] }
const block = { height: 15, footprint: [[-4, -4], [4, -4], [4, 4], [-4, 4]] as const }

describe('indicative urban height profile', () => {
  it('uses the specified heights and power law', () => {
    expect(SLICE_HEIGHTS_M).toEqual([2, 10, 20, 35])
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
