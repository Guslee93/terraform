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
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-ink-secondary">
            Unknown site package
          </p>
          <h1 className="mt-4 max-w-2xl font-display text-[clamp(2.4rem,5vw,3.6rem)] leading-[1] tracking-[-0.02em] text-ink">
            That demonstration site is not part of this study.
          </h1>
          <p className="mt-5 max-w-md text-[14px] leading-relaxed text-ink-secondary">
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

  return (
    <StudioShell
      site={site}
      sitePackage={data}
      packageStatus={status}
      packageError={error}
      onRetry={retry}
    />
  )
}
