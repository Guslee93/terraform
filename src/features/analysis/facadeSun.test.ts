import { describe, expect, it } from 'vitest'
import type { Vec2 } from '../../lib/coordinates'
import type { FootprintBuilding } from './grid'
import { facadeSamples, type FacadeMass, type FacadeSample } from './facadeSamples'
import { computeFacadeSun, medianFacadeSun } from './facadeSun'
import { daySunSamples } from './shadowRay'
import { sunDirectionEnu } from './sun'

const OSLO = { latitude: 59.9139, longitude: 10.7522, timeZone: 'Europe/Oslo' }
const box: Vec2[] = [[-10, -10], [10, -10], [10, 10], [-10, 10]]
const boxBuilding: FootprintBuilding = { height: 20, footprint: box }
const mass = (footprint: readonly Vec2[], height = 20): FacadeMass => ({
  id: 'block',
  tiers: [{ tierIndex: 0, footprint, baseZ: 0, topZ: height }],
})

const mean = (values: readonly { hours: number }[]) =>
  values.reduce((sum, value) => sum + value.hours, 0) / values.length

describe('façade sun hours', () => {
  it('gives the south façade more sun than the north on 21 June, and none on the north at midwinter', () => {
    const samples = facadeSamples([mass(box)])
    const june = computeFacadeSun(samples, [boxBuilding], daySunSamples('2026-06-21', OSLO))
    const juneSouth = june.filter((value) => value.sample.normal[1] < -0.99)
    const juneNorth = june.filter((value) => value.sample.normal[1] > 0.99)
    expect(juneSouth.length).toBeGreaterThan(0)
    expect(juneNorth.length).toBeGreaterThan(0)
    // At 60° N the summer sun rises and sets far north of west, so the north wall still catches
    // long grazing sun; the ordering is clear but the gap is not the midwinter one.
    expect(mean(juneSouth)).toBeGreaterThan(mean(juneNorth))

    const december = computeFacadeSun(samples, [boxBuilding], daySunSamples('2026-12-21', OSLO))
    const decemberSouth = december.filter((value) => value.sample.normal[1] < -0.99)
    const decemberNorth = december.filter((value) => value.sample.normal[1] > 0.99)
    expect(mean(decemberNorth)).toBe(0)
    expect(mean(decemberSouth)).toBeCloseTo(daySunSamples('2026-12-21', OSLO).length * 0.25, 10)
    // No façade can beat the sampled day length.
    expect(Math.max(...june.map((value) => value.hours))).toBeLessThanOrEqual(
      daySunSamples('2026-06-21', OSLO).length * 0.25,
    )
  })

  it('shades the inside corner of an L with the other wing at a known time', () => {
    const lShape: Vec2[] = [[0, 0], [20, 0], [20, 8], [8, 8], [8, 20], [0, 20]]
    const samples = facadeSamples([mass(lShape)])
    const inner = samples.find(
      (sample: FacadeSample) =>
        sample.normal[0] > 0.99 &&
        Math.abs(sample.p[0] - 8.1) < 0.01 &&
        sample.p[1] > 11 &&
        sample.p[1] < 17 &&
        Math.abs(sample.p[2] - 10.5) < 0.01,
    )
    const outer = samples.find(
      (sample) =>
        sample.normal[0] > 0.99 &&
        Math.abs(sample.p[0] - 20.1) < 0.01 &&
        sample.p[1] > 2 &&
        sample.p[1] < 6 &&
        Math.abs(sample.p[2] - 10.5) < 0.01,
    )
    expect(inner).toBeDefined()
    expect(outer).toBeDefined()
    const sun = [{ minute: 900, enu: sunDirectionEnu({ azimuthDeg: 135, elevationDeg: 20 }), elevationDeg: 20 }]
    const buildings: FootprintBuilding[] = [{ height: 20, footprint: lShape }]
    const values = computeFacadeSun([inner!, outer!], buildings, sun, 60)
    // The inner east-facing wall looks into the notch and is blocked by the south wing; the outer
    // east wall looks away and is sunlit for the one sample.
    expect(values[0]?.hours).toBe(0)
    expect(values[1]?.hours).toBe(1)
  })

  it('reports the median and leaves an empty mass list unassessed', () => {
    const samples = facadeSamples([mass(box)])
    const values = computeFacadeSun(samples, [boxBuilding], daySunSamples('2026-06-21', OSLO))
    expect(medianFacadeSun(values)).not.toBeNull()
    expect(medianFacadeSun([])).toBeNull()
  })
})
