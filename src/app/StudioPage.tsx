import { useParams } from 'react-router-dom'
import { SiteFooter, SiteHeader } from '../components/marketing/SiteChrome'
import { StudioShell } from '../components/studio/StudioShell'
import { ButtonLink } from '../components/ui/Button'
import { getSite } from '../features/sites/siteCatalog'
import { useSitePackage } from '../features/sites/useSitePackage'

export function StudioPage() {
  const { siteId } = useParams()
  const site = getSite(siteId)
  const { status, data, error, retry } = useSitePackage(site?.id ?? null)

  if (!site) {
    return (
      <div className="flex min-h-dvh flex-col bg-app">
        <SiteHeader />
        <main className="tf-measure flex flex-1 flex-col justify-center py-24">
          <p className="text-label text-ink-secondary">
            Unknown site package
          </p>
          <h1 className="mt-4 max-w-2xl text-figure-l text-ink">
            That demonstration site is not part of this study.
          </h1>
          <p className="mt-5 max-w-md text-body leading-relaxed text-ink-secondary">
            Terraform ships two curated Oslo sites. Choose one of those to enter the studio.
          </p>
          <div className="mt-8">
            <ButtonLink to="/">Back to the sites</ButtonLink>
          </div>
        </main>
        <SiteFooter />
      </div>
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
