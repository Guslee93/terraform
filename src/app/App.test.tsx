import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AppRoutes } from './App'

function renderRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

describe('application routes', () => {
  it('presents the search-first landing (ADR-0020)', () => {
    renderRoute('/')

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/see the wind and sun on any site/i)
    expect(screen.getByRole('combobox', { name: 'Search an address or place' })).toBeInTheDocument()
    expect(screen.getByText(/Screening from open map data — not engineering/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about')
  })

  it('links the ready-made sites to the studio and places to the framing step', () => {
    renderRoute('/')

    expect(screen.getByRole('link', { name: /open compact infill · oslo in the studio/i })).toHaveAttribute('href', '/studio/compact-infill')
    expect(screen.getByRole('link', { name: /open sloped edge · oslo in the studio/i })).toHaveAttribute('href', '/studio/sloped-edge')
    expect(screen.getByRole('link', { name: 'Bergen (Bryggen)' }).getAttribute('href')).toMatch(/^\/new\?lat=.*&lon=.*&label=Bergen/)
  })

  it('renders the about page with explicit limitations', () => {
    renderRoute('/about')

    expect(screen.getByRole('heading', { name: /site readings you can trace/i })).toBeInTheDocument()
    expect(screen.getByText(/not an engineering wind study/i)).toBeInTheDocument()
  })

  it('shows a recoverable state for an unknown site package', async () => {
    renderRoute('/studio/unknown-site')

    expect(screen.getByRole('status')).toHaveTextContent('Preparing the studio')
    expect(screen.getByRole('link', { name: 'Back to the sites' })).toHaveAttribute('href', '/')

    // The studio route is lazy; its first import can exceed the 1 s default under a full parallel run.
    expect(
      await screen.findByRole('heading', { name: /not part of this study/i }, { timeout: 5000 }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back to the sites/i })).toHaveAttribute('href', '/')
  })

  it('keeps About source disclosures and the data anchor reachable', () => {
    renderRoute('/about')

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    const main = within(screen.getByRole('main'))
    expect(main.getByRole('heading', { name: 'Data sources' }).closest('section')).toHaveAttribute('id', 'data')
    expect(main.getByRole('link', { name: '© OpenStreetMap contributors' })).toHaveAttribute('href', 'https://www.openstreetmap.org/copyright')
    expect(main.getByRole('link', { name: '© Kartverket' })).toHaveAttribute('href', 'https://www.kartverket.no/api-og-data/vilkar-for-bruk/')
    expect(main.getByRole('link', { name: 'Open Database License 1.0' })).toBeInTheDocument()
    expect(main.getByRole('link', { name: 'CC BY 4.0' })).toBeInTheDocument()
    expect(main.getByText(/No backend, authentication, payments or telemetry/)).toBeInTheDocument()
  })

  it('keeps header navigation and footer attribution available', () => {
    renderRoute('/about')

    const header = within(screen.getByRole('banner'))
    expect(header.getByRole('link', { name: 'Terraform home' })).toHaveAttribute('href', '/')
    const nav = within(header.getByRole('navigation', { name: 'Primary' }))
    expect(nav.getByRole('link', { name: 'Sites' })).toHaveAttribute('href', '/#sites')
    expect(nav.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about')
    expect(nav.getByRole('link', { name: 'Open demo' })).toHaveAttribute('href', '/studio/compact-infill')
    const footer = within(screen.getByRole('contentinfo'))
    expect(footer.getByRole('link', { name: 'Data' })).toHaveAttribute('href', '/about#data')
    expect(footer.getByText(/constraints are illustrative and not planning advice/)).toBeInTheDocument()
    expect(footer.getByRole('link', { name: '© OpenStreetMap contributors' })).toBeInTheDocument()
    expect(footer.getByRole('link', { name: '© Kartverket' })).toBeInTheDocument()
  })

  it('provides recovery links for a missing page', () => {
    renderRoute('/missing-page')

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('This part of the site has not been surveyed.')
    const main = within(screen.getByRole('main'))
    expect(main.getByRole('link', { name: 'Back to the sites' })).toHaveAttribute('href', '/')
    expect(main.getByRole('link', { name: 'Open Compact Infill' })).toHaveAttribute('href', '/studio/compact-infill')
  })

})
