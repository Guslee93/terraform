import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { DATE_PRESETS, TIME_PRESETS, dayModel, describeSunState, sunDirection, type DayModel, type SunState } from '../../features/analysis/sun'
import { formatLocalLabel, localDayMinuteToInstant, minutesOfLocalDay, toLocalWallClock, type LocalDate, type ResolvedLocalTime } from '../../features/analysis/time'
import type { SiteManifest } from '../../features/sites/manifest'
import { cn } from '../../lib/cn'
import { Card, CardHeader } from '../ui/Card'
import { inputClass, labelClass, segmentClass } from '../ui/controls'
import { Icon } from '../ui/Icon'
import { Metric, MetricRow } from '../ui/Metric'

export type SunTime = { date: LocalDate; minuteOfDay: number }

export type SunPlayback = {
  playing: boolean
  setPlaying: Dispatch<SetStateAction<boolean>>
  speed: number
  setSpeed: (speed: number) => void
  reducedMotion: boolean
}

export type SunPanelProps = {
  time: SunTime
  onChange: Dispatch<SetStateAction<SunTime>>
  state: SunState
  resolved: ResolvedLocalTime
  location: SiteManifest['location']
  /** Shared with the Sun tile; the panel keeps its own when rendered alone. */
  playback?: SunPlayback
}

const SPEEDS = [30, 60, 120] as const
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const SLOT_MINUTES = 15
const SLOTS = 1440 / SLOT_MINUTES

export const clockLabel = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`
const isLocalDate = (value: string): value is LocalDate => /^\d{4}-\d{2}-\d{2}$/.test(value)
/** `21 Jun` from `2026-06-21`. */
export const shortDate = (date: string) => `${Number(date.slice(8, 10))} ${MONTHS[Number(date.slice(5, 7)) - 1] ?? ''}`
const durationLabel = (minutes: number) => `${Math.floor(minutes / 60)} h ${String(Math.round(minutes % 60)).padStart(2, '0')} m`

/** Playback state for the Sun panel and tile: one clock, advanced in whole local minutes. */
export function useSunPlayback(onChange: Dispatch<SetStateAction<SunTime>>): SunPlayback {
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(60)
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => setReducedMotion(query.matches)
    query.addEventListener('change', change)
    return () => query.removeEventListener('change', change)
  }, [])

  useEffect(() => {
    const pause = () => { if (document.hidden) setPlaying(false) }
    document.addEventListener('visibilitychange', pause)
    return () => document.removeEventListener('visibilitychange', pause)
  }, [])

  useEffect(() => {
    if (!playing) return
    // Keep fractional minutes outside React; the domain resolves whole local minutes.
    let previous = performance.now()
    let remainder = 0
    const timer = window.setInterval(() => {
      if (document.hidden) return
      const now = performance.now()
      remainder += reducedMotion ? 15 : (now - previous) * speed / 1000
      previous = now
      const minutes = Math.floor(remainder)
      remainder -= minutes
      if (minutes) onChange((current) => ({ ...current, minuteOfDay: (current.minuteOfDay + minutes) % 1440 }))
    }, reducedMotion ? 1000 : 50)
    return () => window.clearInterval(timer)
  }, [playing, speed, reducedMotion, onChange])

  return { playing, setPlaying, speed, setSpeed, reducedMotion }
}

/** §5.3 round icon button with a 44 px hit area. */
export function PlayButton({ playback }: { playback: SunPlayback }) {
  return (
    <button
      type="button"
      aria-label={playback.playing ? 'Pause' : 'Play'}
      title={playback.playing ? 'Pause sun playback' : 'Play sun playback'}
      onClick={() => playback.setPlaying((current) => !current)}
      className="relative grid size-7 shrink-0 place-items-center rounded-pill border border-ink text-ink transition-colors duration-200 before:absolute before:-inset-2 before:content-[''] hover:bg-surface-paper"
    >
      <Icon name={playback.playing ? 'pause' : 'play'} size={12} />
    </button>
  )
}

function dayMinutes(day: DayModel, timeZone: string) {
  return day.kind === 'normal'
    ? { sunrise: minutesOfLocalDay(day.sunrise, timeZone), sunset: minutesOfLocalDay(day.sunset, timeZone) }
    : null
}

/** Panel 02 on the Sun tab (spec §7.5). */
export function SunPanel({ time, onChange, state, resolved, location, playback: shared }: SunPanelProps) {
  const own = useSunPlayback(onChange)
  const playback = shared ?? own
  const { latitude, longitude, timeZone } = location
  const day = useMemo(() => dayModel(time.date, latitude, longitude, timeZone), [time.date, latitude, longitude, timeZone])
  const city = timeZone.split('/').at(-1)?.replace(/_/g, ' ') ?? timeZone
  const times = dayMinutes(day, timeZone)

  const dayLabel = day.kind === 'normal'
    ? `Geometric sunrise ${toLocalWallClock(day.sunrise, timeZone).time} · sunset ${toLocalWallClock(day.sunset, timeZone).time}`
    : day.kind === 'polar-day' ? 'Polar day' : 'Polar night'

  return (
    <Card aria-labelledby="sun-heading" className="flex h-full flex-col overflow-y-auto px-7 pb-6 pt-6">
      <CardHeader id="sun-heading" code="02" title="Sun position" icon="sun" iconClassName="text-sun-high" meta={`${shortDate(time.date)} ${time.date.slice(0, 4)} · ${city}`} />
      <section aria-label="Sun controls" className="mt-4 flex flex-1 flex-col gap-5">
        <div>
          <p aria-hidden="true" className="text-display text-ink">{clockLabel(time.minuteOfDay)}</p>
          <div aria-live="polite" aria-atomic="true" className="mt-3 space-y-0.5 font-mono text-body-sm tabular-nums">
            <p className="text-ink">{describeSunState(state)}</p>
            <p className="text-ink-secondary">{formatLocalLabel(resolved.instant, timeZone)}</p>
          </div>
        </div>

        <MetricRow>
          <Metric label="Azimuth" value={state.belowHorizon ? '—' : String(Math.round(state.azimuthDeg))} unit={state.belowHorizon ? undefined : '°'} />
          <Metric label="Altitude" value={state.belowHorizon ? '—' : state.elevationDeg.toFixed(1)} unit={state.belowHorizon ? undefined : '°'} />
          <Metric label="Rise / set" value={times ? `${clockLabel(times.sunrise)}–${clockLabel(times.sunset)}` : '—'} />
          <Metric label="Day length" value={day.kind === 'normal' ? durationLabel(day.daylightMinutes) : day.kind === 'polar-day' ? '24 h' : '0 h'} />
        </MetricRow>

        <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          <fieldset>
            <legend className={labelClass}>Date</legend>
            <div className="mt-1 flex flex-wrap gap-x-5">
              {DATE_PRESETS.map((preset) => (
                <button key={preset.id} type="button" className={segmentClass} aria-label={`${preset.label} · ${shortDate(preset.date)}`} title={preset.label} aria-pressed={time.date === preset.date} onClick={() => onChange((current) => ({ ...current, date: preset.date }))}>
                  {shortDate(preset.date)}
                </button>
              ))}
            </div>
            <label className="mt-2 block">
              <span className={labelClass}>Local date</span>
              <input type="date" className={cn(inputClass, 'mt-1')} value={time.date} onChange={(event) => {
                const value = event.currentTarget.value
                if (event.currentTarget.validity.valid && isLocalDate(value)) onChange((current) => ({ ...current, date: value }))
              }} />
            </label>
          </fieldset>
          <div>
            <p className={labelClass}>Time</p>
            <div className="mt-1 flex flex-wrap gap-x-5">
              {TIME_PRESETS.map((preset) => {
                const [hour = 0, minute = 0] = preset.time.split(':').map(Number)
                const value = hour * 60 + minute
                return <button key={preset.id} type="button" className={segmentClass} aria-pressed={time.minuteOfDay === value} onClick={() => onChange((current) => ({ ...current, minuteOfDay: value }))}>{preset.label}</button>
              })}
            </div>
            <div role="group" aria-label="Playback speed" className="mt-3 flex flex-wrap items-center gap-x-5">
              {SPEEDS.map((value) => (
                <button key={value} type="button" className={segmentClass} aria-pressed={playback.speed === value} disabled={playback.reducedMotion} onClick={() => playback.setSpeed(value)}>
                  {value} min/s
                </button>
              ))}
              <PlayButton playback={playback} />
            </div>
          </div>
        </div>

        <div className="mt-auto space-y-1 rounded-control bg-surface-paper px-3 py-2.5 text-body-sm leading-relaxed text-ink-secondary">
          <p className="text-ink">{dayLabel}</p>
          {playback.reducedMotion && <p>Reduced motion: steps 15 minutes each second.</p>}
          {resolved.kind !== 'normal' && <p>{resolved.kind === 'gap-shifted'
            ? `This time doesn't exist on this date (clocks change); showing ${toLocalWallClock(resolved.instant, timeZone).time}.`
            : 'This time occurs twice; showing the earlier (summer time).'}</p>}
          <p>Geometric sun direction for this site (suncalc). Not a daylight or sun-hours assessment.</p>
        </div>
      </section>
    </Card>
  )
}

/** Sun elevation for every 15-minute slot of a local date, from the existing sun module. */
export function daySlots(date: string, latitude: number, longitude: number, timeZone: string): number[] {
  return Array.from({ length: SLOTS }, (_, slot) => {
    const { instant } = localDayMinuteToInstant(date, slot * SLOT_MINUTES, timeZone)
    return sunDirection(instant, latitude, longitude).elevationDeg
  })
}

type SunTileProps = {
  time: SunTime
  onChange: Dispatch<SetStateAction<SunTime>>
  state: SunState
  location: SiteManifest['location']
  playback: SunPlayback
}

/** Tile 04 (spec §7.7.2): clock, AZ/ALT and the day barcode, which is the time slider. */
export function SunTile({ time, onChange, state, location, playback }: SunTileProps) {
  const { latitude, longitude, timeZone } = location
  const slots = useMemo(() => daySlots(time.date, latitude, longitude, timeZone), [time.date, latitude, longitude, timeZone])
  const day = useMemo(() => dayModel(time.date, latitude, longitude, timeZone), [time.date, latitude, longitude, timeZone])
  const times = dayMinutes(day, timeZone)
  const peak = Math.max(...slots, 0)
  const current = Math.min(Math.floor(time.minuteOfDay / SLOT_MINUTES), SLOTS - 1)
  const setMinute = (minute: number) => onChange((value) => ({ ...value, minuteOfDay: ((minute % 1440) + 1440) % 1440 }))

  return (
    <Card aria-labelledby="sun-tile-heading" className="flex h-full flex-col px-[22px] pb-5 pt-5">
      <CardHeader id="sun-tile-heading" code="04" title={`Sun · ${shortDate(time.date)}`} icon="sun" iconClassName="text-sun-high" meta={<PlayButton playback={playback} />} />
      <p aria-hidden="true" className="mt-4 text-display text-ink">{clockLabel(time.minuteOfDay)}</p>
      <p className="mt-2 flex gap-4 text-label text-ink-secondary">
        <span>Az <span className="font-mono text-ink">{state.belowHorizon ? '—' : `${Math.round(state.azimuthDeg)}°`}</span></span>
        <span>Alt <span className="font-mono text-ink">{state.belowHorizon ? '—' : `${Math.round(state.elevationDeg)}°`}</span></span>
      </p>

      <div className="relative mt-auto h-[84px] rounded-control has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-focus">
        <div aria-hidden="true" className="flex h-full items-end justify-between">
          {slots.map((elevation, slot) => {
            if (slot === current) {
              return (
                <span key={slot} className="relative h-[78px] w-[1.5px] bg-ink">
                  <span className="absolute -left-[3px] -top-[3px] size-[7px] rounded-pill bg-sun-high" />
                  <span className="tf-ping absolute -left-[3px] -top-[3px] size-[7px] rounded-pill border border-sun-high" />
                </span>
              )
            }
            const share = peak > 0 && elevation > 0 ? elevation / peak : 0
            return share > 0 ? (
              <span key={slot} className="w-[1.5px]" style={{ height: 8 + 56 * share, background: `color-mix(in srgb, var(--sun-high) ${Math.round(share * 100)}%, var(--sun-low))` }} />
            ) : (
              <span key={slot} className="h-1 w-px bg-ink-disabled" />
            )
          })}
        </div>
        <input
          type="range"
          aria-label="Local time"
          min={0}
          max={1439}
          step={5}
          value={time.minuteOfDay}
          aria-valuetext={clockLabel(time.minuteOfDay)}
          onChange={(event) => setMinute(Number(event.target.value))}
          onKeyDown={(event) => {
            const step = event.shiftKey ? 60 : SLOT_MINUTES
            const moves: Record<string, number | undefined> = {
              ArrowRight: time.minuteOfDay + step,
              ArrowUp: time.minuteOfDay + step,
              ArrowLeft: time.minuteOfDay - step,
              ArrowDown: time.minuteOfDay - step,
              Home: times?.sunrise ?? 0,
              End: times?.sunset ?? 1439,
            }
            const next = moves[event.key]
            if (next === undefined) return
            event.preventDefault()
            setMinute(event.key === 'Home' || event.key === 'End' ? next : Math.min(Math.max(next, 0), 1439))
          }}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
      <div className="mt-1.5 flex justify-between border-t border-line-strong pt-1.5 text-label text-ink-secondary">
        {['00', '06', '12', '18', '24'].map((hour) => <span key={hour}>{hour}</span>)}
      </div>
      <p className="mt-2 flex justify-between text-label text-ink-secondary">
        {times && day.kind === 'normal' ? (
          <>
            <span>↑ {clockLabel(times.sunrise)}</span>
            <span>{durationLabel(day.daylightMinutes)}</span>
            <span>{clockLabel(times.sunset)} ↓</span>
          </>
        ) : (
          <span>{day.kind === 'polar-day' ? 'Polar day' : 'Polar night'}</span>
        )}
      </p>
    </Card>
  )
}
