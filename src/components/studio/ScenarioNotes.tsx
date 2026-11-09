import { useEffect, useId, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { MAX_NOTES_LENGTH } from '../../features/massing/types'
import { inputClass } from '../ui/controls'

export function ScenarioNotes({ notes, disabled, onCommit }: { notes: string; disabled: boolean; onCommit: (notes: string) => void }) {
  const [draft, setDraft] = useState(notes)
  const id = useId()
  const commit = () => { if (draft !== notes) onCommit(draft) }
  const latest = useRef(commit)
  latest.current = commit
  // Closing or reloading the tab fires no blur: commit the draft first. Capture phase on window
  // runs before the autosave's own visibilitychange/pagehide flush, and flushSync lets the commit
  // (and the effect that queues it for saving) land before that flush reads the pending edits.
  useEffect(() => {
    const save = (event: Event) => {
      if (event.type === 'visibilitychange' && document.visibilityState !== 'hidden') return
      flushSync(() => latest.current())
    }
    window.addEventListener('visibilitychange', save, true)
    window.addEventListener('pagehide', save, true)
    return () => {
      window.removeEventListener('visibilitychange', save, true)
      window.removeEventListener('pagehide', save, true)
    }
  }, [])
  return <section className="px-6 pb-4">
    <label htmlFor={id} className="text-caption text-ink-secondary">Notes</label>
    <textarea id={id} value={draft} maxLength={MAX_NOTES_LENGTH} disabled={disabled} aria-describedby={`${id}-limit`} className={`${inputClass} mt-2 h-20 py-2 font-sans`} onChange={(event) => setDraft(event.target.value)} onBlur={commit} />
    <p id={`${id}-limit`} className="text-caption text-ink-secondary">{draft.length} / {MAX_NOTES_LENGTH.toLocaleString('en-GB')} characters</p>
  </section>
}
