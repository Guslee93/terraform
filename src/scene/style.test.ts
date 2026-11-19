import { describe, expect, it } from 'vitest'
import { applyTuning, DEFAULT_TUNING, IDENTITY, identityStage, NORDIC } from './style'

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
    expect(NORDIC.vegetation).toBe('mesh')
  })
})

describe('IDENTITY scene style (TF-VIS-020 stage A)', () => {
  it('is a complete style with the provisional first-look values', () => {
    expect(IDENTITY.id).toBe('identity')
    expect(IDENTITY.background).toBe('#1C2320')
    expect(IDENTITY.hazeColour).toBe('#1C2320')
    expect(IDENTITY.context).toEqual({ color: '#E6E4DE', roughness: 0.9 })
    expect(IDENTITY.road).toBe('#5A5C57')
    expect(IDENTITY.water).toBe('#4A5455')
    expect(IDENTITY.waterRoughness).toBe(0.25)
    expect(IDENTITY.skirt).toBeNull()
    expect(IDENTITY.floorGrid).toBe(false)
    expect(IDENTITY.groundTint).toBeNull()
    expect(IDENTITY.lines.contourMinor).toEqual({ color: '#F7F7F2', widthPx: 1, opacity: 0.16 })
    expect(IDENTITY.lines.contourMajor).toEqual({ color: '#F7F7F2', widthPx: 1, opacity: 0.38 })
    expect(IDENTITY.lines.crease).toEqual({ color: '#9DA49F', widthPx: 1, opacity: 0.6 })
    expect(IDENTITY.ao).toEqual({ intensity: 1.6, radiusM: 4, color: '#0E1110' })
    expect(IDENTITY.contourSource).toBe('tile1m')
    expect(IDENTITY.dissolve).toBe('auto') // computed from dissolveRange at mount
    expect(IDENTITY.vegetation).toBe('speckled')
    expect(IDENTITY.vegetationColour).toBe('#D4DED4')
  })

  it('keeps NORDIC parcel and section lines', () => {
    expect(IDENTITY.lines.parcel).toEqual(NORDIC.lines.parcel)
    expect(IDENTITY.lines.section).toEqual(NORDIC.lines.section)
  })
})

describe('identityStage (TF-VIS-020 stages)', () => {
  it('A has no dissolve and mesh trees', () => {
    const a = identityStage('A')
    expect(a.dissolve).toBeNull()
    expect(a.vegetation).toBe('mesh')
    expect(a.contourSource).toBe('tile1m')
  })

  it('B adds the dissolve but keeps mesh trees', () => {
    const b = identityStage('B')
    expect(b.dissolve).toBe('auto')
    expect(b.vegetation).toBe('mesh')
    expect(b.contourSource).toBe('tile1m')
  })

  it('C is the full identity (dissolve + speckled vegetation)', () => {
    const c = identityStage('C')
    expect(c.dissolve).toBe('auto')
    expect(c.vegetation).toBe('speckled')
    expect(c.contourSource).toBe('tile1m')
  })

  it('keeps the identity charcoal palette in every stage', () => {
    for (const stage of ['A', 'B', 'C'] as const) {
      const style = identityStage(stage)
      expect(style.background).toBe('#1C2320')
      expect(style.context).toEqual({ color: '#E6E4DE', roughness: 0.9 })
      expect(style.floorGrid).toBe(false)
      expect(style.skirt).toBeNull()
    }
  })
})

describe('applyTuning (Run 8 T4)', () => {
  it('reproduces IDENTITY exactly with the default tuning', () => {
    const tuned = applyTuning(IDENTITY, DEFAULT_TUNING)
    expect(tuned.groundTint).toEqual(IDENTITY.groundTint)
    expect(tuned.road).toBe(IDENTITY.road)
    expect(tuned.water).toBe(IDENTITY.water)
    expect(tuned.vegetationColour).toBe(IDENTITY.vegetationColour)
    expect(tuned.lines.contourMinor.opacity).toBe(IDENTITY.lines.contourMinor.opacity)
  })

  it('overrides road, contours and vegetation from the tuning, keeping the palette ground', () => {
    const tuned = applyTuning(IDENTITY, { ...DEFAULT_TUNING, contourMinorOpacity: 0.3, treeDensity: 1.5 })
    expect(tuned.groundTint).toBeNull()
    expect(tuned.landCoverPalette).toEqual(IDENTITY.landCoverPalette)
    expect(tuned.lines.contourMinor.opacity).toBe(0.3)
    expect(tuned.tuning?.treeDensity).toBe(1.5)
    expect(tuned.road).not.toBe('#000000')
  })

  it('carries the tuning for the runtime parameters', () => {
    const tuning = { ...DEFAULT_TUNING, dissolveSiteMarginM: 60, minorFadeDistanceM: 2 }
    expect(applyTuning(IDENTITY, tuning).tuning).toEqual(tuning)
  })
})
