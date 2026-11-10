import type { SiteFacts } from '../../features/analysis/siteFacts'
import { labelClass } from '../ui/controls'
import { formatArea, formatMetres } from './format'

/** Area figures for the study area, all derived from footprints clipped to the boundary. */
export function SiteFactsPanel({ facts }: { facts: SiteFacts | null }) {
  if (!facts) return null
  const rows: ReadonlyArray<[string, string]> = [
    ['Study area', formatArea(facts.studyAreaM2)],
    ['Buildings', String(facts.buildingCount)],
    ['Built footprint', formatArea(facts.builtM2)],
    ['Coverage', `${Math.round(facts.coverage * 100)} %`],
    ['Tallest', facts.tallestM === null ? '—' : formatMetres(facts.tallestM)],
    ['Mean height', facts.meanHeightM === null ? '—' : formatMetres(facts.meanHeightM)],
  ]
  return (
    <section aria-labelledby="site-facts-heading">
      <h2 id="site-facts-heading" className="sr-only">Study area</h2>
      <dl className="mt-2 grid grid-cols-2 gap-x-6">
        {rows.map(([label, value]) => (
          <div key={label} className="border-b border-line py-2">
            <dt className={labelClass}>{label}</dt>
            <dd className="mt-0.5 text-body text-ink tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-caption text-ink-secondary">Footprints clipped to the study boundary. Simplified map data.</p>
    </section>
  )
}
