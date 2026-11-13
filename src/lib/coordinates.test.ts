import { describe, expect, it } from 'vitest'
import {
  enuToThreeXyz,
  horizontalDistance,
  isFiniteVec2,
  isFiniteVec3,
  parseMetres,
  threeXyzToEnu,
} from './coordinates'

describe('coordinate contract', () => {
  it('maps local ENU metres into a Y-up Three.js frame', () => {
    expect(enuToThreeXyz([120, -45, 9.6])).toEqual([120, 9.6, 45])
  })

  it('round-trips an ENU position through the renderer frame', () => {
    const original = [1234.567, -890.123, 42.5] as const
    expect(threeXyzToEnu).toBeTypeOf('function')
    expect(threeXyzToEnu(enuToThreeXyz(original))).toEqual(original)
  })

  it('preserves horizontal distance independently of elevation', () => {
    expect(horizontalDistance([0, 0], [30, 40])).toBe(50)
  })

  it('rejects non-finite or incorrectly sized vectors', () => {
    expect(isFiniteVec2([1, 2])).toBe(true)
    expect(isFiniteVec2([1, Number.NaN])).toBe(false)
    expect(isFiniteVec2([1])).toBe(false)
    expect(isFiniteVec3([1, 2, 3])).toBe(true)
    expect(isFiniteVec3([1, 2, Number.POSITIVE_INFINITY])).toBe(false)
  })
})

describe('metre input parsing', () => {
  it('accepts whole and decimal values, including comma decimals', () => {
    expect(parseMetres('18')).toBe(18)
    expect(parseMetres(' 3.2 ')).toBe(3.2)
    expect(parseMetres('3,2')).toBe(3.2)
    expect(parseMetres('-4.5')).toBe(-4.5)
  })

  it('rejects empty, partial and non-numeric values', () => {
    expect(parseMetres('')).toBeNull()
    expect(parseMetres('  ')).toBeNull()
    expect(parseMetres('3.2m')).toBeNull()
    expect(parseMetres('1e')).toBeNull()
  })

  it('rejects the other number notations a metre field must not read as metres', () => {
    // `Number` reads these as numbers: 0x10 is 16 and 1e3 is 1000.
    expect(parseMetres('0x10')).toBeNull()
    expect(parseMetres('0b101')).toBeNull()
    expect(parseMetres('1e3')).toBeNull()
    expect(parseMetres('Infinity')).toBeNull()
    expect(parseMetres('.5')).toBe(0.5)
  })
})
