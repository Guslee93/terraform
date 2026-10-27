import type { SiteSummary } from '../../features/sites/siteCatalog'
import { Wordmark, WordmarkMark } from '../marketing/SiteChrome'
import { Icon } from '../ui/Icon'
import { IconButton } from '../ui/IconButton'
import { Link } from 'react-router-dom'

type StudioTopBarProps = {
  site: SiteSummary
  scenario: string
  canFit: boolean
  onFitSite: () => void
  onToggleInspector: () => void
  inspectorOpen: boolean
}

export function StudioTopBar({
  site,
  scenario,
  canFit,
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
        <span
          title="Scenario switching is not available in this preview"
          className="inline-flex h-9 items-center rounded-[var(--radius-control)] border border-line bg-surface px-3 text-[12px] font-medium text-ink"
        >
          {scenario}
        </span>

        <span className="hidden items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-ink-secondary xl:inline-flex">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-ink-secondary" />
          Local session
        </span>

        <span aria-hidden="true" className="mx-1 hidden h-6 w-px bg-line sm:block" />

        {canFit && (
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
        )}

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
          className="min-[1100px]:hidden"
        >
          <Icon name={inspectorOpen ? 'close' : 'menu'} size={17} />
        </IconButton>
      </div>
    </header>
  )
}
