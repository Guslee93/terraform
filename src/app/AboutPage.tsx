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
  {
    title: 'Data and attribution',
    body: [
      'The demonstration sites are curated and simplified. They may be inspired by Oslo morphology without representing an exact property. Site packages record their sources, licences, acquisition dates and simplifications; the studio exposes those notes.',
      'The PRD’s preferred pipeline is offline preprocessing: terrain, context and parcel data are transformed once into a compact, versioned asset package rather than fetched from live GIS services at runtime.',
    ],
  },
]

export function AboutPage() {
  return (
    <div className="min-h-dvh bg-app">
      <SiteHeader />

      <main className="tf-measure pb-20 pt-14 lg:pt-20">
        <div className="max-w-3xl">
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-ink-secondary">
            About the prototype
          </p>
          <h1 className="mt-4 text-balance font-display text-[clamp(2.6rem,5.4vw,4rem)] leading-[0.98] tracking-[-0.025em] text-ink">
            A credible architectural tool, presented as a study.
          </h1>
          <p className="mt-6 max-w-[58ch] text-[15px] leading-[1.75] text-ink-secondary">
            Terraform explores a narrow, difficult question: can a browser-based workspace make
            conceptual massing feel spatial, accountable and genuinely useful — without pretending to
            be software it is not?
          </p>
        </div>

        <div className="mt-14 grid gap-12 border-t border-line pt-12 lg:grid-cols-[220px_1fr] lg:gap-16">
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-[9px] font-medium uppercase tracking-[0.18em] text-ink-secondary">
              Scope
            </p>
            <ul className="mt-4 space-y-3 text-[12px] text-ink-secondary">
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
            <div className="mt-8 rounded-[var(--radius-card)] border border-line bg-surface p-4">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-warning">
                Illustrative constraints
              </p>
              <p className="mt-2 text-[11.5px] leading-relaxed text-ink-secondary">
                Envelope checks are demonstration logic, not planning advice or a legal
                determination.
              </p>
            </div>
          </aside>

          <div className="max-w-2xl space-y-11">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="font-display text-[28px] leading-tight tracking-[-0.01em] text-ink">
                  {section.title}
                </h2>
                <div className="mt-3 space-y-4">
                  {section.body.map((paragraph) => (
                    <p key={paragraph} className="text-[13.5px] leading-[1.8] text-ink-secondary">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}

            <section className="rounded-[var(--radius-card)] border border-line bg-surface p-6">
              <h2 className="font-display text-[24px] leading-tight text-ink">Technical stack</h2>
              <p className="mt-3 text-[12.5px] leading-relaxed text-ink-secondary">
                TypeScript, React and Vite; Three.js with React Three Fiber and Drei; Zustand for
                editor state; Tailwind CSS with design tokens; IndexedDB for local scenario
                persistence; SunCalc and robust polygon geometry for analysis. Vitest, React Testing
                Library and Playwright cover the test surface.
              </p>
              <p className="mt-3 text-[12.5px] leading-relaxed text-ink-secondary">
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
