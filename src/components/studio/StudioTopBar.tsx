import type { SiteSummary } from '../../features/sites/siteCatalog'
import { Wordmark, WordmarkMark } from '../marketing/SiteChrome'
import { Icon } from '../ui/Icon'
import { IconButton } from '../ui/IconButton'
import { Link } from 'react-router-dom'

type StudioTopBarProps = {
  site: SiteSummary
  scenario: string
  onScenarioChange: (scenario: string) => void
  onFitSite: () => void
  onToggleInspector: () => void
  inspectorOpen: boolean
}

export function StudioTopBar({
  site,
  scenario,
  onScenarioChange,
  onFitSite,
  onToggleInspector,
  inspectorOpen,
}: StudioTopBarProps) {
  return (
    <header className="relative z-50 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-3 sm:px-4">
      <div className="sm:hidden">
        <WordmarkMark />
      </div>
      <div className="hidden sm:block">
        <Wordmark compact />
      </div>

      <span aria-hidden="true" className="hidden h-6 w-px bg-line sm:block" />

      <div className="hidden min-w-0 flex-col md:flex">
        <span className="truncate text-[12px] font-medium text-ink">{site.title}</span>
        <span className="truncate text-[9px] uppercase tracking-[0.14em] text-ink-secondary">
          {site.subtitle}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <label htmlFor="scenario-select" className="sr-only">
          Scenario
        </label>
        <div className="relative">
          <select
            id="scenario-select"
            value={scenario}
            onChange={(event) => onScenarioChange(event.target.value)}
            className="h-9 appearance-none rounded-[var(--radius-control)] border border-line bg-surface py-0 pl-3 pr-8 text-[12px] font-medium text-ink transition-colors hover:bg-[#fbfbf8]"
          >
            <option>Concept A</option>
            <option>Concept B</option>
          </select>
          <Icon
            name="chevron-down"
            size={13}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-secondary"
          />
        </div>

        <span className="hidden items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[9px] uppercase tracking-[0.12em] text-ink-secondary xl:inline-flex">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-warning" />
          Session only
        </span>

        <span aria-hidden="true" className="mx-1 hidden h-6 w-px bg-line sm:block" />

        <IconButton label="Undo (available in M2)" disabled className="hidden sm:grid">
          <Icon name="undo" size={16} />
        </IconButton>
        <IconButton label="Redo (available in M2)" disabled className="hidden sm:grid">
          <Icon name="redo" size={16} />
        </IconButton>

        <button
          type="button"
          onClick={onFitSite}
          className="hidden min-h-9 items-center gap-1.5 rounded-[var(--radius-control)] px-2.5 text-[11px] font-medium text-ink-secondary transition-colors hover:bg-surface-muted hover:text-ink md:inline-flex"
        >
          <Icon name="fit" size={15} />
          Fit site
          <kbd className="ml-0.5 rounded border border-line px-1 py-px text-[9px] text-ink-secondary">
            F
          </kbd>
        </button>

        <button
          type="button"
          disabled
          title="PNG export arrives in M5"
          className="hidden min-h-9 items-center gap-1.5 rounded-[var(--radius-control)] border border-line px-2.5 text-[11px] font-medium text-ink-secondary opacity-45 xl:inline-flex"
        >
          <Icon name="download" size={15} />
          Export
        </button>

        <Link
          to="/about"
          aria-label="About this prototype"
          title="About this prototype"
          className="inline-grid size-9 shrink-0 place-items-center rounded-[var(--radius-control)] border border-transparent text-ink-secondary transition-colors hover:bg-surface-muted hover:text-ink"
        >
          <Icon name="info" size={16} />
        </Link>

        <IconButton
          label={inspectorOpen ? 'Close inspector' : 'Open inspector'}
          onClick={onToggleInspector}
          active={inspectorOpen}
          className="lg:hidden"
        >
          <Icon name={inspectorOpen ? 'close' : 'menu'} size={17} />
        </IconButton>
      </div>
    </header>
  )
}
