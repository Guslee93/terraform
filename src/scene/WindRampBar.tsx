import { WIND_RAMP } from '../features/analysis/climateView'

export function WindRampBar() {
  return <div aria-label="Wind speed in metres per second" className="pointer-events-none w-52 max-w-full self-center rounded-chip bg-surface/90 px-3 py-2 text-caption text-ink">
    <div aria-hidden="true" className="h-2 w-full" style={{ background: `linear-gradient(to right, ${WIND_RAMP.map((s) => `${s.colour} ${s.speed * 10}%`).join(', ')})` }} />
    <div className="mt-1 flex justify-between tabular-nums">{WIND_RAMP.map((s) => <span key={s.speed}>{s.speed}</span>)}</div>
    <div className="text-center">m/s</div>
  </div>
}
