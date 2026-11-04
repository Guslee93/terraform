import type { ClimateMode, ClimateView } from '../../features/analysis/climateView'
import { cn } from '../../lib/cn'
import { inputClass, labelClass } from '../ui/controls'

/** Compass points offered for the wind direction (the direction the wind blows FROM). */
export const WIND_DIRECTIONS: ReadonlyArray<{ label: string; bearing: number }> = [
  { label: 'North', bearing: 0 },
  { label: 'North-east', bearing: 45 },
  { label: 'East', bearing: 90 },
  { label: 'South-east', bearing: 135 },
  { label: 'South', bearing: 180 },
  { label: 'South-west', bearing: 225 },
  { label: 'West', bearing: 270 },
  { label: 'North-west', bearing: 315 },
]

const MODES: ReadonlyArray<{ id: ClimateMode; label: string }> = [
  { id: 'off', label: 'Off' },
  { id: 'wind', label: 'Wind' },
  { id: 'noise', label: 'Noise' },
]

type ClimatePanelProps = {
  mode: ClimateMode
  onModeChange: (mode: ClimateMode) => void
  windFrom: number
  onWindFromChange: (bearing: number) => void
  view: ClimateView | null
}

export function ClimatePanel({ mode, onModeChange, windFrom, onWindFromChange, view }: ClimatePanelProps) {
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
          <label htmlFor="wind-from" className={labelClass}>Wind blows from</label>
          <select
            id="wind-from"
            value={windFrom}
            onChange={(event) => onWindFromChange(Number(event.currentTarget.value))}
            className={cn(inputClass, 'mt-1 font-sans')}
          >
            {WIND_DIRECTIONS.map((direction) => (
              <option key={direction.bearing} value={direction.bearing}>{direction.label}</option>
            ))}
          </select>
          <p className="mt-1 text-caption text-ink-secondary">Your choice, not a measured climate value.</p>
        </div>
      )}

      {mode === 'off' && (
        <p className="mt-3 text-body-sm text-ink-secondary">Choose Wind or Noise to colour the ground.</p>
      )}

      {view && mode !== 'off' && (
        <div className="mt-3">
          {view.assessed === 0 ? (
            <p className="text-body-sm text-ink-secondary">
              {mode === 'noise' ? 'No mapped roads in this study area, so there is nothing to estimate.' : 'No open ground in this study area.'}
            </p>
          ) : (
            <ul aria-label={mode === 'wind' ? 'Wind exposure legend' : 'Noise legend'}>
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
