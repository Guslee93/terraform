import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { SiteSummary } from '../../features/sites/siteCatalog'
import { Icon } from '../ui/Icon'

type StudioTopBarProps = {
  site: SiteSummary
  /** Where Back leads: the frame step for an imported site, the site list for a curated one. */
  backTo: string
  canFit: boolean
  onFitSite: () => void
  exportAction?: ReactNode
  /** The Add a block switch. */
  modeAction?: ReactNode
  /** Centre slot: the floating pill toolbar. */
  toolbar?: ReactNode
}

const quiet = 'inline-flex min-h-9 items-center text-body-sm text-ink-secondary transition-colors duration-200 hover:text-ink'

/** Studio top bar: back and site left; block tools centre; actions right. */
export function StudioTopBar({ site, backTo, canFit, onFitSite, modeAction, toolbar, exportAction }: StudioTopBarProps) {
  return (
    // On lg the header dissolves into the studio grid: back/site float over the viewport's top-left,
    // the toolbar floats top-centre, and the actions sit above the full-height Parameters panel.
    <header className="grid min-h-[52px] grid-cols-1 items-center gap-x-6 gap-y-2 px-2 lg:contents">
      <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-1 lg:z-20 lg:col-start-1 lg:row-start-1 lg:m-3 lg:max-w-[calc(100%-24rem)] lg:self-start lg:justify-self-start lg:rounded-control lg:border lg:border-card-line lg:bg-frost lg:px-3 lg:shadow-float lg:backdrop-blur-md">
        <Link to={backTo} className={quiet}>
          <Icon name="chevron-left" size={14} className="-ml-1 mr-0.5" />
          Back
        </Link>
        <p className="min-w-0 truncate text-body-sm text-ink-secondary" title={site.subtitle}>{site.title}</p>

      </div>
      <div className="flex justify-center max-lg:justify-start lg:z-20 lg:col-start-1 lg:row-start-1 lg:mt-3 lg:self-start lg:justify-self-center">{toolbar}</div>
      <div className="flex flex-wrap items-center justify-end gap-x-5 gap-y-1 max-lg:justify-start lg:col-start-2 lg:row-start-1 lg:flex-nowrap lg:gap-x-2.5 lg:self-center lg:px-2">
        {modeAction}
        {exportAction}
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
