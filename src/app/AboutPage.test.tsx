import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { expect, it } from 'vitest'
import { AboutPage } from './AboutPage'

function renderAbout() {
  return render(
    <MemoryRouter>
      <AboutPage />
    </MemoryRouter>,
  )
}

/** The Data sources section, so an assertion cannot be satisfied by prose elsewhere on the page. */
function dataSources() {
  return within(screen.getByRole('heading', { name: 'Data sources' }).closest('section') as HTMLElement)
}

/** The Scope list in the aside, so a phrase used in the prose cannot satisfy a scope assertion. */
function scopeList() {
  return within(screen.getByRole('complementary'))
}

it('does not describe the retired road-noise heuristic', () => {
  renderAbout()
  expect(screen.queryByText(/road class and distance/i)).not.toBeInTheDocument()
  expect(screen.queryByText(/fixed reduction behind buildings/i)).not.toBeInTheDocument()
})

it('describes the official road-noise map as published', () => {
  renderAbout()
  expect(
    screen.getByText(
      /Statens vegvesen’s published strategic road-noise map for 2021, shown as published and not for assessing individual buildings/i,
    ),
  ).toBeInTheDocument()
})

it('describes the wind flow as a screening that can be read at any whole metre', () => {
  renderAbout()
  expect(
    screen.getByText(
      /Wind is a 2D screening flow inside an analysis circle, and the map can be read at any whole metre above the ground/i,
    ),
  ).toBeInTheDocument()
})

it('describes the Water card as a runoff screening', () => {
  renderAbout()
  expect(
    screen.getByText(
      /Water is a runoff screening on the 1 m terrain, showing flow paths and hollows, with no drains, rainfall or water depth/i,
    ),
  ).toBeInTheDocument()
})

it('describes the Snow card as winter climate context', () => {
  renderAbout()
  expect(
    screen.getByText(
      /Snow is winter climate context from NVE’s 1 km snow model for open terrain, not a measurement at the site and not a snow load/i,
    ),
  ).toBeInTheDocument()
})

it('names the Water and Snow cards', () => {
  renderAbout()
  expect(screen.getAllByText(/\bWater\b/).length).toBeGreaterThan(0)
  expect(screen.getAllByText(/\bSnow\b/).length).toBeGreaterThan(0)
})

it('names the five analyses and the terrain tools in the introduction', () => {
  renderAbout()
  expect(
    screen.getByText(
      /reads sun and shadow, wind flow, road noise, runoff and winter snow, with the slope of the ground and a section through it/i,
    ),
  ).toBeInTheDocument()
  // The study area is no longer something the visitor chooses (ADR-0020).
  expect(screen.queryByText(/chooses the study area/i)).not.toBeInTheDocument()
  expect(screen.queryByText(/area figures/i)).not.toBeInTheDocument()
})

it('describes the parcels and the absence of zoning data', () => {
  renderAbout()
  expect(
    screen.getByText(
      /Parcel outlines come from Kartverket’s Eiendomskart, shown as published and not as a surveyed boundary/i,
    ),
  ).toBeInTheDocument()
  expect(
    screen.getByText(/holds no zoning or regulation data and makes no statement about what a plan allows/i),
  ).toBeInTheDocument()
})

it('says where the context building heights come from', () => {
  renderAbout()
  expect(
    screen.getByText(
      /Context building heights on the curated sites come from Kartverket’s surface model, measured rather than estimated/i,
    ),
  ).toBeInTheDocument()
  expect(screen.queryByText(/Area, coverage and height come from building footprints/i)).not.toBeInTheDocument()
})

it('lists the terrain tools, the runoff screening and the winter snow in the scope', () => {
  renderAbout()
  const scope = scopeList()
  expect(scope.getByText(/Terrain slope and sections from the 1 m terrain/i)).toBeInTheDocument()
  expect(scope.getByText(/Runoff screening on the 1 m terrain, showing flow paths and hollows/i)).toBeInTheDocument()
  expect(scope.getByText(/Winter climate context from NVE’s 1 km snow model for open terrain/i)).toBeInTheDocument()
  expect(screen.queryByText(/Study-area figures/i)).not.toBeInTheDocument()
})

it('says what the readings are worth, and no longer promises envelope checks', () => {
  renderAbout()
  expect(screen.getByText(/Indicative and as published/i)).toBeInTheDocument()
  expect(
    screen.getByText(
      /Screening results — wind flow and runoff — are indicative\. Mapped facts — road noise, hazard maps and parcels — are shown as their publishers issue them, with the publisher and the year the data describe\./i,
    ),
  ).toBeInTheDocument()
  expect(screen.queryByText(/Envelope checks/i)).not.toBeInTheDocument()
})

it('says that an imported address queries public services, unlike the sample sites', () => {
  renderAbout()
  expect(
    screen.getByText(
      /The two sample sites are static packages built offline\. An imported address is different: the studio asks public map and elevation services for that place, in the browser/i,
    ),
  ).toBeInTheDocument()
  expect(screen.queryByText(/No live GIS service is queried at runtime/i)).not.toBeInTheDocument()
})

it('names every source owner in the Data sources section', () => {
  renderAbout()
  const sources = dataSources()
  expect(sources.getByText(/OpenStreetMap contributors/i)).toBeInTheDocument()
  expect(sources.getAllByText(/Kartverket/i).length).toBeGreaterThan(0)
  expect(sources.getByText(/Statens vegvesen/i)).toBeInTheDocument()
  expect(sources.getByText(/NVE/i)).toBeInTheDocument()
})

it('gives each source its licence and link', () => {
  renderAbout()
  const sources = dataSources()
  expect(sources.getByRole('link', { name: 'Open Database License 1.0' })).toHaveAttribute(
    'href',
    'https://opendatacommons.org/licenses/odbl/1-0/',
  )
  expect(sources.getByRole('link', { name: 'CC BY 4.0' })).toHaveAttribute(
    'href',
    'https://creativecommons.org/licenses/by/4.0/',
  )
  expect(sources.getByRole('link', { name: 'NLOD 1.0' })).toHaveAttribute(
    'href',
    'https://data.norge.no/nlod/en/1.0',
  )
  expect(sources.getAllByRole('link', { name: 'NLOD' })[0]).toHaveAttribute(
    'href',
    'https://data.norge.no/nlod/',
  )
  expect(sources.getByRole('link', { name: '© Kartverket' })).toHaveAttribute(
    'href',
    'https://www.kartverket.no/api-og-data/vilkar-for-bruk/',
  )
  expect(sources.getByRole('link', { name: '© OpenStreetMap contributors' })).toHaveAttribute(
    'href',
    'https://www.openstreetmap.org/copyright',
  )
})

it('uses none of the banned claim words anywhere on the page', () => {
  const { container } = renderAbout()
  const text = container.textContent ?? ''
  for (const phrase of ['planning compliant', 'verified daylight', 'official parcel', 'BIM-ready', 'safe', 'accurate']) {
    expect(text.toLowerCase()).not.toContain(phrase.toLowerCase())
  }
})
