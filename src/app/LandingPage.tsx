import { MySites } from '../components/marketing/MySites'
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
              Microclimate site study
            </p>

            <h1 className="mt-4 text-balance text-figure-s text-ink sm:text-figure-l">
              Know a site
              <br />
              before you design on it.
            </h1>

            <p className="mt-6 max-w-[46ch] text-body leading-relaxed text-ink-secondary">
              Enter an address, choose the area, and read its sun, wind and noise alongside the
              area figures. Screening-level estimates from open map data. No login, no black box.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <ButtonLink to="/new" className="min-h-11">
                Try it
                <Icon name="arrow-up-right" size={15} />
              </ButtonLink>
              <ButtonLink to="/studio/compact-infill" variant="secondary" className="min-h-11">
                Open Compact Infill
              </ButtonLink>
              <ButtonLink to="/about" variant="ghost" className="min-h-11 underline underline-offset-4">
                About the prototype
              </ButtonLink>
            </div>

            <p className="mt-8 border-t border-line pt-5 text-caption text-ink-secondary">
              Open map data · simplified context · screening estimates
            </p>
          </div>

          <figure className="min-w-0">
            <div className="overflow-hidden rounded-card bg-surface">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
                <span className="text-caption text-ink-secondary">
                  Site study
                </span>
                <span className="text-caption text-ink-secondary">
                  Isometric
                </span>
              </div>
              <div className="aspect-[4/3] bg-viewport">
                <SiteStudyGraphic />
              </div>
              <figcaption className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3 text-caption text-ink-secondary">
                <span>Terrain · Study area · Wind · Noise</span>
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
                Two sample sites are prepared offline and shipped with the app. Each includes terrain,
                simplified context buildings and roads, and a study boundary.
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
                  Type an address anywhere in the Nordics, choose the area, and load open map data in 3D. Context is simplified and partly estimated.
                </span>
              </span>
              <span className="text-caption text-ink-secondary">Live open data · needs a connection</span>
            </Link>
          </div>
        </section>

        <MySites />

        <section className="border-t border-line">
          <div className="mx-auto w-full max-w-[1200px] px-4 py-14 sm:px-7 lg:py-20">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-caption text-ink-secondary">
                  Method
                </p>
                <h2 className="mt-3 max-w-xl text-balance text-figure-s text-ink">
                  One site. Four readings.
                </h2>
              </div>
              <p className="max-w-sm text-body-sm leading-relaxed text-ink-secondary">
                Every reading comes from the same site geometry. If a number changes, the geometry
                changed.
              </p>
            </div>

            <div className="mt-10 grid border-y border-line md:grid-cols-3">
              {[
                {
                  title: 'Site',
                  body: 'Terrain, buildings, roads and trees come from open map data, with the sources recorded.',
                },
                {
                  title: 'Wind and noise',
                  body: 'Screening layers on the ground: shelter from nearby buildings for a wind direction you choose, and road noise by distance and road class.',
                },
                {
                  title: 'Sun and areas',
                  body: 'Move the sun and read the shadows. Study area, built footprint and coverage come from the geometry. Optionally test a building of your own.',
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
                  Honest by design
                </p>
                <h2 className="mt-3 text-balance text-figure-s text-ink">
                  Screening, not simulation.
                </h2>
                <p className="mt-4 max-w-[52ch] text-body-sm leading-relaxed text-ink-secondary">
                  Wind and noise are comparative estimates, not CFD or an acoustic survey. Sun is
                  geometric. The studio labels each layer with what it can and cannot claim.
                </p>
              </div>
              <ButtonLink to="/new" className="min-h-11 shrink-0">
                Try it
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
