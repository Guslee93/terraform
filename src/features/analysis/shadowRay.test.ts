import { describe, expect, it } from 'vitest'
import { blockedTowardSun, daySunSamples } from './shadowRay'
import { sunDirectionEnu } from './sun'
import type { FootprintBuilding } from './grid'
import type { Vec2 } from '../../lib/coordinates'

const OSLO = { latitude: 59.9139, longitude: 10.7522, timeZone: 'Europe/Oslo' }

const box = (centre: Vec2, width: number, depth: number, height: number): FootprintBuilding => {
  const [x, y] = centre
  return {
    height,
    footprint: [
      [x - width / 2, y - depth / 2],
      [x + width / 2, y - depth / 2],
      [x + width / 2, y + depth / 2],
      [x - width / 2, y + depth / 2],
    ],
  }
}

const wall = (north: number): FootprintBuilding => ({
  height: 10,
  footprint: [
    [-20, north - 0.2],
    [20, north - 0.2],
    [20, north],
    [-20, north],
  ],
})

describe('blockedTowardSun', () => {
  const sun45South = sunDirectionEnu({ azimuthDeg: 180, elevationDeg: 45 })

  it('blocks at 5 m from a 10 m wall and clears at 12 m', () => {
    const near = wall(-5)
    const far = wall(-12)
    expect(blockedTowardSun([0, 0, 1], sun45South, [near])).toBe(true)
    expect(blockedTowardSun([0, 0, 1], sun45South, [far])).toBe(false)
  })

  it('always blocks a sun at or below the horizon', () => {
    expect(blockedTowardSun([0, 0, 2], [0, -1, -0.01], [])).toBe(true)
    expect(blockedTowardSun([0, 0, 2], sunDirectionEnu({ azimuthDeg: 180, elevationDeg: 0 }), [])).toBe(true)
  })

  it('follows the entry crossing of a non-convex L footprint', () => {
    const lShape: FootprintBuilding = {
      height: 10,
      footprint: [
        [0, 0],
        [10, 0],
        [10, 4],
        [4, 4],
        [4, 10],
        [0, 10],
      ],
    }
    const east = sunDirectionEnu({ azimuthDeg: 90, elevationDeg: 45 })
    // Inside the notch at y = 6: the ray crosses the vertical arm.
    expect(blockedTowardSun([2, 6, 1], east, [lShape])).toBe(true)
    // Same notch but past the arm: no footprint on the ray.
    expect(blockedTowardSun([6, 6, 1], east, [lShape])).toBe(false)
    // Above the roof, the first crossing no longer reaches the height.
    expect(blockedTowardSun([2, 6, 12], east, [lShape])).toBe(false)
  })

  it('ignores the building passed as skip', () => {
    const own = box([0, 0], 20, 20, 30)
    const sunSouth = sunDirectionEnu({ azimuthDeg: 180, elevationDeg: 30 })
    expect(blockedTowardSun([0, 12, 0], sunSouth, [own])).toBe(true)
    expect(blockedTowardSun([0, 12, 0], sunSouth, [own], own)).toBe(false)
  })
})

describe('daySunSamples', () => {
  it('keeps only above-horizon samples, 15 minutes apart, ordered by local minute', () => {
    const samples = daySunSamples('2026-06-21', OSLO)
    expect(samples.length).toBeGreaterThan(60)
    expect(samples.every((sample) => sample.elevationDeg > 0 && sample.enu[2] > 0)).toBe(true)
    for (let index = 1; index < samples.length; index += 1) {
      expect((samples[index]?.minute ?? 0) - (samples[index - 1]?.minute ?? 0)).toBe(15)
    }
  })

  it('has no samples on a polar night', () => {
    expect(daySunSamples('2026-12-21', { latitude: 78.22, longitude: 15.65, timeZone: 'Arctic/Longyearbyen' })).toEqual([])
  })
})
