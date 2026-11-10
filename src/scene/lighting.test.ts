import { describe, expect, it } from 'vitest'
import { fitShadowFrustum, lightRig, sunPosition } from './lighting'

describe('lightRig', () => {
  it.each([6, 20, 49.5])('preserves the daylight rig at %s degrees', (elevationDeg) => {
    expect(lightRig({ azimuthDeg: 217, elevationDeg }, 'high')).toEqual({
      night: false,
      sun: { azimuthDeg: 217, elevationDeg, intensity: 3.2, castShadow: true },
      ambient: 0.08,
      environment: 0.22,
      hemisphere: { sky: '#EEF3FA', ground: '#D2D5D8', intensity: 1.35 },
    })
  })

  it('fades direct sun to half intensity at 3 degrees without changing fill', () => {
    const rig = lightRig({ azimuthDeg: 90, elevationDeg: 3 }, 'balanced')
    expect(rig.sun?.intensity).toBe(1.6)
    expect(rig.sun?.castShadow).toBe(true)
    expect(rig.night).toBe(false)
    expect(rig.ambient).toBe(0.08)
    expect(rig.environment).toBe(0.22)
    expect(rig.hemisphere).toEqual({ sky: '#EEF3FA', ground: '#D2D5D8', intensity: 1.35 })
  })

  it.each([0, -10])('removes direct sun at %s degrees and keeps the model readable', (elevationDeg) => {
    expect(lightRig({ azimuthDeg: 180, elevationDeg }, 'high')).toEqual({
      night: true,
      sun: null,
      ambient: 0.2,
      environment: 0.6,
      hemisphere: { sky: '#C9D3E0', ground: '#B9BEC4', intensity: 0.7 },
    })
  })

  it.each([-10, 0, 3, 20])('never casts shadows in Low at %s degrees', (elevationDeg) => {
    expect(lightRig({ azimuthDeg: 180, elevationDeg }, 'low').sun?.castShadow ?? false).toBe(false)
  })
})

describe('sunPosition', () => {
  it('places a south-west sun at −x (west) and +z (south)', () => {
    const [x, y, z] = sunPosition(225, 35, 100)
    const horizontal = Math.cos((35 * Math.PI) / 180) * 100
    expect(x).toBeCloseTo(-horizontal / Math.SQRT2, 6)
    expect(y).toBeCloseTo(Math.sin((35 * Math.PI) / 180) * 100, 6)
    // North is −z in the renderer frame, so a southern sun sits at +z.
    expect(z).toBeCloseTo(horizontal / Math.SQRT2, 6)
  })

  it('puts a zenith sun straight up', () => {
    const [x, y, z] = sunPosition(0, 90, 50)
    expect(x).toBeCloseTo(0, 6)
    expect(y).toBeCloseTo(50, 6)
    expect(z).toBeCloseTo(0, 6)
  })

  it('puts a horizon sun due east on +x', () => {
    const [x, y, z] = sunPosition(90, 0, 10)
    expect(x).toBeCloseTo(10, 6)
    expect(y).toBeCloseTo(0, 6)
    expect(z).toBeCloseTo(0, 6)
  })
})

describe('fitShadowFrustum', () => {
  it('covers the bounding sphere of the site with a near plane in front of it', () => {
    const frustum = fitShadowFrustum(300, 40)
    const radius = Math.hypot(300, 40)
    expect(frustum.halfExtent).toBeCloseTo(radius, 6)
    expect(frustum.distance - frustum.near).toBeCloseTo(radius, 6)
    expect(frustum.far - frustum.distance).toBeCloseTo(radius, 6)
    expect(frustum.near).toBeGreaterThan(0)
  })

  it('keeps 4096 px under 0.15 m per texel for a 250 m site', () => {
    const frustum = fitShadowFrustum(250, 30)
    expect((frustum.halfExtent * 2) / 4096).toBeLessThan(0.15)
  })
})
