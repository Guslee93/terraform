import { describe, expect, it } from 'vitest'
import type { Vec2 } from '../../lib/coordinates'
import { checkClearance, type SiteContext } from './clearance'
import { createRectangleFootprint, createScenario, createTier, createVolume } from './factories'
import type { MassVolume } from './types'

const studyArea: Vec2[] = [
  [0, 0],
  [100, 0],
  [100, 100],
  [0, 100],
]
const flat: SiteContext = { studyArea, heightAt: () => 0 }

function mass(center: Vec2, baseElevation = 0, id = 'v1'): MassVolume {
  return createVolume({
    id,
    name: 'Mass 1',
    tiers: [createTier({ id: `${id}-t`, footprint: createRectangleFootprint(20, 12, center), baseElevation })],
  })
}

function kinds(volume: MassVolume, site: SiteContext = flat) {
  const issues = checkClearance(createScenario({ siteId: 's', volumes: [volume] }), site).get(volume.id)
  return (issues ?? []).map((issue) => issue.kind)
}

describe('study boundary (QA-06)', () => {
  it('reports nothing for a mass fully inside', () => {
    expect(kinds(mass([50, 50]))).toEqual([])
  })

  it('flags a mass crossing the boundary', () => {
    expect(kinds(mass([100, 50]))).toEqual(['boundary-crossing'])
  })

  it('flags a mass fully outside', () => {
    expect(kinds(mass([200, 50]))).toEqual(['boundary-outside'])
  })

  it('flags a crossing upper tier even when the base tier is inside', () => {
    const stepped = createVolume({
      id: 'v1',
      tiers: [
        createTier({ id: 't1', footprint: createRectangleFootprint(20, 12, [50, 50]) }),
        createTier({ id: 't2', footprint: createRectangleFootprint(80, 8, [70, 50]), baseElevation: 9.6 }),
      ],
    })
    expect(kinds(stepped)).toEqual(['boundary-crossing'])
  })

  it('returns no entry for masses without issues', () => {
    const document = createScenario({
      siteId: 's',
      volumes: [mass([50, 50], 0, 'ok'), mass([100, 50], 0, 'bad')],
    })
    const result = checkClearance(document, flat)
    expect([...result.keys()]).toEqual(['bad'])
  })
})

describe('terrain clearance', () => {
  it('accepts a mass seated on flat ground', () => {
    expect(kinds(mass([50, 50], 0.3))).toEqual([])
  })

  it('flags a mass floating above the ground with the gap', () => {
    const issues = checkClearance(createScenario({ siteId: 's', volumes: [mass([50, 50], 2)] }), flat).get('v1')
    expect(issues).toEqual([{ kind: 'floating', amount: 2, message: 'Floats up to 2.0 m above the ground' }])
  })

  it('flags a mass cutting into a slope with the depth', () => {
    // 20 % grade rising to the east: 40 → 60 m east gives 8 → 12 m.
    const slope: SiteContext = { studyArea, heightAt: (east) => east * 0.2 }
    const issues = checkClearance(createScenario({ siteId: 's', volumes: [mass([50, 50], 8)] }), slope).get('v1')
    expect(issues?.map((issue) => issue.kind)).toEqual(['cut'])
    expect(issues?.[0]?.amount).toBeCloseTo(4, 6)
    expect(issues?.[0]?.message).toBe('Cuts up to 4.0 m into the slope')
  })

  it('accepts a cut shallower than one storey (a normal plinth)', () => {
    // 6 % grade: 40 → 60 m east gives 2.4 → 3.6 m, a 1.2 m cut under 3.2 m storeys.
    const gentle: SiteContext = { studyArea, heightAt: (east) => east * 0.06 }
    expect(kinds(mass([50, 50], 2.4), gentle)).toEqual([])
  })

  it('finds a hump inside the footprint, not just under the corners', () => {
    const hill: SiteContext = {
      studyArea,
      heightAt: (east, north) => Math.max(0, 6 - Math.hypot(east - 50, north - 50) / 2),
    }
    const cut = checkClearance(createScenario({ siteId: 's', volumes: [mass([50, 50], 0)] }), hill)
      .get('v1')
      ?.find((issue) => issue.kind === 'cut')
    expect(cut?.amount).toBeGreaterThan(5.5)
  })

  it('checks only ground tiers against the terrain', () => {
    const stepped = createVolume({
      id: 'v1',
      tiers: [
        createTier({ id: 't1', footprint: createRectangleFootprint(20, 12, [50, 50]) }),
        createTier({ id: 't2', footprint: createRectangleFootprint(10, 8, [50, 50]), baseElevation: 9.6 }),
      ],
    })
    expect(kinds(stepped)).toEqual([])
  })
})
