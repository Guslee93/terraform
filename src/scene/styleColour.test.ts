import { describe, expect, it } from 'vitest'
import { Color } from 'three'
import { tintGroundColour } from './styleColour'

const hsl = (hex: string) => {
  const value = { h: 0, s: 0, l: 0 }
  new Color(hex).getHSL(value)
  return value
}

describe('tintGroundColour (TF-VIS-020 ground transform)', () => {
  it('is the identity when the tint is null (NORDIC)', () => {
    expect(tintGroundColour('#D3E0E8', null)).toBe('#D3E0E8')
    expect(tintGroundColour('#F7F4EF', null)).toBe('#F7F4EF')
  })

  it('desaturates by 0.8 — keeps ~20 % chroma', () => {
    // Pure red starts at s = 1; the transform keeps ~20 % (within 8-bit hex rounding).
    const { s } = hsl(tintGroundColour('#FF0000', { saturation: 0.2, lightness: 1 }))
    expect(s).toBeGreaterThan(0.15)
    expect(s).toBeLessThan(0.25)
  })

  it('darkens by the lightness factor', () => {
    const { l } = hsl(tintGroundColour('#FFFFFF', { saturation: 0.2, lightness: 0.5 }))
    expect(l).toBeGreaterThan(0.45)
    expect(l).toBeLessThan(0.55)
  })

  it('leaves pure greys grey (no hue is invented)', () => {
    const { s } = hsl(tintGroundColour('#808080', { saturation: 0.2, lightness: 0.5 }))
    expect(s).toBeCloseTo(0, 5)
  })
})
