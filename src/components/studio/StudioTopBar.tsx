import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { SaveStatus } from '../../features/scenarios/autosave'
import type { SiteSummary } from '../../features/sites/siteCatalog'
import type { StorageMode } from './useScenarioProject'

/** The save indicator's words: always the real state, never colour alone (FR-043, QA-14). */
export function saveStatusLabel(storage: StorageMode, status: SaveStatus): string {
  if (storage === 'memory') return "Not saved — this browser can't store data"
  if (storage === 'read-only') return 'Read-only — saved by a newer version'
  switch (status.state) {
    case 'saved':
      return 'Saved'
    case 'saving':
      return 'Saving…'
    case 'unsaved':
      return 'Unsaved changes'
    case 'error':
      return status.kind === 'quota' ? 'Not saved — storage is full' : 'Not saved — storage unavailable'
  }
}

type StudioTopBarProps = {
  site: SiteSummary
  scenario: string
  scenarioMenu?: ReactNode
  compareAction?: ReactNode
  guideAction?: ReactNode
  saveStatus: SaveStatus
  storage: StorageMode
  canFit: boolean
  onFitSite: () => void
  /** The Test a building switch. */
  modeAction?: ReactNode
  /** Analysis-only studio: no scenario name, save status or Compare. */
  analysisOnly?: boolean
}

/** A plain 52 px row on the ground (draft 4): identity left, scenario and two text actions right. */
export function StudioTopBar({ site, scenario, scenarioMenu, compareAction, guideAction, saveStatus, storage, canFit, onFitSite, modeAction, analysisOnly = false }: StudioTopBarProps) {
  return (
    <header className="flex min-h-[52px] flex-wrap items-center gap-x-7 gap-y-1 px-5">
      <Link to="/" aria-label="Terraform home" className="inline-flex items-center gap-2.5 text-body font-medium text-ink">
        <span aria-hidden="true" className="size-[9px] rotate-45 bg-ink" />
        Terraform
      </Link>
      <p className="min-w-0 truncate text-body-sm text-ink">
        {site.title}
        <span className="ml-2 text-caption text-ink-secondary">{site.subtitle}</span>
      </p>
      <div className="ml-auto flex max-w-full flex-wrap items-center gap-x-5 gap-y-1">
        {modeAction}
        {!analysisOnly && <>
          <div className="flex flex-wrap items-center text-body-sm text-ink">
            {scenarioMenu ?? scenario}
            <span aria-live="polite" className={saveStatus.state === 'error' || storage !== 'persistent' ? 'ml-1.5 text-caption text-warning-ink' : 'ml-1.5 text-caption text-ink-secondary'}>
              {saveStatusLabel(storage, saveStatus)}
            </span>
          </div>
          {compareAction}
          {guideAction}
        </>}
        {canFit && (
          <button type="button" onClick={onFitSite} title="Fit site (F)" className="min-h-6 text-caption text-ink transition-colors duration-200 hover:text-accent">
            Fit site
          </button>
        )}
        <Link to="/about" className="inline-flex min-h-6 items-center text-caption text-ink transition-colors duration-200 hover:text-accent">
          About
        </Link>
      </div>
    </header>
  )
}
