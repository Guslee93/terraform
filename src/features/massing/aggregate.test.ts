import { describe, expect, it } from 'vitest'
import {
  scenarioCoverage,
  scenarioGfa,
  scenarioMaxHeight,
  scenarioVolume,
  tierFootprintArea,
  tierGfa,
  tierHeight,
  tierVolume,
  volumeGfa,
  volumeGroundFootprintArea,
  volumeMaxHeight,
  volumeVolume,
} from './aggregate'
import {
  createFootprint,
  createRectangleFootprint,
  createScenario,
  createTier,
  createVolume,
} from './factories'

// Values from docs/qa/fixtures.md §2.
const PARCEL_AREA = 40 * 50

const rectangle = createTier({
  footprint: createRectangleFootprint(18, 12),
  storeys: 3,
  storeyHeight: 3.2,
})

const lShape = createTier({
  footprint: createFootprint([
    [0, 0],
    [20, 0],
    [20, 5],
    [10, 5],
    [10, 10],
    [0, 10],
  ]),
  storeys: 2,
  storeyHeight: 3.2,
})

const steppedMass = createVolume({
  tiers: [
    createTier({ footprint: createRectangleFootprint(20, 10), storeys: 3, storeyHeight: 3.2 }),
    createTier({
      footprint: createRectangleFootprint(10, 8),
      baseElevation: 9.6,
      storeys: 2,
      storeyHeight: 3.2,
    }),
  ],
})

describe('massing aggregate fixtures', () => {
  it('measures the 18 × 12 m rectangle', () => {
    expect(tierFootprintArea(rectangle)).toBeCloseTo(216, 6)
    expect(tierHeight(rectangle)).toBeCloseTo(9.6, 6)
    expect(tierGfa(rectangle)).toBeCloseTo(648, 6)
    expect(tierVolume(rectangle)).toBeCloseTo(2073.6, 6)
  })

  it('measures the L-shaped footprint', () => {
    expect(tierFootprintArea(lShape)).toBeCloseTo(150, 6)
    expect(tierHeight(lShape)).toBeCloseTo(6.4, 6)
    expect(tierGfa(lShape)).toBeCloseTo(300, 6)
    expect(tierVolume(lShape)).toBeCloseTo(960, 6)
  })

  it('aggregates the stepped mass without double counting', () => {
    expect(volumeGroundFootprintArea(steppedMass)).toBeCloseTo(200, 6)
    expect(volumeGfa(steppedMass)).toBeCloseTo(760, 6)
    expect(volumeVolume(steppedMass)).toBeCloseTo(2432, 6)
    expect(volumeMaxHeight(steppedMass)).toBeCloseTo(16, 6)
  })

  it('rolls volumes up to scenario totals', () => {
    const scenario = createScenario({ siteId: 'compact-infill', volumes: [steppedMass] })
    expect(scenarioGfa(scenario)).toBeCloseTo(760, 6)
    expect(scenarioVolume(scenario)).toBeCloseTo(2432, 6)
    expect(scenarioMaxHeight(scenario)).toBeCloseTo(16, 6)
  })

  it('reports max height below the site origin on sloped ground', () => {
    // ADR-0004: maxHeight = max(tier.top), relative to the site origin.
    const sunken = createVolume({
      tiers: [
        createTier({
          footprint: createRectangleFootprint(18, 12),
          baseElevation: -20,
          storeys: 3,
          storeyHeight: 3.2,
        }),
      ],
    })
    expect(volumeMaxHeight(sunken)).toBeCloseTo(-10.4, 6)
    const scenario = createScenario({ siteId: 'sloped-edge', volumes: [sunken] })
    expect(scenarioMaxHeight(scenario)).toBeCloseTo(-10.4, 6)
    expect(scenarioMaxHeight(createScenario({ siteId: 'sloped-edge' }))).toBe(0)
  })

  it('computes site coverage against the 2 000 m² parcel', () => {
    const rectangleScenario = createScenario({
      siteId: 'compact-infill',
      volumes: [createVolume({ tiers: [rectangle] })],
    })
    const steppedScenario = createScenario({ siteId: 'compact-infill', volumes: [steppedMass] })
    expect(scenarioCoverage(rectangleScenario, PARCEL_AREA)).toBeCloseTo(0.108, 6)
    expect(scenarioCoverage(steppedScenario, PARCEL_AREA)).toBeCloseTo(0.1, 6)
    expect(scenarioCoverage(rectangleScenario, 0)).toBe(0)
  })
})
