import { useMemo } from 'react'
import { hazardFacts, type HazardKind, type Hazards } from '../../features/analysis/hazards'
import { RUNOFF_COURTYARDS, RUNOFF_LEGEND, RUNOFF_LIMITS, RUNOFF_NOTE, type RunoffSummary } from '../../features/analysis/runoff'
import type { Vec2 } from '../../lib/coordinates'

/** The mapped hazards that are about water. */
const WATER_KINDS: readonly HazardKind[] = ['flood-zones', 'flood-susceptibility', 'storm-surge']

/**
 * The Water card's body (ADR-0038): the runoff screening's legend and limits, and beside it what
 * the authorities have mapped. Two different kinds of statement, kept apart: a screening from the
 * shape of the ground, and published maps. Neither is a flood depth or a verdict.
 */
export function WaterPanel({ available, computing, summary, hazards, area }: {
  /** The package ships the 1 m terrain the screening needs. */
  available: boolean
  computing: boolean
  summary: RunoffSummary | null
  hazards: Hazards | null
  area: readonly Vec2[]
}) {
  const mapped = useMemo(() => (hazards ? hazardFacts(hazards, area).filter((fact) => WATER_KINDS.includes(fact.kind)) : []), [hazards, area])
  return (
    <div className="space-y-3">
      {!available ? (
        <p className="text-body-sm text-ink-secondary">The runoff screening needs the 1 m terrain, which this site does not have yet. It is available on the curated sites.</p>
      ) : (
        <>
          {computing && <p role="status" className="text-caption text-ink-secondary">Tracing where the water runs…</p>}
          <ul aria-label="Runoff legend">
            {[...RUNOFF_LEGEND].reverse().map((entry) => (
              <li key={entry.label} className="flex min-h-7 items-center gap-2 text-body-sm text-ink">
                <span aria-hidden="true" className="inline-block size-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.colour }} />
                {entry.label}
              </li>
            ))}
          </ul>
          <p className="text-caption text-ink-secondary">{RUNOFF_NOTE}</p>
          <p className="text-caption text-ink-secondary">{RUNOFF_LIMITS}</p>
          <p className="text-caption text-ink-secondary">{RUNOFF_COURTYARDS}</p>
          <p className="text-caption text-ink-secondary">A block you draw is a block in the model too: the paths go around it.</p>
          {summary && !summary.conserved && <p role="status" className="text-caption text-ink">The terrain could not be drained completely; treat the paths with extra care.</p>}
        </>
      )}
      {mapped.length > 0 && (
        <section aria-label="Mapped by the authorities" className="border-t border-card-line pt-3">
          <p className="text-eyebrow text-ink-secondary">Mapped by the authorities</p>
          <ul className="mt-2 space-y-1.5">
            {mapped.map((fact) => (
              <li key={fact.kind} className="text-body-sm">
                <span className="block text-ink-secondary">{fact.label}</span>
                <span className="block text-ink">{fact.statement}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-caption text-ink-secondary">Sources and dates are under Site. “Not mapped” is not a statement that the site is safe.</p>
        </section>
      )}
    </div>
  )
}
