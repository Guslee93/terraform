import { describe, expect, it } from 'vitest'
import { particleSegment } from './particles'

// C23 finding 6: centre [0, 0], radius 100. Segments must never reach outside the circle.
describe('particleSegment', () => {
  const inside = (p: readonly [number, number]) => Math.hypot(p[0], p[1]) <= 100
  it('a head that crossed the east edge respawns and draws nothing', () => {
    const s = particleSegment([100.8, 0], [1, 0], 6.3, [0, 0], 100)
    expect(s.respawn).toBe(true)
    expect(s.tail).toEqual([100.8, 0])
  })
  it('a tail that would poke out at the upwind (west) edge collapses onto the head', () => {
    const s = particleSegment([-97, 0], [1, 0], 6.3, [0, 0], 100)
    expect(s.respawn).toBe(false)
    expect(s.tail).toEqual([-97, 0])
  })
  it('an interior segment keeps its full tail inside the circle', () => {
    const s = particleSegment([10, 5], [0.6, 0.8], 5, [0, 0], 100)
    expect(s.tail[0]).toBeCloseTo(7, 9)
    expect(s.tail[1]).toBeCloseTo(1, 9)
    expect(inside(s.tail)).toBe(true)
  })
})
