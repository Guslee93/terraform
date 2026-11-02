import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { SITES } from '../../features/sites/siteCatalog'
import { SiteCard } from './SiteCard'

describe('SiteCard', () => {
  it.each(SITES)('presents the catalogue content and studio link for $title', (site) => {
    render(
      <MemoryRouter>
        <SiteCard site={site} />
      </MemoryRouter>,
    )

    const link = screen.getByRole('link', { name: `Open ${site.title} in the studio` })
    expect(link).toHaveAttribute('href', `/studio/${site.id}`)
    const card = within(link)
    expect(card.getByRole('heading', { level: 3, name: site.title })).toBeInTheDocument()
    expect(card.getByText(site.subtitle)).toBeInTheDocument()
    expect(card.getByText(site.morphology)).toBeInTheDocument()
    expect(card.getByText(site.description)).toBeInTheDocument()
    expect(card.getByAltText('')).toHaveAttribute('src', site.thumbnail)
    expect(card.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(1)
    expect(card.queryByText(/\d|building count|terrain relief/i)).not.toBeInTheDocument()
  })
})
