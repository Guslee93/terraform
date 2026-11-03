import { useEffect, useState, type ReactNode } from 'react'
import { RouteFallback } from './RouteFallback'
import { ConfirmDialog, type Confirmation } from '../components/ui/ConfirmDialog'
import { useParams } from 'react-router-dom'
import { SiteFooter, SiteHeader } from '../components/marketing/SiteChrome'
import { StudioShell } from '../components/studio/StudioShell'
import { Button, ButtonLink } from '../components/ui/Button'
import { deleteImported, getImported } from '../features/import/session'
import { getSite } from '../features/sites/siteCatalog'
import { useSitePackage } from '../features/sites/useSitePackage'

const noop = () => {}

function MissingSite({ eyebrow, heading, body, to, action, children }: { children?: ReactNode; eyebrow: string; heading: string; body: string; to: string; action: string }) {
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
          {children}
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

/** Loads a validated imported package before mounting the studio. */
export function ImportedStudioPage() {
  const { importId } = useParams()
  const [loaded, setLoaded] = useState<{ id: string | undefined; site: Awaited<ReturnType<typeof getImported>> } | null>(null)
  const [error, setError] = useState<{ id: string | undefined; message: string } | null>(null)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  useEffect(() => {
    let active = true
    getImported(importId).then((site) => { if (active) setLoaded({ id: importId, site }) })
      .catch((problem: unknown) => { if (active) setError({ id: importId, message: problem instanceof Error ? problem.message : 'Could not load this site.' }) })
    return () => { active = false }
  }, [importId])
  if (error && error.id === importId) return <MissingSite eyebrow="Imported site" heading="This saved site could not be loaded" body={error.message} to="/" action="Back to the sites" />
  if (!loaded || loaded.id !== importId) return <RouteFallback />
  const imported = loaded.site
  if (!imported || 'status' in imported) {
    return <MissingSite eyebrow="Imported site" heading="This imported site is no longer available"
      body={imported ? 'This saved site could not be read.' : 'It may have been deleted from My sites.'}
      to="/new" action="Import it again">
      {imported && <Button variant="secondary" className="mr-4" onClick={() => setConfirmation({
        title: 'Delete this saved site?', message: 'This removes the imported site and its saved scenarios from this browser.', action: 'Delete',
        onConfirm: async () => { await deleteImported(imported.id); setLoaded({ id: importId, site: undefined }) },
      })}>Delete it</Button>}
      {confirmation && <ConfirmDialog confirmation={confirmation} onClose={() => setConfirmation(null)} />}
    </MissingSite>
  }
  return <StudioShell key={imported.summary.id} site={imported.summary} sitePackage={imported.sitePackage}
    packageStatus="ready" packageError={null} onRetry={noop} />
}
