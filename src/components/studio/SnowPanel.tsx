import { periodLabel, SNOW_COVER_MIN_CM, SNOW_LIMITS, SNOW_NOTE, type SnowClimate } from '../../features/analysis/snowClimate'
import { formatNumber } from './format'

const CHART = { width: 300, height: 90, top: 6, bottom: 4, gap: 2 }

/**
 * The Snow card's body (ADR-0039): winter climate context for the area from NVE's snow model. How
 * many days a winter has had snow on the ground and how deep it has been, with the spread between
 * winters. Climate context only: no snowdrift, no accumulation around buildings, no snow load.
 */
export function SnowPanel({ snow, siteAltitudeM }: { snow: SnowClimate | null; /** The site origin's elevation, to set beside the model cell's. */ siteAltitudeM: number | null }) {
  if (!snow) {
    return <p className="text-body-sm text-ink-secondary">Winter climate context is available on the curated sites. The source cannot be read from the browser, so imported sites do not have it yet.</p>
  }
  const deepest = Math.max(1, ...snow.winters.map((winter) => winter.maxDepthCm))
  const bar = (CHART.width - CHART.gap * (snow.winters.length - 1)) / snow.winters.length
  const peakMonth = snow.monthlyMeanDepthCm.reduce((best, month) => (month.value > best.value ? month : best))
  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-body-sm">
        <dt className="text-ink-secondary">Days with snow on the ground, median winter</dt>
        <dd className="tabular-nums text-ink">{formatNumber(snow.snowDays.median)}</dd>
        <dt className="text-ink-secondary">Fewest and most in one winter</dt>
        <dd className="tabular-nums text-ink">{formatNumber(snow.snowDays.min)}–{formatNumber(snow.snowDays.max)}</dd>
        <dt className="text-ink-secondary">Deepest snow of the winter, median</dt>
        <dd className="tabular-nums text-ink">{formatNumber(snow.maxDepthCm.median)} cm</dd>
        <dt className="text-ink-secondary">Shallowest and deepest winter</dt>
        <dd className="tabular-nums text-ink">{formatNumber(snow.maxDepthCm.min)}–{formatNumber(snow.maxDepthCm.max)} cm</dd>
        <dt className="text-ink-secondary">Month with the most snow on average</dt>
        <dd className="tabular-nums text-ink">{peakMonth.month} · {formatNumber(peakMonth.value)} cm</dd>
      </dl>
      <figure>
        <svg viewBox={`0 0 ${CHART.width} ${CHART.height}`} role="img" className="w-full rounded-chip border border-card-line bg-canvas"
          aria-label={`Deepest snow of each winter, ${periodLabel(snow)}: from ${formatNumber(snow.maxDepthCm.min)} to ${formatNumber(snow.maxDepthCm.max)} cm`}>
          {snow.winters.map((winter, index) => {
            const height = (winter.maxDepthCm / deepest) * (CHART.height - CHART.top - CHART.bottom)
            return <rect key={winter.winter} x={index * (bar + CHART.gap)} y={CHART.height - CHART.bottom - height} width={bar} height={Math.max(0.5, height)} fill="var(--ink-secondary, #6B7280)"><title>{winter.winter}: {winter.maxDepthCm} cm, {winter.snowDays} days</title></rect>
          })}
        </svg>
        <figcaption className="mt-1 flex justify-between gap-3 text-caption tabular-nums text-ink-secondary">
          <span>{snow.winters[0]!.winter}</span>
          <span className="text-ink">Deepest snow of each winter</span>
          <span>{snow.winters.at(-1)!.winter}</span>
        </figcaption>
      </figure>
      <p className="text-caption text-ink-secondary">
        Snow on the ground means at least {SNOW_COVER_MIN_CM} cm. NVE’s snow model on the seNorge grid, a 1 km cell at {formatNumber(snow.cell.altitudeM)} m above sea level{siteAltitudeM === null ? '' : `; the site is at ${formatNumber(siteAltitudeM)} m`}, {periodLabel(snow)}.
      </p>
      <p className="text-caption text-ink-secondary">{SNOW_NOTE} A street, a courtyard or a roof will differ.</p>
      <p className="text-caption text-ink-secondary">{SNOW_LIMITS}</p>
    </div>
  )
}
