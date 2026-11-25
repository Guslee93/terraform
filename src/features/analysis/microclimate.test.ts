import { describe, expect, it } from 'vitest'
import { sampleGrid } from './grid'

// The road-noise heuristic and its tests were retired with ADR-0034 (official noise map).
describe('sampleGrid', () => {
  it('returns cell centres inside the polygon', () => {
    const cells = sampleGrid(
      [
        [0, 0],
        [20, 0],
        [20, 20],
        [0, 20],
      ],
      10,
    )
    expect(cells).toEqual([
      { x: 5, y: 5 },
      { x: 15, y: 5 },
      { x: 5, y: 15 },
      { x: 15, y: 15 },
    ])
  })
})
