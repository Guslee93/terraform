import { describe, expect, it } from 'vitest'
import { Color } from 'three'
import { sceneColourForDisplay, tintGroundColour } from './styleColour'

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

describe('sceneColourForDisplay (neutral tone-mapping inverse)', () => {
  // 8-bit sRGB of a linear colour.
  const bytes = (c: Color) => { const hex = c.getHexString(); return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) }
  // three's NeutralToneMapping below the compression knee, in linear space.
  const forward = (hex: string, exposure: number) => {
    const c = new Color(hex)
    const v = [c.r * exposure, c.g * exposure, c.b * exposure]
    const x = Math.min(...v)
    const offset = x < 0.08 ? x - 6.25 * x * x : 0.04
    return bytes(new Color(v[0]! - offset, v[1]! - offset, v[2]! - offset))
  }

  it.each(['#3A4540', '#262E2A', '#1C2320', '#4A5455'])('displays %s as asked at exposure 1 and 1.35', (hex) => {
    for (const exposure of [1, 1.35]) {
      const shown = forward(sceneColourForDisplay(hex, exposure), exposure)
      const want = bytes(new Color(hex))
      shown.forEach((value, i) => expect(Math.abs(value - want[i]!)).toBeLessThanOrEqual(1))
    }
  })

  it('leaves bright colours alone', () => {
    expect(sceneColourForDisplay('#F1F1EF', 1.35)).toBe('#F1F1EF')
  })
})
