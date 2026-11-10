import { render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { localDayMinuteToInstant } from '../../features/analysis/time'
import { sunState } from '../../features/analysis/sun'
import { SunDetails, useSunPlayback, type SunTime } from './SunPanel'
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
  it('states in the Sun method note that it is not a daylight or sun-hours assessment', () => {
    render(<SunPanelHarness />)
    expect(screen.getByText('Geometric sun direction for this site (suncalc). Not a daylight or sun-hours assessment.')).toBeVisible()
  })

})
