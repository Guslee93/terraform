import { Link } from 'react-router-dom'
import type { SiteSummary } from '../../features/sites/siteCatalog'
import { Icon } from '../ui/Icon'

type SiteCardProps = {
  site: SiteSummary
}

export function SiteCard({ site }: SiteCardProps) {
  return (
    <Link
      to={`/studio/${site.id}`}
      className="flex min-w-0 flex-col overflow-hidden rounded-card bg-surface transition-colors duration-200 hover:bg-surface-hover"
      aria-label={`Open ${site.title} in the studio`}
    >
      <div className="aspect-[16/10] overflow-hidden border-b border-line bg-viewport">
        <img
          src={site.thumbnail}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>

      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <p className="mb-3 text-caption text-ink-secondary">{site.morphology}</p>
        <div className="flex items-start justify-between gap-5">
          <div>
            <h3 className="text-title text-ink">
              {site.title}
            </h3>
            <p className="mt-2 text-body-sm text-ink-secondary">{site.subtitle}</p>
          </div>
          <span
            aria-hidden="true"
            className="mt-0.5 shrink-0 text-ink"
          >
            <Icon name="arrow-up-right" size={16} />
          </span>
        </div>

        <p className="mt-4 max-w-[42ch] text-body-sm leading-relaxed text-ink-secondary">
          {site.description}
        </p>

        <div className="mt-auto pt-6">
          <p className="border-t border-line pt-4 text-body-sm text-ink underline underline-offset-4">
            Open studio
          </p>
        </div>
      </div>
    </Link>
  )
}
