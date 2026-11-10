import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import type { PlaceResult } from '../features/import/geocode'
import { LandingPage } from './LandingPage'

const searchPlaces = vi.hoisted(() => vi.fn<(query: string, signal?: AbortSignal) => Promise<PlaceResult[]>>())
vi.mock('../features/import/geocode', () => ({ searchPlaces }))
vi.mock('maplibre-gl', () => ({ default: {} }))

function Where() {
  const location = useLocation()
  return <p data-testid="where">{location.pathname + location.search}</p>
}

it('searching an address and choosing it opens the framing step at that place', async () => {
  searchPlaces.mockResolvedValue([{ id: 'p1', label: 'Karl Johans gate 1', detail: 'Oslo', latitude: 59.911378, longitude: 10.749404 } as PlaceResult])
  const user = userEvent.setup()
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/new" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  )
  await user.type(screen.getByRole('combobox', { name: 'Search an address or place' }), 'Karl Johans')
  await user.click(await screen.findByRole('option', { name: /Karl Johans gate 1/ }))
  expect(screen.getByTestId('where')).toHaveTextContent('/new?lat=59.911378&lon=10.749404&label=Karl+Johans+gate+1')
})
