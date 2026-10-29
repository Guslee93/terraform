import { act, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sunState } from '../../features/analysis/sun'
import { localDayMinuteToInstant } from '../../features/analysis/time'
import { SunPanel, type SunTime } from './SunPanel'

function Harness({ latitude = 59.91, initial = { date: '2026-06-21', minuteOfDay: 900 } }: { latitude?: number; initial?: SunTime }) {
  const [time, setTime] = useState(initial)
  const location = { latitude, longitude: 10.75, timeZone: 'Europe/Oslo' }
  const resolved = localDayMinuteToInstant(time.date, time.minuteOfDay, location.timeZone)
  return <SunPanel time={time} onChange={setTime} location={location} resolved={resolved} state={sunState(resolved.instant, latitude, location.longitude, location.timeZone)} />
}

beforeEach(() => vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))))
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

describe('Sun panel', () => {
  it('changes the readout with date and time presets', () => {
    render(<Harness />)
    const original = screen.getByText(/Elevation/).textContent
    fireEvent.click(screen.getByRole('button', { name: 'Winter solstice' }))
    expect(screen.getByText('2026-12-21 15:00 CET')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Winter solstice' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Noon' }))
    expect(screen.getByText('2026-12-21 12:00 CET')).toBeVisible()
    expect(screen.getByText(/Elevation/).textContent).not.toBe(original)
    expect(screen.getByRole('slider', { name: 'Local time' })).toHaveAttribute('aria-valuetext', '12:00')
  })

  it('discloses the DST gap for the requested 02:30 wall time', () => {
    render(<Harness />)
    fireEvent.change(screen.getByLabelText('Local date'), { target: { value: '2026-03-29' } })
    fireEvent.change(screen.getByRole('slider'), { target: { value: '150' } })
    expect(screen.getByText("This time doesn't exist on this date (clocks change); showing 03:30.")).toBeVisible()
    expect(screen.getByText('2026-03-29 03:30 CEST')).toBeVisible()
  })

  it('discloses the earlier autumn occurrence', () => {
    render(<Harness initial={{ date: '2026-10-25', minuteOfDay: 150 }} />)
    expect(screen.getByText('This time occurs twice; showing the earlier (summer time).')).toBeVisible()
  })

  it('shows polar day at a Tromsø-like latitude', () => {
    render(<Harness latitude={69.65} />)
    expect(screen.getByText('Polar day')).toBeVisible()
    expect(screen.queryByText(/Geometric sunrise/)).not.toBeInTheDocument()
  })

  it('plays at the selected speed, wraps midnight and pauses', () => {
    vi.useFakeTimers()
    render(<Harness initial={{ date: '2026-06-21', minuteOfDay: 1430 }} />)
    fireEvent.change(screen.getByLabelText('Playback speed'), { target: { value: '120' } })
    fireEvent.click(screen.getByRole('button', { name: 'Play' }))
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByRole('slider')).toHaveValue('110')
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.getByRole('slider')).toHaveValue('110')
  })

  it('steps 15 minutes per second for reduced motion', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
    vi.useFakeTimers()
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Play' }))
    act(() => vi.advanceTimersByTime(999))
    expect(screen.getByRole('slider')).toHaveValue('900')
    act(() => vi.advanceTimersByTime(1))
    expect(screen.getByRole('slider')).toHaveValue('915')
  })

  it('pauses when the browser tab is hidden', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Play' }))
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    fireEvent(document, new Event('visibilitychange'))
    expect(screen.getByRole('button', { name: 'Play' })).toBeVisible()
    hidden.mockRestore()
  })
})
