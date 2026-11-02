import { Link } from 'react-router-dom'
import { SiteFooter, SiteHeader } from '../components/marketing/SiteChrome'
import { ButtonLink } from '../components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-app">
      <SiteHeader />

      <main className="mx-auto w-full max-w-[1200px] px-4 sm:px-7 flex flex-1 flex-col justify-center py-24">
        <p className="text-caption text-ink-secondary">
          404 — Not found
        </p>
        <h1 className="mt-4 max-w-2xl text-figure-s sm:text-figure-l text-ink">
          This part of the site has not been surveyed.
        </h1>
        <p className="mt-5 max-w-md text-body leading-relaxed text-ink-secondary">
          The page or site package you requested does not exist. Return to the demonstration sites or
          open the primary studio.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonLink to="/" className="min-h-11">Back to the sites</ButtonLink>
          <Link
            to="/studio/compact-infill"
            className="inline-flex min-h-11 items-center justify-center px-4 text-body text-ink underline underline-offset-4 transition-colors duration-200 hover:text-ink-secondary"
          >
            Open Compact Infill
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
