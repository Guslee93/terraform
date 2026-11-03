import { act, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { importedFixture } from '../features/import/storeFixtures'
import { getImported } from '../features/import/session'
import { ImportedStudioPage } from './StudioPage'
vi.mock('../features/import/session', () => ({ getImported: vi.fn(), deleteImported: vi.fn() }))
vi.mock('../components/studio/StudioShell', () => ({ StudioShell: ({ site, packageStatus }: { site: { title: string }; packageStatus: string }) => <p>{site.title} {packageStatus}</p> }))
beforeEach(() => { vi.mocked(getImported).mockReset() })
function show() { render(<MemoryRouter initialEntries={['/studio/import/import-test']}><Routes><Route path="/studio/import/:importId" element={<ImportedStudioPage />} /></Routes></MemoryRouter>) }
it('shows loading until the validated site arrives', async () => {
  let finish: (value: Awaited<ReturnType<typeof getImported>>) => void = () => {}
  vi.mocked(getImported).mockImplementation(() => new Promise((resolve) => { finish = resolve }))
  show()
  expect(screen.getByRole('status')).toHaveTextContent('Preparing the studio')
  await act(async () => finish(importedFixture()))
  expect(screen.getByText('Oslo test ready')).toBeInTheDocument()
})
it('explains missing sites', async () => {
  vi.mocked(getImported).mockResolvedValue(undefined)
  show()
  expect(await screen.findByText('It may have been deleted from My sites.')).toBeInTheDocument()
})
it('offers deletion for unreadable sites', async () => {
  vi.mocked(getImported).mockResolvedValue({ id: 'import-test', status: 'unreadable' })
  show()
  expect(await screen.findByText('This saved site could not be read.')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Delete it' })).toBeInTheDocument()
})
it('reports storage outages without claiming the site is missing', async () => {
  vi.mocked(getImported).mockRejectedValue(new Error('Storage unavailable'))
  show()
  expect(await screen.findByText('Storage unavailable')).toBeInTheDocument()
  expect(screen.queryByText('It may have been deleted from My sites.')).not.toBeInTheDocument()
})
