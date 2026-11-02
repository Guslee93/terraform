import { LEVEL_TOLERANCE_M, type ScenarioMetrics, type VolumeMetrics } from '../../features/massing/metrics'
import { Card, CardHeader } from '../ui/Card'
import { labelClass } from '../ui/controls'
import { Figure, Metric, MetricRow } from '../ui/Metric'
import { formatArea, formatMetres, formatNumber } from './format'

const GAUGE = { width: 580, height: 300, cx: 290, cy: 272, r: 232, pill: 17, steps: 20 }

/** Scale end for the coverage gauge: 50 %, or the next 5 % above the value. */
export function gaugeScaleEnd(percent: number): number {
  return Math.max(50, Math.ceil(percent / 5) * 5)
}

/**
 * Pill-arc coverage gauge (spec §7.8). The site packages carry no coverage limit, so the
 * gauge shows used and remaining only; a limit pill appears only when a limit is supplied.
 */
function CoverageGauge({ percent }: { percent: number }) {
  const end = gaugeScaleEnd(percent)
  const pills = Array.from({ length: GAUGE.steps + 1 }, (_, index) => {
    const value = (end * index) / GAUGE.steps
    const angle = Math.PI - (index / GAUGE.steps) * Math.PI
    return {
      value,
      x: GAUGE.cx + GAUGE.r * Math.cos(angle),
      y: GAUGE.cy - GAUGE.r * Math.sin(angle),
      used: percent > 0 && value <= percent + 1e-9,
    }
  })
  const inner = GAUGE.r - 40
  return (
    <svg
      role="img"
      aria-label={`Site coverage ${formatNumber(percent, 1)} percent of the study area; no coverage limit in this package`}
      viewBox={`0 0 ${GAUGE.width} ${GAUGE.height}`}
      className="block w-full"
    >
      <path
        d={`M${GAUGE.cx - inner} ${GAUGE.cy} A${inner} ${inner} 0 0 1 ${GAUGE.cx + inner} ${GAUGE.cy}`}
        fill="none"
        stroke="var(--border)"
        strokeDasharray="1 5"
        strokeLinecap="round"
      />
      {pills.map((pill, index) => (
        <g key={index}>
          <circle cx={pill.x} cy={pill.y} r={GAUGE.pill} fill={pill.used ? 'var(--accent)' : 'var(--muted-fill)'} />
          {index % 2 === 0 && (
            <text
              x={pill.x}
              y={pill.y + 4}
              textAnchor="middle"
              fontFamily="var(--typeface-mono)"
              fontSize={11}
              fill={pill.used ? 'var(--ink-on-inverse)' : 'var(--ink-secondary)'}
            >
              {formatNumber(pill.value, 0)}
            </text>
          )}
        </g>
      ))}
    </svg>
  )
}

/** Panel 02 on the Model tab: coverage gauge and the core metric row. */
export function MetricsPanel({ metrics }: { metrics: ScenarioMetrics | null }) {
  const empty = !metrics || metrics.buildingCount === 0
  const percent = metrics ? metrics.coverageWithinParcel * 100 : 0
  return (
    <Card aria-labelledby="metrics-heading" className="flex h-full flex-col px-7 pb-6 pt-6">
      <CardHeader id="metrics-heading" code="02" title="Site coverage" icon="footprint" meta="Of study area · no limit set" />
      <div className="relative mx-auto mt-2 w-full max-w-[580px] flex-1">
        <CoverageGauge percent={percent} />
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
          <p className="text-hero text-ink max-sm:text-figure-l">
            <Figure value={formatNumber(percent, 1)} unit="%" />
          </p>
          <p className="mt-3 flex items-center gap-4 text-label text-ink-secondary">
            <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="size-[7px] rounded-pill bg-accent" />Used</span>
            <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="size-[7px] rounded-pill bg-muted-fill" />Remaining</span>
          </p>
        </div>
      </div>
      {empty ? (
        <p className="mt-6 border-t border-line-strong pt-4 text-body-sm text-ink-secondary">Draw a mass to see metrics.</p>
      ) : (
        <>
          <MetricRow className="mt-6">
            <Metric label="Concept GFA" icon="area" value={formatNumber(metrics.gfaM2)} unit="m²" />
            <Metric label="Footprint" icon="footprint" value={formatNumber(metrics.groundFootprintM2)} unit="m²" />
            <Metric label="Volume" icon="cube" value={formatNumber(metrics.volumeM3)} unit="m³" />
            <Metric label="Max height" icon="height" value={formatNumber(metrics.maxHeightM, 1)} unit="m" />
          </MetricRow>
          <p className="mt-3 text-label text-ink-secondary">
            Height above site origin · GFA ratio {formatNumber(metrics.conceptGfaRatio, 2)} · {metrics.buildingCount} {metrics.buildingCount === 1 ? 'building' : 'buildings'}
            {metrics.footprintOutsideParcelM2 > 0 && (
              <span className="text-warning-ink"> · <span>Outside study area</span> <span>{formatArea(metrics.footprintOutsideParcelM2)} outside</span></span>
            )}
          </p>
        </>
      )}
    </Card>
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
