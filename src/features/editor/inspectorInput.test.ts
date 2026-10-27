import { describe, expect, it } from 'vitest'
import { formatInputValue, parseStoreys } from './inspectorInput'

// Spec: status report §15.3b D8.
describe('parseStoreys', () => {
  it.each([
    ['3', 3],
    [' 12 ', 12],
    ['0', 0],
  ])('parses %j as %d', (text, expected) => {
    expect(parseStoreys(text)).toBe(expected)
  })

  it.each(['', '3.5', '-1', '3 storeys', '1e2', 'abc'])('rejects %j', (text) => {
    expect(parseStoreys(text)).toBeNull()
  })
})

describe('formatInputValue', () => {
  it('shows two decimals without a unit', () => {
    expect(formatInputValue(9.6)).toBe('9.60')
    expect(formatInputValue(3.2)).toBe('3.20')
    expect(formatInputValue(-12.345)).toBe('-12.35')
  })

  it('never shows negative zero', () => {
    expect(formatInputValue(-0.001)).toBe('0.00')
    expect(formatInputValue(-0)).toBe('0.00')
  })

  it('returns an empty string for non-finite values', () => {
    expect(formatInputValue(Number.NaN)).toBe('')
    expect(formatInputValue(Number.POSITIVE_INFINITY)).toBe('')
  })
})
