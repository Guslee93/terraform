import { useEffect, useId, useRef, useState } from 'react'
import { textButtonSmClass } from './controls'

export type Confirmation = { title: string; message: string; action: string; onConfirm: () => void | Promise<void> }

/** Native modal: focus trapping, Escape cancellation and focus restoration belong to the browser. */
export function ConfirmDialog({ confirmation, onClose }: { confirmation: Confirmation; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])
  return (
    <dialog ref={ref} aria-labelledby={titleId} onCancel={(event) => { if (busy) event.preventDefault(); else onClose() }} className="m-auto w-[min(420px,calc(100%-32px))] rounded-card border border-line bg-surface p-6 text-ink backdrop:bg-ink/30">
      <h2 id={titleId} className="text-title">{confirmation.title}</h2>
      <p className="mt-3 text-body-sm">{confirmation.message}</p>
      {error && <p role="alert" className="mt-3 text-body-sm text-warning-ink">{error}</p>}
      <div className="mt-5 flex justify-end gap-6">
        <button autoFocus type="button" disabled={busy} className={textButtonSmClass} onClick={onClose}>Cancel</button>
        <button type="button" disabled={busy} className="min-h-9 border-b border-current text-body-sm text-danger disabled:opacity-50" onClick={async () => {
          setBusy(true)
          try { await confirmation.onConfirm(); onClose() }
          catch (problem) { setError(problem instanceof Error ? problem.message : 'The action could not be completed.'); setBusy(false) }
        }}>{busy ? 'Working…' : confirmation.action}</button>
      </div>
    </dialog>
  )
}
