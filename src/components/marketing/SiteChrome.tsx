import { Link } from 'react-router-dom'
import { Icon } from '../ui/Icon'

export function WordmarkMark() {
  return (
    <Link to="/" aria-label="Terraform home" className="inline-flex size-11 items-center justify-center">
      <span aria-hidden="true" className="size-2.5 rotate-45 bg-ink" />
    </Link>
  )
}

export function Wordmark() {
  return (
    <Link to="/" className="inline-flex min-h-11 items-center gap-2.5 text-body font-medium text-ink" aria-label="Terraform home">
      <span aria-hidden="true" className="size-2.5 rotate-45 bg-ink" />
      Terraform
    </Link>
  )
}

export function SiteHeader() {
  return (
    <header className="bg-app">
      <div className="mx-auto flex min-h-18 w-full max-w-[1200px] flex-wrap items-center justify-between gap-x-5 px-4 py-2 sm:px-7">
        <Wordmark />
        <nav aria-label="Primary" className="flex flex-wrap items-center gap-4 sm:gap-7">
          <a href="/#sites" className="inline-flex min-h-11 items-center text-body text-ink-secondary transition-colors duration-200 hover:text-ink">
            Sites
          </a>
          <Link to="/about" className="inline-flex min-h-11 items-center text-body text-ink-secondary transition-colors duration-200 hover:text-ink">
            About
          </Link>
          <Link to="/studio/compact-infill" className="inline-flex min-h-11 items-center gap-2 text-body text-ink underline underline-offset-4 transition-colors duration-200 hover:text-ink-secondary">
            Open demo
            <Icon name="arrow-up-right" size={15} />
          </Link>
        </nav>
      </div>
    </header>
  )
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-app">
      <p className="mx-auto w-full max-w-[1200px] px-4 py-6 text-caption text-ink-secondary sm:px-7">
        A portfolio prototype for architectural site study. Sites are curated demonstrations;
        constraints are illustrative and not planning advice. · Buildings{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-ink">
          © OpenStreetMap contributors
        </a>{' '}
        (ODbL) · Terrain{' '}
        <a href="https://www.kartverket.no/api-og-data/vilkar-for-bruk/" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-ink">
          © Kartverket
        </a>{' '}
        (CC BY 4.0) · <Link to="/about#data" className="underline underline-offset-2 hover:text-ink">Data</Link>
      </p>
    </footer>
  )
}
