import { describe, expect, it } from 'vitest'
import { CONTEXT_HALO_M, dissolveRange } from './dissolve'

describe('dissolveRange (TF-VIS-02A)', () => {
  it('compact-infill: start is outside the site+halo and the circle, end within the extent', () => {
    const studyArea = [[-95, -120], [95, -120], [95, 120], [-95, 120], [-95, -120]] as const
    const terrain = { minX: -311.86, maxX: 311.86, minY: -367.12, maxY: 367.12 }
    const range = dissolveRange(studyArea, 100, terrain)
    const studyRadius = Math.hypot(95, 120)
    expect(range.start).toBeGreaterThanOrEqual(studyRadius + CONTEXT_HALO_M)
    expect(range.start).toBeGreaterThanOrEqual(100)
    expect(range.end).toBeLessThanOrEqual(Math.hypot(311.86, 367.12))
    expect(range.end).toBeGreaterThan(range.start)
  })

  it('sloped-edge: the same invariants hold', () => {
    const studyArea = [[-115, -155], [115, -155], [115, 155], [-115, 155], [-115, -155]] as const
    const terrain = { minX: -325.94, maxX: 325.94, minY: -394.97, maxY: 394.97 }
    const range = dissolveRange(studyArea, 100, terrain)
    const studyRadius = Math.hypot(115, 155)
    expect(range.start).toBeGreaterThanOrEqual(studyRadius + CONTEXT_HALO_M)
    expect(range.start).toBeGreaterThanOrEqual(100)
    expect(range.end).toBeLessThanOrEqual(Math.hypot(325.94, 394.97))
    expect(range.end).toBeGreaterThan(range.start)
  })

  it('never inverts the band when the terrain is smaller than the site+halo', () => {
    const studyArea = [[-50, -50], [50, -50], [50, 50], [-50, 50], [-50, -50]] as const
    const range = dissolveRange(studyArea, 10, { minX: -60, maxX: 60, minY: -60, maxY: 60 })
    expect(range.end).toBeGreaterThanOrEqual(range.start)
  })
})
