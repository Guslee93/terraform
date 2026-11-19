import { describe, expect, it } from 'vitest'
import { IDENTITY, NORDIC } from './style'

// Pins every value NORDIC moved out of the old inline constants/literals. If one of these changes,
// the refactor changed the picture; revert it (TF-VIS-013 acceptance is pixel identity).
describe('NORDIC scene style', () => {
  it('holds the old surface and material colours', () => {
    expect(NORDIC.background).toBe('#F1F1EF')
    expect(NORDIC.ground).toBe('#EBEBE8')
    expect(NORDIC.context).toEqual({ color: '#FAF9F6', roughness: 0.9 })
    expect(NORDIC.road).toBe('#C1BEB7')
    expect(NORDIC.water).toBe('#D3E0E8')
    expect(NORDIC.waterRoughness).toBe(0.55)
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

  it('keeps the new identity fields at today\'s behaviour', () => {
    expect(NORDIC.floorGrid).toBe(true)
    expect(NORDIC.groundTint).toBeNull()
    expect(NORDIC.id).toBe('nordic')
    expect(NORDIC.contourSource).toBe('grid16')
    expect(NORDIC.dissolve).toBeNull()
  })
})

describe('IDENTITY scene style (TF-VIS-020 stage A)', () => {
  it('is a complete style with the provisional first-look values', () => {
    expect(IDENTITY.id).toBe('identity')
    expect(IDENTITY.background).toBe('#171B19')
    expect(IDENTITY.context).toEqual({ color: '#EEEDE8', roughness: 0.92 })
    expect(IDENTITY.road).toBe('#2C312E')
    expect(IDENTITY.water).toBe('#26302F')
    expect(IDENTITY.waterRoughness).toBe(1)
    expect(IDENTITY.skirt).toBeNull()
    expect(IDENTITY.floorGrid).toBe(false)
    expect(IDENTITY.groundTint).toEqual({ saturation: 0.2, lightness: 0.5 })
    expect(IDENTITY.lines.contourMinor).toEqual({ color: '#F7F7F2', widthPx: 1, opacity: 0.16 })
    expect(IDENTITY.lines.contourMajor).toEqual({ color: '#F7F7F2', widthPx: 1, opacity: 0.38 })
    expect(IDENTITY.lines.crease).toEqual({ color: '#9DA49F', widthPx: 1, opacity: 0.6 })
    expect(IDENTITY.ao).toEqual({ intensity: 1.6, radiusM: 4, color: '#0E1110' })
    expect(IDENTITY.contourSource).toBe('tile1m')
    expect(IDENTITY.dissolve).toBeNull() // filled from dissolveRange at mount
  })

  it('keeps NORDIC parcel and section lines', () => {
    expect(IDENTITY.lines.parcel).toEqual(NORDIC.lines.parcel)
    expect(IDENTITY.lines.section).toEqual(NORDIC.lines.section)
  })
})
