import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { DATE_PRESETS, TIME_PRESETS, dayModel, describeSunState, type SunState } from '../../features/analysis/sun'
import { formatLocalLabel, minutesOfLocalDay, toLocalWallClock, type LocalDate, type ResolvedLocalTime } from '../../features/analysis/time'
import type { SiteManifest } from '../../features/sites/manifest'

export type SunTime = { date: LocalDate; minuteOfDay: number }
export type SunPanelProps = {
  time: SunTime
  onChange: Dispatch<SetStateAction<SunTime>>
  state: SunState
  resolved: ResolvedLocalTime
  location: SiteManifest['location']
}

const buttonClass = 'min-h-10 rounded-[var(--radius-control)] border border-line px-2 text-[11.5px] hover:bg-surface-muted aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:text-accent'
const labelClass = 'text-[10px] uppercase tracking-[0.12em] text-ink-secondary'
const controlClass = 'mt-1 min-h-10 w-full rounded-[var(--radius-control)] border border-line bg-surface px-2 text-[12px] tabular-nums'
const clockLabel = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`
const isLocalDate = (value: string): value is LocalDate => /^\d{4}-\d{2}-\d{2}$/.test(value)

export function SunPanel({ time, onChange, state, resolved, location }: SunPanelProps) {
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(60)
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const { latitude, longitude, timeZone } = location
  const day = useMemo(() => dayModel(time.date, latitude, longitude, timeZone), [time.date, latitude, longitude, timeZone])

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

  const dayLabel = day.kind === 'normal'
    ? `Geometric sunrise ${toLocalWallClock(day.sunrise, timeZone).time} · sunset ${toLocalWallClock(day.sunset, timeZone).time}`
    : day.kind === 'polar-day' ? 'Polar day' : 'Polar night'
  const night = 'var(--ink-secondary)'
  const daylight = 'var(--accent-soft)'
  const rise = day.kind === 'normal' ? minutesOfLocalDay(day.sunrise, timeZone) / 1440 * 100 : 0
  const set = day.kind === 'normal' ? minutesOfLocalDay(day.sunset, timeZone) / 1440 * 100 : 0
  const track = day.kind === 'polar-day' ? daylight : day.kind === 'polar-night' ? night
    : rise < set
      ? `linear-gradient(to right, ${night} ${rise}%, ${daylight} ${rise}%, ${daylight} ${set}%, ${night} ${set}%)`
      : `linear-gradient(to right, ${daylight} ${set}%, ${night} ${set}%, ${night} ${rise}%, ${daylight} ${rise}%)`

  return (
    <section aria-label="Sun controls" className="space-y-4 text-[11.5px]">
      <div aria-live="polite" aria-atomic="true" className="space-y-1 tabular-nums">
        <p className="font-medium">{describeSunState(state)}</p>
        <p className="text-ink-secondary">{formatLocalLabel(resolved.instant, timeZone)}</p>
      </div>
      <fieldset>
        <legend className={labelClass}>Date</legend>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {DATE_PRESETS.map((preset) => <button key={preset.id} type="button" className={buttonClass} aria-pressed={time.date === preset.date} onClick={() => onChange((current) => ({ ...current, date: preset.date }))}>{preset.label}</button>)}
        </div>
        <label className="mt-2 block">
          <span className={labelClass}>Local date</span>
          <input type="date" className={controlClass} value={time.date} onChange={(event) => {
            const value = event.currentTarget.value
            if (event.currentTarget.validity.valid && isLocalDate(value)) onChange((current) => ({ ...current, date: value }))
          }} />
        </label>
      </fieldset>
      <div>
        <label htmlFor="sun-time" className="flex justify-between"><span className={labelClass}>Local time</span><span aria-hidden="true" className="tabular-nums">{clockLabel(time.minuteOfDay)}</span></label>
        <div className="relative mt-2 flex h-10 items-center">
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 h-2 rounded-full" style={{ background: track }} />
          <input id="sun-time" type="range" min={0} max={1439} step={5} value={time.minuteOfDay} aria-valuetext={clockLabel(time.minuteOfDay)} className="relative h-10 w-full appearance-none bg-transparent accent-[var(--accent)] [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-moz-range-track]:bg-transparent [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-accent" onChange={(event) => onChange((current) => ({ ...current, minuteOfDay: Number(event.target.value) }))} />
        </div>
        <div className="mt-1 grid grid-cols-3 gap-1.5">
          {TIME_PRESETS.map((preset) => {
            const [hour = 0, minute = 0] = preset.time.split(':').map(Number)
            const value = hour * 60 + minute
            return <button key={preset.id} type="button" className={buttonClass} aria-pressed={time.minuteOfDay === value} onClick={() => onChange((current) => ({ ...current, minuteOfDay: value }))}>{preset.label}</button>
          })}
        </div>
      </div>
      <div className="flex items-end gap-2">
        <button type="button" className={buttonClass} aria-pressed={playing} onClick={() => setPlaying((current) => !current)}>{playing ? 'Pause' : 'Play'}</button>
        <label className="flex-1"><span className={labelClass}>Playback speed</span><select className={controlClass} value={speed} disabled={reducedMotion} onChange={(event) => setSpeed(Number(event.target.value))}>{[30, 60, 120].map((value) => <option key={value} value={value}>{value} min / second</option>)}</select></label>
      </div>
      {reducedMotion && <p className="text-ink-secondary">Reduced motion: steps 15 minutes each second.</p>}
      <p>{dayLabel}</p>
      {resolved.kind !== 'normal' && <p className="text-ink-secondary">{resolved.kind === 'gap-shifted'
        ? `This time doesn't exist on this date (clocks change); showing ${toLocalWallClock(resolved.instant, timeZone).time}.`
        : 'This time occurs twice; showing the earlier (summer time).'}</p>}
      <p className="text-[10px] leading-relaxed text-ink-secondary">Geometric sun direction for this site (suncalc). Not a daylight or sun-hours assessment.</p>
    </section>
  )
}
