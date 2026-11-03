import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import { createMemoryImportedSiteStore } from '../features/import/store'
import { importedFixture } from '../features/import/storeFixtures'
import { createMemoryStore } from '../features/scenarios/store'
import { createScenarioRepository } from '../features/scenarios/repository'
import { createDefaultProject } from '../features/scenarios/project'
import type * as ImportSessionModule from '../features/import/session'
import { LandingPage } from './LandingPage'

const injected = vi.hoisted(() => ({ imports: null as ReturnType<typeof createMemoryImportedSiteStore> | null, scenarios: null as ReturnType<typeof createScenarioRepository> | null }))
vi.mock('../features/import/session', async (original) => ({ ...await original<typeof ImportSessionModule>(), getImportedSiteStore: () => injected.imports! }))
vi.mock('../features/scenarios/defaultRepository', () => ({ getScenarioRepository: () => injected.scenarios! }))
let rows: ReturnType<typeof createMemoryStore>
beforeEach(() => {
  injected.imports = createMemoryImportedSiteStore()
  rows = createMemoryStore()
  injected.scenarios = createScenarioRepository(rows, { now: () => '2026-11-03T12:00:00Z', appVersion: 'test' })
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
})
it('omits My sites when storage is empty', async () => {
  const list = vi.spyOn(injected.imports!, 'list')
  render(<MemoryRouter><LandingPage /></MemoryRouter>)
  await waitFor(() => expect(list).toHaveBeenCalled())
  expect(screen.queryByRole('region', { name: 'My sites' })).not.toBeInTheDocument()
})
it('lists imports and confirms deletion of the site and all scenarios, restoring focus', async () => {
  const site = importedFixture()
  await injected.imports!.put(site)
  const defaults = createDefaultProject(site.summary.id, site.importedAt)
  await injected.scenarios!.saveProject(defaults.project)
  for (const scenario of defaults.scenarios) await injected.scenarios!.saveScenario(scenario)
  const user = userEvent.setup()
  render(<MemoryRouter><LandingPage /></MemoryRouter>)
  const section = await screen.findByRole('region', { name: 'My sites' })
  expect(within(section).getByRole('link', { name: 'Open Oslo test' })).toHaveAttribute('href', '/studio/import/import-test')
  expect(within(section).getByText(/Imported .* · \d+ buildings/)).toBeInTheDocument()
  await user.click(within(section).getByRole('button', { name: 'Delete Oslo test' }))
  let dialog = screen.getByRole('dialog')
  expect(dialog).toHaveTextContent('This removes the imported site and its saved scenarios from this browser.')
  await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
  expect(await injected.imports!.get(site.summary.id)).toBeDefined()
  await user.click(within(section).getByRole('button', { name: 'Delete Oslo test' }))
  dialog = screen.getByRole('dialog')
  await user.click(within(dialog).getByRole('button', { name: 'Delete' }))
  await waitFor(() => expect(screen.queryByRole('region', { name: 'My sites' })).not.toBeInTheDocument())
  expect(await injected.imports!.get(site.summary.id)).toBeUndefined()
  expect(await rows.getProject(site.summary.id)).toBeUndefined()
  expect(await rows.listScenarios(site.summary.id)).toEqual([])
  await waitFor(() => expect(screen.getByRole('link', { name: /Start from any address/ })).toHaveFocus())
})
it('keeps unreadable rows available for deletion', async () => {
  injected.imports = createMemoryImportedSiteStore([{ id: 'import-bad', savedAt: '', json: '{' }])
  render(<MemoryRouter><LandingPage /></MemoryRouter>)
  expect(await screen.findByRole('button', { name: 'Delete Unreadable site' })).toBeInTheDocument()
})
