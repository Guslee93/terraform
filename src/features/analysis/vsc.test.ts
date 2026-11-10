import { describe, expect, it } from 'vitest'
import type { Vec2 } from '../../lib/coordinates'
import type { FootprintBuilding } from './grid'
import { facadeSamples } from './facadeSamples'
import { computeVsc, medianVsc, vscBand } from './vsc'

const sample = (normal: Vec2) => ({ p: [0, 0, 5] as const, normal, massId: 'block', tierIndex: 0 })

describe('Vertical Sky Component', () => {
  it('gives the standard 39.6 % for an unobstructed vertical façade at any orientation', () => {
    for (const normal of [[0, -1], [0, 1], [1, 0], [-1, 0]] as const) {
      const [value] = computeVsc([sample(normal)], [])
      expect(value?.vsc).toBeCloseTo(39.6, 1)
      expect(value?.band).toBe('27-plus')
    }
  })

  it('drops clearly when a wall subtends about 25° in front of the façade', () => {
    // Sample at 5 m, wall top at 10 m and 10 m away: atan(5 / 10) ≈ 26.6° above the sample.
    const wall: FootprintBuilding = {
      height: 10,
      footprint: [
        [-20, -10.2],
        [20, -10.2],
        [20, -10],
        [-20, -10],
      ],
    }
    const open = computeVsc([sample([0, -1])], [])[0]?.vsc ?? 0
    const shaded = computeVsc([sample([0, -1])], [wall])[0]?.vsc ?? 0
    expect(shaded).toBeLessThan(open - 5)
  })

  it('uses descriptive bands with an open top', () => {
    expect(vscBand(0)).toBe('under-15')
    expect(vscBand(14.9)).toBe('under-15')
    expect(vscBand(15)).toBe('15-27')
    expect(vscBand(26.9)).toBe('15-27')
    expect(vscBand(27)).toBe('27-plus')
    expect(vscBand(60)).toBe('27-plus')
  })

  it('reports the median and an empty list as unassessed', () => {
    expect(medianVsc([{ sample: sample([0, -1]), vsc: 10, band: 'under-15' }, { sample: sample([0, -1]), vsc: 30, band: '27-plus' }])).toBe(20)
    expect(medianVsc([])).toBeNull()
  })

  it('computes a 20 m block’s façades inside the worker-style budget', () => {
    const box: Vec2[] = [[-10, -10], [10, -10], [10, 10], [-10, 10]]
    const samples = facadeSamples([{ id: 'block', tiers: [{ tierIndex: 0, footprint: box, baseZ: 0, topZ: 20 }] }])
    const start = performance.now()
    const values = computeVsc(samples, [{ height: 20, footprint: box }])
    const elapsed = performance.now() - start
    console.info(`[vsc] ${elapsed.toFixed(1)} ms · ${samples.length} samples`)
    expect(values).toHaveLength(samples.length)
    expect(values.every((value) => Number.isFinite(value.vsc))).toBe(true)
    expect(elapsed).toBeLessThan(1500)
  })
})
