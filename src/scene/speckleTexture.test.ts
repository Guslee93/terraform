import { describe, expect, it } from 'vitest'
import { speckleAlpha } from './speckleTexture'

describe('speckleAlpha (visuals plan V4)', () => {
  it('has real holes and real leaf clusters, not uniform noise', () => {
    const alpha = speckleAlpha(128, 7)
    const holes = alpha.filter((a) => a < 0.05).length / alpha.length
    const solid = alpha.filter((a) => a > 0.75).length / alpha.length
    expect(holes).toBeGreaterThan(0.1)
    expect(holes).toBeLessThan(0.45)
    expect(solid).toBeGreaterThan(0.2)
  })

  it('is repeatable for a seed and differs between seeds', () => {
    expect(speckleAlpha(32, 7)).toEqual(speckleAlpha(32, 7))
    expect(speckleAlpha(32, 7)).not.toEqual(speckleAlpha(32, 8))
  })
})
