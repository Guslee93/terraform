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
        className="sr-only z-50 rounded-control bg-ink px-4 py-2 text-sm text-surface focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      <SiteHeader />

      <main id="main">
        <section className="tf-measure grid gap-12 pb-14 pt-10 lg:grid-cols-[1.18fr_0.82fr] lg:items-center lg:gap-12 lg:pb-16 lg:pt-14">
          <div className="max-w-[36rem]">
            <p className="flex items-center gap-3 text-label text-ink-secondary">
              <span aria-hidden="true" className="h-px w-8 bg-accent/60" />
              Oslo · Architectural site study
            </p>

            <h1 className="mt-6 text-figure-l text-ink">
              Explore a site.
              <br />
              <span className="italic text-accent">Shape</span> a concept.
              <br />
              Understand the impact.
            </h1>

            <p className="mt-6 max-w-[46ch] text-body leading-[1.7] text-ink-secondary">
              A browser workspace for testing conceptual massing against terrain, daylight and
              clearly labelled demo constraints. No login, no black box.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <ButtonLink to="/studio/compact-infill">
                Open Compact Infill
                <Icon name="arrow-up-right" size={15} />
              </ButtonLink>
              <ButtonLink to="/about" variant="secondary">
                About the prototype
              </ButtonLink>
            </div>

            <dl className="mt-8 grid max-w-md grid-cols-3 gap-4 border-t border-line pt-5">
              <div>
                <dt className="text-label text-ink-secondary">
                  Sites
                </dt>
                <dd className="mt-1.5 text-body-sm text-ink">Two curated</dd>
              </div>
              <div>
                <dt className="text-label text-ink-secondary">
                  Access
                </dt>
                <dd className="mt-1.5 text-body-sm text-ink">No login</dd>
              </div>
              <div>
                <dt className="text-label text-ink-secondary">
                  Platform
                </dt>
                <dd className="mt-1.5 text-body-sm text-ink">Desktop web</dd>
              </div>
            </dl>
          </div>

          <figure className="relative isolate">
            <div className="relative z-10 overflow-hidden rounded-card border border-line bg-surface">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <span className="text-label text-ink-secondary">
                  Site study · Concept A
                </span>
                <span className="rounded-full border border-line px-2 py-0.5 text-label text-ink-secondary">
                  Isometric
                </span>
              </div>
              <div className="aspect-[4/3] bg-viewport">
                <SiteStudyGraphic />
              </div>
              <figcaption className="flex items-center justify-between gap-4 border-t border-line px-4 py-3 text-label text-ink-secondary">
                <span>Terrain · Parcel · Massing</span>
                <span>Illustrative — not surveyed</span>
              </figcaption>
            </div>
            <div
              aria-hidden="true"
              className="absolute -bottom-3 -right-3 z-0 hidden h-28 w-28 rounded-card border border-line bg-accent-soft/60 lg:block"
            />
          </figure>
        </section>

        <section id="sites" className="border-t border-line bg-surface-paper">
          <div className="tf-measure py-14 lg:py-20">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-label text-ink-secondary">
                  01 — Demonstration sites
                </p>
                <h2 className="mt-3 max-w-xl text-balance text-figure-l text-ink">
                  Choose a site to begin.
                </h2>
              </div>
              <p className="max-w-sm text-body-sm leading-relaxed text-ink-secondary">
                Both packages are prepared offline and shipped with the app. Each includes terrain,
                simplified context, a parcel boundary and explicitly hypothetical constraints.
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {SITES.map((site, index) => (
                <SiteCard key={site.id} site={site} index={index} />
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-line">
          <div className="tf-measure py-14 lg:py-20">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-label text-ink-secondary">
                  02 — Method
                </p>
                <h2 className="mt-3 max-w-xl text-balance text-figure-l text-ink">
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
                  index: '01',
                  title: 'Site',
                  body: 'Terrain, context buildings, parcel linework and demo constraints arrive as static, versioned packages with provenance.',
                },
                {
                  index: '02',
                  title: 'Massing',
                  body: 'Draw footprints, stack storeys and step upper volumes. Areas, heights and envelope checks derive from the edited geometry.',
                },
                {
                  index: '03',
                  title: 'Impact',
                  body: 'Move the sun, read shadows, test the illustrative envelope, then compare two concepts against the same camera and time.',
                },
              ].map((step, index) => (
                <article
                  key={step.index}
                  className={`px-6 py-8 md:px-7 lg:py-10 ${
                    index > 0 ? 'border-t border-line md:border-l md:border-t-0' : ''
                  }`}
                >
                  <span className="text-body-sm font-medium text-accent">
                    {step.index}
                  </span>
                  <h3 className="mt-4 text-title text-ink">
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

        <section className="tf-measure pb-16 lg:pb-24">
          <div className="relative overflow-hidden rounded-card border border-line bg-accent-soft/70 px-7 py-10 md:px-12 md:py-14">
            <div
              aria-hidden="true"
              className="tf-paper-grid absolute inset-0 opacity-40 [mask-image:linear-gradient(to_right,transparent,black)]"
            />
            <div className="relative flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
              <div className="max-w-xl">
                <p className="text-label text-accent">
                  Portfolio prototype
                </p>
                <h2 className="mt-3 text-balance text-figure-l text-ink">
                  Designed to be examined, not just admired.
                </h2>
                <p className="mt-4 max-w-[52ch] text-body-sm leading-relaxed text-ink-secondary">
                  The studio is deliberately explicit about what it simulates: geometric massing,
                  conceptual metrics, geometric sun direction and illustrative demo limits.
                </p>
              </div>
              <ButtonLink to="/studio/compact-infill" className="shrink-0">
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
