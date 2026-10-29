import { describe, expect, it } from 'vitest'
import type { Vec2 } from '../../lib/coordinates'
import {
  createFootprint,
  createRectangleFootprint,
  createScenario,
  createTier,
  createVolume,
} from './factories'
import { floorLevels, LEVEL_TOLERANCE_M, parcelCoverage, scenarioMetrics, volumeMetrics } from './metrics'
import { footprintUnion } from './aggregate'

// docs/qa/fixtures.md §2: parcel 40 m × 50 m centred on the origin.
const PARCEL: Vec2[] = [
  [-20, -25],
  [20, -25],
  [20, 25],
  [-20, 25],
]

const rectangle = createTier({ footprint: createRectangleFootprint(18, 12), storeys: 3, storeyHeight: 3.2 })

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

const steppedLower = createTier({ footprint: createRectangleFootprint(20, 10), storeys: 3, storeyHeight: 3.2 })
const steppedUpper = createTier({
  footprint: createRectangleFootprint(10, 8),
  storeys: 2,
  storeyHeight: 3.2,
  baseElevation: 9.6,
})

const scenarioOf = (...volumes: ReturnType<typeof createVolume>[]) =>
  createScenario({ siteId: 'fixture', name: 'Fixture', volumes })

describe('floorLevels (ADR-0007)', () => {
  it('rectangle: three plates of 216 m² at 0, 3.2 and 6.4 m', () => {
    expect(floorLevels([rectangle])).toEqual([
      { elevation: 0, areaM2: 216 },
      { elevation: 3.2, areaM2: 216 },
      { elevation: 6.4, areaM2: 216 },
    ])
  })

  it('stepped mass: five levels, the shared slab at 9.6 m counted once (fixtures §2)', () => {
    const levels = floorLevels([steppedLower, steppedUpper])
    expect(levels.map((level) => level.elevation)).toEqual([0, 3.2, 6.4, 9.6, 12.8])
    expect(levels.map((level) => level.areaM2)).toEqual([200, 200, 200, 80, 80])
    expect(levels.reduce((total, level) => total + level.areaM2, 0)).toBeCloseTo(760, 6)
  })

  it('two tiers overlapping at the same level: the level is their union, not their sum', () => {
    const a = createTier({ footprint: createRectangleFootprint(10, 10, [0, 0]), storeys: 1 })
    const b = createTier({ footprint: createRectangleFootprint(10, 10, [5, 0]), storeys: 1 })
    const levels = floorLevels([a, b])
    expect(levels).toHaveLength(1)
    expect(levels[0]?.areaM2).toBeCloseTo(150, 6)
  })

  it('plates within the tolerance merge; plates beyond it are separate levels', () => {
    const base = createTier({ footprint: createRectangleFootprint(10, 10), storeys: 1 })
    const nudged = createTier({
      footprint: createRectangleFootprint(10, 10),
      storeys: 1,
      baseElevation: LEVEL_TOLERANCE_M / 2,
    })
    const apart = createTier({
      footprint: createRectangleFootprint(10, 10),
      storeys: 1,
      baseElevation: LEVEL_TOLERANCE_M,
    })
    expect(floorLevels([base, nudged])).toHaveLength(1)
    expect(floorLevels([base, apart])).toHaveLength(2)
  })

  it('mixed storey heights keep distinct plate elevations as distinct levels', () => {
    const tall = createTier({ footprint: createRectangleFootprint(10, 10, [0, 0]), storeys: 2, storeyHeight: 4 })
    const low = createTier({ footprint: createRectangleFootprint(10, 10, [20, 0]), storeys: 2, storeyHeight: 3 })
    expect(floorLevels([tall, low]).map((level) => level.elevation)).toEqual([0, 3, 4])
  })
})

describe('volumeMetrics', () => {
  it('rectangle fixture: 216 m² footprint, 9.6 m, 648 m² GFA, 2 073.6 m³', () => {
    const metrics = volumeMetrics(createVolume({ tiers: [rectangle] }))
    expect(metrics.groundFootprintM2).toBeCloseTo(216, 6)
    expect(metrics.maxHeightM).toBeCloseTo(9.6, 6)
    expect(metrics.gfaM2).toBeCloseTo(648, 6)
    expect(metrics.volumeM3).toBeCloseTo(2073.6, 6)
    expect(metrics.storeys).toHaveLength(3)
  })

  it('L-shaped fixture: 150 m², 6.4 m, 300 m² GFA, 960 m³', () => {
    const metrics = volumeMetrics(createVolume({ tiers: [lShape] }))
    expect(metrics.groundFootprintM2).toBeCloseTo(150, 6)
    expect(metrics.maxHeightM).toBeCloseTo(6.4, 6)
    expect(metrics.gfaM2).toBeCloseTo(300, 6)
    expect(metrics.volumeM3).toBeCloseTo(960, 6)
  })

  it('stepped fixture: ground 200 m², GFA 760 m², 2 432 m³, 16 m, five storeys', () => {
    const metrics = volumeMetrics(createVolume({ tiers: [steppedLower, steppedUpper] }))
    expect(metrics.groundFootprintM2).toBeCloseTo(200, 6)
    expect(metrics.gfaM2).toBeCloseTo(760, 6)
    expect(metrics.volumeM3).toBeCloseTo(2432, 6)
    expect(metrics.maxHeightM).toBeCloseTo(16, 6)
    expect(metrics.storeys).toHaveLength(5)
  })
})

describe('scenarioMetrics', () => {
  it('counts buildings and takes the tallest top', () => {
    const metrics = scenarioMetrics(
      scenarioOf(
        createVolume({ tiers: [rectangle] }),
        createVolume({ tiers: [steppedLower, steppedUpper] }),
      ),
      PARCEL,
    )
    expect(metrics.buildingCount).toBe(2)
    expect(metrics.maxHeightM).toBeCloseTo(16, 6)
    expect(metrics.perVolume).toHaveLength(2)
  })

  it('is empty for a scenario without volumes', () => {
    const metrics = scenarioMetrics(scenarioOf(), PARCEL)
    expect(metrics).toMatchObject({
      gfaM2: 0,
      groundFootprintM2: 0,
      coverageWithinParcel: 0,
      conceptGfaRatio: 0,
      volumeM3: 0,
      maxHeightM: 0,
      buildingCount: 0,
      parcelAreaM2: 2000,
    })
  })

  it('interpenetrating buildings: scenario GFA is the level union, per-building sum is larger', () => {
    const a = createVolume({ tiers: [createTier({ footprint: createRectangleFootprint(10, 10, [0, 0]), storeys: 2 })] })
    const b = createVolume({ tiers: [createTier({ footprint: createRectangleFootprint(10, 10, [5, 0]), storeys: 2 })] })
    const metrics = scenarioMetrics(scenarioOf(a, b), PARCEL)
    expect(metrics.gfaM2).toBeCloseTo(300, 6)
    expect(metrics.gfaByBuildingM2).toBeCloseTo(400, 6)
    expect(metrics.groundFootprintM2).toBeCloseTo(150, 6)
  })

  it('concept GFA ratio is GFA over parcel area (FR-055)', () => {
    const metrics = scenarioMetrics(scenarioOf(createVolume({ tiers: [rectangle] })), PARCEL)
    expect(metrics.conceptGfaRatio).toBeCloseTo(648 / 2000, 9)
  })

  it('agrees with the simple tier sums when nothing overlaps (ADR-0004 §2 compatibility)', () => {
    // The L-shape sits at [0,20]×[0,10]; put the stepped mass clear of it.
    const lower = createTier({ footprint: createRectangleFootprint(20, 10, [-40, 0]), storeys: 3, storeyHeight: 3.2 })
    const upper = createTier({ footprint: createRectangleFootprint(10, 8, [-40, 0]), storeys: 2, storeyHeight: 3.2, baseElevation: 9.6 })
    const metrics = scenarioMetrics(
      scenarioOf(createVolume({ tiers: [lShape] }), createVolume({ tiers: [lower, upper] })),
      PARCEL,
    )
    expect(metrics.gfaM2).toBeCloseTo(300 + 760, 6)
    expect(metrics.gfaByBuildingM2).toBeCloseTo(metrics.gfaM2, 6)
  })
})

describe('parcel coverage (FR-054, fixtures §2 site coverage)', () => {
  it('rectangle footprint 216 m² on a 2 000 m² parcel → 10.80 %', () => {
    const metrics = scenarioMetrics(scenarioOf(createVolume({ tiers: [rectangle] })), PARCEL)
    expect(metrics.footprintWithinParcelM2).toBeCloseTo(216, 6)
    expect(metrics.footprintOutsideParcelM2).toBeCloseTo(0, 6)
    expect(metrics.coverageWithinParcel * 100).toBeCloseTo(10.8, 6)
  })

  it('stepped mass ground footprint 200 m² → 10.00 %, the upper tier adds nothing', () => {
    const metrics = scenarioMetrics(scenarioOf(createVolume({ tiers: [steppedLower, steppedUpper] })), PARCEL)
    expect(metrics.groundFootprintM2).toBeCloseTo(200, 6)
    expect(metrics.coverageWithinParcel * 100).toBeCloseTo(10, 6)
  })

  it('footprint fully outside the parcel → 0 % coverage, all of it reported outside', () => {
    const outside = createTier({ footprint: createRectangleFootprint(18, 12, [60, 0]), storeys: 3 })
    const metrics = scenarioMetrics(scenarioOf(createVolume({ tiers: [outside] })), PARCEL)
    expect(metrics.groundFootprintM2).toBeCloseTo(216, 6)
    expect(metrics.footprintWithinParcelM2).toBe(0)
    expect(metrics.footprintOutsideParcelM2).toBeCloseTo(216, 6)
    expect(metrics.coverageWithinParcel).toBe(0)
  })

  it('footprint crossing the parcel edge is split: 168 m² inside, 48 m² outside', () => {
    // Spans 6..24 east; parcel ends at 20.
    const crossing = createTier({ footprint: createRectangleFootprint(18, 12, [15, 0]), storeys: 3 })
    const metrics = scenarioMetrics(scenarioOf(createVolume({ tiers: [crossing] })), PARCEL)
    expect(metrics.footprintWithinParcelM2).toBeCloseTo(14 * 12, 6)
    expect(metrics.footprintOutsideParcelM2).toBeCloseTo(4 * 12, 6)
    expect(metrics.footprintWithinParcelM2 + metrics.footprintOutsideParcelM2).toBeCloseTo(metrics.groundFootprintM2, 6)
    expect(metrics.coverageWithinParcel * 100).toBeCloseTo(8.4, 6)
  })

  it('a footprint sharing the parcel edge and a corner is fully within (touching is not crossing)', () => {
    const corner = createTier({ footprint: createRectangleFootprint(10, 10, [15, 20]), storeys: 1 })
    const metrics = scenarioMetrics(scenarioOf(createVolume({ tiers: [corner] })), PARCEL)
    expect(metrics.footprintWithinParcelM2).toBeCloseTo(100, 6)
    expect(metrics.footprintOutsideParcelM2).toBeCloseTo(0, 6)
  })

  it('overlapping buildings do not double count ground inside the parcel', () => {
    const a = createVolume({ tiers: [createTier({ footprint: createRectangleFootprint(10, 10, [0, 0]), storeys: 1 })] })
    const b = createVolume({ tiers: [createTier({ footprint: createRectangleFootprint(10, 10, [5, 0]), storeys: 1 })] })
    const metrics = scenarioMetrics(scenarioOf(a, b), PARCEL)
    expect(metrics.footprintWithinParcelM2).toBeCloseTo(150, 6)
    expect(metrics.coverageWithinParcel * 100).toBeCloseTo(7.5, 6)
  })

  it('a mass larger than the parcel covers 100 % with the rest outside', () => {
    const huge = createTier({ footprint: createRectangleFootprint(60, 70), storeys: 1 })
    const metrics = scenarioMetrics(scenarioOf(createVolume({ tiers: [huge] })), PARCEL)
    expect(metrics.coverageWithinParcel).toBeCloseTo(1, 9)
    expect(metrics.footprintOutsideParcelM2).toBeCloseTo(60 * 70 - 2000, 6)
  })

  it('parcelCoverage handles an empty ground and a degenerate parcel', () => {
    expect(parcelCoverage([], PARCEL)).toEqual({ withinM2: 0, outsideM2: 0, parcelAreaM2: 2000 })
    const ground = footprintUnion([rectangle.footprint])
    expect(parcelCoverage(ground, [[0, 0], [1, 1]])).toEqual({ withinM2: 0, outsideM2: 216, parcelAreaM2: 0 })
  })
})
