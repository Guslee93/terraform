import { useId, useState } from 'react'
import { isRecord, ScenarioLoadError } from '../../features/scenarios/migrate'
import { ConfirmDialog, type Confirmation } from '../ui/ConfirmDialog'
import { textButtonSmClass } from '../ui/controls'
import type { ScenarioProject } from './useScenarioProject'

export function projectFileName(siteId: string, date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `terraform_${siteId}_${date.getFullYear()}${month}${day}.json`
}

export function downloadProject(json: string, siteId: string) {
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = projectFileName(siteId)
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function RecoveryStrip({ project, siteId }: { project: ScenarioProject; siteId: string }) {
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  if (!project.ready) return null
  const failed = project.saveStatus.state === 'error'
  if (project.storage === 'persistent' && !failed && !project.skipped.length) return null
  const exportData = async (saved = false) => {
    setError(null); setBusy(true)
    try { downloadProject(saved ? await project.actions.exportSavedData() : project.actions.exportProject(), siteId) }
    catch (problem) { setError(problem instanceof Error ? problem.message : 'Export failed.') }
    finally { setBusy(false) }
  }
  return <section aria-label="Project recovery" className="border-b border-line bg-warning-soft px-6 py-4 text-body-sm text-warning-ink">
    <div aria-live="polite">
      {project.storage === 'memory' && <p>This browser can't store data, so changes last only until you close the tab.</p>}
      {project.storage === 'read-only' && <p>These scenarios were saved by a newer version of Terraform (format {project.newerVersion}) and can't be opened here. Nothing will be overwritten.</p>}
      {failed && <p>{project.saveStatus.state === 'error' && project.saveStatus.kind === 'quota' ? 'Browser storage is full.' : 'Browser storage is unavailable.'} Export a backup before closing this tab.</p>}
      {project.skipped.length > 0 && <p>{project.skipped.length} saved {project.skipped.length === 1 ? 'scenario' : 'scenarios'} couldn't be opened.</p>}
    </div>
    <div className="flex flex-wrap gap-x-4">
      <button type="button" disabled={busy} className={textButtonSmClass} onClick={() => void exportData(project.storage === 'read-only')}>{project.storage === 'read-only' ? 'Export saved data' : project.skipped.length ? 'Export raw data' : 'Export project'}</button>
      {failed && <button type="button" disabled={busy} className={textButtonSmClass} onClick={async () => { setBusy(true); try { await project.actions.flush() } finally { setBusy(false) } }}>Try again</button>}
    </div>
    {project.skipped.length > 0 && <details className="mt-2"><summary className="cursor-pointer">Details</summary><ul>
      {project.skipped.map((record) => <li key={record.id} className="mt-3 break-words">
        <p>{record.id} · {record.reason}</p><p>{record.detail}</p>
        <button type="button" className={textButtonSmClass} disabled={busy || project.editor.interaction.kind !== 'idle'} onClick={() => setConfirmation({ title: 'Discard saved record?', message: `Delete unreadable record ${record.id}? Export raw data first if you want to keep a copy.`, action: 'Discard', onConfirm: () => project.actions.discardSkipped(record.id) })}>Discard</button>
      </li>)}
    </ul></details>}
    {error && <p role="alert" className="mt-2">{error}</p>}
    {confirmation && <ConfirmDialog confirmation={confirmation} onClose={() => setConfirmation(null)} />}
  </section>
}

export function ProjectBackup({ project, siteId }: { project: ScenarioProject; siteId: string }) {
  const inputId = useId()
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const disabled = !project.ready || busy || project.editor.interaction.kind !== 'idle'
  const report = (error: unknown) => setMessage(error instanceof ScenarioLoadError
    ? `This file couldn't be imported: ${error.path} ${error.message}`
    : error instanceof Error ? error.message : 'The operation could not be completed.')
  return <div className="mt-3 border-t border-line pt-3">
    <div className="flex flex-wrap gap-4">
      <button type="button" className={textButtonSmClass} disabled={disabled} onClick={() => { try { downloadProject(project.actions.exportProject(), siteId); setMessage('Project exported.') } catch (error) { report(error) } }}>Export project</button>
      <label htmlFor={inputId} className="flex min-h-9 items-center text-body-sm focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus">Import project…
      <input id={inputId} type="file" accept=".json,application/json" className="sr-only" onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.currentTarget.click() } }} disabled={disabled || project.storage !== 'persistent'} onChange={async (event) => {
        const file = event.currentTarget.files?.[0]
        event.currentTarget.value = ''
        if (!file) return
        setBusy(true); setMessage(null)
        try {
          const json = await file.text()
          setConfirmation({ title: 'Import project?', message: "Importing replaces every scenario for this site, including any saved records that couldn't be opened." + (project.skipped.length > 0 ? ' Export your project first if you want to keep them.' : ''), action: 'Import project', onConfirm: async () => {
            try {
              // Prevent a backup for a different site from replacing the current editor's site context.
              let raw: unknown
              try { raw = JSON.parse(json) } catch { throw new ScenarioLoadError('corrupt', '$', 'The file is not valid JSON') }
              if (isRecord(raw) && isRecord(raw.project) && typeof raw.project.siteId === 'string' && raw.project.siteId !== siteId) {
                throw new ScenarioLoadError('corrupt', 'project.siteId', 'This backup belongs to a different site.')
              }
              await project.actions.importProject(json)
              setMessage('Project imported.')
            } catch (error) { report(error) }
          } })
        } catch (error) { report(error) }
        finally { setBusy(false) }
      }} />
      </label>
    </div>
    {project.storage !== 'persistent' && <p className="mt-2 text-caption text-ink-secondary">Import requires writable browser storage. Export remains available.</p>}
    {message && <p role="status" className="mt-2 text-body-sm">{message}</p>}
    {confirmation && <ConfirmDialog confirmation={confirmation} onClose={() => setConfirmation(null)} />}
  </div>
}
