import { Link, useNavigate } from 'react-router-dom'
import { Wordmark } from '../components/marketing/SiteChrome'
import { QUICK_PICKS } from '../features/import/cities'
import { SITES } from '../features/sites/siteCatalog'
import { framingHref, PlaceSearch } from './PlaceSearch'

/** Ready-made sites open straight in the studio; quick picks open the framing step. */
const TEMPLATES = SITES.map((site) => ({ id: site.id, label: `${site.title} · Oslo`, href: `/studio/${site.id}` }))
const PLACES = QUICK_PICKS.slice(1, 5).map((pick) => ({ id: pick.id, label: pick.label, href: framingHref(pick.latitude, pick.longitude, pick.label) }))

const chip =
  'inline-flex min-h-9 items-center rounded-full border border-ink/10 bg-surface/70 px-3.5 text-caption text-ink backdrop-blur transition-colors duration-200 hover:bg-surface focus-visible:outline-2 focus-visible:outline-focus'

/** Search-first landing (ADR-0020): one screen — headline, a frosted search card, templates. */
export function LandingPage() {
  const navigate = useNavigate()
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-app text-ink">
      {/* Soft lime → grey wash (owner's references: #F3FFAC / #C7D0D2), slowly drifting; still under reduced motion. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-[15%] -top-[25%] h-[80vh] w-[70vw] rounded-full bg-[#F3FFAC] opacity-70 blur-[110px] motion-safe:animate-[drift_18s_ease-in-out_infinite_alternate]" />
        <div className="absolute -bottom-[30%] -right-[10%] h-[85vh] w-[65vw] rounded-full bg-[#C7D0D2] opacity-80 blur-[120px] motion-safe:animate-[drift_22s_ease-in-out_infinite_alternate-reverse]" />
        <div className="absolute left-[35%] top-[30%] h-[40vh] w-[35vw] rounded-full bg-[#DCE8F0] opacity-60 blur-[100px]" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-[1200px] items-center justify-between px-4 py-3 sm:px-7">
        <Wordmark />
        <Link to="/about" className="inline-flex min-h-11 items-center text-body text-ink-secondary transition-colors duration-200 hover:text-ink">
          About
        </Link>
      </header>

      <main id="main" className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-16 sm:px-7">
        <p className="rounded-full border border-ink/10 bg-surface/60 px-3 py-1 text-caption text-ink-secondary backdrop-blur">
          Wind · Sun · Noise — in 3D, in the browser
        </p>
        <h1 className="mt-5 max-w-3xl text-balance text-center text-figure-s text-ink sm:text-figure-l">
          See the wind and sun on any site.
        </h1>
        <p className="mt-4 max-w-xl text-balance text-center text-body text-ink-secondary">
          Search an address or open a ready-made site. Watch the flow, move the sun, export the image.
        </p>

        <div className="mt-9 w-full max-w-2xl rounded-[28px] border border-white/60 bg-surface/55 p-3 shadow-[0_24px_80px_-24px_rgb(32_32_32/0.35)] backdrop-blur-xl sm:p-4">
          <PlaceSearch
            disabled={false}
            hideLabel
            label="Search an address or place"
            placeholder="Search an address in the Nordics…"
            inputClassName="min-h-14 w-full rounded-[20px] border border-ink/10 bg-surface/80 px-5 text-body text-ink placeholder:text-ink-secondary focus-visible:outline-2 focus-visible:outline-focus"
            onSelect={(place) => navigate(framingHref(place.latitude, place.longitude, place.label))}
          />
          <div className="mt-1 flex flex-wrap items-center gap-2 px-1">
            <span className="text-caption text-ink-secondary">Ready-made</span>
            {TEMPLATES.map((t) => (
              <Link key={t.id} to={t.href} className={chip} aria-label={`Open ${t.label} in the studio`}>{t.label}</Link>
            ))}
            <span aria-hidden="true" className="mx-1 h-4 w-px bg-ink/15" />
            {PLACES.map((p) => (
              <Link key={p.id} to={p.href} className={chip}>{p.label}</Link>
            ))}
          </div>
        </div>

      </main>

      <footer className="relative z-10 px-4 pb-6 sm:px-7">
        <p className="mx-auto max-w-xl text-balance text-center text-caption text-ink-secondary">
          Screening from open map data — not engineering. Buildings © OpenStreetMap contributors · Terrain © Kartverket.
        </p>
      </footer>
    </div>
  )
}
