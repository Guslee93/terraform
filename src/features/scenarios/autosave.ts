import type { ScenarioDocument } from '../massing/types'
import { StoreError, type StoreErrorKind } from './store'

/** What the save indicator shows; always the real state (ADR-0011 §6). */
export type SaveStatus =
  | { readonly state: 'saved' }
  | { readonly state: 'saving' }
  | { readonly state: 'unsaved' }
  | { readonly state: 'error'; readonly kind: StoreErrorKind }

type Options = {
  save: (document: ScenarioDocument) => Promise<void>
  /** ~800 ms after the last committed change (FR-043). */
  delayMs?: number
  /** True during a pointer gesture: the timer waits instead of writing (no writes while dragging). */
  isBusy?: () => boolean
  now: () => string
  /** Starts a timer and returns its cancel function (injected in tests). */
  schedule?: (run: () => void, ms: number) => () => void
}

export type Autosave = {
  /** A committed history change. Only the latest document per scenario is kept. */
  commit(document: ScenarioDocument): void
  /** Save everything pending now (scenario switch, compare, page hidden). Resolves when written or failed. */
  flush(): Promise<void>
  /** Drop a pending save (the scenario is being deleted or reset), so it can't be written back. */
  discard(scenarioId: string): void
  status(): SaveStatus
  subscribe(listener: (status: SaveStatus) => void): () => void
  dispose(): void
}

export function createAutosave({
  save,
  delayMs = 800,
  isBusy = () => false,
  now,
  schedule = (run, ms) => {
    const handle = setTimeout(run, ms)
    return () => clearTimeout(handle)
  },
}: Options): Autosave {
  const pending = new Map<string, ScenarioDocument>()
  /** Ids discarded since their last write began, so a failed in-flight write can't resurrect them. */
  const dropped = new Set<string>()
  const listeners = new Set<(status: SaveStatus) => void>()
  let current: SaveStatus = { state: 'saved' }
  let cancelTimer: (() => void) | null = null
  let running: Promise<void> = Promise.resolve()

  const set = (status: SaveStatus) => {
    current = status
    for (const listener of listeners) listener(status)
  }

  const disarm = () => {
    cancelTimer?.()
    cancelTimer = null
  }

  const arm = () => {
    disarm()
    cancelTimer = schedule(() => {
      cancelTimer = null
      if (isBusy()) arm()
      else void flush()
    }, delayMs)
  }

  async function writeAll() {
    if (pending.size === 0) return
    set({ state: 'saving' })
    let failure: StoreErrorKind | null = null
    for (const id of [...pending.keys()]) {
      // Read at write time: an edit committed while an earlier id was saving must not be lost (review M1).
      const document = pending.get(id)
      if (!document) continue
      pending.delete(id)
      dropped.delete(id)
      try {
        await save({ ...document, updatedAt: now() })
      } catch (error) {
        failure = error instanceof StoreError ? error.kind : 'unavailable'
        // Keep it for the next attempt unless a newer edit arrived or it was discarded meanwhile.
        if (!pending.has(id) && !dropped.has(id)) pending.set(id, document)
      }
    }
    if (failure) set({ state: 'error', kind: failure })
    else set(pending.size > 0 ? { state: 'unsaved' } : { state: 'saved' })
  }

  function flush(): Promise<void> {
    disarm()
    running = running.then(writeAll)
    return running
  }

  return {
    commit(document) {
      pending.set(document.id, document)
      if (current.state !== 'error') set({ state: 'unsaved' })
      arm()
    },
    flush,
    discard(scenarioId) {
      pending.delete(scenarioId)
      dropped.add(scenarioId)
      if (pending.size === 0 && current.state === 'unsaved') set({ state: 'saved' })
    },
    status: () => current,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    dispose() {
      disarm()
      listeners.clear()
    },
  }
}
