import { describe, expect, it } from 'vitest'
import { buildClimateView, DEFAULT_WIND } from '../../features/analysis/climateView'
import { bandShares } from '../../features/analysis/officialNoise'
import { DEMO_SUN_INSTANT, sunState } from '../../features/analysis/sun'
import type { FacadeSample } from '../../features/analysis/facadeSamples'
import type { Vec2 } from '../../lib/coordinates'
import { computeCircleSunHours } from '../../features/analysis/circleSunHours'
import { circleSunStat, noiseStat, roofSolarStat, sunStat, vscStat, windStat } from './analysisValues'

const parcel: Vec2[] = [[-50, -50], [50, -50], [50, 50], [-50, 50], [-50, -50]]
const text = (parts: readonly (readonly [string, string])[]) => parts.map(([value, unit]) => value + unit).join('')

describe('analysis card values come from the analysis, not constants', () => {
  it('Sun uses the geometric sun state and hides the figure below the horizon', () => {
    const day = sunState(DEMO_SUN_INSTANT, 59.91, 10.75)
    const stat = sunStat(day, '15:00')
    expect(stat.value).toBe(String(Math.round(day.elevationDeg)))
    expect(text(stat.secondary)).toContain(`${Math.round(day.azimuthDeg)}°`)
    const night = sunState(new Date(Date.UTC(2026, 11, 21, 22)), 59.91, 10.75)
    expect(sunStat(night, '23:00')).toMatchObject({ value: null, hint: 'Sun below horizon' })
  })

  it('Noise names the mapped band with the largest share of open ground, never a single level', () => {
    const band = (bandLow: number, x0: number, x1: number) => ({ metric: 'Lden' as const, bandLow, rings: [[[x0, -50], [x1, -50], [x1, 50], [x0, 50]] as Vec2[]] })
    const noise = { dataYear: 2021, polygons: [band(55, -50, 10), band(65, 10, 30)] }
    const stat = noiseStat(bandShares(noise, 'Lden', parcel, []), 'Lden', noise.dataYear)
    expect(stat).toMatchObject({ value: '55–60', unit: ' dB' })
    expect(text(stat.secondary)).toBe('band with the largest share of open ground · Lden 2021')
    // The top band is open-ended.
    expect(noiseStat(bandShares({ dataYear: 2021, polygons: [band(75, -50, 50)] }, 'Lden', parcel, []), 'Lden', 2021).value).toBe('≥ 75')
    // No map for this metric, or no package layer at all: the card says so; it never implies quiet.
    expect(noiseStat(bandShares(noise, 'Lnight', parcel, []), 'Lnight', noise.dataYear)).toMatchObject({ value: null, hint: 'No strategic noise map here' })
    expect(noiseStat(bandShares(null, 'Lden', parcel, []), 'Lden', null)).toMatchObject({ value: null, hint: 'No strategic noise map here' })
    // A map exists, but no band reaches the study area.
    expect(noiseStat(bandShares({ dataYear: 2021, polygons: [band(55, 500, 600)] }, 'Lden', parcel, []), 'Lden', 2021)).toMatchObject({ value: null, hint: 'No mapped band in the study area' })
  })

  it('Wind sums the Comfort legend at or above 4 m/s and names the chosen wind as the input of the user', () => {
    // A Comfort view with no flow yet has no assessed cells: the card says so instead of 0 %.
    const pending = buildClimateView('wind', parcel, [], [], null, { ...DEFAULT_WIND, display: 'activity' })
    expect(windStat(pending, 270, 6, true)).toMatchObject({ value: null, hint: 'Solving the flow…' })
    expect(windStat(null, 270, 6, false)).toMatchObject({ value: null, hint: 'Select to solve the flow' })
    const legend = [0.5, 0.2, 0.2, 0.1, 0, 0].map((share, index) => ({ label: `Band ${index} (x)`, colour: '#000', count: share * 10, share }))
    const stat = windStat({ ...pending, legend, assessed: 10 }, 270, 6, true)
    // Stroll (4–6), walk (6–8) and above are at or above the 4 m/s stand threshold: 0.2 + 0.1.
    expect(stat).toMatchObject({ value: '30', unit: '%' })
    expect(text(stat.secondary)).toBe('of open ground ≥ 4 m/s, at W 6 m/s (your input)')
    // The comfort figure is always at 2 m; while the map shows another height the card says so.
    expect(text(windStat({ ...pending, legend, assessed: 10 }, 270, 6, true, true).secondary)).toBe('of open ground ≥ 4 m/s at 2 m, at W 6 m/s (your input)')
  })

  it('Sun analysis cards use the medians of the same samples the layers draw', () => {
    // One hour of sun from the south: open ground gets all of it (ADR-0031).
    const enu: [number, number, number] = [0, -Math.cos(Math.PI / 6), Math.sin(Math.PI / 6)]
    const sun = computeCircleSunHours([], { centre: [0, 0], radius: 20 }, [720, 735, 750, 765].map((minute) => ({ minute, enu, elevationDeg: 30 })))
    expect(circleSunStat(sun, false, '2026-06-21')).toMatchObject({ value: '1.0', unit: ' h' })
    expect(text(circleSunStat(sun, false, '2026-06-21').secondary)).toBe('median ground · 21 Jun')
    // No result yet: no number, and the card says it is computing.
    expect(circleSunStat(null, true, '2026-06-21')).toMatchObject({ value: null, hint: 'Computing…' })
    // A circle covered by buildings has no open ground to summarise.
    const covered = computeCircleSunHours([{ height: 10, footprint: [[-50, -50], [50, -50], [50, 50], [-50, 50]] }], { centre: [0, 0], radius: 20 }, [])
    expect(circleSunStat(covered, false, '2026-06-21')).toMatchObject({ value: null, hint: 'No open ground in the circle' })

    expect(roofSolarStat([{ kwhPerM2: 800, sampleCount: 1, analysed: true }, { kwhPerM2: 1000, sampleCount: 1, analysed: true }]))
      .toMatchObject({ value: '900', unit: ' kWh' })
    expect(text(roofSolarStat([{ kwhPerM2: 800, sampleCount: 1, analysed: true }]).secondary)).toBe('/m²·yr · clear sky')

    const sample: FacadeSample = { p: [0, 0, 1], normal: [0, -1], massId: 'm', tierIndex: 0 }
    expect(vscStat([
      { sample, vsc: 10, band: 'under-15' },
      { sample, vsc: 30, band: '27-plus' },
    ])).toMatchObject({ value: '20.0', unit: ' %' })
    expect(vscStat([])).toMatchObject({ value: null, hint: 'Draw a block to see façades' })
  })
})
