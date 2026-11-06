import { describe, expect, it } from 'vitest'
import { demoFrame } from './windDemo'

describe('demoFrame', () => {
  it('follows the 20 s script (hand-computed)', () => {
    expect(demoFrame(0)).toEqual({ from: 270, orbitDeg: 0, streamlines: false, done: false })
    expect(demoFrame(3).from).toBe(270)
    expect(demoFrame(4.5).from).toBe(285) // one 15° step after 1 s of sweep
    expect(demoFrame(10).orbitDeg).toBeCloseTo(20, 9) // eased midpoint of 40°
    expect(demoFrame(15)).toMatchObject({ from: 450, streamlines: true, done: false })
    expect(demoFrame(20)).toMatchObject({ from: 450, orbitDeg: 40, done: true })
  })
  it('holds four directions without orbit under reduced motion', () => {
    expect([0, 3, 6, 9].map((t) => demoFrame(t, true).from)).toEqual([270, 0, 90, 180])
    for (const t of [0, 5, 11]) expect(demoFrame(t, true).orbitDeg).toBe(0)
    expect(demoFrame(12, true).done).toBe(true)
  })
})
