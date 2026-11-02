import { useId, useState } from 'react'
import { MAX_NOTES_LENGTH } from '../../features/massing/types'
import { inputClass } from '../ui/controls'

export function ScenarioNotes({ notes, disabled, onCommit }: { notes: string; disabled: boolean; onCommit: (notes: string) => void }) {
  const [draft, setDraft] = useState(notes)
  const id = useId()
  return <section className="px-6 pb-4">
    <label htmlFor={id} className="text-caption text-ink-secondary">Notes</label>
    <textarea id={id} value={draft} maxLength={MAX_NOTES_LENGTH} disabled={disabled} aria-describedby={`${id}-limit`} className={`${inputClass} mt-2 h-20 py-2 font-sans`} onChange={(event) => setDraft(event.target.value)} onBlur={() => { if (draft !== notes) onCommit(draft) }} />
    <p id={`${id}-limit`} className="text-caption text-ink-secondary">{draft.length} / {MAX_NOTES_LENGTH.toLocaleString('en-GB')} characters</p>
  </section>
}
