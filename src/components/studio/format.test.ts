import { describe, expect, it } from 'vitest'
import { formatArea, formatMetres, formatNumber } from './format'

describe('analysis number formatting', () => {
  it('groups integer areas with thin spaces', () => {
    expect(formatArea(1080.2)).toBe('1\u2009080 m²')
    expect(formatNumber(1234567.8)).toBe('1\u2009234\u2009568')
  })
  it('shows the specified precision and units', () => {
    expect(formatMetres(16)).toBe('16.0 m')
    expect(formatNumber(10.84, 1)).toBe('10.8')
  })
  it('never shows negative zero after rounding', () => {
    expect(formatArea(-0.1)).toBe('0 m²')
    expect(formatMetres(-0.01)).toBe('0.0 m')
    expect(formatNumber(-0.0001, 1)).toBe('0.0')
  })
})
