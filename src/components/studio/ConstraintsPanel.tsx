import { CONSTRAINT_DISCLAIMER, ENVELOPE_STATUS_LABEL, type EnvelopeResult, type HeightReference } from '../../features/analysis/constraints'
import type { SiteManifest } from '../../features/sites/manifest'
import type { MassListItem } from './MassList'
import { formatMetres } from './format'

export type ConstraintsPanelProps = {
  envelope: EnvelopeResult | null
  limits: SiteManifest['constraints'] | null
  heightReference: HeightReference
  onHeightReferenceChange: (reference: HeightReference) => void
  masses: readonly MassListItem[]
  onSelectMass: (id: string) => void
}

export function ConstraintsPanel({ envelope, limits, heightReference, onHeightReferenceChange, masses, onSelectMass }: ConstraintsPanelProps) {
  return <section aria-label="Envelope constraints" className="space-y-4 text-[11.5px]">
    <div>
      <h2 aria-live="polite" className="text-[13px] font-medium">{ENVELOPE_STATUS_LABEL[envelope?.status ?? 'not-evaluated']}</h2>
      <p className="mt-1 text-[10px] leading-relaxed text-ink-secondary">{envelope?.disclaimer ?? CONSTRAINT_DISCLAIMER}</p>
    </div>
    {limits && <p className="tabular-nums">Max height {formatMetres(limits.maxHeightMeters)} · Setback {formatMetres(limits.setbackMeters)}</p>}
    <label className="block"><span className="text-[10px] uppercase tracking-[0.12em] text-ink-secondary">Height measured from</span>
      <select value={heightReference} aria-describedby="height-reference-hint" onChange={(event) => {
        const value = event.target.value
        if (value === 'grade' || value === 'datum') onHeightReferenceChange(value)
      }} className="mt-1 min-h-10 w-full rounded-[var(--radius-control)] border border-line bg-surface px-2 text-[12px]">
        <option value="grade">Grade</option><option value="datum">Datum</option>
      </select>
    </label>
    <p id="height-reference-hint" className="text-[10px] leading-relaxed text-ink-secondary">Grade: lowest ground under the building. Datum: site origin.</p>
    <div className="space-y-2">
      {envelope?.perVolume.filter((volume) => volume.status === 'exceeds').map((volume) => <button key={volume.volumeId} type="button" title={envelope.disclaimer} onClick={() => onSelectMass(volume.volumeId)} className="block min-h-10 w-full rounded-[var(--radius-control)] border border-warning/40 bg-warning/10 px-3 py-2 text-left hover:bg-surface-muted">
        <span className="block font-medium">{masses.find((mass) => mass.id === volume.volumeId)?.name ?? 'Mass'}</span>
        <span className="mt-1 block text-warning-ink">{volume.reasons.map((reason) => reason === 'outside-setback' ? 'outside the setback'
          : reason === 'outside-boundary' ? 'outside the study area'
          : `${formatMetres(volume.heightExcessM)} above the limit (above ${envelope.heightReference}, ref ${formatMetres(volume.referenceElevationM).replace('-', '−')})`).join(' · ')}</span>
      </button>)}
    </div>
  </section>
}
