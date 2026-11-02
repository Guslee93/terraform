import { describe, expect, it, vi } from 'vitest'
import { createScenario } from '../massing/factories'
import type { ScenarioDocument } from '../massing/types'
import { createAutosave, type SaveStatus } from './autosave'
import { StoreError } from './store'

const NOW = '2026-11-02T10:00:00.000Z'

/** A manual clock: timers fire only when `tick` is called. */
function manualTimers() {
  let queue: { at: number; run: () => void }[] = []
  let time = 0
  return {
    schedule: (run: () => void, ms: number) => {
      const entry = { at: time + ms, run }
      queue.push(entry)
      return () => { queue = queue.filter((candidate) => candidate !== entry) }
    },
    async tick(ms: number) {
      time += ms
      const due = queue.filter((entry) => entry.at <= time)
      queue = queue.filter((entry) => entry.at > time)
      for (const entry of due) entry.run()
      await Promise.resolve()
      await new Promise((resolve) => setTimeout(resolve, 0))
    },
  }
}

const doc = (id: string, name = id): ScenarioDocument => createScenario({ id, siteId: 's', name, now: '2026-11-01T00:00:00.000Z' })

describe('autosave', () => {
  it('saves ~800 ms after the last commit, coalescing edits, with updatedAt set at save time', async () => {
    const timers = manualTimers()
    const save = vi.fn<(document: ScenarioDocument) => Promise<void>>(async () => undefined)
    const autosave = createAutosave({ save, now: () => NOW, schedule: timers.schedule })
    const seen: SaveStatus[] = []
    autosave.subscribe((status) => seen.push(status))
    autosave.commit(doc('a', 'first'))
    await timers.tick(500)
    autosave.commit(doc('a', 'second'))
    await timers.tick(500)
    expect(save).not.toHaveBeenCalled()
    await timers.tick(300)
    expect(save).toHaveBeenCalledTimes(1)
    expect(save).toHaveBeenCalledWith({ ...doc('a', 'second'), updatedAt: NOW })
    expect(seen.map((status) => status.state)).toEqual(['unsaved', 'unsaved', 'saving', 'saved'])
  })

  it('never writes while a gesture is in progress; it waits and saves after', async () => {
    const timers = manualTimers()
    const save = vi.fn<(document: ScenarioDocument) => Promise<void>>(async () => undefined)
    let busy = true
    const autosave = createAutosave({ save, now: () => NOW, schedule: timers.schedule, isBusy: () => busy })
    autosave.commit(doc('a'))
    await timers.tick(800)
    await timers.tick(800)
    expect(save).not.toHaveBeenCalled()
    busy = false
    await timers.tick(800)
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('flush saves every pending scenario immediately (switch, hidden page)', async () => {
    const timers = manualTimers()
    const save = vi.fn<(document: ScenarioDocument) => Promise<void>>(async () => undefined)
    const autosave = createAutosave({ save, now: () => NOW, schedule: timers.schedule })
    autosave.commit(doc('a'))
    autosave.commit(doc('b'))
    await autosave.flush()
    expect(save.mock.calls.map(([document]) => document.id)).toEqual(['a', 'b'])
    expect(autosave.status()).toEqual({ state: 'saved' })
  })

  it('reports a quota error, keeps the edit and retries on the next commit', async () => {
    const timers = manualTimers()
    const save = vi.fn<(document: ScenarioDocument) => Promise<void>>()
      .mockRejectedValueOnce(new StoreError('quota', 'full'))
      .mockResolvedValue(undefined)
    const autosave = createAutosave({ save, now: () => NOW, schedule: timers.schedule })
    autosave.commit(doc('a'))
    await autosave.flush()
    expect(autosave.status()).toEqual({ state: 'error', kind: 'quota' })
    autosave.commit(doc('b'))
    await autosave.flush()
    expect(save.mock.calls.map(([document]) => document.id)).toEqual(['a', 'a', 'b'])
    expect(autosave.status()).toEqual({ state: 'saved' })
  })

  it('discards a pending save so a deleted scenario is never written back', async () => {
    const timers = manualTimers()
    const save = vi.fn<(document: ScenarioDocument) => Promise<void>>(async () => undefined)
    const autosave = createAutosave({ save, now: () => NOW, schedule: timers.schedule })
    autosave.commit(doc('a'))
    autosave.discard('a')
    await autosave.flush()
    expect(save).not.toHaveBeenCalled()
    expect(autosave.status()).toEqual({ state: 'saved' })
  })
})
