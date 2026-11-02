import { useCallback, useEffect, useRef, useState } from 'react'

export const STUDIO_GUIDE_KEY = 'terraform:studio-guide-dismissed:v1'

export function readGuideDismissed(): boolean {
  try {
    return window.localStorage.getItem(STUDIO_GUIDE_KEY) === 'true'
  } catch {
    return false
  }
}

const steps = [
  'Choose Draw building in the toolbar to draw a mass on the site.',
  'Move the Local time slider below the scene to move the sun.',
  'Open the concept menu in the top bar, choose Duplicate, then choose Compare.',
]
const actionClass = 'min-h-9 text-body-sm underline underline-offset-4 hover:text-ink-secondary'

/** In-flow and non-modal: the studio stays available throughout the guide. */
export function StudioGuide({ onClose, onShowControl }: {
  onClose: () => void
  onShowControl: (step: number) => void
}) {
  const [step, setStep] = useState(0)
  const region = useRef<HTMLElement>(null)
  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(STUDIO_GUIDE_KEY, 'true')
    } catch {
      // The guide still closes for this visit when storage is unavailable.
    }
    onClose()
  }, [onClose])

  useEffect(() => {
    const previous = document.activeElement
    region.current?.focus()
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus()
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Do not consume Escape: editing and menus retain their own cancellation.
      if (event.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [dismiss])

  return (
    <section ref={region} tabIndex={-1} aria-label="Studio guide" className="mx-4 mb-2 flex shrink-0 flex-wrap items-center gap-x-5 gap-y-1 rounded-chip border border-line bg-surface px-4 py-2">
      <div className="min-w-0 flex-1" aria-live="polite" aria-atomic="true">
        <p className="text-caption text-ink-secondary">Studio guide · {step + 1} of 3</p>
        <p className="text-body-sm">{steps[step]}</p>
      </div>
      <div className="flex flex-wrap gap-x-5">
        <button type="button" className={actionClass} onClick={() => onShowControl(step)}>Show control</button>
        <button type="button" className={actionClass} onClick={() => step === steps.length - 1 ? dismiss() : setStep(step + 1)}>{step === steps.length - 1 ? 'Finish' : 'Next'}</button>
        <button type="button" className={actionClass} onClick={dismiss}>Skip</button>
      </div>
    </section>
  )
}
