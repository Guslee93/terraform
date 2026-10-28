import { describe, expect, it } from 'vitest'
import type { Vec2 } from './coordinates'
import { isSimpleRing, ringWithin, segmentsIntersect } from './polygon'

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

describe('ringWithin', () => {
  const outer: Vec2[] = [[0, 0], [20, 0], [20, 10], [0, 10]]
  const u: Vec2[] = [[0, 0], [30, 0], [30, 20], [20, 20], [20, 5], [10, 5], [10, 20], [0, 20]]

  it('accepts a ring strictly inside', () => {
    expect(ringWithin([[5, 1], [15, 1], [15, 9], [5, 9]], outer)).toBe(true)
  })

  it('rejects a ring that crosses or leaves the outline', () => {
    expect(ringWithin([[15, 1], [25, 1], [25, 9], [15, 9]], outer)).toBe(false)
    expect(ringWithin([[30, 1], [40, 1], [40, 9], [30, 9]], outer)).toBe(false)
  })

  it('rejects a ring spanning the notch of a concave outline', () => {
    expect(ringWithin([[5, 10], [25, 10], [25, 15], [5, 15]], u)).toBe(false)
  })
})
