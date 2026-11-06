import { describe, expect, it } from 'vitest'
import type { Vec2 } from '../../lib/coordinates'
import { siteFacts } from './siteFacts'

const area: Vec2[] = [[0, 0], [40, 0], [40, 40], [0, 40]]
const block = (x0: number, x1: number, y0: number, y1: number, height: number) => ({
  height,
  footprint: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]] as Vec2[],
})

describe('siteFacts (hand-computed)', () => {
  it('reports an empty site', () => {
    expect(siteFacts(area, [])).toMatchObject({ studyAreaM2: 1600, buildingCount: 0, builtM2: 0, coverage: 0, tallestM: null })
  })
  it('measures a block inside: 20×20 of 40×40 = 25 %', () => {
    const facts = siteFacts(area, [block(5, 25, 5, 25, 12)])
    expect(facts.builtM2).toBeCloseTo(400, 6)
    expect(facts.coverage).toBeCloseTo(0.25, 9)
    expect(facts.tallestM).toBe(12)
  })
  it('clips a block half outside to the study area and ignores one fully outside', () => {
    const facts = siteFacts(area, [block(5, 25, 5, 25, 12), block(30, 50, 0, 20, 6), block(100, 110, 0, 10, 30)])
    expect(facts.buildingCount).toBe(2)
    expect(facts.builtM2).toBeCloseTo(400 + 200, 6) // 10 × 20 of the second block is inside
    expect(facts.meanHeightM).toBe(9)
    expect(facts.tallestM).toBe(12)
  })
  it('counts overlapping footprints once', () => {
    expect(siteFacts(area, [block(0, 20, 0, 20, 5), block(10, 30, 0, 20, 5)]).builtM2).toBeCloseTo(600, 6)
  })
})
