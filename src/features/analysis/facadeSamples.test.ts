import { describe, expect, it } from 'vitest'
import type { Vec2 } from '../../lib/coordinates'
import { facadeSamples, type FacadeMass } from './facadeSamples'

const box: Vec2[] = [[-10, -10], [10, -10], [10, 10], [-10, 10]]
const mass = (footprint: readonly Vec2[], baseZ = 0, topZ = 20): FacadeMass => ({
  id: 'block',
  tiers: [{ tierIndex: 0, footprint, baseZ, topZ }],
})

describe('façade samples', () => {
  it('walks every edge at mid-storey heights, 0.1 m outside the wall', () => {
    const samples = facadeSamples([mass(box)])
    // 20 m edge / 3 m → 7 samples per edge, 7 heights (1.5 … 19.5), four edges.
    expect(samples).toHaveLength(4 * 7 * 7)
    expect(samples.every((sample) => sample.p[2] % 3 === 1.5)).toBe(true)
    expect(new Set(samples.map((sample) => `${sample.normal[0]},${sample.normal[1]}`)).size).toBe(4)
    const east = samples.find((sample) => sample.normal[0] === 1 && sample.normal[1] === 0)
    expect(east?.p[0]).toBeCloseTo(10.1, 9)
  })

  it('gets outward normals from a clockwise ring too', () => {
    // Same box, reversed: normalizeRing makes it counter-clockwise before the normal is taken.
    const clockwise = [...box].reverse()
    const samples = facadeSamples([mass(clockwise)])
    const east = samples.find((sample) => sample.normal[0] === 1 && sample.normal[1] === 0)
    expect(east?.p[0]).toBeGreaterThan(10)
  })

  it('samples a raised tier between its base and top', () => {
    const samples = facadeSamples([mass(box, 10, 20)])
    expect(Math.min(...samples.map((sample) => sample.p[2]))).toBeCloseTo(11.5, 9)
    expect(Math.max(...samples.map((sample) => sample.p[2]))).toBeCloseTo(17.5, 9)
  })

  it('ignores an empty or degenerate tier', () => {
    expect(facadeSamples([mass([[0, 0], [1, 0]], 0, 20)])).toEqual([])
    expect(facadeSamples([mass(box, 20, 20)])).toEqual([])
  })
})
