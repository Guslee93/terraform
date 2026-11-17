import { SiteFooter, SiteHeader } from '../components/marketing/SiteChrome'
import { ButtonLink } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'

const sections = [
  {
    title: 'What this is',
    body: [
      'Terraform is a microclimate and site-analysis prototype. A visitor enters an address or opens a sample site, and reads sun and shadow, wind flow, road noise, runoff and winter snow, with the slope of the ground and a section through it. An optional mode lets them test a building of their own against the same readings.',
      'The intent is to show how architectural judgement, computational geometry and interface design can meet in one coherent tool — not to present a commercial planning product.',
    ],
  },
  {
    title: 'What this is not',
    body: [
      'This is not an engineering wind study, a noise survey, a BIM environment, a regulatory compliance tool or a commercial SaaS. Wind is a screening estimate for comparing places within one site. Road noise is Statens vegvesen’s published strategic noise map, shown as mapped bands and not for assessing individual buildings. Neither certifies comfort, daylight, planning permission or legal setbacks.',
      'Parcel outlines come from Kartverket’s Eiendomskart, shown as published and not as a surveyed boundary. The studio holds no zoning or regulation data and makes no statement about what a plan allows.',
    ],
  },
  {
    title: 'How the model stays honest',
    body: [
      'Authored geometry lives in a local East/North/Up metre frame. One coordinate pipeline serves raycasts, snapping, measurement and export. Domain calculations are kept independent of React and Three.js so they can be tested without mounting a canvas.',
      'Context building heights on the curated sites come from Kartverket’s surface model, measured rather than estimated. Solar direction is calculated from the site’s coordinates and timestamp. Wind is a 2D screening flow inside an analysis circle, and the map can be read at any whole metre above the ground. Noise is Statens vegvesen’s published strategic road-noise map for 2021, shown as published and not for assessing individual buildings. Water is a runoff screening on the 1 m terrain, showing flow paths and hollows, with no drains, rainfall or water depth. Snow is winter climate context from NVE’s 1 km snow model for open terrain, not a measurement at the site and not a snow load. Where the tool cannot make a claim, the interface says so.',
    ],
  },
]

export function AboutPage() {
  return (
    <div className="min-h-dvh bg-app">
      <SiteHeader />

      <main className="mx-auto w-full max-w-[1200px] px-4 sm:px-7 pb-20 pt-14 lg:pt-20">
        <div className="max-w-[68ch]">
          <p className="text-caption text-ink-secondary">
            About the prototype
          </p>
          <h1 className="mt-4 text-balance text-figure-s sm:text-figure-l text-ink">
            Site readings you can trace back to the geometry.
          </h1>
          <p className="mt-6 max-w-[58ch] text-body leading-relaxed text-ink-secondary">
            Terraform asks a narrow question: how much can a browser say about a place from open
            map data alone, while being exact about what it cannot say?
          </p>
        </div>

        <div className="mt-14 grid gap-12 border-t border-line pt-12 lg:grid-cols-[220px_1fr] lg:gap-16">
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-caption text-ink-secondary">
              Scope
            </p>
            <ul className="mt-4 space-y-3 text-body-sm text-ink-secondary">
              <li className="flex gap-2">
                <Icon name="cube" size={15} className="mt-px shrink-0 text-ink-secondary" />
                Live 2D wind flow in an analysis circle (screening), and the official road-noise map as bands
              </li>
              <li className="flex gap-2">
                <Icon name="sun" size={15} className="mt-px shrink-0 text-ink-secondary" />
                Geometric sun and shadow
              </li>
              <li className="flex gap-2">
                <Icon name="ruler" size={15} className="mt-px shrink-0 text-ink-secondary" />
                Terrain slope and sections from the 1 m terrain
              </li>
              <li className="flex gap-2">
                <Icon name="water" size={15} className="mt-px shrink-0 text-ink-secondary" />
                Runoff screening on the 1 m terrain, showing flow paths and hollows
              </li>
              <li className="flex gap-2">
                <Icon name="snow" size={15} className="mt-px shrink-0 text-ink-secondary" />
                Winter climate context from NVE’s 1 km snow model for open terrain
              </li>
              <li className="flex gap-2">
                <Icon name="layers" size={15} className="mt-px shrink-0 text-ink-secondary" />
                Open map data, sample sites
              </li>
            </ul>
            <div className="mt-8 border-t border-line py-4">
              <p className="text-caption text-ink-secondary">
                Indicative and as published
              </p>
              <p className="mt-2 text-body leading-relaxed text-ink-secondary">
                Screening results — wind flow and runoff — are indicative. Mapped facts — road
                noise, hazard maps and parcels — are shown as their publishers issue them, with the
                publisher and the year the data describe.
              </p>
            </div>
          </aside>

          <div className="min-w-0 max-w-[68ch] space-y-11">
            {sections.map((section) => (
              <section key={section.title} className="border-b border-line pb-8">
                <h2 className="text-title text-ink">
                  {section.title}
                </h2>
                <div className="mt-3 space-y-4">
                  {section.body.map((paragraph) => (
                    <p key={paragraph} className="text-body leading-relaxed text-ink-secondary">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}

            <section id="data" className="scroll-mt-28">
              <h2 className="text-title text-ink">
                Data sources
              </h2>
              <p className="mt-3 text-body leading-relaxed text-ink-secondary">
                The two sample sites are static packages built offline. An imported address is
                different: the studio asks public map and elevation services for that place, in the
                browser, and builds the package from their answers. Each package records its
                sources, licence, acquisition date and simplifications in its own attribution file.
              </p>
              <ul className="mt-5 space-y-3">
                <li className="border-t border-line py-4">
                  <p className="text-caption text-ink-secondary">
                    Building footprints
                  </p>
                  <p className="mt-1.5 text-body leading-relaxed text-ink-secondary">
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
                <li className="border-t border-line py-4">
                  <p className="text-caption text-ink-secondary">
                    Terrain, building heights and parcels
                  </p>
                  <p className="mt-1.5 text-body leading-relaxed text-ink-secondary">
                    <a
                      href="https://www.kartverket.no/api-og-data/vilkar-for-bruk/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-ink underline decoration-line underline-offset-2 hover:decoration-ink"
                    >
                      © Kartverket
                    </a>
                    : the DTM1 elevation and the 1 m terrain tile, the DOM1 surface model behind the
                    measured building heights, and the Eiendomskart parcel outlines, licensed
                    under{' '}
                    <a
                      href="https://creativecommons.org/licenses/by/4.0/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-ink underline decoration-line underline-offset-2 hover:decoration-ink"
                    >
                      CC BY 4.0
                    </a>
                    . Heights are measured from a lidar surface model, not surveyed.
                  </p>
                </li>
                <li className="border-t border-line py-4">
                  <p className="text-caption text-ink-secondary">
                    Storm surge
                  </p>
                  <p className="mt-1.5 text-body leading-relaxed text-ink-secondary">
                    Kartverket’s Stormflo og havnivå storm-surge map (2026), under{' '}
                    <a
                      href="https://data.norge.no/nlod/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-ink underline decoration-line underline-offset-2 hover:decoration-ink"
                    >
                      NLOD
                    </a>
                    . Modelled areas, which the publisher says are not suited to detailed studies
                    or decisions at detail level.
                  </p>
                </li>
                <li className="border-t border-line py-4">
                  <p className="text-caption text-ink-secondary">
                    Road noise
                  </p>
                  <p className="mt-1.5 text-body leading-relaxed text-ink-secondary">
                    Statens vegvesen’s strategic road-noise map (Lden, Lnight), calculated for 2021,
                    under{' '}
                    <a
                      href="https://data.norge.no/nlod/en/1.0"
                      target="_blank"
                      rel="noreferrer"
                      className="text-ink underline decoration-line underline-offset-2 hover:decoration-ink"
                    >
                      NLOD 1.0
                    </a>
                    . The publisher does not allow it to be used to assess the need for measures on
                    individual buildings.
                  </p>
                </li>
                <li className="border-t border-line py-4">
                  <p className="text-caption text-ink-secondary">
                    Flood, quick clay and snow
                  </p>
                  <p className="mt-1.5 text-body leading-relaxed text-ink-secondary">
                    NVE: the Flomsoner flood-zone maps, the Flom aktsomhetsområder
                    flood-susceptibility map (2025), the Aktsomhetskart for kvikkleireskred
                    quick-clay map (2026) and the snow-depth series, under{' '}
                    <a
                      href="https://data.norge.no/nlod/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-ink underline decoration-line underline-offset-2 hover:decoration-ink"
                    >
                      NLOD
                    </a>
                    . A “not mapped” answer from any of them means the authority has no mapped
                    area here, and nothing more.
                  </p>
                </li>
              </ul>
              <p className="mt-3 text-body leading-relaxed text-ink-secondary">
                The study area is the rectangle the readings are measured over — authored for the
                sample sites, and the chosen frame inset by 15 % for an imported address. It is not a
                cadastral parcel, property boundary, zoning designation or planning constraint.
              </p>
              <p className="mt-3 text-body leading-relaxed text-ink-secondary">
                Streets, trees, parks, grass, woods and water areas come from the same
                OpenStreetMap extract as the building footprints, are simplified, and are drawn at
                illustrative widths and sizes.
              </p>
              <p className="mt-3 text-body leading-relaxed text-ink-secondary">
                Water is drawn as a surface that follows the mapped outline and the ground along
                it, flat across its width. It is a simplified water level read from the
                elevation model, not a surveyed water level or a river bed. An imported site
                reads its water outlines from OpenStreetMap's own geometry; if that answer is
                unavailable, the generalised map-tile outline is used and the import says so.
              </p>
            </section>

            <section className="border-t border-line pt-6">
              <h2 className="text-title text-ink">Technical stack</h2>
              <p className="mt-3 text-body leading-relaxed text-ink-secondary">
                TypeScript, React and Vite; Three.js with React Three Fiber and Drei; Zustand for
                editor state; Tailwind CSS with design tokens; IndexedDB for local scenario
                persistence; SunCalc and robust polygon geometry for analysis. Vitest, React Testing
                Library and Playwright cover the test surface.
              </p>
              <p className="mt-3 text-body leading-relaxed text-ink-secondary">
                No backend, authentication, payments or telemetry. AI generation is deferred to an
                optional later phase and is not part of v1.
              </p>
            </section>

            <div className="flex flex-col gap-3 border-t border-line pt-8 sm:flex-row">
              <ButtonLink to="/studio/compact-infill" className="min-h-11">
                Open the studio
                <Icon name="arrow-up-right" size={15} />
              </ButtonLink>
              <ButtonLink to="/" variant="ghost" className="min-h-11 underline underline-offset-4">
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
