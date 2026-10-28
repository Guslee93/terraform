import { describe, expect, it } from 'vitest'
import { sunPosition } from './lighting'

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
