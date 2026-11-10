import { describe, expect, it } from 'vitest'
import { buildClimateView, DEFAULT_WIND } from '../../features/analysis/climateView'
import { computeNoise } from '../../features/analysis/noise'
import { DEMO_SUN_INSTANT, sunState } from '../../features/analysis/sun'
import type { Vec2 } from '../../lib/coordinates'
import { noiseStat, sunStat, windStat } from './dockValues'

const parcel: Vec2[] = [[-50, -50], [50, -50], [50, 50], [-50, 50], [-50, -50]]
const text = (parts: readonly (readonly [string, string])[]) => parts.map(([value, unit]) => value + unit).join('')

describe('dock card values come from the analysis, not constants', () => {
  it('Sun uses the geometric sun state and hides the figure below the horizon', () => {
    const day = sunState(DEMO_SUN_INSTANT, 59.91, 10.75)
    const stat = sunStat(day, '15:00')
    expect(stat.value).toBe(String(Math.round(day.elevationDeg)))
    expect(text(stat.secondary)).toContain(`${Math.round(day.azimuthDeg)}°`)
    const night = sunState(new Date(Date.UTC(2026, 11, 21, 22)), 59.91, 10.75)
    expect(sunStat(night, '23:00')).toMatchObject({ value: null, hint: 'Sun below horizon' })
  })

  it('Noise is the peak of computeNoise and names the loudest mapped road class', () => {
    const roads = [
      { highway: 'residential', centreline: [[-50, 0], [50, 0]] as Vec2[] },
      { highway: 'primary', centreline: [[-50, 40], [50, 40]] as Vec2[] },
      { highway: 'footway', centreline: [[-50, -40], [50, -40]] as Vec2[] },
    ]
    const cells = computeNoise(parcel, roads, [], 10)
    const peak = Math.max(...cells.flatMap((cell) => (cell.db === null ? [] : [cell.db])))
    const stat = noiseStat(cells, roads)
    expect(stat).toMatchObject({ value: String(Math.round(peak)), unit: ' dB' })
    expect(text(stat.secondary)).toBe('peak · primary road')
    expect(noiseStat(computeNoise(parcel, [], [], 10), [])).toMatchObject({ value: null, hint: 'No mapped roads in the study area' })
  })

  it('Wind sums the Comfort legend at or above 4 m/s and reports the windiest class present', () => {
    // A Comfort view with no flow yet has no assessed cells: the card says so instead of 0 %.
    const pending = buildClimateView('wind', parcel, [], [], null, { ...DEFAULT_WIND, display: 'activity' })
    expect(windStat(pending, 270, 6, true)).toMatchObject({ value: null, hint: 'Solving the flow…' })
    expect(windStat(null, 270, 6, false)).toMatchObject({ value: null, hint: 'Select to solve the flow' })
    const legend = [0.5, 0.2, 0.2, 0.1, 0, 0, 0].map((share, index) => ({ label: `Band ${index} (x)`, colour: '#000', count: share * 10, share }))
    const stat = windStat({ ...pending, legend, assessed: 10 }, 270, 6, true)
    // Stroll (4–6), walk (6–8) and above are at or above the 4 m/s stand threshold: 0.2 + 0.1.
    expect(stat).toMatchObject({ value: '30', unit: '%' })
    expect(text(stat.secondary)).toBe('worst Band 3')
  })
})
