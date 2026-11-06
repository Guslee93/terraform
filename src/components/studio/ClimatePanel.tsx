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

type ClimatePanelProps = {
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

export function ClimatePanel({ mode, onModeChange, wind, onWindChange, view, placingCircle = false, onPlaceCircle, streamlines = false, onStreamlinesChange, baseline = null, baselineMismatch = false, canSetBaseline = false, onSetBaseline, onClearBaseline }: ClimatePanelProps) {
  const windFrom = wind.from
  const set = (patch: Partial<WindSettings>) => onWindChange({ ...wind, ...patch })
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
                {placingCircle ? 'Click the ground to place · Esc to cancel' : 'Move circle'}
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
            <input type="checkbox" checked={streamlines} onChange={(event) => onStreamlinesChange?.(event.currentTarget.checked)} />
            Streamlines
          </label>
          <div className="mt-3 flex gap-2">
            <button type="button" className="min-h-8 rounded-chip border border-line px-2 text-body-sm disabled:opacity-50" disabled={!canSetBaseline} onClick={onSetBaseline}>Set baseline</button>
            {baseline && <button type="button" className="min-h-8 rounded-chip border border-line px-2 text-body-sm" onClick={onClearBaseline}>Clear baseline</button>}
          </div>
          {baseline && baselineMismatch && <p role="status" className="mt-2 text-caption text-ink-secondary">Baseline was taken for {compassName(baseline.from)} {baseline.from}°, r = {baseline.circle.radius} m. Reset it to compare.</p>}
          {wind.display === 'delta' && !baselineMismatch && <p className="mt-2 text-caption">{DELTA_NOTE}</p>}
          {wind.display === 'activity' && (
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
              <span className="block text-caption text-ink-secondary">A rule, not simulated: faster wind at the base of buildings 30 m or taller, or twice the height of their neighbours.</span>
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
          <p className="mt-2 text-caption text-ink-secondary">{view.disclaimer}</p>
        </div>
      )}
    </div>
  )
}
