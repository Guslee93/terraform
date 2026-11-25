import { PARCEL_AREA_NOTE, PARCEL_NOTE, PLANINNSYN_URL, parcelArea, type Parcel } from '../../features/analysis/parcels'
import { formatArea } from './format'

/**
 * The selected parcel as facts (ADR-0035): its register number, the area of its mapped outline and
 * what an outline is. Zoning is a link out: the studio shows where the plan is, never a verdict.
 */
export function ParcelFacts({ parcel, showPlanLink }: { parcel: Parcel | null; /** Oslo's planning viewer covers Oslo only. */ showPlanLink: boolean }) {
  return (
    <section aria-label="Parcel" className="mt-3 border-t border-card-line pt-3">
      <p className="text-body-sm text-ink-secondary">Parcel</p>
      {parcel ? (
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-body-sm">
          <dt className="text-ink-secondary">Property</dt>
          <dd className="tabular-nums text-ink">{parcel.matrikkel ?? 'No property number registered'}</dd>
          <dt className="text-ink-secondary">Area</dt>
          <dd className="tabular-nums text-ink">{formatArea(parcelArea(parcel))}</dd>
          {parcel.updated && <>
            <dt className="text-ink-secondary">Register updated</dt>
            <dd className="tabular-nums text-ink">{parcel.updated}</dd>
          </>}
        </dl>
      ) : (
        <p className="mt-2 text-body-sm text-ink-secondary">Click the ground to select a parcel.</p>
      )}
      <p className="mt-2 text-caption text-ink-secondary">{PARCEL_NOTE}. {PARCEL_AREA_NOTE}</p>
      {showPlanLink && (
        <a className="mt-1 inline-flex min-h-8 items-center text-caption text-ink-secondary underline underline-offset-2 hover:text-ink" href={PLANINNSYN_URL} target="_blank" rel="noreferrer">
          Zoning plans: Oslo Planinnsyn (opens the municipality’s viewer)
        </a>
      )}
    </section>
  )
}
