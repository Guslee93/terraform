import { render, screen } from '@testing-library/react'
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
