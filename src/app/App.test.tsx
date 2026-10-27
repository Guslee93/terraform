import { render, screen } from '@testing-library/react'
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
  it('presents the landing proposition and both sites', () => {
    renderRoute('/')

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/explore a site/i)
    expect(screen.getByRole('heading', { name: 'Compact Infill' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sloped Edge' })).toBeInTheDocument()
  })

  it('links each card to its studio route', () => {
    renderRoute('/')

    expect(screen.getByRole('link', { name: /open compact infill in the studio/i })).toHaveAttribute(
      'href',
      '/studio/compact-infill',
    )
    expect(screen.getByRole('link', { name: /open sloped edge in the studio/i })).toHaveAttribute(
      'href',
      '/studio/sloped-edge',
    )
  })

  it('renders the about page with explicit limitations', () => {
    renderRoute('/about')

    expect(screen.getByRole('heading', { name: /a credible architectural tool/i })).toBeInTheDocument()
    expect(screen.getByText(/not a bim authoring environment/i)).toBeInTheDocument()
  })

  it('shows a recoverable state for an unknown site package', async () => {
    renderRoute('/studio/unknown-site')

    expect(
      await screen.findByRole('heading', { name: /not part of this study/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back to the sites/i })).toHaveAttribute('href', '/')
  })
})
