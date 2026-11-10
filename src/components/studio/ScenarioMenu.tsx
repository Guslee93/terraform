import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { evaluateEnvelope, ENVELOPE_STATUS_LABEL, type EnvelopeSite } from '../../features/analysis/constraints'
import { floorLevels, scenarioMetrics } from '../../features/massing/metrics'
import { ConfirmDialog, type Confirmation } from '../ui/ConfirmDialog'
import { inputClass, textButtonSmClass } from '../ui/controls'
import { Icon } from '../ui/Icon'
import { formatArea } from './format'
import type { ScenarioProject } from './useScenarioProject'

export function ScenarioMenu({ project, site }: { project: ScenarioProject; site: EnvelopeSite | null }) {
  const [open, setOpen] = useState(false)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const restoreTrigger = useRef(false)
  useEffect(() => {
    if (!confirmation && restoreTrigger.current) {
      restoreTrigger.current = false
      trigger.current?.focus()
    }
  }, [confirmation])
  const renameButtons = useRef(new Map<string, HTMLButtonElement>())
  const renameFocus = useRef<string | null>(null)
  const finishRename = (scenarioId: string) => {
    renameFocus.current = scenarioId
    setRenaming(null)
  }
  useLayoutEffect(() => {
    if (renameFocus.current) {
      (renameButtons.current.get(renameFocus.current) ?? trigger.current)?.focus()
      renameFocus.current = null
    } else if (renaming && !project.scenarios.some((scenario) => scenario.id === renaming)) {
      trigger.current?.focus()
    }
  })
  const id = useId()
  const disabled = !project.ready || project.editor.interaction.kind !== 'idle'
  const close = () => { setOpen(false); setRenaming(null); setError(null); trigger.current?.focus() }
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) { setOpen(false); setRenaming(null) }
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])
  const confirm = (value: Confirmation) => { setConfirmation(value); setOpen(false) }
  return (
    <div ref={root} className="relative" onBlur={(event) => {
      // Only when focus lands on another element outside the menu. A click on plain text inside the
      // menu also blurs with no target (relatedTarget null) and must not close it; real outside
      // clicks are handled by the document listener.
      if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) {
        setOpen(false); setRenaming(null); setError(null)
      }
    }} onKeyDown={(event) => {
      if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); close() }
      if (!open || event.target instanceof HTMLInputElement) return
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        const rows = Array.from(root.current?.querySelectorAll<HTMLButtonElement>('[data-scenario-row]') ?? [])
        const index = rows.findIndex((row) => row === document.activeElement)
        const next = index < 0 ? (event.key === 'ArrowDown' ? 0 : rows.length - 1) : (index + (event.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length
        rows[next]?.focus()
      }
    }}>
      <button data-guide="scenarios" ref={trigger} type="button" aria-expanded={open} aria-controls={id} disabled={!project.ready} onClick={() => open ? close() : setOpen(true)} className="inline-flex min-h-9 items-center gap-2 text-body-sm text-ink disabled:text-ink-disabled">
        {project.editor.history.document.name}<Icon name="chevron-down" size={12} />
      </button>
      {open && <div id={id} role="group" aria-label="Scenarios" className="fixed inset-x-4 top-28 z-40 sm:absolute sm:inset-x-auto sm:left-0 sm:top-full sm:mt-2 max-h-[70dvh] w-[min(360px,calc(100vw-32px))] overflow-y-auto rounded-panel border border-card-line bg-card p-3 shadow-float">
        <ul>
          {project.scenarios.map((scenario) => {
            const shown = { ...scenario, volumes: scenario.volumes.filter((volume) => volume.visible) }
            const metrics = site ? scenarioMetrics(shown, site.studyArea) : null
            const status = site ? evaluateEnvelope(shown, site).status : null
            const floors = shown.volumes.reduce((sum, volume) => sum + floorLevels(volume.tiers).length, 0)
            return <li key={scenario.id} className="border-b border-line py-2">
              <button type="button" data-scenario-row disabled={disabled} aria-current={project.activeId === scenario.id ? 'true' : undefined} onClick={() => { project.actions.switchTo(scenario.id); close() }} className="flex w-full items-center gap-2 py-2 text-left text-body-sm disabled:text-ink-disabled">
                <span aria-hidden="true" className={project.activeId === scenario.id ? 'size-2 bg-accent' : 'size-2'} />
                <span className="min-w-0 flex-1 break-words">{scenario.name}</span>
                {status && <span title={ENVELOPE_STATUS_LABEL[status]}><span className="sr-only">{ENVELOPE_STATUS_LABEL[status]}</span><span aria-hidden="true" className={`block size-1.5 rounded-full ${status === 'exceeds' ? 'bg-warning' : status === 'within' ? 'bg-positive' : 'bg-ink-secondary'}`} /></span>}
              </button>
              <p className="ml-4 text-caption text-ink-secondary">{floors} floors · Concept GFA {metrics ? formatArea(metrics.gfaM2) : 'unavailable'}</p>
              {renaming === scenario.id ? <form className="mt-2" onSubmit={(event) => {
                event.preventDefault()
                const problem = project.actions.rename(scenario.id, name)
                setError(problem)
                if (!problem) finishRename(scenario.id)
              }}>
                <label className="sr-only" htmlFor={`${id}-name`}>Scenario name</label>
                <input autoFocus id={`${id}-name`} className={inputClass} value={name} disabled={disabled} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); finishRename(scenario.id); setError(null) } }} />
                {error && <p id={`${id}-error`} role="alert" className="text-caption text-warning-ink">{error}</p>}
                <button type="submit" disabled={disabled} className={textButtonSmClass}>Save name</button>
              </form> : <div className="ml-4 flex flex-wrap gap-x-4">
                <button ref={(button) => { if (button) renameButtons.current.set(scenario.id, button); else renameButtons.current.delete(scenario.id) }} type="button" disabled={disabled} className={textButtonSmClass} onClick={() => { setRenaming(scenario.id); setName(scenario.name); setError(null) }}>Rename</button>
                <button type="button" disabled={disabled} className={textButtonSmClass} onClick={() => { project.actions.duplicate(scenario.id); close() }}>Duplicate</button>
                <button type="button" disabled={disabled} className={textButtonSmClass} onClick={() => confirm({ title: `Reset ${scenario.name}?`, message: 'Remove the buildings and notes from this scenario?', action: 'Reset scenario', onConfirm: () => project.actions.resetScenario(scenario.id) })}>Reset</button>
                {project.canRemove && <button type="button" disabled={disabled} className={textButtonSmClass} onClick={() => confirm({ title: `Delete ${scenario.name}?`, message: 'This removes the scenario and its undo history.', action: 'Delete scenario', onConfirm: async () => { const problem = await project.actions.remove(scenario.id); if (problem) throw new Error(problem) } })}>Delete</button>}
              </div>}
            </li>
          })}
        </ul>
        <div className="flex justify-between gap-3 pt-2">
          <button type="button" disabled={disabled} className={textButtonSmClass} onClick={() => { project.actions.create(); close() }}>New scenario</button>
          <button type="button" disabled={disabled || project.storage === 'read-only'} className={textButtonSmClass} onClick={() => confirm({ title: 'Reset demo?', message: 'Remove every scenario for this site and start again with empty Concept A and B?', action: 'Reset demo', onConfirm: project.actions.resetDemo })}>Reset demo…</button>
        </div>
      </div>}
      {confirmation && <ConfirmDialog confirmation={confirmation} onClose={() => { restoreTrigger.current = true; setConfirmation(null) }} />}
    </div>
  )
}
