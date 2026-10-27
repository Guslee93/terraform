import { describe, expect, it } from 'vitest'
import type { Vec2 } from '../../lib/coordinates'
import { createRectangleFootprint, createTier } from './factories'
import { validateFootprint, validateTier } from './validation'

// Cases from docs/qa/fixtures.md §3. Envelope rows belong to M3.
const paths = (issues: readonly { path: string }[]) => issues.map((issue) => issue.path)

describe('massing validation fixtures', () => {
  it('accepts a valid rectangle tier', () => {
    const tier = createTier({ footprint: createRectangleFootprint(18, 12) })
    expect(validateTier(tier)).toEqual([])
  })

  it('rejects a self-intersecting bow-tie and leaves it unchanged', () => {
    const vertices: Vec2[] = [
      [0, 0],
      [10, 10],
      [10, 0],
      [0, 10],
    ]
    const footprint = Object.freeze({ vertices: Object.freeze([...vertices]) })
    const issues = validateFootprint(footprint)
    expect(issues.map((issue) => issue.message)).toContain(
      'must be a simple ring without crossings',
    )
    expect(footprint.vertices).toEqual(vertices)
  })

  it('rejects a 2-point polygon', () => {
    const issues = validateFootprint({
      vertices: [
        [0, 0],
        [10, 0],
      ],
    })
    expect(issues).toEqual([{ path: 'footprint.vertices', message: 'must have 3–200 vertices' }])
  })

  it('rejects a zero-area polygon', () => {
    const issues = validateFootprint({
      vertices: [
        [0, 0],
        [5, 0],
        [10, 0],
      ],
    })
    expect(issues.map((issue) => issue.message)).toContain('area must be at least 4 m²')
  })

  it('rejects negative width before a footprint exists', () => {
    expect(() => createRectangleFootprint(-18, 12)).toThrow('Rectangle dimensions must be positive')
  })

  it.each([-1, 0, 41, 2.5])('rejects storey count %s with a field-specific error', (storeys) => {
    const tier = createTier({ footprint: createRectangleFootprint(18, 12), storeys })
    expect(paths(validateTier(tier))).toEqual(['tier.storeys'])
  })

  it.each([1, 40])('accepts the storey bound %s', (storeys) => {
    const tier = createTier({ footprint: createRectangleFootprint(18, 12), storeys })
    expect(validateTier(tier)).toEqual([])
  })

  it('reports nested footprint issues under the tier path', () => {
    const tier = createTier({ footprint: createRectangleFootprint(1, 1) })
    expect(paths(validateTier(tier))).toEqual(['tier.footprint.vertices'])
  })
})
