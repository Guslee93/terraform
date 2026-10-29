import { LEVEL_TOLERANCE_M, type ScenarioMetrics, type VolumeMetrics } from '../../features/massing/metrics'
import { formatArea, formatMetres, formatPercent, formatRatio, formatVolume } from './format'

const labelClass = 'text-[10px] uppercase tracking-[0.12em] text-ink-secondary'

export function MetricsPanel({ metrics }: { metrics: ScenarioMetrics | null }) {
  return (
    <section aria-labelledby="metrics-heading" className="mb-6">
      <h2 id="metrics-heading" className={labelClass}>Metrics</h2>
      {!metrics || metrics.buildingCount === 0 ? <p className="mt-2 text-[11.5px] text-ink-secondary">Draw a mass to see metrics.</p> : <>
        <dl className="mt-2 grid grid-cols-2 gap-2">
          {[
            { label: 'Concept GFA', value: formatArea(metrics.gfaM2) },
            { label: 'Ground footprint', value: formatArea(metrics.groundFootprintM2) },
            { label: 'Coverage of study area', value: formatPercent(metrics.coverageWithinParcel) },
            ...(metrics.footprintOutsideParcelM2 > 0 ? [{ label: 'Outside study area', value: `${formatArea(metrics.footprintOutsideParcelM2)} outside`, outside: true }] : []),
            { label: 'Volume', value: formatVolume(metrics.volumeM3) },
            { label: 'Max height', value: formatMetres(metrics.maxHeightM), hint: 'above site origin' },
            { label: 'Buildings', value: String(metrics.buildingCount) },
            { label: 'Concept GFA ratio', value: formatRatio(metrics.conceptGfaRatio) },
          ].map((card) => <div key={card.label} className="rounded-[var(--radius-control)] border border-line px-2.5 py-2">
            <dt className={labelClass}>{card.label}</dt>
            <dd className={`mt-1 text-[13px] font-medium tabular-nums ${'outside' in card ? 'text-warning' : 'text-ink'}`}>{card.value}</dd>
            {'hint' in card && <dd className="mt-0.5 text-[10px] text-ink-secondary">{card.hint}</dd>}
          </div>)}
        </dl>
        {metrics.gfaM2 !== metrics.gfaByBuildingM2 && <p className="mt-2 text-[11.5px] text-ink-secondary">Buildings overlap at some floor levels; overlap counted once.</p>}
        <details className="mt-3 text-[11.5px] leading-relaxed text-ink-secondary">
          <summary className="min-h-10 cursor-pointer py-2 text-ink">About these numbers</summary>
          <p>Areas are in m², volume in m³ and elevations in metres above the site origin. Ground footprint is the union of tier projections; coverage counts only the footprint within the study area, divided by its area.</p>
          <p className="mt-2">Concept GFA sums one floor plate per storey base, unioned at each level within a {formatMetres(LEVEL_TOLERANCE_M)} tolerance; roofs are excluded. Concept GFA ratio divides this area by study area.</p>
          <p className="mt-2">Concept GFA is not BRA, BYA or %-BRA.</p>
        </details>
      </>}
    </section>
  )
}

export function SelectedFloors({ metrics }: { metrics: VolumeMetrics }) {
  return <section aria-label="Selected mass metrics" className="mt-4 border-t border-line pt-3">
    <dl className="flex items-baseline justify-between gap-2"><dt className={labelClass}>Concept GFA</dt><dd className="text-[12px] font-medium tabular-nums">{formatArea(metrics.gfaM2)}</dd></dl>
    <h3 className={`${labelClass} mt-3`}>Floors · {metrics.storeys.length}</h3>
    <ol aria-label="Floors" className="mt-1 text-[11.5px] tabular-nums">
      {metrics.storeys.map((floor, index) => <li key={floor.elevation} className="flex justify-between gap-2 border-b border-line/70 py-2 last:border-b-0"><span>Floor {index + 1} · {formatMetres(floor.elevation)}</span><span>{formatArea(floor.areaM2)}</span></li>)}
    </ol>
    <p className="mt-1 text-[10px] text-ink-secondary">Floor elevations above site origin. Concept GFA is not BRA, BYA or %-BRA.</p>
  </section>
}
