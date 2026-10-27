import { describe, expect, it } from 'vitest'
import type { Vec2 } from './coordinates'
import { isSimpleRing, segmentsIntersect } from './polygon'

describe('isSimpleRing', () => {
  it('accepts a rectangle and an L-shape', () => {
    expect(isSimpleRing([[0, 0], [10, 0], [10, 5], [0, 5]])).toBe(true)
    expect(isSimpleRing([[0, 0], [20, 0], [20, 5], [10, 5], [10, 10], [0, 10]])).toBe(true)
  })

  it('rejects a crossing bow-tie', () => {
    expect(isSimpleRing([[0, 0], [10, 10], [10, 0], [0, 10]])).toBe(false)
  })

  it('rejects non-adjacent edges overlapping along a line', () => {
    const ring: Vec2[] = [[0, 0], [10, 0], [10, 4], [6, 4], [6, 0], [2, 0], [2, -4], [0, -4]]
    expect(isSimpleRing(ring)).toBe(false)
  })

  it('rejects a vertex touching another edge', () => {
    const pinched: Vec2[] = [[0, 0], [10, 0], [10, 10], [6, 10], [5, 0], [4, 10], [0, 10]]
    expect(isSimpleRing(pinched)).toBe(false)
  })

  it('rejects adjacent edges folding back on themselves', () => {
    expect(isSimpleRing([[0, 0], [10, 0], [10, 10], [10, 4]])).toBe(false)
  })
})

describe('segmentsIntersect', () => {
  it('detects proper crossings and touches, not separate segments', () => {
    expect(segmentsIntersect([0, 0], [10, 10], [0, 10], [10, 0])).toBe(true)
    expect(segmentsIntersect([0, 0], [10, 0], [5, 0], [5, 5])).toBe(true)
    expect(segmentsIntersect([0, 0], [10, 0], [0, 1], [10, 1])).toBe(false)
    expect(segmentsIntersect([0, 0], [4, 0], [5, 0], [9, 0])).toBe(false)
  })
})
