import { useId, useState, type ReactNode } from 'react'
import { parseMetres } from '../../lib/coordinates'
import { tierFootprintArea, tierHeight } from '../../features/massing/aggregate'
import type { MassTier, MassUse, MassVolume } from '../../features/massing/types'
import { USES } from '../../features/massing/validation'
import { updateTier, updateVolume } from '../../features/editor/commands'
import type { MassingCommand } from '../../features/editor/history'
import { formatInputValue, parseStoreys } from '../../features/editor/inspectorInput'

type MassFieldsProps = {
  volume: MassVolume
  tier: MassTier
  /** Editing off (small screens or an open gesture). */
  disabled: boolean
  /** Applies a command, or returns why it was refused (the document stays unchanged). */
  onCommand: (command: MassingCommand) => string | null
}

const USE_LABELS: Record<MassUse, string> = {
  residential: 'Residential',
  commercial: 'Commercial',
  mixed: 'Mixed',
  civic: 'Civic',
  other: 'Other',
}

const labelClass = 'text-[10px] uppercase tracking-[0.12em] text-ink-secondary'
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

export function MassFields({ volume, tier, disabled, onCommand }: MassFieldsProps) {
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

  return (
    <div className="space-y-3 text-left">
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
