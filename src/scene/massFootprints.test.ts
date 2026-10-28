import { describe, expect, it } from 'vitest'
import type { ScenarioDocument } from '../features/massing/types'
import { visibleTierFootprints } from './massFootprints'

function makeDoc(overrides?: Partial<ScenarioDocument>): ScenarioDocument {
  return {
    schemaVersion: 1,
    id: 'test',
    siteId: 'compact-infill',
    name: 'Test',
    assumptions: { defaultStoreyHeight: 3.2, minStoreys: 1, maxStoreys: 40 },
    volumes: [
      {
        id: 'v1',
        name: 'V1',
        visible: true,
        locked: false,
        tiers: [
          {
            id: 't1',
            name: 'T1',
            footprint: { vertices: [[0, 0], [10, 0], [10, 10], [0, 10]] },
            baseElevation: 0,
            storeys: 3,
            storeyHeight: 3.2,
            use: 'residential' as const,
          },
        ],
      },
      {
        id: 'v2',
        name: 'V2',
        visible: true,
        locked: false,
        tiers: [
          {
            id: 't2',
            name: 'T2',
            footprint: { vertices: [[20, 20], [30, 20], [30, 30], [20, 30]] },
            baseElevation: 0,
            storeys: 2,
            storeyHeight: 3.2,
            use: 'commercial' as const,
          },
          {
            id: 't3',
            name: 'T3',
            footprint: { vertices: [[25, 25], [28, 25], [28, 28], [25, 28]] },
            baseElevation: 6.4,
            storeys: 1,
            storeyHeight: 3.2,
            use: 'commercial' as const,
          },
        ],
      },
    ],
    ...overrides,
  }
}

describe('visibleTierFootprints', () => {
  it('returns footprints of every tier of every visible volume', () => {
    const footprints = visibleTierFootprints(makeDoc())
    expect(footprints).toHaveLength(3)
    // t1 first
    expect(footprints[0]).toEqual([[0, 0], [10, 0], [10, 10], [0, 10]])
    // t2 second
    expect(footprints[1]).toEqual([[20, 20], [30, 20], [30, 30], [20, 30]])
    // t3 third
    expect(footprints[2]).toEqual([[25, 25], [28, 25], [28, 28], [25, 28]])
  })

  it('excludes hidden volumes', () => {
    const doc = makeDoc({
      volumes: [
        {
          id: 'v1',
          name: 'V1',
          visible: true,
          locked: false,
          tiers: [
            {
              id: 't1',
              name: 'T1',
              footprint: { vertices: [[0, 0], [10, 0], [10, 10], [0, 10]] },
              baseElevation: 0,
              storeys: 3,
              storeyHeight: 3.2,
              use: 'residential' as const,
            },
          ],
        },
        {
          id: 'v2',
          name: 'V2',
          visible: false,
          locked: false,
          tiers: [
            {
              id: 't2',
              name: 'T2',
              footprint: { vertices: [[20, 20], [30, 20], [30, 30], [20, 30]] },
              baseElevation: 0,
              storeys: 2,
              storeyHeight: 3.2,
              use: 'commercial' as const,
            },
          ],
        },
      ],
    })
    const footprints = visibleTierFootprints(doc)
    expect(footprints).toHaveLength(1)
    expect(footprints[0]).toEqual([[0, 0], [10, 0], [10, 10], [0, 10]])
  })

  it('returns empty array for empty document', () => {
    const doc = makeDoc({ volumes: [] })
    expect(visibleTierFootprints(doc)).toEqual([])
  })

  it('returns empty array when all volumes are hidden', () => {
    const doc: ScenarioDocument = {
      schemaVersion: 1,
      id: 'test',
      siteId: 'compact-infill',
      name: 'Test',
      assumptions: { defaultStoreyHeight: 3.2, minStoreys: 1, maxStoreys: 40 },
      volumes: [
        {
          id: 'v1',
          name: 'V1',
          visible: false,
          locked: false,
          tiers: [
            {
              id: 't1',
              name: 'T1',
              footprint: { vertices: [[0, 0], [10, 0], [10, 10], [0, 10]] },
              baseElevation: 0,
              storeys: 3,
              storeyHeight: 3.2,
              use: 'residential' as const,
            },
          ],
        },
      ],
    }
    expect(visibleTierFootprints(doc)).toHaveLength(0)
  })
})