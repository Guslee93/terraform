import { describe, expect, it } from 'vitest'
import { DEFAULT_GRID_STEP_M, snapPoint, snapValue } from './snapping'

describe('grid snapping helpers', () => {
  it('exposes the default grid step in metres', () => {
    expect(DEFAULT_GRID_STEP_M).toBe(1)
  })

  it('snaps to the nearest multiple of the step', () => {
    expect(snapValue(3.7, 2)).toBe(4)
    expect(snapValue(3.2, 2)).toBe(4)
    expect(snapValue(2.9, 2)).toBe(2)
    expect(snapValue(1.26, 0.25)).toBe(1.25)
    expect(snapValue(0.29, 0.1)).toBe(0.3)
  })

  it('rounds ties away from zero', () => {
    expect(snapValue(2.5, 1)).toBe(3)
    expect(snapValue(-2.5, 1)).toBe(-3)
  })

  it('returns non-finite or invalid input unchanged', () => {
    expect(snapValue(Number.NaN, 1)).toBe(Number.NaN)
    expect(snapValue(Number.POSITIVE_INFINITY, 1)).toBe(Number.POSITIVE_INFINITY)
    expect(snapValue(2, Number.NaN)).toBe(2)
    expect(snapValue(2, 0)).toBe(2)
    expect(snapValue(2, -1)).toBe(2)
  })

  it('never returns negative zero', () => {
    expect(Object.is(snapValue(-0.4, 1), -0)).toBe(false)
    expect(Object.is(snapValue(-0.4, 1), 0)).toBe(true)
    expect(Object.is(snapValue(-2.5, 1), -0)).toBe(false)
  })

  it('snaps points relative to an origin', () => {
    expect(snapPoint([3.4, 7.6], 2, [1, 1])).toEqual([3, 7])
    expect(snapPoint([0.49, -0.52], 1)).toEqual([0, -1])
    expect(snapPoint([2.5, -2.4], 1)).toEqual([3, -2])
  })
})