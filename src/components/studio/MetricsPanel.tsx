import { LEVEL_TOLERANCE_M, type ScenarioMetrics, type VolumeMetrics } from '../../features/massing/metrics'
import { labelClass } from '../ui/controls'
import { Figure } from '../ui/Metric'
import { cn } from '../../lib/cn'
import type { ReactNode } from 'react'
import { formatArea, formatMetres, formatNumber } from './format'

function FigureCell({ label, children, note, className }: { label: string; children: ReactNode; note?: ReactNode; className?: string }) {
  return (
    <div className={cn('border-b border-line px-6 py-3 odd:border-r', className)}>
      <dt className="text-caption text-ink-secondary">{label}</dt>
      <dd className="mt-2">{children}</dd>
      {note && <dd className="mt-1.5 text-caption text-ink-secondary">{note}</dd>}
    </div>
  )
}

/** A 2 px track with an ink fill, an amber overrun past `limit` and a limit tick. Shares are 0–1. */
function Track({ share, limit, colour = 'bg-ink' }: { share: number; limit?: number; colour?: string }) {
  const clamped = Math.min(Math.max(share, 0), 1)
  const base = limit === undefined ? clamped : Math.min(clamped, limit)
  return (
    <span aria-hidden="true" className="relative mt-2.5 block h-[2px] bg-line">
      <span className={cn('absolute inset-y-0 left-0', colour)} style={{ width: `${base * 100}%` }} />
      {limit !== undefined && clamped > limit && <span className="absolute inset-y-0 bg-warning" style={{ left: `${limit * 100}%`, width: `${(clamped - limit) * 100}%` }} />}
      {limit !== undefined && <span className="absolute -top-1 h-2.5 w-px bg-ink" style={{ left: `${limit * 100}%` }} />}
    </span>
  )
}

/**
 * Panel section 2 (draft 4): scenario figures. Tallest uses the envelope reference (grade or
 * datum), the same number as the design check and the scene labels.
 */
export function MetricsPanel({ metrics, tallestM, limitM, reference }: {
  metrics: ScenarioMetrics | null
  tallestM?: number
  limitM?: number | null
  reference?: string
}) {
  if (!metrics || metrics.buildingCount === 0) {
    return (
      <section aria-labelledby="metrics-heading" className="border-t border-line px-6 py-4">
        <h2 id="metrics-heading" className="text-caption text-ink-secondary">Scenario</h2>
        <p className="mt-2 text-body-sm text-ink-secondary">Draw a mass to see metrics.</p>
      </section>
    )
  }
  const tallest = tallestM ?? metrics.maxHeightM
  const scale = limitM ? Math.max(limitM * 1.25, tallest) : 0
  const over = limitM !== null && limitM !== undefined && tallest > limitM + 1e-3
  return (
    <section aria-labelledby="metrics-heading" className="border-t border-line">
      <div className="flex justify-between px-6 pb-2 pt-4">
        <h2 id="metrics-heading" className="text-caption text-ink-secondary">Scenario</h2>
        <span className="text-caption text-ink-secondary">{metrics.buildingCount} {metrics.buildingCount === 1 ? 'building' : 'buildings'}</span>
      </div>
      <dl className="grid grid-cols-2 border-t border-line">
        <FigureCell label="Floor area" note={<>Concept GFA · ratio {formatNumber(metrics.conceptGfaRatio, 2)}</>}>
          <Figure value={formatNumber(metrics.gfaM2)} unit="m²" className="text-figure-s text-ink" />
        </FigureCell>
        <FigureCell label="Tallest" note={tallestM === undefined ? 'Above site origin' : limitM ? `Limit ${formatNumber(limitM, 0)} m above ${reference ?? 'grade'}` : `Above ${reference ?? 'grade'}`}>
          <Figure value={formatNumber(tallest, 1)} unit="m" className={cn('text-figure-s', over ? 'text-warning-ink' : 'text-ink')} />
          {limitM ? <Track share={tallest / scale} limit={limitM / scale} /> : null}
        </FigureCell>
        <FigureCell label="Footprint" note={<>{formatNumber(metrics.coverageWithinParcel * 100, 1)} % of study area{metrics.footprintOutsideParcelM2 > 0 && <span className="text-warning-ink"> · <span>Outside study area</span> <span>{formatArea(metrics.footprintOutsideParcelM2)} outside</span></span>}</>}>
          <Figure value={formatNumber(metrics.groundFootprintM2)} unit="m²" className="text-figure-s text-ink" />
          <Track share={metrics.coverageWithinParcel} colour="bg-accent" />
        </FigureCell>
        <FigureCell label="Volume">
          <Figure value={formatNumber(metrics.volumeM3)} unit="m³" className="text-figure-s text-ink" />
        </FigureCell>
      </dl>
    </section>
  )
}

/** Method notes for the metrics; lives in the drawer so panel 02 stays a fixed height. */
export function MetricsNotes({ metrics }: { metrics: ScenarioMetrics | null }) {
  return (
    <div className="space-y-2 text-body-sm leading-relaxed text-ink-secondary">
      {metrics && metrics.gfaM2 !== metrics.gfaByBuildingM2 && <p className="text-ink">Buildings overlap at some floor levels; overlap counted once.</p>}
      <p>Areas are in m², volume in m³ and elevations in metres above the site origin. Ground footprint is the union of tier projections; coverage counts only the footprint within the study area, divided by its area.</p>
      <p>Concept GFA sums one floor plate per storey base, unioned at each level within a {formatMetres(LEVEL_TOLERANCE_M)} tolerance; roofs are excluded. Concept GFA ratio divides this area by study area.</p>
      <p>Concept GFA is not BRA, BYA or %-BRA.</p>
    </div>
  )
}

export function SelectedFloors({ metrics }: { metrics: VolumeMetrics }) {
  return <section aria-label="Selected mass metrics" className="mt-4 border-t border-line pt-3">
    <dl className="flex items-baseline justify-between gap-2"><dt className={labelClass}>Concept GFA</dt><dd className="font-mono text-body-sm tabular-nums">{formatArea(metrics.gfaM2)}</dd></dl>
    <h3 className={`${labelClass} mt-3`}>Floors · {metrics.storeys.length}</h3>
    <ol aria-label="Floors" className="mt-1 font-mono text-body-sm tabular-nums">
      {metrics.storeys.map((floor, index) => <li key={floor.elevation} className="flex justify-between gap-2 border-b border-line py-2 last:border-b-0"><span>Floor {index + 1} · {formatMetres(floor.elevation)}</span><span>{formatArea(floor.areaM2)}</span></li>)}
    </ol>
    <p className="mt-1 text-body-sm text-ink-secondary">Floor elevations above site origin. Concept GFA is not BRA, BYA or %-BRA.</p>
  </section>
}
