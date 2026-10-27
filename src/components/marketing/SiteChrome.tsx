import { Link } from 'react-router-dom'
import { ButtonLink } from '../ui/Button'
import { Icon } from '../ui/Icon'

export function WordmarkMark() {
  return (
    <Link
      to="/"
      aria-label="Terraform home"
      className="grid size-8 place-items-center rounded-[7px] border border-ink/15 bg-surface"
    >
      <span aria-hidden="true" className="size-3 rotate-45 border border-accent/70 bg-accent-soft" />
    </Link>
  )
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="group inline-flex items-center gap-3" aria-label="Terraform home">
      <span
        aria-hidden="true"
        className="relative grid size-7 place-items-center rounded-[6px] border border-ink/15 bg-surface"
      >
        <span className="size-3 rotate-45 border border-accent/70 bg-accent-soft" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-[12px] font-semibold tracking-[0.24em] text-ink">TERRAFORM</span>
        {!compact && (
          <span className="mt-1 hidden text-[9px] uppercase tracking-[0.18em] text-ink-secondary sm:block">
            Architectural site study
          </span>
        )}
      </span>
    </Link>
  )
}

export function SiteHeader() {
  return (
    <header className="border-b border-line/80 bg-app/80 backdrop-blur-sm">
      <div className="tf-measure flex h-[72px] items-center justify-between gap-6">
        <Wordmark />

        <nav aria-label="Primary" className="flex items-center gap-1 sm:gap-3">
          <a
            href="/#sites"
            className="hidden rounded-[var(--radius-control)] px-3 py-2 text-[12px] font-medium text-ink-secondary transition-colors hover:bg-surface-muted hover:text-ink sm:inline-flex"
          >
            Sites
          </a>
          <Link
            to="/about"
            className="hidden rounded-[var(--radius-control)] px-3 py-2 text-[12px] font-medium text-ink-secondary transition-colors hover:bg-surface-muted hover:text-ink sm:inline-flex"
          >
            About
          </Link>
          <ButtonLink to="/studio/compact-infill" variant="primary" className="min-h-9 px-3.5">
            Open demo
            <Icon name="arrow-up-right" size={15} />
          </ButtonLink>
        </nav>
      </div>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line/80 bg-app">
      <div className="tf-measure flex flex-col gap-6 py-10 md:flex-row md:items-start md:justify-between">
        <div className="max-w-md">
          <Wordmark />
          <p className="mt-4 text-[12px] leading-relaxed text-ink-secondary">
            A portfolio prototype for architectural site study. Sites are curated demonstrations;
            constraints are illustrative and not planning advice.
          </p>
        </div>
        <div className="flex flex-col gap-2 text-[11px] uppercase tracking-[0.14em] text-ink-secondary md:items-end">
          <nav aria-label="Footer" className="flex gap-4">
            <Link to="/" className="transition-colors hover:text-ink">
              Sites
            </Link>
            <Link to="/about" className="transition-colors hover:text-ink">
              About
            </Link>
            <Link to="/about#data" className="transition-colors hover:text-ink">
              Data
            </Link>
          </nav>
          <span className="normal-case tracking-normal">
            Buildings{' '}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-line underline-offset-2 hover:text-ink"
            >
              © OpenStreetMap contributors
            </a>{' '}
            (ODbL) · Terrain{' '}
            <a
              href="https://www.kartverket.no/api-og-data/vilkar-for-bruk/"
              target="_blank"
              rel="noreferrer"
              className="underline decoration-line underline-offset-2 hover:text-ink"
            >
              © Kartverket
            </a>{' '}
            (CC BY 4.0)
          </span>
          <span>Oslo, Norway</span>
          <span>Desktop-first · No login</span>
          <span>© 2026 Terraform study</span>
        </div>
      </div>
    </footer>
  )
}
