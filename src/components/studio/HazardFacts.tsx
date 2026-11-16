import { HAZARD_DISCLAIMER, hazardFacts, type Hazards } from '../../features/analysis/hazards'
import type { Vec2 } from '../../lib/coordinates'

/**
 * Mapped hazards for the study area, as facts (ADR-0036): mapped here, mapped nearby, or not mapped
 * by the authority, each with its source and dates. Never "safe", never a depth or a class.
 */
export function HazardFacts({ hazards, area }: { hazards: Hazards; area: readonly Vec2[] }) {
  return (
    <section aria-label="Mapped hazards" className="mt-3 border-t border-card-line pt-3">
      <p className="text-body-sm text-ink-secondary">Mapped hazards · study area</p>
      <ul className="mt-2 space-y-2">
        {hazardFacts(hazards, area).map((fact) => (
          <li key={fact.kind} className="text-body-sm">
            {/* Stacked: the labels are long and the panel is 340 px wide. */}
            <span className="block text-ink-secondary">{fact.label}</span>
            <span className="block text-ink">{fact.statement}</span>
            <span className="block text-caption text-ink-secondary">{fact.source}. {fact.note}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-caption text-ink-secondary">{HAZARD_DISCLAIMER}</p>
    </section>
  )
}
