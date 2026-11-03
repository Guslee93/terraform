import { Link } from 'react-router-dom'
import { SITES } from '../features/sites/siteCatalog'
import { SiteCard } from '../components/marketing/SiteCard'
import { SiteStudyGraphic } from '../components/marketing/SiteStudyGraphic'
import { SiteFooter, SiteHeader } from '../components/marketing/SiteChrome'
import { ButtonLink } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'

export function LandingPage() {
  return (
    <div className="min-h-dvh bg-app">
      <a
        href="#main"
        className="sr-only z-50 rounded-control bg-ink px-4 py-2 text-body-sm text-surface focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      <SiteHeader />

      <main id="main">
        <section className="mx-auto grid w-full max-w-[1200px] gap-10 px-4 pb-14 pt-14 sm:px-7 lg:grid-cols-2 lg:items-center lg:gap-12 lg:pb-20 lg:pt-20">
          <div className="min-w-0">
            <p className="text-caption text-ink-secondary">
              Oslo · Architectural site study
            </p>

            <h1 className="mt-4 text-balance text-figure-s text-ink sm:text-figure-l">
              Explore a site.
              <br />
              Shape a concept.
              <br />
              Understand the impact.
            </h1>

            <p className="mt-6 max-w-[46ch] text-body leading-relaxed text-ink-secondary">
              A browser workspace for testing conceptual massing against terrain, daylight and
              clearly labelled demo constraints. No login, no black box.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <ButtonLink to="/studio/compact-infill" className="min-h-11">
                Open Compact Infill
                <Icon name="arrow-up-right" size={15} />
              </ButtonLink>
              <ButtonLink to="/about" variant="ghost" className="min-h-11 underline underline-offset-4">
                About the prototype
              </ButtonLink>
            </div>

            <p className="mt-8 border-t border-line pt-5 text-caption text-ink-secondary">
              Curated Oslo demo · simplified context
            </p>
          </div>

          <figure className="min-w-0">
            <div className="overflow-hidden rounded-card bg-surface">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
                <span className="text-caption text-ink-secondary">
                  Site study · Concept A
                </span>
                <span className="text-caption text-ink-secondary">
                  Isometric
                </span>
              </div>
              <div className="aspect-[4/3] bg-viewport">
                <SiteStudyGraphic />
              </div>
              <figcaption className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3 text-caption text-ink-secondary">
                <span>Terrain · Parcel · Massing</span>
                <span>Illustrative — not surveyed</span>
              </figcaption>
            </div>
          </figure>
        </section>

        <section id="sites" className="border-t border-line">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-14 sm:px-7 lg:py-20">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-caption text-ink-secondary">
                  Demonstration sites
                </p>
                <h2 className="mt-3 max-w-xl text-balance text-figure-s text-ink">
                  Choose a site to begin.
                </h2>
              </div>
              <p className="max-w-sm text-body-sm leading-relaxed text-ink-secondary">
                Both packages are prepared offline and shipped with the app. Each includes terrain,
                simplified context, a parcel boundary and explicitly hypothetical constraints.
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {SITES.map((site) => (
                <SiteCard key={site.id} site={site} />
              ))}
            </div>

            <Link
              to="/new"
              className="mt-5 flex flex-col gap-2 rounded-card border border-dashed border-line-strong bg-surface px-5 py-5 transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-focus sm:flex-row sm:items-center sm:justify-between"
            >
              <span>
                <span className="flex items-center gap-2 text-body text-ink">
                  Start from any address
                  <Icon name="arrow-up-right" size={15} />
                </span>
                <span className="mt-1 block max-w-[60ch] text-body-sm text-ink-secondary">
                  Pick a block anywhere in the Nordics and load open map data in 3D. Context is simplified and partly estimated.
                </span>
              </span>
              <span className="text-caption text-ink-secondary">Live open data · needs a connection</span>
            </Link>
          </div>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-14 sm:px-7 lg:py-20">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-caption text-ink-secondary">
                  Method
                </p>
                <h2 className="mt-3 max-w-xl text-balance text-figure-s text-ink">
                  One model. Three consequences.
                </h2>
              </div>
              <p className="max-w-sm text-body-sm leading-relaxed text-ink-secondary">
                Geometry, metrics and feedback share a single source of truth. If a number changes,
                the model changed.
              </p>
            </div>

            <div className="mt-10 grid border-y border-line md:grid-cols-3">
              {[
                {
                  title: 'Site',
                  body: 'Terrain, context buildings, parcel linework and demo constraints arrive as static, versioned packages with provenance.',
                },
                {
                  title: 'Massing',
                  body: 'Draw footprints, stack storeys and step upper volumes. Areas, heights and envelope checks derive from the edited geometry.',
                },
                {
                  title: 'Impact',
                  body: 'Move the sun, read shadows, test the illustrative envelope, then compare two concepts against the same camera and time.',
                },
              ].map((step, index) => (
                <article
                  key={step.title}
                  className={`px-6 py-8 md:px-7 lg:py-10 ${
                    index > 0 ? 'border-t border-line md:border-l md:border-t-0' : ''
                  }`}
                >
                  <h3 className="text-title text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-3 max-w-[30ch] text-body-sm leading-relaxed text-ink-secondary">
                    {step.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-14 sm:px-7 lg:py-20">
            <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
              <div className="max-w-xl">
                <p className="text-caption text-ink-secondary">
                  Portfolio prototype
                </p>
                <h2 className="mt-3 text-balance text-figure-s text-ink">
                  Designed to be examined, not just admired.
                </h2>
                <p className="mt-4 max-w-[52ch] text-body-sm leading-relaxed text-ink-secondary">
                  The studio is deliberately explicit about what it simulates: geometric massing,
                  conceptual metrics, geometric sun direction and illustrative demo limits.
                </p>
              </div>
              <ButtonLink to="/studio/compact-infill" className="min-h-11 shrink-0">
                Enter the studio
                <Icon name="arrow-up-right" size={15} />
              </ButtonLink>
            </div>
          </div>
        </section>

      </main>

      <SiteFooter />
    </div>
  )
}
