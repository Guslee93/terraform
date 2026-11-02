import { CONSTRAINT_DISCLAIMER, ENVELOPE_STATUS_LABEL, type EnvelopeResult, type HeightReference } from '../../features/analysis/constraints'
import type { SiteManifest } from '../../features/sites/manifest'
import { cn } from '../../lib/cn'
import { Card, CardHeader } from '../ui/Card'
import { inputClass, labelClass } from '../ui/controls'
import { CheckRow } from '../ui/Metric'
import { checkValue, type CheckSummary } from './checks'
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
}

/** §7.6 summary bar: one segment per check, ink for pass, amber for attention. */
export function CheckSummaryBar({ checks, className }: { checks: readonly CheckSummary[]; className?: string }) {
  if (checks.length === 0) return null
  return (
    <div aria-hidden="true" className={cn('flex h-1.5 gap-[3px]', className)}>
      {checks.map((check) => <span key={check.id} className={cn('flex-1', check.failing > 0 ? 'bg-warning' : 'bg-ink')} />)}
    </div>
  )
}

export function ConstraintsPanel({ envelope, limits, heightReference, onHeightReferenceChange, masses, onSelectMass, checks = [] }: ConstraintsPanelProps) {
  const attention = checks.filter((check) => check.failing > 0).length
  return (
    <Card aria-labelledby="constraints-heading" className="flex h-full flex-col overflow-y-auto px-7 pb-6 pt-6">
      <CardHeader
        id="constraints-heading"
        code="02"
        title="Constraints"
        icon="shield"
        meta={checks.length > 0 ? <span className={attention > 0 ? 'text-warning-ink' : 'text-ink'}>{attention} / {checks.length}</span> : 'Not evaluated'}
      />
      <section aria-label="Envelope constraints" className="mt-4 flex flex-1 flex-col gap-4 text-body-sm">
        <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
          {checks.length > 0 && (
            <p className="flex items-end gap-3">
              <span className={cn('text-hero', attention > 0 ? 'text-warning-ink' : 'text-ink')}>{attention}/{checks.length}</span>
              <span className="pb-2 text-body text-ink-secondary">{attention === 1 ? 'check needs attention' : 'checks need attention'}</span>
            </p>
          )}
          <div className="pb-2">
            <h3 aria-live="polite" className="text-title text-ink">{ENVELOPE_STATUS_LABEL[envelope?.status ?? 'not-evaluated']}</h3>
            {/* Claim policy (D34): the disclaimer sits directly after every status. */}
            <p className="mt-1 text-label text-ink-secondary">{envelope?.disclaimer ?? CONSTRAINT_DISCLAIMER}</p>
          </div>
        </div>
        <CheckSummaryBar checks={checks} />

        {checks.length > 0 && (
          <ul aria-label="Limits" className="space-y-1">
            {checks.map((check) => (
              <li key={check.id}>
                <CheckRow status={check.failing > 0 ? 'attention' : 'pass'} label={check.label} value={checkValue(check)} />
                <span aria-hidden="true" className="block h-1 bg-muted-fill">
                  <span
                    className={cn('block h-full', check.failing > 0 ? 'bg-warning' : 'bg-positive')}
                    style={{ width: `${((check.failing > 0 ? check.failing : check.evaluated) / check.evaluated) * 100}%` }}
                  />
                </span>
              </li>
            ))}
          </ul>
        )}

        {envelope?.perVolume.some((volume) => volume.status === 'exceeds') && (
          <div>
            <p className={labelClass}>Masses outside the envelope</p>
            {envelope.perVolume.filter((volume) => volume.status === 'exceeds').map((volume) => (
              <CheckRow
                key={volume.volumeId}
                status="attention"
                title={envelope.disclaimer}
                onClick={() => onSelectMass(volume.volumeId)}
                label={<><span className="block font-medium">{masses.find((mass) => mass.id === volume.volumeId)?.name ?? 'Mass'}</span>
                  <span className="block">{volume.reasons.map((reason) => reason === 'outside-setback' ? 'outside the setback'
                    : reason === 'outside-boundary' ? 'outside the study area'
                    : `${formatMetres(volume.heightExcessM)} above the limit (above ${envelope.heightReference}, ref ${formatMetres(volume.referenceElevationM).replace('-', '−')})`).join(' · ')}</span></>}
              />
            ))}
          </div>
        )}

        <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {limits && <p className="font-mono tabular-nums text-ink">Max height {formatMetres(limits.maxHeightMeters)} · Setback {formatMetres(limits.setbackMeters)}</p>}
          <label className="block"><span className={labelClass}>Height measured from</span>
            <select value={heightReference} aria-describedby="height-reference-hint" onChange={(event) => {
              const value = event.target.value
              if (value === 'grade' || value === 'datum') onHeightReferenceChange(value)
            }} className={cn(inputClass, 'mt-1')}>
              <option value="grade">Grade</option><option value="datum">Datum</option>
            </select>
          </label>
        </div>
        <p id="height-reference-hint" className="text-ink-secondary">Grade: lowest ground under the building. Datum: site origin.</p>
      </section>
    </Card>
  )
}
