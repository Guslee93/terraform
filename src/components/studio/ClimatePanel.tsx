import { STREAMLINE_3D_NOTE } from '../../features/analysis/streamlines3d'
import { useCallback, useEffect, useRef, useState } from 'react'
import { demoFrame } from '../../features/analysis/windDemo'
import { CIRCLE_RADIUS, DELTA_NOTE, type WindBaseline, type ClimateMode, type ClimateView, type WindDisplay, type WindSettings } from '../../features/analysis/climateView'
import { cn } from '../../lib/cn'
import { labelClass } from '../ui/controls'

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const
export const compassName = (bearing: number) => COMPASS[Math.round((((bearing % 360) + 360) % 360) / 45) % 8]!

const MODES: ReadonlyArray<{ id: ClimateMode; label: string }> = [
  { id: 'off', label: 'Off' },
  { id: 'wind', label: 'Wind' },
  { id: 'noise', label: 'Noise' },
]

/** Own the temporary settings so every exit follows the same restore path. */
export function useWindDemo(wind: WindSettings, streamlines: boolean, onWindChange: (next: WindSettings) => void, onStreamlinesChange: (next: boolean) => void) {
  const [orbitDeg, setOrbitDeg] = useState<number | null>(null)
  const saved = useRef<{ wind: WindSettings; streamlines: boolean } | null>(null)
  const request = useRef(0)
  const stop = useCallback(() => {
    cancelAnimationFrame(request.current)
    const previous = saved.current
    saved.current = null
    if (previous) {
      onWindChange(previous.wind)
      onStreamlinesChange(previous.streamlines)
      setOrbitDeg(null)
    }
  }, [onWindChange, onStreamlinesChange])
  /** A panel edit during the demo stops it, restores the saved settings and keeps that edit. */
  const stopWith = useCallback((patch: Partial<WindSettings>) => {
    const previous = saved.current
    stop()
    if (previous) onWindChange({ ...previous.wind, ...patch })
  }, [stop, onWindChange])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!saved.current) return
      // Prevent Enter/Space on the focused demo button from starting it again.
      event.preventDefault()
      stop()
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      stop()
    }
  }, [stop])
  const toggle = () => {
    if (saved.current) return stop()
    saved.current = { wind, streamlines }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const started = performance.now()
    let lastFrom = -1
    let lastStreamlines: boolean | undefined
    const tick = (now: number) => {
      const frame = demoFrame((now - started) / 1000, reduced)
      if (frame.done) return stop()
      const from = frame.from % 360
      if (from !== lastFrom) onWindChange({ ...wind, from })
      if (frame.streamlines !== lastStreamlines) onStreamlinesChange(frame.streamlines)
      lastFrom = from
      lastStreamlines = frame.streamlines
      setOrbitDeg(frame.orbitDeg)
      request.current = requestAnimationFrame(tick)
    }
    tick(started)
  }
  return { playing: orbitDeg !== null, orbitDeg, toggle, stop, stopWith }
}

type ClimatePanelProps = {
  /** Heights (m) of the slices solved so far, ground first; the stack arrives progressively. */
  availableHeights?: readonly number[]
  slicesComplete?: boolean
  /** All heights the stack will have; defaults to the standard four. */
  sliceHeights?: readonly number[]
  demoPlaying?: boolean
  onToggleDemo?: () => void
  /** Edit made while the demo plays: stop it, restore, then apply this change. */
  onDemoEdit?: (patch: Partial<WindSettings>) => void
  mode: ClimateMode
  onModeChange: (mode: ClimateMode) => void
  wind: WindSettings
  onWindChange: (next: WindSettings) => void
  view: ClimateView | null
  streamlines?: boolean
  onStreamlinesChange?: (enabled: boolean) => void
  baseline?: WindBaseline | null
  baselineMismatch?: boolean
  canSetBaseline?: boolean
  onSetBaseline?: () => void
  onClearBaseline?: () => void
  placingCircle?: boolean
  onPlaceCircle?: (placing: boolean) => void
}

const DISPLAYS: ReadonlyArray<{ id: WindDisplay; label: string }> = [
  { id: 'activity', label: 'Comfort' },
  { id: 'ratio', label: 'Direction' },
]

export function ClimatePanel({ availableHeights = [], slicesComplete = false, sliceHeights = [2, 10, 20, 35], demoPlaying = false, onToggleDemo, onDemoEdit, mode, onModeChange, wind, onWindChange, view, placingCircle = false, onPlaceCircle, streamlines = false, onStreamlinesChange, baseline = null, baselineMismatch = false, canSetBaseline = false, onSetBaseline, onClearBaseline }: ClimatePanelProps) {
  const windFrom = wind.from
  const slicesReady = availableHeights.length >= 2
  // While the demo plays, an edit stops it (restoring the user's settings) and keeps the edit.
  const set = (patch: Partial<WindSettings>) => (demoPlaying && onDemoEdit ? onDemoEdit(patch) : onWindChange({ ...wind, ...patch }))
  return (
    <div>
      <div role="group" aria-label="Climate layer" className="flex gap-1">
        {MODES.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={mode === option.id}
            onClick={() => onModeChange(option.id)}
            className={cn(
              'min-h-9 flex-1 rounded-chip border border-line text-body-sm',
              mode === option.id ? 'bg-ink text-ink-on-inverse' : 'bg-surface text-ink',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {mode === 'wind' && (
        <div className="mt-3">
          {onToggleDemo && <button type="button" aria-pressed={demoPlaying} onClick={onToggleDemo} className={cn('mb-3 min-h-8 rounded-chip border border-line px-2 text-body-sm', demoPlaying ? 'bg-ink text-ink-on-inverse' : 'bg-surface text-ink')}>{demoPlaying ? 'Stop demo' : 'Play demo'}</button>}
          <div className="flex items-center justify-between">
            <label htmlFor="wind-from" className={labelClass}>Wind blows from</label>
            <span className="flex items-center gap-2 text-body-sm tabular-nums text-ink">
              {/* Arrow points where the wind goes (downwind). */}
              <svg aria-hidden="true" viewBox="-10 -10 20 20" className="size-5" style={{ transform: `rotate(${windFrom + 180}deg)` }}>
                <circle r="9" fill="none" stroke="currentColor" strokeOpacity="0.3" />
                <path d="M0 6 V-6 M-3.5 -2.5 L0 -6 L3.5 -2.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {compassName(windFrom)} · {windFrom}°
            </span>
          </div>
          <input
            id="wind-from"
            type="range"
            min={0}
            max={345}
            step={15}
            value={windFrom}
            aria-valuetext={`${compassName(windFrom)}, ${windFrom} degrees`}
            onChange={(event) => set({ from: Number(event.currentTarget.value) })}
            className="mt-2 w-full accent-ink"
          />
          <p className="mt-1 text-caption text-ink-secondary">Your choice, not a measured climate value. The flow updates as you drag.</p>

          <div className="mt-3">
            <div className="flex items-center justify-between">
              <label htmlFor="wind-radius" className={labelClass}>Analysis circle</label>
              <span className="text-body-sm tabular-nums text-ink">r = {wind.radius} m</span>
            </div>
            <input
              id="wind-radius"
              type="range"
              min={CIRCLE_RADIUS.min}
              max={CIRCLE_RADIUS.max}
              step={CIRCLE_RADIUS.step}
              value={wind.radius}
              aria-valuetext={`radius ${wind.radius} metres`}
              onChange={(event) => set({ radius: Number(event.currentTarget.value) })}
              className="mt-2 w-full accent-ink"
            />
            {onPlaceCircle && (
              <button
                type="button"
                aria-pressed={placingCircle}
                onClick={() => onPlaceCircle(!placingCircle)}
                className={cn(
                  'mt-2 min-h-8 w-full rounded-chip border border-line text-body-sm',
                  placingCircle ? 'bg-ink text-ink-on-inverse' : 'bg-surface text-ink',
                )}
              >
                {placingCircle ? 'Click the ground or use arrow keys · Enter to place · Esc to cancel' : 'Move circle'}
              </button>
            )}
            <p className="mt-1 text-caption text-ink-secondary">The flow is solved only around this circle, at about {Math.round((wind.radius * 2 * 1.4) / 160 * 10) / 10} m resolution.</p>
          </div>

          <div role="group" aria-label="Wind map shows" className="mt-3 flex gap-1">
            {[...DISPLAYS, ...(baseline ? [{ id: 'delta' as const, label: 'Delta' }] : [])].map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={wind.display === option.id}
                onClick={() => set({ display: option.id })}
                className={cn(
                  'min-h-8 flex-1 rounded-chip border border-line text-body-sm',
                  wind.display === option.id ? 'bg-ink text-ink-on-inverse' : 'bg-surface text-ink',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          <label className="mt-3 flex items-center gap-2 text-body-sm">
            <input type="checkbox" checked={streamlines} onChange={(event) => { const on = event.currentTarget.checked; if (demoPlaying) onDemoEdit?.({}); onStreamlinesChange?.(on) }} />
            Streamlines
          </label>
          <div className="mt-3 space-y-2">
            <label htmlFor="streamline-height" className={labelClass}>Streamline height</label>
            <select id="streamline-height" value={wind.streamlineHeight ?? '3d'} disabled={!slicesReady}
              aria-describedby={!slicesReady ? 'upper-heights-status' : undefined}
              onChange={(event) => set({ streamlineHeight: event.currentTarget.value === '3d' ? null : Number(event.currentTarget.value) })}
              className="min-h-9 w-full rounded-chip border border-line bg-surface text-body-sm disabled:opacity-50">
              <option value="3d">3D (follows buildings)</option>
              {sliceHeights.map((z) => <option key={z} value={z} disabled={!availableHeights.includes(z)}>{z} m{availableHeights.includes(z) ? '' : ' (computing)'}</option>)}
            </select>
            <label htmlFor="streamline-opacity" className={labelClass}>Streamline opacity</label>
            <input id="streamline-opacity" type="range" min={0.2} max={1} step={0.05}
              value={wind.streamlineOpacity} disabled={!slicesReady}
              aria-valuetext={`${Math.round(wind.streamlineOpacity * 100)} percent`}
              aria-describedby={!slicesReady ? 'upper-heights-status' : undefined}
              onChange={(event) => set({ streamlineOpacity: Number(event.currentTarget.value) })}
              className="w-full accent-ink disabled:opacity-50" />
            {!slicesComplete && (
              <p id="upper-heights-status" className="text-caption text-ink-secondary">
                Upper heights computing… {availableHeights.length}/{sliceHeights.length} ready
              </p>
            )}
            {slicesReady && wind.streamlineHeight === null && <p className="text-caption text-ink-secondary">{STREAMLINE_3D_NOTE}</p>}
          </div>
          <div className="mt-3 flex gap-2">
            <button type="button" className="min-h-8 rounded-chip border border-line px-2 text-body-sm disabled:opacity-50" disabled={!canSetBaseline} onClick={onSetBaseline}>Set baseline</button>
            {baseline && <button type="button" className="min-h-8 rounded-chip border border-line px-2 text-body-sm" onClick={onClearBaseline}>Clear baseline</button>}
          </div>
          {baseline && baselineMismatch && <p role="status" className="mt-2 text-caption text-ink-secondary">Baseline was taken for {compassName(baseline.from)} {baseline.from}°, r = {baseline.circle.radius} m, downwash rule {baseline.downwash ? 'on' : 'off'}. Reset it to compare.</p>}
          {wind.display === 'delta' && !baselineMismatch && <p className="mt-2 text-caption">{DELTA_NOTE}</p>}
          {wind.display !== 'delta' && (
            <div className="mt-3">
              <div className="flex items-center justify-between">
                <label htmlFor="wind-speed" className={labelClass}>Wind at 10 m height</label>
                <span className="text-body-sm tabular-nums text-ink">{wind.refSpeed} m/s</span>
              </div>
              <input
                id="wind-speed"
                type="range"
                min={2}
                max={15}
                step={1}
                value={wind.refSpeed}
                aria-valuetext={`${wind.refSpeed} metres per second`}
                onChange={(event) => set({ refSpeed: Number(event.currentTarget.value) })}
                className="mt-2 w-full accent-ink"
              />
            </div>
          )}

          <label className="mt-3 flex items-start gap-2 text-body-sm text-ink">
            <input type="checkbox" checked={wind.downwash} onChange={(event) => set({ downwash: event.currentTarget.checked })} className="mt-1 accent-ink" />
            <span>
              Downwash rule for tall buildings
              <span className="block text-caption text-ink-secondary">A rule, not simulated: faster wind at the base of buildings 30 m or taller, or twice the height of their neighbours. Applies at ground level only.</span>
            </span>
          </label>
        </div>
      )}

      {mode === 'off' && (
        <p className="mt-3 text-body-sm text-ink-secondary">Choose Wind or Noise to colour the ground.</p>
      )}

      {view && mode !== 'off' && (
        <div className="mt-3">
          {view.assessed === 0 ? (
            <p className="text-body-sm text-ink-secondary">
              {mode === 'wind' && baselineMismatch && wind.display === 'delta' ? 'Delta unavailable for this circle or direction.' : mode === 'noise' ? 'No mapped roads in this study area, so there is nothing to estimate.' : 'Computing the wind flow…'}
            </p>
          ) : (
            <ul aria-label={mode === 'wind' ? (wind.display === 'delta' ? DELTA_NOTE : wind.display === 'activity' ? 'Wind comfort legend' : 'Wind direction legend') : 'Noise legend'}>
              {view.legend.map((entry) => (
                <li key={entry.label} className="flex min-h-8 items-center justify-between gap-3 text-body-sm text-ink">
                  <span className="flex items-center gap-2">
                    <span aria-hidden="true" className="inline-block size-3 rounded-sm" style={{ backgroundColor: entry.colour }} />
                    {entry.label}
                  </span>
                  <span className="tabular-nums text-ink-secondary">{Math.round(entry.share * 100)}%</span>
                </li>
              ))}
            </ul>
          )}
          {mode === 'wind' && wind.display !== 'delta' && <p className="mt-2 text-caption text-ink-secondary">Shares are for open ground inside the circle; roofs are coloured but not counted.</p>}
          <p className="mt-2 text-caption text-ink-secondary">{view.disclaimer}</p>
        </div>
      )}
    </div>
  )
}
