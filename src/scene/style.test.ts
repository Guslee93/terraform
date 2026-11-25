import { describe, expect, it } from 'vitest'
import { NORDIC } from './style'

// Pins every value NORDIC moved out of the old inline constants/literals. If one of these changes,
// the refactor changed the picture; revert it (TF-VIS-013 acceptance is pixel identity).
describe('NORDIC scene style', () => {
  it('holds the old surface and material colours', () => {
    expect(NORDIC.background).toBe('#F1F1EF')
    expect(NORDIC.ground).toBe('#EBEBE8')
    expect(NORDIC.context).toEqual({ color: '#FAF9F6', roughness: 0.9 })
    expect(NORDIC.road).toBe('#C1BEB7')
    expect(NORDIC.water).toBe('#D3E0E8')
    expect(NORDIC.skirt).toBe('#DCD8D1')
  })

  it('holds the old grid colours', () => {
    expect(NORDIC.grid.minor).toBe('#DDDDD9')
    expect(NORDIC.grid.major).toBe('#D8D8D3')
    expect(NORDIC.grid.terrain).toEqual({ color: '#7C8E7D', widthPx: 1, opacity: 0.22 })
  })

  it('holds the old line values', () => {
    expect(NORDIC.lines.crease).toEqual({ color: '#7E7D7A', widthPx: 1, opacity: 0.85 })
    expect(NORDIC.lines.silhouette).toBeNull()
    expect(NORDIC.lines.contourMinor).toEqual({ color: '#7E7D7A', widthPx: 1, opacity: 0.14 })
    expect(NORDIC.lines.contourMajor).toEqual({ color: '#7E7D7A', widthPx: 1, opacity: 0.32 })
    expect(NORDIC.lines.parcel).toEqual({ color: '#374151', widthPx: 1, opacity: 0.55 })
    expect(NORDIC.lines.section).toEqual({ color: '#1F3BD6', widthPx: 1, opacity: 1 })
  })

  it('holds the old ambient occlusion values', () => {
    expect(NORDIC.ao).toEqual({ intensity: 1.6, radiusM: 4, color: '#2B3138' })
  })
})
