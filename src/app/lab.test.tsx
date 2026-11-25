import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AppRoutes, isLabEnabled } from './App'

describe('Visual Lab gate (ADR-0040)', () => {
  it('enables the Lab only when DEV or VITE_LAB=1', () => {
    // The production build has DEV=false and no VITE_LAB, so the route (and its chunk) are gone.
    expect(isLabEnabled({ DEV: false, VITE_LAB: undefined })).toBe(false)
    expect(isLabEnabled({ DEV: false, VITE_LAB: '0' })).toBe(false)
    expect(isLabEnabled({ DEV: true, VITE_LAB: undefined })).toBe(true)
    expect(isLabEnabled({ DEV: false, VITE_LAB: '1' })).toBe(true)
  })

  it('routes /lab/:siteId to the Lab when enabled (dev)', async () => {
    render(
      <MemoryRouter initialEntries={['/lab/compact-infill']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    // The lazy Lab page shows its own chrome, never the 404 page.
    expect(await screen.findByText('Visual Lab', {}, { timeout: 5000 })).toBeInTheDocument()
    expect(screen.queryByText('This part of the site has not been surveyed.')).not.toBeInTheDocument()
  })
})
