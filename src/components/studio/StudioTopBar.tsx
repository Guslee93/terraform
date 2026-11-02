import { Link } from 'react-router-dom'
import type { SiteSummary } from '../../features/sites/siteCatalog'
import { cn } from '../../lib/cn'
import { textButtonClass } from '../ui/controls'
import { Icon, type IconName } from '../ui/Icon'

export type StudioTab = 'model' | 'sun' | 'constraints'

const TABS: ReadonlyArray<{ id: StudioTab; label: string; icon: IconName }> = [
  { id: 'model', label: 'Model', icon: 'cube' },
  { id: 'sun', label: 'Sun', icon: 'sun' },
  { id: 'constraints', label: 'Constraints', icon: 'shield' },
]

/** Id of the panel the tabs control (panel 02). */
export const STUDIO_TABPANEL_ID = 'studio-panel'

type StudioTopBarProps = {
  site: SiteSummary
  scenario: string
  canFit: boolean
  onFitSite: () => void
  activeTab: StudioTab
  onTabChange: (tab: StudioTab) => void
}

/** Spec §7.2: a 40 px row on the ground, not a card. Compare (M4) is hidden until it works. */
export function StudioTopBar({ site, scenario, canFit, onFitSite, activeTab, onTabChange }: StudioTopBarProps) {
  return (
    <header className="grid grid-cols-1 items-center gap-x-6 gap-y-2 studio:h-10 studio:grid-cols-[1fr_auto_1fr]">
      <div className="flex min-w-0 items-center gap-3">
        <Link to="/" aria-label="Terraform home" className="inline-flex shrink-0 items-center gap-2.5">
          <span aria-hidden="true" className="grid size-[22px] place-items-center rounded-control border border-ink">
            <span className="size-2 rotate-45 bg-ink" />
          </span>
          <span className="text-body font-medium text-ink">Terraform</span>
        </Link>
        <span className="min-w-0 truncate text-label text-ink-secondary">
          <span className="text-ink">{site.title}</span> · {site.subtitle}
        </span>
      </div>

      <div role="tablist" aria-label="Studio sections" className="flex items-center gap-[30px]">
        {TABS.map((tab) => {
          const active = tab.id === activeTab
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`studio-tab-${tab.id}`}
              aria-controls={STUDIO_TABPANEL_ID}
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onTabChange(tab.id)}
              onKeyDown={(event) => {
                if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
                const index = TABS.findIndex((entry) => entry.id === activeTab)
                const next = TABS[(index + (event.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length]
                if (!next) return
                onTabChange(next.id)
                document.getElementById(`studio-tab-${next.id}`)?.focus()
              }}
              className={cn(
                'relative inline-flex min-h-10 items-center gap-2 text-body transition-colors duration-200',
                active ? 'text-ink' : 'text-ink-secondary hover:text-ink',
              )}
            >
              <Icon name={tab.icon} size={14} />
              {tab.label}
              <span
                aria-hidden="true"
                className={cn(
                  'absolute inset-x-0 bottom-1 h-[1.5px] origin-left bg-ink transition-transform duration-[350ms] ease-[var(--ease-out)]',
                  active ? 'scale-x-100' : 'scale-x-0',
                )}
              />
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-[26px] gap-y-1 studio:justify-end">
        <span className="inline-flex items-center gap-2 text-body text-ink" title="Scenario switching arrives with scenarios (M4)">
          <span aria-hidden="true" className="size-[7px] bg-accent" />
          {scenario}
        </span>
        <span className="inline-flex items-center gap-2 text-label text-ink-secondary">
          <span aria-hidden="true" className="relative size-[7px]">
            <span className="tf-ping absolute inset-0 rounded-pill bg-ink" />
            <span className="absolute inset-0 rounded-pill bg-ink" />
          </span>
          Local session
        </span>
        {canFit && (
          <button type="button" onClick={onFitSite} title="Fit site (F)" className={textButtonClass}>
            <Icon name="fit" size={14} />
            Fit site
          </button>
        )}
        <Link
          to="/about"
          aria-label="About this prototype"
          title="About this prototype"
          className="inline-grid size-10 place-items-center text-ink-secondary transition-colors duration-200 hover:text-ink"
        >
          <Icon name="info" size={16} />
        </Link>
      </div>
    </header>
  )
}
