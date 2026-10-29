import { describe, expect, it } from 'vitest'
import { formatArea, formatMetres, formatPercent, formatRatio, formatVolume } from './format'

describe('analysis number formatting', () => {
  it('groups integer areas and volumes with thin spaces', () => {
    expect(formatArea(1080.2)).toBe('1\u2009080 m²')
    expect(formatVolume(1234567.8)).toBe('1\u2009234\u2009568 m³')
  })
  it('shows the specified precision and units', () => {
    expect(formatMetres(16)).toBe('16.0 m')
    expect(formatPercent(0.108)).toBe('10.8 %')
    expect(formatRatio(0.384)).toBe('0.38')
  })
  it('never shows negative zero after rounding', () => {
    expect(formatArea(-0.1)).toBe('0 m²')
    expect(formatVolume(-0)).toBe('0 m³')
    expect(formatMetres(-0.01)).toBe('0.0 m')
    expect(formatPercent(-0.0001)).toBe('0.0 %')
    expect(formatRatio(-0.001)).toBe('0.00')
  })
})
