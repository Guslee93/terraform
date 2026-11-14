import { SUN_HOURS_RAMP, type CircleSunHours } from '../../features/analysis/circleSunHours'
import { rangeClass } from '../ui/controls'
import { CircleControls, Section } from './ClimatePanel'
import { formatNumber } from './format'
import { clockLabel, shortDate } from './SunPanel'

/** A window of the day in local minutes, `from` inclusive and `to` exclusive. */
export type SunWindow = readonly [from: number, to: number]
export const FULL_DAY: SunWindow = [0, 1440]
const WINDOW_STEP_MIN = 30

const hours = (value: number | null) => (value === null ? '—' : `${formatNumber(value, 1)} h`)

/**
 * The Sun card's controls while the map shows hours of direct sun in the analysis circle
 * (ADR-0031): what the circle's surfaces receive, the colour scale, the window of the day and the
 * circle itself, which the wind map shares.
 */
export function SunHoursControls({
  result,
  computing,
  date,
  timeWindow,
  onWindowChange,
  radius,
  onRadiusChange,
  placing,
  onPlace,
}: {
  result: CircleSunHours | null
  computing: boolean
  date: string
  timeWindow: SunWindow
  onWindowChange: (window: SunWindow) => void
  radius: number
  onRadiusChange: (radius: number) => void
  placing: boolean
  onPlace: (placing: boolean) => void
}) {
  const [from, to] = timeWindow
  const top = result ? Math.round(result.possibleHours * 4) / 4 : null
  const ticks = top === null ? [] : [0, top / 4, top / 2, (3 * top) / 4, top].map((h) => Math.round(h * 10) / 10)
  return (
    <div className="space-y-3">
      <Section title="In the circle" action={computing ? <span role="status" className="text-caption text-ink-secondary">Computing…</span> : undefined}>
        <dl className="grid grid-cols-3 gap-2" aria-label="Median hours of direct sun in the circle">
          {(['ground', 'roofs', 'facades'] as const).map((surface) => (
            <div key={surface}>
              <dt className="text-caption text-ink-secondary">{surface === 'ground' ? 'Ground' : surface === 'roofs' ? 'Roofs' : 'Façades'}</dt>
              <dd className="text-body tabular-nums text-ink">{hours(result?.median[surface] ?? null)}</dd>
            </div>
          ))}
        </dl>
        <p className="text-caption text-ink-secondary">
          Median hours of direct sun on {shortDate(date)}, {clockLabel(from)}–{clockLabel(to)}{top === null ? '' : `, of ${formatNumber(top, 1)} h the sun is up`}.
        </p>
        {top !== null && (
          <div role="img" aria-label={`Colour scale: 0 to ${formatNumber(top, 1)} hours of direct sun, dark to light`}>
            <div aria-hidden="true" className="h-2 w-full rounded-chip" style={{ background: `linear-gradient(to right, ${SUN_HOURS_RAMP.join(', ')})` }} />
            <div aria-hidden="true" className="mt-1 flex justify-between text-caption tabular-nums text-ink-secondary">{ticks.map((h, i) => <span key={i}>{h}</span>)}</div>
          </div>
        )}
      </Section>

      <Section title="Time of day" action={<span className="text-body-sm tabular-nums text-ink">{clockLabel(from)}–{clockLabel(to)}</span>}>
        <label className="block text-caption text-ink-secondary">
          From
          <input type="range" min={0} max={1440 - WINDOW_STEP_MIN} step={WINDOW_STEP_MIN} value={from}
            aria-valuetext={clockLabel(from)}
            onChange={(event) => { const next = Number(event.currentTarget.value); onWindowChange([next, Math.max(to, next + WINDOW_STEP_MIN)]) }}
            className={rangeClass} />
        </label>
        <label className="block text-caption text-ink-secondary">
          To
          <input type="range" min={WINDOW_STEP_MIN} max={1440} step={WINDOW_STEP_MIN} value={to}
            aria-valuetext={clockLabel(to)}
            onChange={(event) => { const next = Number(event.currentTarget.value); onWindowChange([Math.min(from, next - WINDOW_STEP_MIN), next]) }}
            className={rangeClass} />
        </label>
      </Section>

      <CircleControls radius={radius} onRadiusChange={onRadiusChange} placing={placing} onPlace={onPlace}
        note="The ground in this circle, and every roof and façade of the buildings that touch it, in 2 m steps." />
    </div>
  )
}
