import { describe, expect, it } from 'vitest'
import type { Vec2 } from '../../lib/coordinates'
import { createRectangleFootprint, createScenario, createTier, createVolume } from './factories'
import type { MassVolume, ScenarioDocument } from './types'
import { validateFootprint, validateScenario, validateTier } from './validation'

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

// ADR-0004 §4 document rules.
function volume(id: string, tierIds: readonly string[]): MassVolume {
  return createVolume({
    id,
    tiers: tierIds.map((tierId) =>
      createTier({ id: tierId, footprint: createRectangleFootprint(18, 12) }),
    ),
  })
}

function scenario(overrides: Partial<ScenarioDocument> = {}): ScenarioDocument {
  return {
    ...createScenario({ id: 'scenario-1', siteId: 'compact-infill', volumes: [volume('v1', ['t1'])] }),
    ...overrides,
  }
}

describe('validateScenario', () => {
  it('accepts a valid document', () => {
    expect(validateScenario(scenario())).toEqual([])
    expect(validateScenario(scenario({ volumes: [] }))).toEqual([])
  })

  it('rejects empty id, site and name', () => {
    expect(paths(validateScenario(scenario({ id: '', siteId: ' ', name: '' })))).toEqual([
      'id',
      'siteId',
      'name',
    ])
  })

  it('rejects duplicate volume ids', () => {
    const issues = validateScenario(scenario({ volumes: [volume('v1', ['t1']), volume('v1', ['t2'])] }))
    expect(paths(issues)).toEqual(['volumes[1].id'])
  })

  it('rejects duplicate tier ids inside a volume and across volumes', () => {
    expect(paths(validateScenario(scenario({ volumes: [volume('v1', ['t1', 't1'])] })))).toEqual([
      'volumes[0].tiers[1].id',
    ])
    expect(
      paths(validateScenario(scenario({ volumes: [volume('v1', ['t1']), volume('v2', ['t1'])] }))),
    ).toEqual(['volumes[1].tiers[0].id'])
  })

  it('rejects a volume without tiers or name', () => {
    const empty = { ...volume('v1', ['t1']), name: '', tiers: [] }
    expect(paths(validateScenario(scenario({ volumes: [empty] })))).toEqual([
      'volumes[0].name',
      'volumes[0].tiers',
    ])
  })

  it('rejects assumptions outside the v1 ranges', () => {
    const issues = validateScenario(
      scenario({
        volumes: [],
        assumptions: { defaultStoreyHeight: 7, minStoreys: 0, maxStoreys: 41 },
      }),
    )
    expect(paths(issues)).toEqual([
      'assumptions.defaultStoreyHeight',
      'assumptions.minStoreys',
      'assumptions.maxStoreys',
    ])
    const inverted = scenario({
      volumes: [],
      assumptions: { defaultStoreyHeight: 3.2, minStoreys: 10, maxStoreys: 5 },
    })
    expect(paths(validateScenario(inverted))).toEqual(['assumptions.maxStoreys'])
  })

  it('applies scenario storey limits to every tier', () => {
    const tall = createVolume({
      id: 'v1',
      tiers: [createTier({ id: 't1', footprint: createRectangleFootprint(18, 12), storeys: 12 })],
    })
    const issues = validateScenario(
      scenario({
        volumes: [tall],
        assumptions: { defaultStoreyHeight: 3.2, minStoreys: 1, maxStoreys: 10 },
      }),
    )
    expect(paths(issues)).toEqual(['volumes[0].tiers[0].storeys'])
  })
})
