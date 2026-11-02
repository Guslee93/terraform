import { CONSTRAINT_DISCLAIMER, ENVELOPE_STATUS_LABEL, type EnvelopeResult, type HeightReference } from '../../features/analysis/constraints'
import type { ClearanceIssue } from '../../features/massing/clearance'
import type { SiteManifest } from '../../features/sites/manifest'
import { cn } from '../../lib/cn'
import type { CheckSummary } from './checks'
import type { MassListItem } from './MassList'
import { formatMetres } from './format'

export type ConstraintsPanelProps = {
  envelope: EnvelopeResult | null
  limits: SiteManifest['constraints'] | null
  heightReference: HeightReference
  onHeightReferenceChange: (reference: HeightReference) => void
  masses: readonly MassListItem[]
  onSelectMass: (id: string) => void
  checks?: readonly CheckSummary[]
  clearance?: ReadonlyMap<string, readonly ClearanceIssue[]>
}

type Issue = { key: string; volumeId: string; text: string; value: string; detail?: string }

/** One row per problem the app already found: envelope reasons, then terrain clearance. */
export function listIssues(
  envelope: EnvelopeResult | null,
  limits: SiteManifest['constraints'] | null,
  clearance: ReadonlyMap<string, readonly ClearanceIssue[]>,
  nameOf: (id: string) => string,
): Issue[] {
  const issues: Issue[] = []
  for (const volume of envelope?.perVolume ?? []) {
    const name = nameOf(volume.volumeId)
    for (const reason of volume.reasons) {
      if (reason === 'too-tall') {
        issues.push({
          key: `${volume.volumeId}-tall`,
          volumeId: volume.volumeId,
          text: `${name} is ${formatMetres(volume.heightExcessM)} above the limit`,
          value: limits ? `${formatMetres(limits.maxHeightMeters)} max` : '',
          // ADR-0008: the reference is always stated next to a height result.
          detail: `Above ${envelope?.heightReference ?? 'grade'}, ref ${formatMetres(volume.referenceElevationM).replace('-', '−')}`,
        })
      } else if (reason === 'outside-setback') {
        issues.push({ key: `${volume.volumeId}-setback`, volumeId: volume.volumeId, text: `${name} is outside the setback`, value: limits ? formatMetres(limits.setbackMeters) : '' })
      } else {
        issues.push({ key: `${volume.volumeId}-boundary`, volumeId: volume.volumeId, text: `${name} is outside the study area`, value: 'Boundary' })
      }
    }
  }
  for (const [volumeId, list] of clearance) {
    for (const issue of list) {
      if (issue.kind !== 'floating' && issue.kind !== 'cut') continue
      issues.push({ key: `${volumeId}-${issue.kind}`, volumeId, text: `${nameOf(volumeId)}: ${issue.message.toLowerCase()}`, value: issue.amount === undefined ? 'Terrain' : formatMetres(issue.amount) })
    }
  }
  return issues
}

/** Panel section 1 (draft 4): the design check, led by how many checks need attention. */
export function ConstraintsPanel({ envelope, limits, heightReference, onHeightReferenceChange, masses, onSelectMass, checks = [], clearance = new Map() }: ConstraintsPanelProps) {
  const attention = checks.filter((check) => check.failing > 0).length
  const nameOf = (id: string) => masses.find((mass) => mass.id === id)?.name ?? 'Mass'
  const issues = listIssues(envelope, limits, clearance, nameOf)
  const passes = checks.filter((check) => check.failing === 0)

  return (
    <section aria-label="Envelope constraints" className="px-6 pb-5 pt-5">
      <h2 className="text-caption text-ink-secondary">Design check</h2>
      {checks.length > 0 ? (
        <p className="mt-2 flex items-end gap-4">
          <span className="text-figure-l text-ink">{attention}<sup className="ml-1 align-[0.9em] text-body text-ink-secondary">/{checks.length}</sup></span>
          <span className="flex items-start gap-2 pb-1 text-body leading-snug">
            <span aria-hidden="true" className={cn('mt-[7px] size-[7px] shrink-0 rounded-pill', attention > 0 ? 'bg-warning' : 'bg-positive')} />
            {attention === 0 ? 'All checks pass' : attention === 1 ? 'check needs attention' : 'checks need attention'}
          </span>
        </p>
      ) : (
        <p className="mt-2 text-body text-ink-secondary">Draw a building to check it against the demo limits.</p>
      )}

      <div className="mt-4">
        <h3 aria-live="polite" className="text-body-sm text-ink">{ENVELOPE_STATUS_LABEL[envelope?.status ?? 'not-evaluated']}</h3>
        {/* Claim policy (D34): the disclaimer sits directly after every status. */}
        <p className="text-caption text-ink-secondary">{envelope?.disclaimer ?? CONSTRAINT_DISCLAIMER}</p>
      </div>

      {(issues.length > 0 || passes.length > 0) && (
        <ul aria-label="Checks" className="mt-3">
          {issues.map((issue) => (
            <li key={issue.key}>
              <button
                type="button"
                title="Select this mass"
                onClick={() => onSelectMass(issue.volumeId)}
                className="grid w-full grid-cols-[10px_1fr_auto] items-center gap-3 border-t border-line py-2 text-left text-body-sm text-ink transition-colors duration-200 hover:bg-surface-hover"
              >
                <span aria-hidden="true" className="size-[7px] bg-warning" />
                <span>
                  {issue.text}
                  {issue.detail && <span className="block text-caption text-ink-secondary">{issue.detail}</span>}
                  <span className="sr-only"> — needs attention</span>
                </span>
                <span className="font-mono text-caption text-warning-ink">{issue.value}</span>
              </button>
            </li>
          ))}
          {passes.map((check) => (
            <li key={check.id} className="grid grid-cols-[10px_1fr_auto] items-center gap-3 border-t border-line py-2 text-body-sm text-ink-secondary">
              <span aria-hidden="true" className="size-[7px] border border-positive" />
              <span>{check.label}<span className="sr-only"> — passes</span></span>
              <span className="font-mono text-caption text-positive">Pass</span>
            </li>
          ))}
        </ul>
      )}

      <label className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3 whitespace-nowrap">
        <span className="text-caption text-ink-secondary">Height measured from</span>
        <select value={heightReference} aria-describedby="height-reference-hint" onChange={(event) => {
          const value = event.target.value
          if (value === 'grade' || value === 'datum') onHeightReferenceChange(value)
        }} className="h-8 w-28 rounded-control border border-line bg-surface-paper px-2 text-body-sm text-ink focus:border-accent">
          <option value="grade">Grade</option><option value="datum">Datum</option>
        </select>
      </label>
      <p id="height-reference-hint" className="mt-1 text-caption text-ink-secondary">
        Grade: lowest ground under the building. Datum: site origin.
        {limits && <> Limits: {formatMetres(limits.maxHeightMeters)} height, {formatMetres(limits.setbackMeters)} setback.</>}
      </p>
    </section>
  )
}
