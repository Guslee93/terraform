import { describe, expect, it } from 'vitest'
import { DEMO_SUN_INSTANT, sunDirection } from './sun'

const OSLO = { latitude: 59.9235, longitude: 10.758 }

describe('sunDirection', () => {
  it('puts the midsummer solar-noon sun due south at 90° − latitude + 23.44°', () => {
    // Solar noon at 10.758° E is ≈ 12:00 − 43 min − equation of time (−1.7 min) ≈ 11:19 UTC.
    const sun = sunDirection(new Date(Date.UTC(2026, 5, 21, 11, 19)), OSLO.latitude, OSLO.longitude)
    expect(sun.azimuthDeg).toBeCloseTo(180, 0)
    expect(sun.elevationDeg).toBeCloseTo(90 - OSLO.latitude + 23.44, 0)
  })

  it('moves the afternoon sun west of south and lower', () => {
    const sun = sunDirection(DEMO_SUN_INSTANT, OSLO.latitude, OSLO.longitude)
    expect(sun.azimuthDeg).toBeGreaterThan(200)
    expect(sun.azimuthDeg).toBeLessThan(250)
    expect(sun.elevationDeg).toBeGreaterThan(35)
    expect(sun.elevationDeg).toBeLessThan(53)
  })

  it('is the reference view of 21 June, 15:00 Oslo summer time (13:00 UTC)', () => {
    expect(DEMO_SUN_INSTANT.toISOString()).toBe('2026-06-21T13:00:00.000Z')
  })
})
