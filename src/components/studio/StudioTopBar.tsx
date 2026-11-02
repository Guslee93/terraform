import { Link } from 'react-router-dom'
import type { SiteSummary } from '../../features/sites/siteCatalog'

type StudioTopBarProps = {
  site: SiteSummary
  scenario: string
  canFit: boolean
  onFitSite: () => void
}

/** A plain 52 px row on the ground (draft 4): identity left, scenario and two text actions right. */
export function StudioTopBar({ site, scenario, canFit, onFitSite }: StudioTopBarProps) {
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
      <div className="ml-auto flex items-center gap-7">
        <p className="text-body-sm text-ink" title="Scenario switching arrives with scenarios (M4)">
          {scenario}
          {/* Nothing persists scenarios until M4 (review blocker): say so, not "saved". */}
          <span className="ml-1.5 text-caption text-ink-secondary">local session</span>
        </p>
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
