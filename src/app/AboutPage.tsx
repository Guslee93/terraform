import { SiteFooter, SiteHeader } from '../components/marketing/SiteChrome'
import { ButtonLink } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'

const sections = [
  {
    title: 'What this is',
    body: [
      'Terraform is an early-stage architectural site-planning workspace and a portfolio case study. A visitor chooses a curated Oslo demonstration site, shapes conceptual building massing, tests sunlight and shadow, reads live area and envelope metrics, and compares two concepts.',
      'The intent is to show how architectural judgement, computational geometry and interface design can meet in one coherent tool — not to present a commercial planning product.',
    ],
  },
  {
    title: 'What this is not',
    body: [
      'This is not a BIM authoring environment, a CAD replacement, a regulatory compliance tool or a commercial SaaS. It does not certify daylight factor, planning permission, structural performance or legal setbacks.',
      'All site constraints are explicitly illustrative. No parcel boundary or regulation should be treated as official unless a source is recorded in the site package and attributed in the interface.',
    ],
  },
  {
    title: 'How the model stays honest',
    body: [
      'Authored geometry lives in a local East/North/Up metre frame. One coordinate pipeline serves raycasts, snapping, measurement and export. Domain calculations are kept independent of React and Three.js so they can be tested without mounting a canvas.',
      'Area, volume, height and coverage are derived from the same geometry the visitor edits. Solar direction is calculated from the site’s coordinates and timestamp. Where the tool cannot make a claim, the interface says so.',
    ],
  },
]

export function AboutPage() {
  return (
    <div className="min-h-dvh bg-app">
      <SiteHeader />

      <main className="tf-measure pb-20 pt-14 lg:pt-20">
        <div className="max-w-3xl">
          <p className="text-label text-ink-secondary">
            About the prototype
          </p>
          <h1 className="mt-4 text-balance text-figure-l text-ink">
            A credible architectural tool, presented as a study.
          </h1>
          <p className="mt-6 max-w-[58ch] text-body leading-[1.75] text-ink-secondary">
            Terraform explores a narrow, difficult question: can a browser-based workspace make
            conceptual massing feel spatial, accountable and genuinely useful — without pretending to
            be software it is not?
          </p>
        </div>

        <div className="mt-14 grid gap-12 border-t border-line pt-12 lg:grid-cols-[220px_1fr] lg:gap-16">
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-label text-ink-secondary">
              Scope
            </p>
            <ul className="mt-4 space-y-3 text-body-sm text-ink-secondary">
              <li className="flex gap-2">
                <Icon name="cube" size={15} className="mt-px shrink-0 text-accent" />
                Conceptual massing
              </li>
              <li className="flex gap-2">
                <Icon name="sun" size={15} className="mt-px shrink-0 text-accent" />
                Geometric sun and shadow
              </li>
              <li className="flex gap-2">
                <Icon name="ruler" size={15} className="mt-px shrink-0 text-accent" />
                Derived areas and envelope checks
              </li>
              <li className="flex gap-2">
                <Icon name="layers" size={15} className="mt-px shrink-0 text-accent" />
                Curated static site packages
              </li>
            </ul>
            <div className="mt-8 rounded-card border border-line bg-surface p-4">
              <p className="text-label text-warning-ink">
                Illustrative constraints
              </p>
              <p className="mt-2 text-body-sm leading-relaxed text-ink-secondary">
                Envelope checks are demonstration logic, not planning advice or a legal
                determination.
              </p>
            </div>
          </aside>

          <div className="max-w-2xl space-y-11">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-figure-l text-ink">
                  {section.title}
                </h2>
                <div className="mt-3 space-y-4">
                  {section.body.map((paragraph) => (
                    <p key={paragraph} className="text-body leading-[1.8] text-ink-secondary">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}

            <section id="data" className="scroll-mt-28">
              <h2 className="text-figure-l text-ink">
                Data sources
              </h2>
              <p className="mt-3 text-body leading-[1.8] text-ink-secondary">
                Both sites are static packages built offline. No live GIS service is queried at
                runtime. Each package records its sources, licence, acquisition date and
                simplifications in its own attribution file.
              </p>
              <ul className="mt-5 space-y-3">
                <li className="rounded-card border border-line bg-surface p-4">
                  <p className="text-label text-ink-secondary">
                    Building footprints
                  </p>
                  <p className="mt-1.5 text-body-sm leading-relaxed text-ink-secondary">
                    <a
                      href="https://www.openstreetmap.org/copyright"
                      target="_blank"
                      rel="noreferrer"
                      className="text-ink underline decoration-line underline-offset-2 hover:decoration-ink"
                    >
                      © OpenStreetMap contributors
                    </a>
                    , licensed under the{' '}
                    <a
                      href="https://opendatacommons.org/licenses/odbl/1-0/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-ink underline decoration-line underline-offset-2 hover:decoration-ink"
                    >
                      Open Database License 1.0
                    </a>
                    . Derived footprints are simplified and redistributed under the same licence.
                  </p>
                </li>
                <li className="rounded-card border border-line bg-surface p-4">
                  <p className="text-label text-ink-secondary">
                    Terrain
                  </p>
                  <p className="mt-1.5 text-body-sm leading-relaxed text-ink-secondary">
                    <a
                      href="https://www.kartverket.no/api-og-data/vilkar-for-bruk/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-ink underline decoration-line underline-offset-2 hover:decoration-ink"
                    >
                      © Kartverket
                    </a>
                    , DTM1 elevation sampled through the open height API, licensed under{' '}
                    <a
                      href="https://creativecommons.org/licenses/by/4.0/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-ink underline decoration-line underline-offset-2 hover:decoration-ink"
                    >
                      CC BY 4.0
                    </a>
                    .
                  </p>
                </li>
                <li className="rounded-card border border-line bg-surface p-4">
                  <p className="text-label text-ink-secondary">
                    Study boundary
                  </p>
                  <p className="mt-1.5 text-body-sm leading-relaxed text-ink-secondary">
                    The dashed boundary is an authored study-area rectangle. It is not a cadastral
                    parcel, property boundary, zoning designation or planning constraint.
                  </p>
                </li>
              </ul>
              <p className="mt-3 text-body-sm leading-relaxed text-ink-secondary">
                Streets, trees, parks, grass, woods and water areas come from the same
                OpenStreetMap extract as the building footprints, are simplified, and are drawn at
                illustrative widths and sizes.
              </p>
            </section>

            <section className="rounded-card border border-line bg-surface p-6">
              <h2 className="text-title text-ink">Technical stack</h2>
              <p className="mt-3 text-body-sm leading-relaxed text-ink-secondary">
                TypeScript, React and Vite; Three.js with React Three Fiber and Drei; Zustand for
                editor state; Tailwind CSS with design tokens; IndexedDB for local scenario
                persistence; SunCalc and robust polygon geometry for analysis. Vitest, React Testing
                Library and Playwright cover the test surface.
              </p>
              <p className="mt-3 text-body-sm leading-relaxed text-ink-secondary">
                No backend, authentication, payments or telemetry. AI generation is deferred to an
                optional later phase and is not part of v1.
              </p>
            </section>

            <div className="flex flex-col gap-3 border-t border-line pt-8 sm:flex-row">
              <ButtonLink to="/studio/compact-infill">
                Open the studio
                <Icon name="arrow-up-right" size={15} />
              </ButtonLink>
              <ButtonLink to="/" variant="secondary">
                Back to the sites
              </ButtonLink>
            </div>

          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
