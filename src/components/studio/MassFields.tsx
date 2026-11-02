import { useId, useState, type ReactNode } from 'react'
import { parseMetres } from '../../lib/coordinates'
import { tierFootprintArea, tierHeight, tierTop } from '../../features/massing/aggregate'
import type { ClearanceIssue } from '../../features/massing/clearance'
import type { MassTier, MassUse, MassVolume } from '../../features/massing/types'
import { USES } from '../../features/massing/validation'
import {
  duplicateVolume,
  removeTier,
  removeVolume,
  rotateVolume,
  stackTier,
  updateTier,
  updateVolume,
} from '../../features/editor/commands'
import type { MassingCommand } from '../../features/editor/history'
import { formatInputValue, parseStoreys } from '../../features/editor/inspectorInput'
import { Icon } from '../ui/Icon'
import { checkboxClass, inputClass, labelClass, textButtonSmClass } from '../ui/controls'

type MassFieldsProps = {
  volume: MassVolume
  tier: MassTier
  /** Editing off (small screens or an open gesture). */
  disabled: boolean
  /** Applies a command, or returns why it was refused (the document stays unchanged). */
  onCommand: (command: MassingCommand) => string | null
  /** Clearance warnings for this mass (boundary, slope). */
  warnings?: readonly ClearanceIssue[]
  onSelectTier: (tierId: string) => void
}

const USE_LABELS: Record<MassUse, string> = {
  residential: 'Residential',
  commercial: 'Commercial',
  mixed: 'Mixed',
  civic: 'Civic',
  other: 'Other',
}

const actionClass = textButtonSmClass
const ROTATE_STEP = Math.PI / 12
/** Gap between an original and its duplicate, in metres. */
const DUPLICATE_GAP_M = 5
const controlClass = inputClass

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
            className="pointer-events-none absolute inset-y-0 right-2 grid place-items-center text-body-sm text-ink-secondary"
          >
            {unit}
          </span>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} aria-live="polite" className="mt-1 text-body-sm leading-snug text-danger">
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
    <label className="flex min-h-9 cursor-pointer items-center justify-between gap-3 text-body-sm text-ink has-[:disabled]:cursor-not-allowed has-[:disabled]:text-ink-disabled">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className={checkboxClass}
      />
    </label>
  )
}

function Readout({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-2 last:border-b-0">
      <dt className={labelClass}>{label}</dt>
      <dd className="font-mono text-body-sm tabular-nums text-ink">{children}</dd>
    </div>
  )
}

export function MassFields({
  volume,
  tier,
  disabled,
  onCommand,
  warnings = [],
  onSelectTier,
}: MassFieldsProps) {
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

  const tiers = [...volume.tiers].sort((a, b) => a.baseElevation - b.baseElevation)
  const groundTier = tiers[0]
  // Only the topmost tier can be removed, so no tier is left hanging over a gap.
  const isTopTier =
    tiers.length > 1 && tier.id !== groundTier?.id && tierTop(tier) >= Math.max(...tiers.map(tierTop))

  // Place the copy east of the original, clear of its widest tier.
  const easts = volume.tiers.flatMap((candidate) => candidate.footprint.vertices.map(([east]) => east))
  const duplicateOffset = Math.max(...easts) - Math.min(...easts) + DUPLICATE_GAP_M

  return (
    <div className="space-y-3 text-left">
      <div className="flex flex-wrap gap-x-4 gap-y-1">
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
          disabled={geometryDisabled}
          onClick={() => setPanelError(onCommand(stackTier(volume.id)))}
          className={actionClass}
        >
          Add tier
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

      {tiers.length > 1 && (
        <div className="flex items-center gap-1.5">
          <div role="group" aria-label="Tiers" className="flex flex-wrap gap-1">
            {tiers.map((candidate, index) => (
              <button
                key={candidate.id}
                type="button"
                aria-pressed={candidate.id === tier.id}
                onClick={() => onSelectTier(candidate.id)}
                className={`${actionClass} border-transparent aria-pressed:border-ink`}
              >
                Tier {index + 1}
              </button>
            ))}
          </div>
          {isTopTier && groundTier && (
            <button
              type="button"
              disabled={geometryDisabled}
              onClick={() =>
                setPanelError(
                  onCommand({
                    ...removeTier(volume.id, tier.id),
                    selectionAfter: { volumeId: volume.id, tierId: groundTier.id },
                  }),
                )
              }
              className={`${actionClass} ml-auto`}
            >
              Remove tier
            </button>
          )}
        </div>
      )}

      <Field
        label="Name"
        value={volume.name}
        disabled={disabled}
        onCommit={(text) => volumeCommand({ name: text.trim() })}
      />

      <div className="grid grid-cols-2 gap-3">
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
        <p aria-live="polite" className="text-body-sm leading-snug text-danger">
          {panelError}
        </p>
      )}

      {warnings.length > 0 && (
        <div className="rounded-control bg-warning-soft px-2.5 py-2">
          <ul aria-label="Clearance warnings" className="space-y-0.5 text-body-sm leading-snug text-warning-ink">
            {warnings.map((warning) => (
              <li key={warning.kind}>{warning.message}</li>
            ))}
          </ul>
          <p className="mt-1 text-body-sm text-warning-ink">Illustrative check · not planning advice</p>
        </div>
      )}

      <dl>
        <Readout label="Height">{tierHeight(tier).toFixed(1)} m</Readout>
        <Readout label="Footprint">{Math.round(tierFootprintArea(tier))} m²</Readout>
      </dl>
      <p className="text-body-sm leading-relaxed text-ink-secondary">
        Base elevation is relative to the site origin. Values derive from the model geometry.
      </p>
    </div>
  )
}
