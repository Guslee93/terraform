import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { SaveStatus } from '../../features/scenarios/autosave'
import type { SiteSummary } from '../../features/sites/siteCatalog'
import type { StorageMode } from './useScenarioProject'
import { Icon } from '../ui/Icon'

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
  /** Centre slot: the floating pill toolbar. */
  toolbar?: ReactNode
  /** Analysis-only studio: no scenario name, save status or Compare. */
  analysisOnly?: boolean
}

const quiet = 'inline-flex min-h-9 items-center text-body-sm text-ink-secondary transition-colors duration-200 hover:text-ink'

/** Studio top bar (ADR-0016): back, site and scenario left; pill toolbar centre; actions right. */
export function StudioTopBar({ site, scenario, scenarioMenu, compareAction, guideAction, saveStatus, storage, canFit, onFitSite, modeAction, toolbar, analysisOnly = false }: StudioTopBarProps) {
  return (
    <header className="grid min-h-[52px] grid-cols-1 items-center gap-x-6 gap-y-2 px-2 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-1">
        <Link to="/#sites" className={quiet}>
          <Icon name="chevron-left" size={14} className="-ml-1 mr-0.5" />
          Back
        </Link>
        <p className="min-w-0 truncate text-body-sm text-ink-secondary" title={site.subtitle}>{site.title}</p>
        {!analysisOnly && (
          <div className="flex min-w-0 flex-wrap items-center text-body font-medium text-ink">
            {scenarioMenu ?? scenario}
            <span aria-live="polite" className={saveStatus.state === 'error' || storage !== 'persistent' ? 'ml-2 text-caption font-normal text-warning-ink' : 'ml-2 text-caption font-normal text-ink-secondary'}>
              {saveStatusLabel(storage, saveStatus)}
            </span>
          </div>
        )}
      </div>
      <div className="flex justify-center max-lg:justify-start">{toolbar}</div>
      <div className="flex flex-wrap items-center justify-end gap-x-5 gap-y-1 max-lg:justify-start">
        {modeAction}
        {!analysisOnly && <>{compareAction}{guideAction}</>}
        {canFit && (
          <button type="button" onClick={onFitSite} title="Fit site (F)" className={quiet}>
            Fit site
          </button>
        )}
        <Link to="/about" className={quiet}>About</Link>
      </div>
    </header>
  )
}
