import { compassName } from './compass'

export type RoseSector = { readonly from: number; readonly shareAbove: number; readonly meanRatio: number }

const SIZE = 168
const C = SIZE / 2
const R_MAX = 62
const R_MIN = 10

/** Point at compass bearing `deg` (0 = north, clockwise), radius r from the centre, in SVG coordinates. */
const at = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180
  return [C + r * Math.sin(a), C - r * Math.cos(a)] as const
}

/** Wedge for the 45° sector centred on `from` (the direction the wind comes FROM). */
function wedge(from: number, r: number): string {
  const [x0, y0] = at(from - 22.5, R_MIN)
  const [x1, y1] = at(from - 22.5, r)
  const [x2, y2] = at(from + 22.5, r)
  const [x3, y3] = at(from + 22.5, R_MIN)
  return `M${x0},${y0} L${x1},${y1} A${r},${r} 0 0 1 ${x2},${y2} L${x3},${y3} A${R_MIN},${R_MIN} 0 0 0 ${x0},${y0} Z`
}

/**
 * Exposure rose (Forma-style panel): one wedge per simulated direction, its length the share of
 * open ground at or above the threshold. Not a climate wind rose: directions are weighted equally.
 * The worst sector is outlined; the current dial direction is marked; wedges are keyboard buttons.
 */
export function DirectionRose({ sectors, worstFrom, currentFrom, thresholdMs, msPerRatio, total, onSelect }: {
  sectors: readonly RoseSector[]
  worstFrom: number | null
  currentFrom: number
  thresholdMs: number
  /** Converts a speed ratio to pedestrian m/s at the current reference speed. */
  msPerRatio: number
  /** Directions the sweep will have when complete (progress). */
  total: number
  onSelect: (from: number) => void
}) {
  // Wedge length = mean speed on open ground, scaled to the windiest direction (always readable);
  // the share above the threshold is in the label and the summary line.
  const maxMean = Math.max(1e-6, ...sectors.map((s) => s.meanRatio))
  const percent = (v: number) => `${Math.round(v * 100)} %`
  const ms = (ratio: number) => `${(ratio * msPerRatio).toFixed(1)} m/s`
  return (
    <div>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="mx-auto block w-full max-w-[220px]" role="group" aria-label={`Exposure by wind direction: mean wind speed on open ground, and share at or above ${thresholdMs} m/s`}>
        {[0.33, 0.66, 1].map((k) => (
          <circle key={k} cx={C} cy={C} r={R_MIN + (R_MAX - R_MIN) * k} fill="none" stroke="currentColor" strokeOpacity={0.12} />
        ))}
        {(['N', 'E', 'S', 'W'] as const).map((label, i) => {
          const [x, y] = at(i * 90, R_MAX + 11)
          return <text key={label} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="fill-current text-[9px] opacity-60">{label}</text>
        })}
        {sectors.map((s) => {
          const r = R_MIN + (R_MAX - R_MIN) * (s.meanRatio / maxMean)
          const worst = s.from === worstFrom
          const label = `Wind from ${compassName(s.from)} (${s.from}°): mean ${ms(s.meanRatio)} on open ground, ${percent(s.shareAbove)} at or above ${thresholdMs} m/s${worst ? ', worst direction' : ''}. Set the dial to this direction.`
          return (
            <path
              key={s.from}
              d={wedge(s.from, r)}
              role="button"
              tabIndex={0}
              aria-label={label}
              onClick={() => onSelect(s.from)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(s.from) } }}
              className="cursor-pointer outline-none focus-visible:stroke-[2.5]"
              fill={worst ? '#C2452F' : '#5B8DEF'}
              fillOpacity={worst ? 0.85 : 0.55}
              stroke={worst ? '#1F2328' : 'none'}
              strokeWidth={worst ? 1.5 : 0}
            >
              <title>{label}</title>
            </path>
          )
        })}
        {/* Current dial direction (where the wind comes from). */}
        {(() => {
          const [x, y] = at(currentFrom, R_MAX + 2)
          return <circle cx={x} cy={y} r={3.5} className="fill-current" aria-hidden="true" />
        })()}
      </svg>
      <p className="mt-1 text-center text-body-sm text-ink" aria-live="polite">
        {worstFrom === null
          ? 'Solving directions…'
          : (() => {
              const w = sectors.find((s) => s.from === worstFrom)!
              return <>Worst direction: <strong>{compassName(worstFrom)} {worstFrom}°</strong> — mean {ms(w.meanRatio)}, {percent(w.shareAbove)} of open ground ≥ {thresholdMs} m/s</>
            })()}
      </p>
      {sectors.length < total && <p className="text-center text-caption text-ink-secondary">{sectors.length}/{total} directions solved…</p>}
    </div>
  )
}

/** Stacked share bar for a legend (Forma's comfort donut, as a compact bar). */
export function ShareBar({ entries, label }: { entries: readonly { label: string; colour: string; share: number }[]; label: string }) {
  const shown = entries.filter((e) => e.share > 0)
  return (
    <div role="img" aria-label={`${label}: ${shown.map((e) => `${e.label} ${Math.round(e.share * 100)} %`).join(', ')}`} className="flex h-3 w-full overflow-hidden rounded-sm">
      {shown.map((e) => <span key={e.label} style={{ width: `${e.share * 100}%`, backgroundColor: e.colour }} />)}
    </div>
  )
}
