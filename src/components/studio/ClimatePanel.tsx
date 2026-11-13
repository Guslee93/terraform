import { STREAMLINE_3D_NOTE } from '../../features/analysis/streamlines3d'
import { DirectionRose, ShareBar, type RoseSector } from './DirectionRose'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { demoFrame } from '../../features/analysis/windDemo'
import { SLICE_HEIGHTS_M } from '../../features/analysis/windProfile'
import { CIRCLE_RADIUS, DELTA_NOTE, displayAt, heightNote, localSpeedMs, PEDESTRIAN_HEIGHT_M, ROSE_THRESHOLD_MS, WORST_NOTE, type WindBaseline, type ClimateMode, type ClimateView, type WindDisplay, type WindSettings } from '../../features/analysis/climateView'
import { cn } from '../../lib/cn'
import { eyebrowClass, labelClass, pillButtonClass, rangeClass, segmentClass, segmentGroupClass } from '../ui/controls'

export { compassName } from './compass'
import { compassName } from './compass'

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

/** Above this much relief inside the circle the panel says the wind model ignores the slope. */
export const STEEP_RELIEF_M = 10

type ClimatePanelProps = {
  /** Terrain height difference (m) inside the wind circle. */
  terrainReliefM?: number
  /** Direction and speed sliders; off where the dock hosts them (WindQuick). */
  showQuick?: boolean
  /** Off / Wind / Noise switch; hidden in the dock, where the active card picks the mode. */
  showModes?: boolean
  /** Heights (m) of the slices solved so far, ground first; the stack arrives progressively. */
  availableHeights?: readonly number[]
  slicesComplete?: boolean
  /** All heights the stack will have; defaults to the standard four. */
  sliceHeights?: readonly number[]
  demoPlaying?: boolean
  onToggleDemo?: () => void
  /** Edit made while the demo plays: stop it, restore, then apply this change. */
  onDemoEdit?: (patch: Partial<WindSettings>) => void
  /** All-directions sweep (ADR-0015): opt-in because it solves 8 directions. */
  sweepOn?: boolean
  onSweepChange?: (on: boolean) => void
  sweep?: { readonly sectors: readonly RoseSector[]; readonly worstFrom: number | null; readonly total: number } | null
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

/** Wind direction and reference speed: the two most-used wind controls (dock strip). */
export function WindQuick({ wind, onChange, idPrefix = 'wind' }: { wind: WindSettings; onChange: (patch: Partial<WindSettings>) => void; idPrefix?: string }) {
  return (
    <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
      <div>
        <div className="flex items-center justify-between">
          <label htmlFor={`${idPrefix}-from`} className={labelClass}>Wind blows from</label>
          <span className="flex items-center gap-1.5 text-body-sm tabular-nums text-ink">
            {/* Arrow points where the wind goes (downwind). */}
            <svg aria-hidden="true" viewBox="-10 -10 20 20" className="size-4 text-ink-secondary" style={{ transform: `rotate(${wind.from + 180}deg)` }}>
              <path d="M0 6 V-6 M-3.5 -2.5 L0 -6 L3.5 -2.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {compassName(wind.from)} · {wind.from}°
          </span>
        </div>
        <input id={`${idPrefix}-from`} type="range" min={0} max={345} step={15} value={wind.from}
          aria-valuetext={`${compassName(wind.from)}, ${wind.from} degrees`}
          onChange={(event) => onChange({ from: Number(event.currentTarget.value) })}
          className={cn(rangeClass, 'mt-1.5')} />
      </div>
      {wind.display !== 'delta' && (
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor={`${idPrefix}-speed`} className={labelClass}>Wind at 10 m height</label>
            <span className="text-body-sm tabular-nums text-ink">{wind.refSpeed} m/s</span>
          </div>
          <input id={`${idPrefix}-speed`} type="range" min={2} max={15} step={1} value={wind.refSpeed}
            aria-valuetext={`${wind.refSpeed} metres per second`}
            onChange={(event) => onChange({ refSpeed: Number(event.currentTarget.value) })}
            className={cn(rangeClass, 'mt-1.5')} />
        </div>
      )}
    </div>
  )
}

function Section({ title, children, action, regionLabel }: { title: string; children: ReactNode; action?: ReactNode; regionLabel?: string }) {
  return (
    <section aria-label={regionLabel} className="border-t border-card-line pt-3">
      <div className="flex min-h-8 items-center justify-between gap-2">
        <h3 className={eyebrowClass}>{title}</h3>
        {action}
      </div>
      <div className="mt-2 space-y-2">{children}</div>
    </section>
  )
}

export function ClimatePanel({ terrainReliefM = 0, showQuick = true, showModes = true, availableHeights = [], slicesComplete = false, sliceHeights = SLICE_HEIGHTS_M, demoPlaying = false, onToggleDemo, onDemoEdit, sweepOn = false, onSweepChange, sweep = null, mode, onModeChange, wind, onWindChange, view, placingCircle = false, onPlaceCircle, streamlines = false, onStreamlinesChange, baseline = null, baselineMismatch = false, canSetBaseline = false, onSetBaseline, onClearBaseline }: ClimatePanelProps) {
  const slicesReady = availableHeights.length >= 2
  // While the demo plays, an edit stops it (restoring the user's settings) and keeps the edit.
  const set = (patch: Partial<WindSettings>) => (demoPlaying && onDemoEdit ? onDemoEdit(patch) : onWindChange({ ...wind, ...patch }))
  const legend = view && mode !== 'off' && (
    <div>
      {view.assessed === 0 ? (
        <p className="text-body-sm text-ink-secondary">
          {mode === 'wind' && baselineMismatch && wind.display === 'delta' ? 'Delta unavailable for this circle or direction.' : mode === 'noise' ? 'No mapped roads in this study area, so there is nothing to estimate.' : 'Computing the wind flow…'}
        </p>
      ) : (
        <>
          <ShareBar entries={view.legend} label={mode === 'wind' ? 'Share of open ground by band' : 'Share of the study area by band'} />
          <ul className="mt-2" aria-label={mode === 'wind' ? (displayAt(wind) === 'delta' ? DELTA_NOTE : displayAt(wind) === 'activity' ? 'Wind comfort legend' : displayAt(wind) === 'worst' ? 'Worst-case comfort legend' : 'Wind direction legend') : 'Noise legend'}>
            {view.legend.map((entry) => (
              <li key={entry.label} className="flex min-h-7 items-center justify-between gap-3 text-body-sm text-ink">
                <span className="flex items-center gap-2">
                  <span aria-hidden="true" className="inline-block size-2.5 rounded-full" style={{ backgroundColor: entry.colour }} />
                  {entry.label}
                </span>
                <span className="tabular-nums text-ink-secondary">{Math.round(entry.share * 100)}%</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {mode === 'wind' && wind.display !== 'delta' && <p className="mt-2 text-caption text-ink-secondary">Shares are for open ground inside the circle; roofs are coloured but not counted.</p>}
      <p className="mt-2 text-caption text-ink-secondary">{view.disclaimer}</p>
      {mode === 'wind' && terrainReliefM >= STEEP_RELIEF_M && (
        <p className="mt-2 text-caption text-ink-secondary">
          Steep site: the ground rises about {Math.round(terrainReliefM)} m across this circle. The wind model follows the ground and does not model the slope itself, so hills neither shelter nor speed up the flow here. Treat these results as rougher than on a flat site.
        </p>
      )}
    </div>
  )

  return (
    <div className="space-y-4">
      {showModes && (
        <div role="group" aria-label="Climate layer" className={segmentGroupClass}>
          {MODES.map((option) => (
            <button key={option.id} type="button" aria-pressed={mode === option.id} onClick={() => onModeChange(option.id)} className={segmentClass}>
              {option.label}
            </button>
          ))}
        </div>
      )}

      {mode === 'wind' && <>
        <div role="group" aria-label="Wind map shows" className={segmentGroupClass}>
          {[...DISPLAYS, ...(sweep && sweep.sectors.length > 0 ? [{ id: 'worst' as const, label: 'Worst case' }] : []), ...(baseline ? [{ id: 'delta' as const, label: 'Delta' }] : [])].map((option) => (
            <button key={option.id} type="button" aria-pressed={displayAt(wind) === option.id}
              // Comfort classes are pedestrian criteria (2 m); the worst case is a 2 m screen.
              disabled={option.id === 'activity' && wind.heightM > PEDESTRIAN_HEIGHT_M}
              aria-describedby={option.id === 'activity' && wind.heightM > PEDESTRIAN_HEIGHT_M ? 'wind-height-note' : undefined}
              onClick={() => set({ display: option.id, ...(option.id === 'worst' ? { heightM: PEDESTRIAN_HEIGHT_M } : {}) })} className={segmentClass}>
              {option.label}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="wind-height" className={labelClass}>Height above terrain</label>
          <select id="wind-height" value={wind.heightM} disabled={wind.display === 'worst'}
            aria-describedby={wind.heightM > PEDESTRIAN_HEIGHT_M ? 'wind-height-note' : !slicesComplete ? 'upper-heights-status' : undefined}
            onChange={(event) => set({ heightM: Number(event.currentTarget.value) })}
            className="h-8 w-40 rounded-control border border-card-line bg-card px-2 text-body-sm disabled:opacity-50">
            {sliceHeights.map((z) => {
              const ready = z <= PEDESTRIAN_HEIGHT_M || availableHeights.includes(z)
              return <option key={z} value={z} disabled={!ready}>{z} m{z <= PEDESTRIAN_HEIGHT_M ? ' (pedestrian)' : ''}{ready ? '' : ' (computing)'}</option>
            })}
          </select>
        </div>
        {wind.heightM > PEDESTRIAN_HEIGHT_M && <p id="wind-height-note" className="text-caption text-ink-secondary">{heightNote(wind.heightM)}</p>}
        {wind.display === 'worst' && <p className="text-caption text-ink-secondary">The worst case is a pedestrian screen at 2 m.</p>}
        {showQuick && <WindQuick wind={wind} onChange={set} />}
        {showQuick && <p className="text-caption text-ink-secondary">Direction is your choice, not a measured climate value. The flow updates as you drag.</p>}
        {legend}

        <Section regionLabel="All wind directions" title="All directions" action={onSweepChange && (
          <button type="button" aria-pressed={sweepOn} onClick={() => { onSweepChange(!sweepOn); if (sweepOn && wind.display === 'worst') set({ display: 'activity' }) }} className={pillButtonClass}>
            {sweepOn ? 'Stop' : 'Analyse 8 directions'}
          </button>
        )}>
          {!sweepOn && <p className="text-caption text-ink-secondary">Solve every 45° to find where and from which direction the area is worst.</p>}
          {sweepOn && sweep && <>
            <DirectionRose sectors={sweep.sectors} worstFrom={sweep.worstFrom} currentFrom={wind.from} thresholdMs={ROSE_THRESHOLD_MS} msPerRatio={localSpeedMs(1, wind.refSpeed)} total={sweep.total}
              onSelect={(from) => set({ from, display: wind.display === 'worst' ? 'activity' : wind.display })} />
            <p className="text-caption text-ink-secondary">{WORST_NOTE} Wedge length: mean wind on open ground for each direction, at {wind.refSpeed} m/s (10 m). Worst = largest share at or above {ROSE_THRESHOLD_MS} m/s (too windy to stand), then highest mean. Select a wedge to view that direction.</p>
          </>}
          {sweepOn && !sweep && <p className="text-caption text-ink-secondary">Solving directions…</p>}
        </Section>

        <Section title="Analysis circle" action={<span className="text-body-sm tabular-nums text-ink">r = {wind.radius} m</span>}>
          <input id="wind-radius" type="range" min={CIRCLE_RADIUS.min} max={CIRCLE_RADIUS.max} step={CIRCLE_RADIUS.step} value={wind.radius}
            aria-label="Analysis circle" aria-valuetext={`radius ${wind.radius} metres`}
            onChange={(event) => set({ radius: Number(event.currentTarget.value) })} className={rangeClass} />
          {onPlaceCircle && (
            <button type="button" aria-pressed={placingCircle} onClick={() => onPlaceCircle(!placingCircle)} className={cn(pillButtonClass, 'w-full')}>
              {placingCircle ? 'Click the ground or use arrow keys · Enter to place · Esc to cancel' : 'Move circle'}
            </button>
          )}
          <p className="text-caption text-ink-secondary">The flow is solved only around this circle, at about {Math.round((wind.radius * 2 * 1.4) / 160 * 10) / 10} m resolution.</p>
        </Section>

        <Section title="Streamlines" action={
          <label className="grid size-8 cursor-pointer place-items-center">
            <input type="checkbox" aria-label="Streamlines" checked={streamlines} onChange={(event) => { const on = event.currentTarget.checked; if (demoPlaying) onDemoEdit?.({}); onStreamlinesChange?.(on) }} className="size-4 accent-[var(--accent)]" />
          </label>
        }>
          <label className="flex items-center justify-between gap-3">
            <span className={labelClass}>Follow buildings in 3D</span>
            <input type="checkbox" checked={wind.streamlines3d} disabled={!slicesReady}
              aria-describedby={!slicesReady ? 'upper-heights-status' : undefined}
              onChange={(event) => set({ streamlines3d: event.currentTarget.checked })}
              className="size-4 accent-[var(--accent)]" />
          </label>
          {!wind.streamlines3d && <p className="text-caption text-ink-secondary">Flat at {wind.heightM} m above terrain, the height chosen above.</p>}
          <label htmlFor="streamline-opacity" className={labelClass}>Streamline opacity</label>
          <input id="streamline-opacity" type="range" min={0.2} max={1} step={0.05}
            value={wind.streamlineOpacity} disabled={!slicesReady}
            aria-valuetext={`${Math.round(wind.streamlineOpacity * 100)} percent`}
            aria-describedby={!slicesReady ? 'upper-heights-status' : undefined}
            onChange={(event) => set({ streamlineOpacity: Number(event.currentTarget.value) })}
            className={rangeClass} />
          {!slicesComplete && <p id="upper-heights-status" className="text-caption text-ink-secondary">Upper heights computing… {availableHeights.length}/{sliceHeights.length} ready</p>}
          {slicesReady && wind.streamlines3d && <p className="text-caption text-ink-secondary">{STREAMLINE_3D_NOTE}</p>}
        </Section>

        <Section title="Compare">
          <div className="flex flex-wrap gap-2">
            <button type="button" className={pillButtonClass} disabled={!canSetBaseline} onClick={onSetBaseline}>Set baseline</button>
            {baseline && <button type="button" className={pillButtonClass} onClick={onClearBaseline}>Clear baseline</button>}
            {onToggleDemo && <button type="button" aria-pressed={demoPlaying} onClick={onToggleDemo} className={pillButtonClass}>{demoPlaying ? 'Stop demo' : 'Play demo'}</button>}
          </div>
          {baseline && baselineMismatch && <p role="status" className="text-caption text-ink-secondary">Baseline was taken for {compassName(baseline.from)} {baseline.from}°, r = {baseline.circle.radius} m, downwash rule {baseline.downwash ? 'on' : 'off'}. Reset it to compare.</p>}
          {wind.display === 'delta' && !baselineMismatch && <p className="text-caption">{DELTA_NOTE}</p>}
        </Section>

        <Section title="Rules">
          <label className="flex items-start gap-2 text-body-sm text-ink">
            <input type="checkbox" checked={wind.downwash} onChange={(event) => set({ downwash: event.currentTarget.checked })} className="mt-1 accent-[var(--accent)]" />
            <span>
              Downwash rule for tall buildings
              <span className="block text-caption text-ink-secondary">A rule, not simulated: faster wind at the base of buildings 30 m or taller, or twice the height of their neighbours. Applies at ground level only.</span>
            </span>
          </label>
        </Section>
      </>}

      {mode === 'off' && <p className="text-body-sm text-ink-secondary">Choose Wind or Noise to colour the ground.</p>}
      {mode === 'noise' && legend}
    </div>
  )
}
