import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { DATE_PRESETS, TIME_PRESETS, dayModel, describeSunState, sunDirection, type DayModel, type SunState } from '../../features/analysis/sun'
import { formatLocalLabel, localDayMinuteToInstant, minutesOfLocalDay, toLocalWallClock, type LocalDate, type ResolvedLocalTime } from '../../features/analysis/time'
import type { SiteManifest } from '../../features/sites/manifest'
import { cn } from '../../lib/cn'
import { inputClass } from '../ui/controls'

export type SunTime = { date: LocalDate; minuteOfDay: number }

export type SunPlayback = {
  playing: boolean
  setPlaying: Dispatch<SetStateAction<boolean>>
  speed: number
  setSpeed: (speed: number) => void
  reducedMotion: boolean
}

type SunProps = {
  time: SunTime
  onChange: Dispatch<SetStateAction<SunTime>>
  state: SunState
  location: SiteManifest['location']
  playback: SunPlayback
}

const SPEEDS = [30, 60, 120] as const
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const SLOT_MINUTES = 15
const SLOTS = 1440 / SLOT_MINUTES

export const clockLabel = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`
const isLocalDate = (value: string): value is LocalDate => /^\d{4}-\d{2}-\d{2}$/.test(value)
/** `21 Jun` from `2026-06-21`. */
export const shortDate = (date: string) => `${Number(date.slice(8, 10))} ${MONTHS[Number(date.slice(5, 7)) - 1] ?? ''}`
const segment = 'border-b border-transparent pb-0.5 text-caption text-ink-secondary transition-colors duration-200 hover:text-ink aria-pressed:border-ink aria-pressed:text-ink disabled:text-ink-disabled'

/** Playback state shared by the sun band and the sun details: one clock, advanced in whole local minutes. */
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

/** Solid round play/pause button with a 44 px hit area. */
export function PlayButton({ playback }: { playback: SunPlayback }) {
  return (
    <button
      type="button"
      aria-label={playback.playing ? 'Pause' : 'Play'}
      title={playback.playing ? 'Pause sun playback' : 'Play the day'}
      onClick={() => playback.setPlaying((current) => !current)}
      className="relative grid size-9 shrink-0 place-items-center rounded-pill bg-ink text-surface transition-opacity duration-200 before:absolute before:-inset-1 before:content-[''] hover:opacity-85"
    >
      {playback.playing ? (
        <svg aria-hidden="true" width="10" height="10" viewBox="0 0 16 16"><path d="M4 2h3v12H4zM9 2h3v12H9z" fill="currentColor" /></svg>
      ) : (
        <svg aria-hidden="true" width="10" height="10" viewBox="0 0 16 16"><path d="M5 3 13 8 5 13z" fill="currentColor" /></svg>
      )}
    </button>
  )
}

function dayMinutes(day: DayModel, timeZone: string) {
  return day.kind === 'normal'
    ? { sunrise: minutesOfLocalDay(day.sunrise, timeZone), sunset: minutesOfLocalDay(day.sunset, timeZone) }
    : null
}

/** Sun elevation for every 15-minute slot of a local date, from the existing sun module. */
export function daySlots(date: string, latitude: number, longitude: number, timeZone: string): number[] {
  return Array.from({ length: SLOTS }, (_, slot) => {
    const { instant } = localDayMinuteToInstant(date, slot * SLOT_MINUTES, timeZone)
    return sunDirection(instant, latitude, longitude).elevationDeg
  })
}

/**
 * The sun band under the scene (draft 4): clock, date presets, the day barcode (which is the
 * `Local time` slider: 15 min per arrow, 1 h with Shift, Home/End = sunrise/sunset) and Play.
 */
export function SunBand({ time, onChange, state, location, playback }: SunProps) {
  const { latitude, longitude, timeZone } = location
  const slots = useMemo(() => daySlots(time.date, latitude, longitude, timeZone), [time.date, latitude, longitude, timeZone])
  const day = useMemo(() => dayModel(time.date, latitude, longitude, timeZone), [time.date, latitude, longitude, timeZone])
  const times = dayMinutes(day, timeZone)
  const peak = Math.max(...slots, 0)
  const current = Math.min(Math.floor(time.minuteOfDay / SLOT_MINUTES), SLOTS - 1)
  const setMinute = (minute: number) => onChange((value) => ({ ...value, minuteOfDay: ((minute % 1440) + 1440) % 1440 }))

  return (
    <section aria-label="Sun and shadows" className="grid shrink-0 grid-cols-[auto_1fr_auto] items-end gap-x-6 gap-y-2 @max-xl:grid-cols-[1fr_auto]">
      <div>
        <p className="flex items-center gap-2 text-caption text-ink-secondary">
          <span aria-hidden="true" className="size-[7px] rounded-pill bg-sun-high" />
          Sun · {shortDate(time.date)}
        </p>
        <p aria-hidden="true" className="mt-1 text-stat-s text-ink">{clockLabel(time.minuteOfDay)}</p>
        <div role="group" aria-label="Date presets" className="mt-2 flex gap-3.5">
          {DATE_PRESETS.map((preset) => (
            <button key={preset.id} type="button" className={segment} aria-label={`${preset.label} · ${shortDate(preset.date)}`} title={preset.label} aria-pressed={time.date === preset.date} onClick={() => onChange((value) => ({ ...value, date: preset.date }))}>
              {shortDate(preset.date).split(' ')[1]}
            </button>
          ))}
        </div>
      </div>

      <div className="min-w-0 @max-xl:order-last @max-xl:col-span-2">
        <div className="relative h-11 rounded-chip has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-focus">
          <div aria-hidden="true" className="flex h-full items-end justify-between">
            {slots.map((elevation, slot) => {
              if (slot === current) return <span key={slot} className="h-11 w-[2px] bg-accent" />
              const share = peak > 0 && elevation > 0 ? elevation / peak : 0
              return share > 0 ? (
                <span key={slot} className="w-[1.2px]" style={{ height: 4 + 36 * share, background: `color-mix(in srgb, var(--sun-high) ${Math.round(40 + share * 60)}%, var(--sun-low))` }} />
              ) : (
                <span key={slot} className="h-0.5 w-px bg-ink-disabled" />
              )
            })}
          </div>
          <input
            type="range"
            aria-label="Local time"
            min={0}
            max={1439}
            step={1}
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
        {/* Labels sit at their own minute, matching the to-scale bar above (review). */}
        <div className="relative mt-1 h-5 border-t border-ink pt-1.5 font-mono text-caption text-ink-secondary">
          {[
            { at: 0, label: '00' },
            { at: 720, label: '12' },
            { at: 1440, label: '24' },
            ...(times ? [{ at: times.sunrise, label: clockLabel(times.sunrise) }, { at: times.sunset, label: clockLabel(times.sunset) }] : []),
          ].filter((tick, _, all) => (tick.label !== '00' && tick.label !== '24') || all.every((other) => other === tick || other.label === '12' || Math.abs(other.at - tick.at) > 90))
            .sort((a, b) => a.at - b.at).map((tick) => (
            <span
              key={tick.label}
              className="absolute top-1.5 -translate-x-1/2 first:translate-x-0 last:-translate-x-full"
              style={{ left: `${(tick.at / 1440) * 100}%` }}
            >
              {tick.label}
            </span>
          ))}
          {!times && <span className="absolute left-1/2 top-1.5 ml-8">{day.kind === 'polar-day' ? 'Polar day' : 'Polar night'}</span>}
        </div>
      </div>

      <div className="flex items-center gap-3 max-sm:justify-between">
        {/* The live region stays mounted so the night state is announced when it appears. */}
        <p className="text-right text-caption text-ink-secondary">
          <span role="status">{state.belowHorizon ? 'Sun below horizon' : ''}</span>
          {!state.belowHorizon && <>Azimuth {Math.round(state.azimuthDeg)}°<br />Altitude {Math.round(state.elevationDeg)}°</>}
        </p>
        <PlayButton playback={playback} />
      </div>
    </section>
  )
}

/** The panel's Sun group: readout, date and time controls, playback speed, notes and the sun path. */
export function SunDetails({ time, onChange, state, location, playback, resolved }: SunProps & { resolved: ResolvedLocalTime }) {
  const { latitude, longitude, timeZone } = location
  const day = useMemo(() => dayModel(time.date, latitude, longitude, timeZone), [time.date, latitude, longitude, timeZone])
  const dayLabel = day.kind === 'normal'
    ? `Geometric sunrise ${toLocalWallClock(day.sunrise, timeZone).time} · sunset ${toLocalWallClock(day.sunset, timeZone).time}`
    : day.kind === 'polar-day' ? 'Polar day' : 'Polar night'

  return (
    <section aria-label="Sun controls" className="space-y-4 text-body-sm">
      <div aria-live="polite" aria-atomic="true" className="space-y-0.5 font-mono tabular-nums">
        <p className="text-ink">{describeSunState(state)}</p>
        <p className="text-ink-secondary">{formatLocalLabel(resolved.instant, timeZone)}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-caption text-ink-secondary">Local date</span>
          <input type="date" className={cn(inputClass, 'mt-1')} value={time.date} onChange={(event) => {
            const value = event.currentTarget.value
            if (event.currentTarget.validity.valid && isLocalDate(value)) onChange((current) => ({ ...current, date: value }))
          }} />
        </label>
        <div>
          <p className="text-caption text-ink-secondary">Time</p>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
            {TIME_PRESETS.map((preset) => {
              const [hour = 0, minute = 0] = preset.time.split(':').map(Number)
              const value = hour * 60 + minute
              return <button key={preset.id} type="button" className={segment} aria-pressed={time.minuteOfDay === value} onClick={() => onChange((current) => ({ ...current, minuteOfDay: value }))}>{preset.label}</button>
            })}
          </div>
        </div>
      </div>
      <div role="group" aria-label="Playback speed" className="flex flex-wrap items-center gap-x-4">
        <span className="text-caption text-ink-secondary">Playback</span>
        {SPEEDS.map((value) => (
          <button key={value} type="button" className={segment} aria-pressed={playback.speed === value} disabled={playback.reducedMotion} onClick={() => playback.setSpeed(value)}>
            {value} min/s
          </button>
        ))}
      </div>
      <SunPathDiagram date={time.date} state={state} location={location} />
      <div className="space-y-1 text-ink-secondary">
        <p className="text-ink">{dayLabel}</p>
        {playback.reducedMotion && <p>Reduced motion: steps 15 minutes each second.</p>}
        {resolved.kind !== 'normal' && <p>{resolved.kind === 'gap-shifted'
          ? `This time doesn't exist on this date (clocks change); showing ${toLocalWallClock(resolved.instant, timeZone).time}.`
          : 'This time occurs twice; showing the earlier (summer time).'}</p>}
        <p>Geometric sun direction for this site (suncalc). Not a daylight or sun-hours assessment.</p>
      </div>
    </section>
  )
}

const PATH = { size: 260, c: 130, r: 88 }

function project(elevationDeg: number, azimuthDeg: number): [number, number] {
  const radius = PATH.r * (1 - elevationDeg / 90)
  const azimuth = (azimuthDeg * Math.PI) / 180
  return [PATH.c + radius * Math.sin(azimuth), PATH.c - radius * Math.cos(azimuth)]
}

/** Above-horizon sun positions every 6 minutes of a local date, as SVG path data. */
export function sunPathData(date: string, latitude: number, longitude: number, timeZone: string): { d: string; hours: Array<[number, number]> } {
  let d = ''
  let drawing = false
  const hours: Array<[number, number]> = []
  for (let minute = 0; minute <= 1440; minute += 6) {
    const { instant } = localDayMinuteToInstant(date, Math.min(minute, 1439), timeZone)
    const { azimuthDeg, elevationDeg } = sunDirection(instant, latitude, longitude)
    if (elevationDeg < 0) { drawing = false; continue }
    const [x, y] = project(elevationDeg, azimuthDeg)
    d += `${drawing ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`
    drawing = true
    if (minute % 60 === 0) hours.push([x, y])
  }
  return { d, hours }
}

const JUNE = DATE_PRESETS.find((preset) => preset.id === 'summer-solstice')?.date ?? '2026-06-21'
const EQUINOX = DATE_PRESETS.find((preset) => preset.id === 'spring-equinox')?.date ?? '2026-03-20'
const DECEMBER = DATE_PRESETS.find((preset) => preset.id === 'winter-solstice')?.date ?? '2026-12-21'

/** Sun-path diagram (spec §7.7.3): north up, azimuth clockwise, horizon at the rim. */
export function SunPathDiagram({ date, state, location }: { date: string; state: SunState; location: SiteManifest['location'] }) {
  const { latitude, longitude, timeZone } = location
  const paths = useMemo(() => ({
    june: sunPathData(JUNE, latitude, longitude, timeZone),
    equinox: sunPathData(EQUINOX, latitude, longitude, timeZone),
    december: sunPathData(DECEMBER, latitude, longitude, timeZone),
  }), [latitude, longitude, timeZone])
  const selected = useMemo(() => sunPathData(date, latitude, longitude, timeZone), [date, latitude, longitude, timeZone])
  const sun = state.belowHorizon ? null : project(state.elevationDeg, state.azimuthDeg)
  const { c, r } = PATH
  const label = `Sun path for ${shortDate(date)} at latitude ${Math.abs(latitude).toFixed(1)}° ${latitude >= 0 ? 'north' : 'south'}; ${
    state.belowHorizon ? 'sun below the horizon now' : `sun now at azimuth ${Math.round(state.azimuthDeg)}°, altitude ${Math.round(state.elevationDeg)}°`}`

  return (
    <div>
      <svg role="img" aria-label={label} viewBox={`0 0 ${PATH.size} ${PATH.size}`} className="mx-auto block w-full max-w-[220px]">
        {Array.from({ length: 72 }, (_, index) => (
          <line key={index} x1={c} y1={c - r - 8} x2={c} y2={c - r - 14} stroke="var(--ink-primary)" strokeOpacity={0.45} strokeWidth={0.6} transform={`rotate(${index * 5} ${c} ${c})`} />
        ))}
        {[30, 60].map((altitude) => (
          <g key={altitude}>
            <circle cx={c} cy={c} r={r * (1 - altitude / 90)} fill="none" stroke="var(--border)" strokeWidth={0.8} />
            <text x={c + 3} y={c - r * (1 - altitude / 90) - 2} fontFamily="var(--typeface-mono)" fontSize={8.5} fill="var(--ink-secondary)">{altitude}°</text>
          </g>
        ))}
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--ink-primary)" strokeWidth={0.8} />
        <path d={`M${c} ${c - r}V${c + r}M${c - r} ${c}H${c + r}`} stroke="var(--border)" strokeWidth={0.8} />
        {([['N', 0], ['E', 90], ['S', 180], ['W', 270]] as const).map(([letter, azimuth]) => {
          const angle = (azimuth * Math.PI) / 180
          return <text key={letter} x={c + (r + 27) * Math.sin(angle)} y={c - (r + 27) * Math.cos(angle) + 4} textAnchor="middle" fontFamily="var(--typeface-sans)" fontSize={11} fontWeight={500} fill="var(--ink-primary)">{letter}</text>
        })}
        <path d={`${paths.june.d}Z`} fill="var(--sun-glow)" fillOpacity={0.18} stroke="none" />
        <path d={paths.december.d} fill="none" stroke="var(--sun-winter)" strokeWidth={1.2} strokeDasharray="1 3" strokeLinecap="round" />
        <path d={paths.equinox.d} fill="none" stroke="var(--sun-mid)" strokeWidth={1} strokeDasharray="4 3" />
        <path d={selected.d} fill="none" stroke="var(--sun-high)" strokeWidth={1.8} strokeLinejoin="round" />
        {selected.hours.map(([x, y], index) => <circle key={index} cx={x} cy={y} r={1.8} fill="var(--sun-high)" />)}
        {sun && (
          <g>
            <line x1={c} y1={c} x2={sun[0]} y2={sun[1]} stroke="var(--sun-high)" strokeWidth={0.8} strokeDasharray="2 2" />
            <circle cx={sun[0]} cy={sun[1]} r={14} fill="var(--sun-glow)" fillOpacity={0.35} />
            <circle cx={sun[0]} cy={sun[1]} r={9} fill="none" stroke="var(--sun-mid)" strokeWidth={1.2} className="tf-ping [transform-box:fill-box] [transform-origin:center]" />
            <circle cx={sun[0]} cy={sun[1]} r={6} fill="var(--sun-dot)" stroke="var(--sun-high)" strokeWidth={1.2} />
          </g>
        )}
      </svg>
      <p aria-hidden="true" className="mt-1 flex flex-wrap justify-center gap-x-4 text-caption text-ink-secondary">
        <span className="inline-flex items-center gap-1.5"><span className="w-3.5 border-t-[1.5px] border-sun-high" />{shortDate(date)}</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3.5 border-t border-dashed border-sun-mid" />Mar / Sep</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3.5 border-t-[1.5px] border-dotted border-sun-winter" />Dec</span>
      </p>
    </div>
  )
}

