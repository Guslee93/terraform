import { Link } from 'react-router-dom'
import { SiteFooter, SiteHeader } from '../components/marketing/SiteChrome'
import { ButtonLink } from '../components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-app">
      <SiteHeader />

      <main className="tf-measure flex flex-1 flex-col justify-center py-24">
        <p className="text-label text-ink-secondary">
          404 — Not found
        </p>
        <h1 className="mt-4 max-w-2xl text-figure-l text-ink">
          This part of the site has not been surveyed.
        </h1>
        <p className="mt-5 max-w-md text-body leading-relaxed text-ink-secondary">
          The page or site package you requested does not exist. Return to the demonstration sites or
          open the primary studio.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonLink to="/">Back to the sites</ButtonLink>
          <Link
            to="/studio/compact-infill"
            className="inline-flex min-h-10 items-center justify-center rounded-control border border-line bg-surface px-4 text-body-sm font-medium text-ink transition-colors hover:bg-muted-fill"
          >
            Open Compact Infill
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
