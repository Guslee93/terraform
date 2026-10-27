import { useId, useState, type ReactNode } from 'react'
import { parseMetres } from '../../lib/coordinates'
import { tierFootprintArea, tierHeight } from '../../features/massing/aggregate'
import type { ClearanceIssue } from '../../features/massing/clearance'
import type { MassTier, MassUse, MassVolume } from '../../features/massing/types'
import { USES } from '../../features/massing/validation'
import {
  duplicateVolume,
  removeVolume,
  rotateVolume,
  updateTier,
  updateVolume,
} from '../../features/editor/commands'
import type { MassingCommand } from '../../features/editor/history'
import { formatInputValue, parseStoreys } from '../../features/editor/inspectorInput'
import { Icon } from '../ui/Icon'

type MassFieldsProps = {
  volume: MassVolume
  tier: MassTier
  /** Editing off (small screens or an open gesture). */
  disabled: boolean
  /** Applies a command, or returns why it was refused (the document stays unchanged). */
  onCommand: (command: MassingCommand) => string | null
  /** Clearance warnings for this mass (boundary, slope). */
  warnings?: readonly ClearanceIssue[]
}

const USE_LABELS: Record<MassUse, string> = {
  residential: 'Residential',
  commercial: 'Commercial',
  mixed: 'Mixed',
  civic: 'Civic',
  other: 'Other',
}

const labelClass = 'text-[10px] uppercase tracking-[0.12em] text-ink-secondary'
const actionClass =
  'inline-flex h-7 items-center justify-center gap-1 rounded-[var(--radius-control)] border border-line bg-surface px-2 text-[11px] text-ink transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-45'
const ROTATE_STEP = Math.PI / 12
/** Gap between an original and its duplicate, in metres. */
const DUPLICATE_GAP_M = 5
const controlClass =
  'h-8 w-full rounded-[var(--radius-control)] border border-line bg-surface px-2 text-[12px] tabular-nums text-ink transition-colors disabled:cursor-not-allowed disabled:opacity-45 aria-[invalid=true]:border-danger'

/**
 * Text field that commits on Enter or blur and reverts on Escape. When `onCommit` reports a
 * problem, the field returns to the last valid value and shows the reason below (QA-16).
 */
function Field({
  label,
  value,
  unit,
  disabled,
  inputMode,
  onCommit,
}: {
  label: string
  value: string
  unit?: string
  disabled: boolean
  inputMode?: 'numeric' | 'decimal'
  onCommit: (text: string) => string | null
}) {
  const id = useId()
  const [draft, setDraft] = useState(value)
  const [shown, setShown] = useState(value)
  const [error, setError] = useState<string | null>(null)
  if (value !== shown) {
    // The model changed (commit, undo, another tool): show it.
    setShown(value)
    setDraft(value)
  }

  const commit = () => {
    if (draft === value) return
    const problem = onCommit(draft)
    setError(problem)
    if (problem) setDraft(value)
  }

  return (
    <div className="min-w-0">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="relative mt-1">
        <input
          id={id}
          type="text"
          inputMode={inputMode}
          autoComplete="off"
          value={draft}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commit()
            }
            if (event.key === 'Escape') {
              setDraft(value)
              setError(null)
            }
          }}
          className={unit ? `${controlClass} pr-6` : controlClass}
        />
        {unit && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-2 grid place-items-center text-[11px] text-ink-secondary"
          >
            {unit}
          </span>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} aria-live="polite" className="mt-1 text-[10.5px] leading-snug text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

function Toggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string
  checked: boolean
  disabled: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-[6px] px-1.5 py-1.5 text-[11.5px] text-ink transition-colors hover:bg-surface-muted has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-45">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="size-3.5 accent-[var(--accent)]"
      />
    </label>
  )
}

function Readout({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line/70 py-2 last:border-b-0">
      <dt className={labelClass}>{label}</dt>
      <dd className="text-[11.5px] font-medium tabular-nums text-ink">{children}</dd>
    </div>
  )
}

export function MassFields({ volume, tier, disabled, onCommand, warnings = [] }: MassFieldsProps) {
  const [panelError, setPanelError] = useState<string | null>(null)
  // A locked mass keeps rename, visibility and unlock (ADR-0004 §3 amendment).
  const geometryDisabled = disabled || volume.locked
  const useFieldId = useId()

  const tierCommand = (patch: Parameters<typeof updateTier>[2]) =>
    onCommand(updateTier(volume.id, tier.id, patch))
  const volumeCommand = (patch: Parameters<typeof updateVolume>[1]) =>
    onCommand(updateVolume(volume.id, patch))
  const metres = (text: string, apply: (value: number) => string | null) => {
    const value = parseMetres(text)
    return value === null ? 'Enter a number in metres.' : apply(value)
  }

  // Place the copy east of the original, clear of its widest tier.
  const easts = volume.tiers.flatMap((candidate) => candidate.footprint.vertices.map(([east]) => east))
  const duplicateOffset = Math.max(...easts) - Math.min(...easts) + DUPLICATE_GAP_M

  return (
    <div className="space-y-3 text-left">
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setPanelError(onCommand(duplicateVolume(volume.id, { offset: [duplicateOffset, 0] })))}
          className={actionClass}
        >
          Duplicate
        </button>
        <button
          type="button"
          aria-label="Rotate 15° counter-clockwise"
          title="Rotate 15° counter-clockwise"
          disabled={geometryDisabled}
          onClick={() => setPanelError(onCommand(rotateVolume(volume.id, ROTATE_STEP)))}
          className={actionClass}
        >
          <Icon name="rotate" size={13} className="-scale-x-100" />
          15°
        </button>
        <button
          type="button"
          aria-label="Rotate 15° clockwise"
          title="Rotate 15° clockwise"
          disabled={geometryDisabled}
          onClick={() => setPanelError(onCommand(rotateVolume(volume.id, -ROTATE_STEP)))}
          className={actionClass}
        >
          <Icon name="rotate" size={13} />
          15°
        </button>
        <button
          type="button"
          disabled={geometryDisabled}
          onClick={() => setPanelError(onCommand(removeVolume(volume.id)))}
          className={`${actionClass} ml-auto`}
        >
          Delete
        </button>
      </div>

      <Field
        label="Name"
        value={volume.name}
        disabled={disabled}
        onCommit={(text) => volumeCommand({ name: text.trim() })}
      />

      <div className="grid grid-cols-2 gap-2.5">
        <Field
          label="Storeys"
          value={String(tier.storeys)}
          inputMode="numeric"
          disabled={geometryDisabled}
          onCommit={(text) => {
            const storeys = parseStoreys(text)
            return storeys === null ? 'Enter a whole number of storeys.' : tierCommand({ storeys })
          }}
        />
        <Field
          label="Storey height"
          value={formatInputValue(tier.storeyHeight)}
          unit="m"
          inputMode="decimal"
          disabled={geometryDisabled}
          onCommit={(text) => metres(text, (storeyHeight) => tierCommand({ storeyHeight }))}
        />
        <Field
          label="Base elevation"
          value={formatInputValue(tier.baseElevation)}
          unit="m"
          inputMode="decimal"
          disabled={geometryDisabled}
          onCommit={(text) => metres(text, (baseElevation) => tierCommand({ baseElevation }))}
        />
        <div className="min-w-0">
          <label htmlFor={useFieldId} className={labelClass}>
            Use
          </label>
          <select
            id={useFieldId}
            value={tier.use}
            disabled={geometryDisabled}
            onChange={(event) => {
              const use = USES.find((candidate) => candidate === event.target.value)
              if (use) setPanelError(tierCommand({ use }))
            }}
            className={`${controlClass} mt-1`}
          >
            {USES.map((use) => (
              <option key={use} value={use}>
                {USE_LABELS[use]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-0.5">
        <Toggle
          label="Visible"
          checked={volume.visible}
          disabled={disabled}
          onChange={(visible) => setPanelError(volumeCommand({ visible }))}
        />
        <Toggle
          label="Locked"
          checked={volume.locked}
          disabled={disabled}
          onChange={(locked) => setPanelError(volumeCommand({ locked }))}
        />
      </div>

      {panelError && (
        <p aria-live="polite" className="text-[10.5px] leading-snug text-danger">
          {panelError}
        </p>
      )}

      {warnings.length > 0 && (
        <div className="rounded-[6px] border border-warning/40 bg-warning/10 px-2.5 py-2">
          <ul aria-label="Clearance warnings" className="space-y-0.5 text-[11px] leading-snug text-warning-ink">
            {warnings.map((warning) => (
              <li key={warning.kind}>{warning.message}</li>
            ))}
          </ul>
          <p className="mt-1 text-[10px] text-warning-ink/80">Illustrative check · not planning advice</p>
        </div>
      )}

      <dl>
        <Readout label="Height">{tierHeight(tier).toFixed(1)} m</Readout>
        <Readout label="Footprint">{Math.round(tierFootprintArea(tier))} m²</Readout>
      </dl>
      <p className="text-[10px] leading-relaxed text-ink-secondary">
        Base elevation is relative to the site origin. Values derive from the model geometry.
      </p>
    </div>
  )
}
