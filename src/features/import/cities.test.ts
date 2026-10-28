import { describe, expect, it } from 'vitest'
import { QUICK_PICKS, liesInCountryBounds } from './cities'

describe('Nordic city quick picks', () => {
  it('exposes nine picks covering all four countries', () => {
    expect(QUICK_PICKS).toHaveLength(9)
    expect(QUICK_PICKS.map((pick) => pick.country)).toEqual(['NO', 'NO', 'NO', 'SE', 'SE', 'SE', 'DK', 'DK', 'FI'])
  })

  it('has unique ids', () => {
    const ids = QUICK_PICKS.map((pick) => pick.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('uses the fixed 400 m frame for every pick', () => {
    expect(QUICK_PICKS.every((pick) => pick.frameMetres === 400)).toBe(true)
  })

  it('places every pick inside its country bounding box', () => {
    for (const pick of QUICK_PICKS) {
      expect(liesInCountryBounds(pick), `${pick.id} must lie inside ${pick.country}`).toBe(true)
    }
  })

  it('keeps coordinates at four decimal places', () => {
    for (const pick of QUICK_PICKS) {
      expect(Number.isInteger(pick.latitude * 10_000)).toBe(true)
      expect(Number.isInteger(pick.longitude * 10_000)).toBe(true)
    }
  })
})