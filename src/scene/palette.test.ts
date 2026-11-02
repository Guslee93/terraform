import { Color } from 'three'
import { describe, expect, it } from 'vitest'
import { soften } from './palette'

const hsl = (hex: string) => {
  const out = { h: 0, s: 0, l: 0 }
  new Color(hex).getHSL(out)
  return out
}

describe('soften', () => {
  it('scales saturation and keeps hue and lightness', () => {
    const before = hsl('#8FBB8A')
    const after = hsl(soften('#8FBB8A', 0.5))
    expect(after.s).toBeCloseTo(before.s * 0.5, 2)
    expect(after.h).toBeCloseTo(before.h, 2)
    expect(after.l).toBeCloseTo(before.l, 2)
  })
  it('leaves greys alone', () => {
    expect(soften('#808080')).toBe('#808080')
  })
})
