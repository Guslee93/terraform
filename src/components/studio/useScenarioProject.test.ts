import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { addVolume } from '../../features/editor/commands'
import { createRectangleFootprint, createTier, createVolume } from '../../features/massing/factories'
import { createScenarioRepository } from '../../features/scenarios/repository'
import { createMemoryStore, StoreError, type ScenarioStore } from '../../features/scenarios/store'
import { useScenarioProject } from './useScenarioProject'

const SITE = 'compact-infill'
const now = () => '2026-11-02T00:00:00.000Z'
const block = (id: string) => createVolume({ id, name: id, tiers: [createTier({ id: `${id}-t`, footprint: createRectangleFootprint(10, 10) })] })

async function open(store: ScenarioStore) {
  const repository = createScenarioRepository(store, { now, appVersion: 'test' })
  const hook = renderHook(() => useScenarioProject({ siteId: SITE, repository, now }))
  await waitFor(() => expect(hook.result.current.ready).toBe(true))
  return hook
}

describe('useScenarioProject', () => {
  it('keeps an inactive rename when restoring its parked editor history', async () => {
    const { result } = await open(createMemoryStore())
    const a = result.current.scenarios[0]!.id
    const b = result.current.scenarios[1]!.id
    act(() => result.current.dispatch({ type: 'command', command: addVolume(block('kept')) }))
    act(() => result.current.actions.switchTo(b))
    act(() => { result.current.actions.rename(a, 'Courtyard option') })
    act(() => result.current.actions.switchTo(a))
    expect(result.current.editor.history.document.name).toBe('Courtyard option')
    expect(result.current.editor.history.document.volumes[0]?.id).toBe('kept')
    act(() => result.current.dispatch({ type: 'undo' }))
    expect(result.current.editor.history.document.name).toBe('Concept A')
    expect(result.current.editor.history.document.volumes[0]?.id).toBe('kept')
  })

  it('exports the original newer-version project and rows verbatim without overwriting them', async () => {
    const store = createMemoryStore()
    const projectRow = { siteId: SITE, json: '{ "schemaVersion": 99, "futureIndex": ["future"] }' }
    const scenarioRow = { siteId: SITE, id: 'future', json: '{ "schemaVersion": 99, "futureGeometry": "keep me" }' }
    await store.putProject(projectRow)
    await store.putScenario(scenarioRow)
    const { result } = await open(store)
    expect(result.current.storage).toBe('read-only')
    act(() => result.current.dispatch({ type: 'command', command: addVolume(block('temporary')) }))
    await act(() => result.current.actions.flush())
    const saved = JSON.parse(await result.current.actions.exportSavedData())
    expect(saved.rawProject).toEqual(projectRow)
    expect(saved.unreadable).toEqual([{ id: scenarioRow.id, json: scenarioRow.json }])
    expect(saved.scenarios).toBeUndefined()
    expect(JSON.parse(result.current.actions.exportProject()).scenarios[0].volumes[0].id).toBe('temporary')
    expect(await store.getProject(SITE)).toEqual(projectRow)
    expect(await store.listScenarios(SITE)).toEqual([scenarioRow])
  })

  it('starts with Concept A and B and saves them on the first visit', async () => {
    const store = createMemoryStore()
    const { result } = await open(store)
    expect(result.current.scenarios.map((document) => document.name)).toEqual(['Concept A', 'Concept B'])
    expect(result.current.storage).toBe('persistent')
    await act(() => result.current.actions.flush())
    expect((await store.listScenarios(SITE)).length).toBe(2)
    expect(await store.getProject(SITE)).toBeDefined()
  })

  it('QA-09: edits in two scenarios survive a reload, distinct, each with its own undo', async () => {
    const store = createMemoryStore()
    const first = await open(store)
    act(() => first.result.current.dispatch({ type: 'command', command: addVolume(block('in-a')) }))
    const [, bId] = first.result.current.scenarios.map((document) => document.id)
    act(() => first.result.current.actions.switchTo(bId!))
    expect(first.result.current.editor.history.undoStack).toHaveLength(0)
    act(() => first.result.current.dispatch({ type: 'command', command: addVolume(block('in-b')) }))
    act(() => first.result.current.actions.switchTo(first.result.current.scenarios[0]!.id))
    expect(first.result.current.editor.history.undoStack).toHaveLength(1) // A's own history came back
    await act(() => first.result.current.actions.flush())
    first.unmount()

    const second = await open(store)
    expect(second.result.current.scenarios.map((document) => document.volumes.map((volume) => volume.id))).toEqual([['in-a'], ['in-b']])
    expect(second.result.current.activeId).toBe(second.result.current.scenarios[0]?.id)
  })

  it('creates, renames, duplicates and removes, keeping at least one scenario', async () => {
    const store = createMemoryStore()
    const { result } = await open(store)
    act(() => result.current.actions.create())
    expect(result.current.scenarios.map((document) => document.name)).toEqual(['Concept A', 'Concept B', 'Concept C'])
    expect(result.current.activeId).toBe(result.current.scenarios[2]?.id)
    expect(result.current.actions.rename(result.current.scenarios[2]!.id, 'Concept A')).toBe('Another scenario already has this name.')
    act(() => { result.current.actions.rename(result.current.scenarios[2]!.id, 'Tower option') })
    act(() => result.current.actions.duplicate(result.current.scenarios[2]!.id))
    expect(result.current.scenarios.at(-1)?.name).toBe('Tower option copy')
    const activeBefore = result.current.activeId!
    await act(async () => { await result.current.actions.remove(activeBefore) })
    expect(result.current.scenarios.map((document) => document.name)).toEqual(['Concept A', 'Concept B', 'Tower option'])
    expect(result.current.activeId).toBe(result.current.scenarios[2]?.id)
    await act(() => result.current.actions.flush())
    expect((await store.listScenarios(SITE)).map((row) => row.id)).not.toContain(activeBefore)
  })

  it('QA-14: with no storage it works in memory and never claims to have saved', async () => {
    const memory = createMemoryStore()
    const broken: ScenarioStore = { ...memory, getProject: () => Promise.reject(new StoreError('unavailable', 'no')) }
    const { result } = await open(broken)
    expect(result.current.storage).toBe('memory')
    act(() => result.current.dispatch({ type: 'command', command: addVolume(block('x')) }))
    await act(() => result.current.actions.flush())
    expect(result.current.saveStatus).toEqual({ state: 'saved' }) // nothing pending: memory mode never queues
    expect(await memory.listScenarios(SITE)).toEqual([])
  })

  it('exports what is on screen, including unsaved edits, with provenance', async () => {
    const { result } = await open(createMemoryStore())
    act(() => result.current.dispatch({ type: 'command', command: addVolume(block('unsaved')) }))
    const bundle = JSON.parse(result.current.actions.exportProject())
    expect(bundle.provenance).toEqual({ siteId: SITE, appVersion: expect.any(String), exportedAt: now() })
    expect(bundle.scenarios[0].volumes[0].id).toBe('unsaved')
  })

  it('a failed delete or reset throws and leaves the screen as it was (review)', async () => {
    const memory = createMemoryStore()
    const failing: ScenarioStore = {
      ...memory,
      deleteScenario: () => Promise.reject(new StoreError('unavailable', 'delete failed')),
      clearSite: () => Promise.reject(new StoreError('unavailable', 'reset failed')),
    }
    const { result } = await open(failing)
    await act(() => result.current.actions.flush())
    const before = result.current.scenarios.map((document) => document.id)
    await act(async () => { await expect(result.current.actions.remove(before[1]!)).rejects.toThrow('delete failed') })
    await act(async () => { await expect(result.current.actions.resetDemo()).rejects.toThrow('reset failed') })
    expect(result.current.scenarios.map((document) => document.id)).toEqual(before)
  })
})
