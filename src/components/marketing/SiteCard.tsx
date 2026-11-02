import { Link } from 'react-router-dom'
import type { SiteSummary } from '../../features/sites/siteCatalog'
import { Icon } from '../ui/Icon'

type SiteCardProps = {
  site: SiteSummary
  index: number
}

export function SiteCard({ site, index }: SiteCardProps) {
  return (
    <Link
      to={`/studio/${site.id}`}
      className="group overflow-hidden rounded-card border border-line bg-surface transition-[border-color,transform] duration-300 hover:border-line-strong motion-safe:hover:-translate-y-0.5"
      aria-label={`Open ${site.title} in the studio`}
    >
      <div className="relative aspect-[16/10] overflow-hidden border-b border-line bg-viewport">
        <img
          src={site.thumbnail}
          alt=""
          className="h-full w-full object-cover transition-transform duration-700 ease-[var(--ease-out)] motion-safe:group-hover:scale-[1.025]"
          loading="lazy"
        />
        <span className="absolute left-4 top-4 rounded-full border border-ink/10 bg-app/85 px-2.5 py-1 text-label text-ink-secondary backdrop-blur-sm">
          0{index + 1}
        </span>
        <span className="absolute right-4 top-4 rounded-full border border-ink/10 bg-app/85 px-2.5 py-1 text-label text-ink-secondary backdrop-blur-sm">
          {site.morphology}
        </span>
      </div>

      <div className="p-6">
        <div className="flex items-start justify-between gap-5">
          <div>
            <h3 className="text-title text-ink">
              {site.title}
            </h3>
            <p className="mt-2 text-body-sm text-ink-secondary">{site.subtitle}</p>
          </div>
          <span
            aria-hidden="true"
            className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full border border-line text-ink-secondary transition-colors duration-200 group-hover:border-ink group-hover:bg-ink group-hover:text-surface"
          >
            <Icon name="arrow-up-right" size={16} />
          </span>
        </div>

        <p className="mt-4 max-w-[42ch] text-body-sm leading-relaxed text-ink-secondary">
          {site.description}
        </p>

        <div className="mt-6 flex items-center justify-between border-t border-line pt-4 text-label text-ink-secondary">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-positive" />
            Curated demo
          </span>
          <span className="transition-colors group-hover:text-ink">Open studio</span>
        </div>
      </div>
    </Link>
  )
}
