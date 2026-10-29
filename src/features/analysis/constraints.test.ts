import { describe, expect, it } from 'vitest'
import type { Vec2 } from '../../lib/coordinates'
import { insetPolygon, multiPolygonArea } from '../../lib/clip'
import { isSimpleRing, pointInPolygon, polygonArea } from '../../lib/polygon'
import { createRectangleFootprint, createScenario, createTier, createVolume } from '../massing/factories'
import {
  CONSTRAINT_DISCLAIMER,
  constraintsFromManifest,
  ENVELOPE_STATUS_LABEL,
  evaluateEnvelope,
  referenceElevation,
  type EnvelopeSite,
} from './constraints'

// docs/qa/fixtures.md §2–§3: parcel 40 m × 50 m centred on the origin, 12 m limit.
const PARCEL: Vec2[] = [
  [-20, -25],
  [20, -25],
  [20, 25],
  [-20, 25],
]
const flat = () => 0

const site = (overrides: Partial<EnvelopeSite> = {}): EnvelopeSite => ({
  studyArea: PARCEL,
  heightAt: flat,
  constraints: { maxHeightM: 12, setbackM: 4, heightReference: 'grade' },
  ...overrides,
})

const mass = (width: number, depth: number, center: Vec2, storeys = 3, id = 'm') =>
  createVolume({ id, tiers: [createTier({ footprint: createRectangleFootprint(width, depth, center), storeys, storeyHeight: 3.2 })] })

const scenarioOf = (...volumes: ReturnType<typeof createVolume>[]) =>
  createScenario({ siteId: 'fixture', name: 'Fixture', volumes })

describe('insetPolygon', () => {
  it('insets a rectangle exactly', () => {
    const result = insetPolygon(PARCEL, 4)
    expect(result).toHaveLength(1)
    expect(multiPolygonArea(result)).toBeCloseTo(32 * 42, 6)
    const ring = result[0]?.[0] ?? []
    expect(isSimpleRing(ring)).toBe(true)
    for (const [east, north] of ring) {
      expect(Math.abs(east)).toBeCloseTo(16, 6)
      expect(Math.abs(north)).toBeCloseTo(21, 6)
    }
  })

  it('handles an L-shaped (concave) boundary: 95 − π/4 m² with a rounded reflex corner', () => {
    const lShape: Vec2[] = [
      [0, 0],
      [20, 0],
      [20, 5],
      [10, 5],
      [10, 10],
      [0, 10],
    ]
    const result = insetPolygon(lShape, 1)
    expect(result).toHaveLength(1)
    // [1,19]×[1,4] ∪ [1,9]×[1,9] plus the corner square [9,10]×[4,5] minus the quarter disc at (10,5).
    expect(multiPolygonArea(result)).toBeCloseTo(95 - Math.PI / 4, 1)
    const ring = result[0]?.[0] ?? []
    expect(isSimpleRing(ring)).toBe(true)
    // Every vertex of the inset lies inside the original and at least 1 m (minus 48-gon error) from each edge.
    for (const point of ring) {
      expect(pointInPolygon(point, lShape)).toBe(true)
      for (let i = 0; i < lShape.length; i += 1) {
        const a = lShape[i]!
        const b = lShape[(i + 1) % lShape.length]!
        expect(distanceToSegment(point, a, b)).toBeGreaterThan(1 - 0.01)
      }
    }
  })

  it('splits a notched (dumbbell) boundary into two polygons when the neck is narrower than 2d', () => {
    const dumbbell: Vec2[] = [
      [0, 0],
      [10, 0],
      [10, 4],
      [20, 4],
      [20, 0],
      [30, 0],
      [30, 10],
      [20, 10],
      [20, 6],
      [10, 6],
      [10, 10],
      [0, 10],
    ]
    const result = insetPolygon(dumbbell, 2)
    expect(result).toHaveLength(2)
    // Two 6 × 6 squares plus the lens each side where the neck's two reflex corners are both ≥ 2 m away.
    const lens = 4 - Math.sqrt(3) - (2 * Math.PI) / 3
    expect(multiPolygonArea(result)).toBeCloseTo(2 * 36 + 2 * lens, 1)
    for (const rings of result) expect(isSimpleRing(rings[0] ?? [])).toBe(true)
  })

  it('is empty when the boundary is narrower than twice the distance', () => {
    expect(insetPolygon(PARCEL, 20)).toEqual([])
    expect(insetPolygon(PARCEL, 25)).toEqual([])
  })

  it('returns the ring itself for a zero distance and rejects negative distances', () => {
    expect(insetPolygon(PARCEL, 0)).toEqual([[PARCEL]])
    expect(() => insetPolygon(PARCEL, -1)).toThrow()
  })
})

function distanceToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy))
}

describe('evaluateEnvelope (fixtures §3)', () => {
  it('footprint fully inside parcel and setback, 9.6 m vs 12 m limit → Within demo envelope', () => {
    const result = evaluateEnvelope(scenarioOf(mass(18, 12, [0, 0])), site())
    expect(result.status).toBe('within')
    expect(ENVELOPE_STATUS_LABEL[result.status]).toBe('Within demo envelope')
    expect(result.perVolume[0]).toMatchObject({ status: 'within', reasons: [], heightExcessM: 0 })
    expect(result.perVolume[0]?.heightM).toBeCloseTo(9.6, 9)
    expect(result.setbackPolygon).toHaveLength(1)
    expect(result.disclaimer).toBe(CONSTRAINT_DISCLAIMER)
  })

  it('footprint crossing the parcel edge → Exceeds, with the offending part outside the boundary', () => {
    // 18 m wide, centred 15 m east: spans 6..24, the parcel ends at 20.
    const result = evaluateEnvelope(scenarioOf(mass(18, 12, [15, 0], 3, 'crossing')), site())
    const volume = result.perVolume[0]!
    expect(result.status).toBe('exceeds')
    expect(volume.volumeId).toBe('crossing')
    expect(volume.reasons).toEqual(['outside-boundary', 'outside-setback'])
    expect(volume.outsideBoundaryRings).toHaveLength(1)
    expect(polygonArea(volume.outsideBoundaryRings[0]!)).toBeCloseTo(4 * 12, 6)
    // Outside the setback line (x > 16): 8 m × 12 m.
    expect(polygonArea(volume.outsideSetbackRings[0]!)).toBeCloseTo(8 * 12, 6)
  })

  it('footprint fully outside the parcel → Exceeds with the whole footprint as offending geometry', () => {
    const result = evaluateEnvelope(scenarioOf(mass(18, 12, [60, 0])), site())
    const volume = result.perVolume[0]!
    expect(volume.status).toBe('exceeds')
    expect(volume.reasons).toContain('outside-boundary')
    expect(polygonArea(volume.outsideBoundaryRings[0]!)).toBeCloseTo(216, 6)
  })

  it('footprint inside the parcel but over the setback line → Exceeds for the setback only', () => {
    // Spans 0..18 east; setback line at 16.
    const result = evaluateEnvelope(scenarioOf(mass(18, 12, [9, 0])), site())
    const volume = result.perVolume[0]!
    expect(volume.reasons).toEqual(['outside-setback'])
    expect(volume.outsideBoundaryRings).toEqual([])
    expect(polygonArea(volume.outsideSetbackRings[0]!)).toBeCloseTo(2 * 12, 6)
  })

  it('a footprint sharing the setback line exactly is within (no sliver violations)', () => {
    // 32 m × 42 m centred: coincides with the setback polygon.
    const result = evaluateEnvelope(scenarioOf(mass(32, 42, [0, 0])), site())
    expect(result.perVolume[0]?.reasons).toEqual([])
    expect(result.status).toBe('within')
  })

  it('height 16.0 m vs 12 m limit → Exceeds with a 4 m excess', () => {
    const result = evaluateEnvelope(scenarioOf(mass(18, 12, [0, 0], 5)), site())
    expect(result.status).toBe('exceeds')
    expect(result.perVolume[0]?.reasons).toEqual(['too-tall'])
    expect(result.perVolume[0]?.heightM).toBeCloseTo(16, 9)
    expect(result.perVolume[0]?.heightExcessM).toBeCloseTo(4, 9)
  })

  it('exactly at the limit is within', () => {
    const result = evaluateEnvelope(scenarioOf(mass(18, 12, [0, 0], 5)), site({ constraints: { maxHeightM: 16, setbackM: 4, heightReference: 'grade' } }))
    expect(result.status).toBe('within')
  })

  it('no constraint configured → Not evaluated for the scenario and every mass', () => {
    const result = evaluateEnvelope(scenarioOf(mass(18, 12, [60, 0], 9)), site({ constraints: null }))
    expect(result.status).toBe('not-evaluated')
    expect(ENVELOPE_STATUS_LABEL[result.status]).toBe('Not evaluated')
    expect(result.setbackPolygon).toBeNull()
    expect(result.perVolume[0]?.status).toBe('not-evaluated')
    expect(result.disclaimer).toBe(CONSTRAINT_DISCLAIMER)
  })

  it('evaluates only the configured checks', () => {
    const tallAndOutside = scenarioOf(mass(18, 12, [60, 0], 9))
    const heightOnly = evaluateEnvelope(tallAndOutside, site({ constraints: { maxHeightM: 12, heightReference: 'datum' } }))
    expect(heightOnly.perVolume[0]?.reasons).toEqual(['too-tall'])
    expect(heightOnly.setbackPolygon).toBeNull()
    const setbackOnly = evaluateEnvelope(tallAndOutside, site({ constraints: { setbackM: 4, heightReference: 'datum' } }))
    expect(setbackOnly.perVolume[0]?.reasons).toEqual(['outside-boundary', 'outside-setback'])
    expect(setbackOnly.perVolume[0]?.heightExcessM).toBe(0)
  })

  it('reports per-mass status and the scenario is exceeds if any mass exceeds (FR-074)', () => {
    const result = evaluateEnvelope(scenarioOf(mass(10, 10, [0, 0], 3, 'ok'), mass(10, 10, [0, 0], 6, 'tall')), site())
    expect(result.status).toBe('exceeds')
    expect(result.perVolume.map((v) => [v.volumeId, v.status])).toEqual([
      ['ok', 'within'],
      ['tall', 'exceeds'],
    ])
  })

  it('maps the manifest constraints block', () => {
    expect(constraintsFromManifest({ maxHeightMeters: 18, setbackMeters: 4 })).toEqual({
      maxHeightM: 18,
      setbackM: 4,
      heightReference: 'grade',
    })
  })
})

describe('height reference (ADR-0008)', () => {
  // Terrain falling 1 m per 10 m eastwards: z = −east / 10.
  const slope = (east: number) => -east / 10
  const onSlope = createVolume({
    id: 'slope',
    tiers: [createTier({ footprint: createRectangleFootprint(20, 10, [0, 0]), storeys: 3, storeyHeight: 3.2, baseElevation: -1 })],
  })

  it('grade is the lowest terrain sample under the ground tier', () => {
    expect(referenceElevation(onSlope, site({ heightAt: slope }), 'grade')).toBeCloseTo(-1, 6)
  })

  it('datum is the site origin regardless of terrain', () => {
    expect(referenceElevation(onSlope, site({ heightAt: slope }), 'datum')).toBe(0)
  })

  it('the same mass is taller from grade than from datum on a falling slope', () => {
    const grade = evaluateEnvelope(scenarioOf(onSlope), site({ heightAt: slope, constraints: { maxHeightM: 9, heightReference: 'grade' } }))
    const datum = evaluateEnvelope(scenarioOf(onSlope), site({ heightAt: slope, constraints: { maxHeightM: 9, heightReference: 'datum' } }))
    expect(grade.perVolume[0]?.heightM).toBeCloseTo(9.6, 6)
    expect(grade.perVolume[0]?.referenceElevationM).toBeCloseTo(-1, 6)
    expect(grade.status).toBe('exceeds')
    expect(datum.perVolume[0]?.heightM).toBeCloseTo(8.6, 6)
    expect(datum.status).toBe('within')
  })

  it('grade uses the ground tiers only, not an upper tier', () => {
    const stepped = createVolume({
      tiers: [
        createTier({ footprint: createRectangleFootprint(20, 10, [0, 0]), storeys: 3, storeyHeight: 3.2 }),
        createTier({ footprint: createRectangleFootprint(4, 4, [8, 0]), storeys: 1, storeyHeight: 3.2, baseElevation: 9.6 }),
      ],
    })
    // A dip outside the ground footprint (east > 15) must not lower the reference.
    const dip = (east: number) => (east > 15 ? -5 : 0)
    expect(referenceElevation(stepped, site({ heightAt: dip }), 'grade')).toBe(0)
  })
})
