import { useId, useState } from 'react'
import { tierHeight } from '../../features/massing/aggregate'
import type { MassTier, MassVolume } from '../../features/massing/types'
import { removeVolume, updateTier } from '../../features/editor/commands'
import type { MassingCommand } from '../../features/editor/history'
import { parseStoreys } from '../../features/editor/inspectorInput'
import { inputClass, labelClass, textButtonSmClass } from '../ui/controls'

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
          type="number"
          min={1}
          step={1}
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

export function MassFields({ volume, tier, disabled, onCommand }: {
  volume: MassVolume
  tier: MassTier
  disabled: boolean
  onCommand: (command: MassingCommand) => string | null
}) {
  const [error, setError] = useState<string | null>(null)
  return <div className="space-y-3">
    <Field label="Storeys" value={String(tier.storeys)} inputMode="numeric" disabled={disabled} onCommit={(text) => {
      const storeys = parseStoreys(text)
      return storeys === null ? 'Enter a positive whole number of storeys.' : onCommand(updateTier(volume.id, tier.id, { storeys }))
    }} />
    <p className="text-body-sm text-ink-secondary">Height · {tierHeight(tier).toFixed(1)} m</p>
    <button type="button" className={textButtonSmClass} disabled={disabled} onClick={() => setError(onCommand(removeVolume(volume.id)))}>Delete</button>
    {error && <p role="status" className="text-body-sm text-danger">{error}</p>}
  </div>
}
