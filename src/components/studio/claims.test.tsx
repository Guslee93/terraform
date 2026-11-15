import { render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { localDayMinuteToInstant } from '../../features/analysis/time'
import { sunState } from '../../features/analysis/sun'
import { SunDetails, useSunPlayback, type SunTime } from './SunPanel'
import { ACTIVITY_BANDS, ACTIVITY_NOTE, DELTA_BANDS, DIRECTION_BANDS } from '../../features/analysis/climateView'
import { SUN_HOURS_DISCLAIMER } from '../../features/analysis/sunHours'
import { ROOF_SOLAR_DISCLAIMER } from '../../features/analysis/roofSolar'
import { circleSunStat, windStat } from './analysisValues'
import { LayersCard } from './LayersCard'
import type { SiteManifest } from '../../features/sites/manifest'
import type { CircleSunHours } from '../../features/analysis/circleSunHours'
function SunPanelHarness({ latitude = 59.91, initial = { date: '2026-06-21', minuteOfDay: 900 } }: { latitude?: number; initial?: SunTime }) {
  const [time, setTime] = useState(initial)
  const location = { latitude, longitude: 10.75, timeZone: 'Europe/Oslo' }
  const resolved = localDayMinuteToInstant(time.date, time.minuteOfDay, location.timeZone)
  const playback = useSunPlayback(setTime)
  return <SunDetails time={time} onChange={setTime} location={location} resolved={resolved} playback={playback} state={sunState(resolved.instant, latitude, location.longitude, location.timeZone)} />
}

beforeEach(() => vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))))
afterEach(() => { vi.unstubAllGlobals() })

describe('D34 claim and disclaimer audit', () => {
  it('states in the Sun method note that it is not a daylight assessment', () => {
    render(<SunPanelHarness />)
    expect(screen.getByText('Geometric sun direction for this site (suncalc). Not a daylight assessment.')).toBeVisible()
  })

  // Feasibility 09 §5: the label corrections that had to land before any new layer.
  it('no wind legend carries a safety class', () => {
    for (const band of [...ACTIVITY_BANDS, ...DIRECTION_BANDS, ...DELTA_BANDS]) expect(band.label).not.toMatch(/unsafe/i)
    expect(ACTIVITY_NOTE).toContain('Indicative wind speed classes at the chosen wind')
  })

  it('the wind card names the chosen wind as the user\'s input, not a comfort result', () => {
    const view = { overlay: { cellM: 1, cells: [] }, legend: ACTIVITY_BANDS.map((b) => ({ label: b.label, colour: b.colour, count: 1, share: 1 / ACTIVITY_BANDS.length })), disclaimer: '', assessed: ACTIVITY_BANDS.length }
    const text = windStat(view, 270, 6, true).secondary.map(([value, unit]) => value + unit).join('')
    expect(text).toBe('of open ground ≥ 4 m/s, at W 6 m/s (your input)')
    expect(text).not.toMatch(/worst|comfort/i)
  })

  it('sun hours read in half-hour steps and say what does not shade', () => {
    const result = { median: { ground: 8.8, roofs: null, facades: null } } as unknown as CircleSunHours
    expect(circleSunStat(result, false, '2026-06-21').value).toBe('9.0')
    expect(circleSunStat({ median: { ground: 8.7, roofs: null, facades: null } } as unknown as CircleSunHours, false, '2026-06-21').value).toBe('8.5')
    expect(SUN_HOURS_DISCLAIMER).toContain('terrain and trees do not shade')
  })

  it('roof solar says how far above measured weather the clear-sky figure sits', () => {
    expect(ROOF_SOLAR_DISCLAIMER).toContain('about 30 % above typical measured weather (PVGIS 2014–2023)')
  })

  it('the trees layer says trees are not analysed', () => {
    const manifest = { assetPaths: { trees: 'trees.json' } } as unknown as SiteManifest
    render(<LayersCard manifest={manifest} layers={{ terrain: true, ground: true, context: true, streets: true, trees: true }} onToggleLayer={() => {}} />)
    expect(screen.getByText('Trees are shown, not analysed')).toBeVisible()
  })

})
