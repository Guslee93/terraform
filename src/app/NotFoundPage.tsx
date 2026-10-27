import { Link } from 'react-router-dom'
import { SiteFooter, SiteHeader } from '../components/marketing/SiteChrome'
import { ButtonLink } from '../components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-app">
      <SiteHeader />

      <main className="tf-measure flex flex-1 flex-col justify-center py-24">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-ink-secondary">
          404 — Not found
        </p>
        <h1 className="mt-4 max-w-2xl font-display text-[clamp(2.6rem,5.4vw,4rem)] leading-[0.98] tracking-[-0.025em] text-ink">
          This part of the site has not been surveyed.
        </h1>
        <p className="mt-5 max-w-md text-[14px] leading-relaxed text-ink-secondary">
          The page or site package you requested does not exist. Return to the demonstration sites or
          open the primary studio.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonLink to="/">Back to the sites</ButtonLink>
          <Link
            to="/studio/compact-infill"
            className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius-control)] border border-line bg-surface px-4 text-[13px] font-medium text-ink transition-colors hover:bg-surface-muted"
          >
            Open Compact Infill
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
