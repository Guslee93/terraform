import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryStore, StoreError, type ScenarioStore } from '../../features/scenarios/store'
import { createScenarioRepository } from '../../features/scenarios/repository'
import { addVolume } from '../../features/editor/commands'
import { createRectangleFootprint, createTier, createVolume } from '../../features/massing/factories'
import { ProjectBackup, RecoveryStrip } from './ProjectRecovery'
import { useScenarioProject, type ScenarioProject } from './useScenarioProject'

let project: ScenarioProject
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.open = true }
  HTMLDialogElement.prototype.close = function () { this.open = false }
  URL.createObjectURL = vi.fn(() => 'blob:test')
  URL.revokeObjectURL = vi.fn()
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
})
async function setup(store: ScenarioStore) {
  const repository = createScenarioRepository(store, { now: () => '2026-11-02T00:00:00Z', appVersion: 'test' })
  function Harness() {
    project = useScenarioProject({ siteId: 's', repository })
    return <><RecoveryStrip project={project} siteId="s" /><ProjectBackup project={project} siteId="s" /></>
  }
  render(<Harness />)
  await waitFor(() => expect(project.ready).toBe(true))
  return userEvent.setup()
}
describe('project recovery', () => {
  it('explains memory mode and exports the working project', async () => {
    const memory = createMemoryStore()
    const user = await setup({ ...memory, getProject: async () => { throw new StoreError('unavailable','no') } })
    const strip = screen.getByRole('region', { name: 'Project recovery' })
    expect(strip).toHaveTextContent("changes last only until you close the tab")
    const exportSpy = vi.spyOn(project.actions, 'exportProject')
    await user.click(within(strip).getByRole('button', { name: 'Export project' }))
    expect(exportSpy).toHaveBeenCalled()
    expect(URL.createObjectURL).toHaveBeenCalled()
  })
  it('exposes the raw saved-data export in newer-version mode', async () => {
    const store = createMemoryStore()
    await store.putProject({ siteId: 's', json: '{"schemaVersion":99}' })
    const user = await setup(store)
    expect(screen.getByText(/format 99/)).toBeInTheDocument()
    const saved = vi.spyOn(project.actions, 'exportSavedData')
    await user.click(screen.getByRole('button', { name: 'Export saved data' }))
    expect(saved).toHaveBeenCalled()
  })
  it('lists corrupt records and requires confirmation to discard them', async () => {
    const store = createMemoryStore()
    await store.putScenario({ siteId: 's', id: 'broken', json: '{' })
    const user = await setup(store)
    expect(screen.getByText("1 saved scenario couldn't be opened.")).toBeInTheDocument()
    await user.click(screen.getByText('Details'))
    await user.click(screen.getByRole('button', { name: 'Discard' }))
    expect(await store.listScenarios('s')).toHaveLength(1)
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Discard' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await store.listScenarios('s')).toHaveLength(0)
  })
  it('keeps the record and shows an error if discarding fails', async () => {
    const store = createMemoryStore()
    await store.putScenario({ siteId: 's', id: 'broken', json: '{' })
    const user = await setup({ ...store, deleteScenario: async () => { throw new StoreError('unavailable', 'Deletion failed') } })
    await user.click(screen.getByText('Details'))
    await user.click(screen.getByRole('button', { name: 'Discard' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Discard' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Deletion failed')
    expect(project.skipped).toHaveLength(1)
    expect(await store.listScenarios('s')).toHaveLength(1)
  })
  it('shows quota recovery and retry after an edit fails to save', async () => {
    const store = createMemoryStore()
    await setup(store)
    await act(() => project.actions.flush())
    store.failNext = 'quota'
    act(() => project.dispatch({ type: 'command', command: addVolume(createVolume({ tiers: [createTier({ footprint: createRectangleFootprint(10,10) })] })) }))
    await act(() => project.actions.flush())
    expect(screen.getByText(/Browser storage is full/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Project recovery' })).not.toBeInTheDocument())
  })
  it('rejects a backup for another site before changing the current project', async () => {
    const user = await setup(createMemoryStore())
    const before = project.scenarios
    const file = new File(['{}'], 'other.json', { type: 'application/json' })
    Object.defineProperty(file, 'text', { value: async () => JSON.stringify({ project: { siteId: 'another-site' } }) })
    await user.upload(screen.getByLabelText('Import project…'), file)
    await user.click(screen.getByRole('button', { name: 'Import project' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('project.siteId This backup belongs to a different site.'))
    expect(project.scenarios).toEqual(before)
  })
  it('confirms import and reports bad JSON without changing scenarios', async () => {
    const user = await setup(createMemoryStore())
    const before = project.scenarios
    const file = new File(['{'], 'bad.json', { type: 'application/json' })
    Object.defineProperty(file, 'text', { value: async () => '{' })
    await user.upload(screen.getByLabelText('Import project…'), file)
    expect(screen.getByRole('dialog')).toHaveTextContent('Importing replaces every scenario for this site.')
    await user.click(screen.getByRole('button', { name: 'Import project' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent("This file couldn't be imported: $"))
    expect(project.scenarios).toEqual(before)
  })
})
