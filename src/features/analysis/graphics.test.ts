import { describe, expect, it } from 'vitest'
import { SUN_HOURS_RAMP } from './circleSunHours'
import { ACTIVITY_BANDS, DELTA_BANDS, WIND_RAMP } from './climateView'
import { NOISE_BAND_COLOUR } from './officialNoise'
import { ROOF_SOLAR_COLOUR } from './roofSolar'
import { RUNOFF_LEGEND } from './runoff'
import { SLOPE_BANDS } from './terrainTools'
import { VSC_COLOUR } from './vsc'
import { bandsOf, GRAPHICS, rampColours, sharedColours, type AnalysisGraphicId } from './graphics'

const ALL_IDS: readonly AnalysisGraphicId[] = [
  'sun-hours',
  'roof-solar',
  'vsc',
  'wind-speed',
  'wind-comfort',
  'wind-delta',
  'noise',
  'slope',
  'runoff',
]

describe('analysis graphics registry (TF-VIS-014)', () => {
  it('registers every analysis exactly once, each with an output class', () => {
    expect(Object.keys(GRAPHICS).sort()).toEqual([...ALL_IDS].sort())
    for (const id of ALL_IDS) {
      const graphic = GRAPHICS[id]!
      expect(graphic.id).toBe(id)
      expect(['mapped', 'calculated', 'screening', 'illustrative']).toContain(graphic.outputClass)
      expect(graphic.scale.kind === 'ramp' || graphic.scale.kind === 'bands').toBe(true)
    }
  })

  it('keeps banded scales at seven bands or fewer', () => {
    for (const id of ALL_IDS) {
      if (GRAPHICS[id]!.scale.kind === 'bands') expect(bandsOf(id).length).toBeLessThanOrEqual(7)
    }
  })

  it('sharedColours() snaps today\'s cross-analysis hex values', () => {
    expect(sharedColours()).toMatchInlineSnapshot(`
      [
        "#1E3A8A",
        "#3B6EA8",
        "#93C5FD",
        "#962838",
        "#9C2F2F",
        "#CC7340",
        "#E0B25C",
        "#E39A4C",
        "#E5E7EB",
        "#E6DC9C",
        "#E8D48A",
      ]
    `)
  })

  it('holds the original sun-hours ramp values', () => {
    expect(SUN_HOURS_RAMP).toEqual(['#662506', '#993404', '#CC4C02', '#EC7014', '#FE9929', '#FEC44F', '#FEE391'])
    expect(rampColours('sun-hours')).toEqual(SUN_HOURS_RAMP)
  })

  it('holds the original wind-speed ramp values', () => {
    expect(WIND_RAMP).toEqual([
      { speed: 0, colour: '#F5F7FB' },
      { speed: 2, colour: '#BFD3F2' },
      { speed: 4, colour: '#5B8DEF' },
      { speed: 6, colour: '#2F49D1' },
      { speed: 8, colour: '#7B2FD1' },
      { speed: 10, colour: '#C21FB3' },
    ])
  })

  it('holds the original wind-comfort and wind-delta colours and boundaries', () => {
    expect(ACTIVITY_BANDS.map((b) => b.colour)).toEqual(['#3B6EA8', '#4FA3A5', '#E6DC9C', '#E39A4C', '#C2452F', '#962838'])
    expect(ACTIVITY_BANDS.map((b) => b.below)).toEqual([2, 4, 6, 8, 10, Infinity])
    expect(bandsOf('wind-comfort').map((b) => b.colour)).toEqual(ACTIVITY_BANDS.map((b) => b.colour))
    expect(DELTA_BANDS.map((b) => b.colour)).toEqual(['#1E3A8A', '#93C5FD', '#E5E7EB', '#FCA5A5', '#B91C1C'])
    expect(bandsOf('wind-delta').map((b) => b.colour)).toEqual(DELTA_BANDS.map((b) => b.colour))
  })

  it('holds the original slope colours and labels', () => {
    expect(SLOPE_BANDS.map((b) => b.colour)).toEqual(['#E5E7EB', '#E6DC9C', '#E39A4C', '#962838'])
    expect(SLOPE_BANDS.map((b) => b.below)).toEqual([5, 15, 30, Infinity])
    expect(SLOPE_BANDS.map((b) => b.label)).toEqual(['Under 5°', '5–15°', '15–30°', 'Over 30°'])
    expect(bandsOf('slope').map((b) => b.colour)).toEqual(SLOPE_BANDS.map((b) => b.colour))
  })

  it('holds the original runoff legend colours', () => {
    expect(RUNOFF_LEGEND.map((b) => b.colour)).toEqual(['#93C5FD', '#3B6EA8', '#1E3A8A'])
    expect(bandsOf('runoff').map((b) => b.colour)).toEqual(RUNOFF_LEGEND.map((b) => b.colour))
  })

  it('holds the original noise, roof-solar and VSC colours', () => {
    expect(Object.values(NOISE_BAND_COLOUR)).toEqual(['#C4D3C6', '#9DB8A0', '#D4D08A', '#E0B25C', '#CC7340', '#9C2F2F', '#6E1A2A'])
    expect(bandsOf('noise').map((b) => b.colour)).toEqual(Object.values(NOISE_BAND_COLOUR))
    expect(Object.values(ROOF_SOLAR_COLOUR)).toEqual(['#E7E1D2', '#E8D48A', '#E0B25C', '#CC7340', '#9C2F2F'])
    expect(bandsOf('roof-solar').map((b) => b.colour)).toEqual(Object.values(ROOF_SOLAR_COLOUR))
    expect(Object.values(VSC_COLOUR)).toEqual(['#9C2F2F', '#E0B25C', '#E8D48A'])
    expect(bandsOf('vsc').map((b) => b.colour)).toEqual(Object.values(VSC_COLOUR))
  })
})
