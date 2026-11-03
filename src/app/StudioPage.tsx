import { useParams } from 'react-router-dom'
import { SiteFooter, SiteHeader } from '../components/marketing/SiteChrome'
import { StudioShell } from '../components/studio/StudioShell'
import { ButtonLink } from '../components/ui/Button'
import { getImported } from '../features/import/session'
import { getSite } from '../features/sites/siteCatalog'
import { useSitePackage } from '../features/sites/useSitePackage'

const noop = () => {}

function MissingSite({ eyebrow, heading, body, to, action }: { eyebrow: string; heading: string; body: string; to: string; action: string }) {
  return (
    <div className="flex min-h-dvh flex-col bg-app">
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1200px] px-4 sm:px-7 flex flex-1 flex-col justify-center py-24">
        <p className="text-caption text-ink-secondary">
          {eyebrow}
        </p>
        <h1 className="mt-4 max-w-2xl text-figure-s sm:text-figure-l text-ink">
          {heading}
        </h1>
        <p className="mt-5 max-w-md text-body leading-relaxed text-ink-secondary">
          {body}
        </p>
        <div className="mt-8">
          <ButtonLink to={to} className="min-h-11">{action}</ButtonLink>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}

export function StudioPage() {
  const { siteId } = useParams()
  const site = getSite(siteId)
  const { status, data, error, retry } = useSitePackage(site?.id ?? null)

  if (!site) {
    return (
      <MissingSite
        eyebrow="Unknown site package"
        heading="That demonstration site is not part of this study."
        body="Terraform ships two curated Oslo sites. Choose one of those to enter the studio."
        to="/"
        action="Back to the sites"
      />
    )
  }

  // `idle` only occurs when no site is chosen, which the branch above already
  // renders as the missing-site page; StudioShell never sees it.
  const packageStatus = status === 'idle' ? 'loading' : status

  return (
    <StudioShell
      key={site.id}
      site={site}
      sitePackage={data}
      packageStatus={packageStatus}
      packageError={error}
      onRetry={retry}
    />
  )
}

/** `/studio/import/:importId`: a site loaded on `/new`, held in memory until reload (P3). */
export function ImportedStudioPage() {
  const { importId } = useParams()
  const imported = getImported(importId)

  if (!imported) {
    return (
      <MissingSite
        eyebrow="Imported site"
        heading="This imported site is no longer available"
        body="Imported sites are kept only until the page reloads. Saving them arrives with My sites."
        to="/new"
        action="Import it again"
      />
    )
  }

  return (
    <StudioShell
      key={imported.summary.id}
      site={imported.summary}
      sitePackage={imported.sitePackage}
      packageStatus="ready"
      packageError={null}
      onRetry={noop}
    />
  )
}
