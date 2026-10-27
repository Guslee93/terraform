import { describe, expect, it } from 'vitest'
import {
  createRectangleFootprint,
  createScenario,
  createTier,
  createVolume,
} from '../massing/factories'
import { EMPTY_SELECTION, HISTORY_LIMIT, type ScenarioDocument } from '../massing/types'
import { MassingValidationError } from '../massing/validation'
import {
  beginPreview,
  cancelPreview,
  commitPreview,
  createHistory,
  execute,
  redo,
  select,
  undo,
  updatePreview,
  type MassingCommand,
} from './history'

const base = createScenario({
  id: 'scenario-1',
  siteId: 'compact-infill',
  volumes: [
    createVolume({
      id: 'v1',
      tiers: [createTier({ id: 't1', footprint: createRectangleFootprint(18, 12), storeys: 3 })],
    }),
  ],
})

function rename(name: string): MassingCommand {
  return { label: `Rename to ${name}`, apply: (document) => ({ ...document, name }) }
}

describe('massing history', () => {
  it('records one entry per command and clears redo', () => {
    const first = execute(createHistory(base), rename('A'))
    expect(first.document.name).toBe('A')
    expect(first.undoStack).toHaveLength(1)
    const undone = undo(first)
    expect(undone.redoStack).toHaveLength(1)
    const branched = execute(undone, rename('B'))
    expect(branched.redoStack).toHaveLength(0)
    expect(branched.undoStack).toHaveLength(1)
  })

  it('throws on an invalid result and leaves history untouched', () => {
    const history = createHistory(base)
    const snapshot = JSON.stringify(history)
    expect(() => execute(history, rename(''))).toThrow(MassingValidationError)
    expect(JSON.stringify(history)).toBe(snapshot)
  })

  it('records nothing when a command returns the same document', () => {
    const history = createHistory(base)
    expect(execute(history, { label: 'No-op', apply: (document) => document })).toBe(history)
  })

  it('restores document and selection on undo and redo', () => {
    const selected = select(createHistory(base), { volumeId: 'v1', tierId: 't1' })
    const renamed = execute(selected, { ...rename('A'), selectionAfter: EMPTY_SELECTION })
    expect(renamed.selection).toEqual(EMPTY_SELECTION)
    const undone = undo(renamed)
    expect(undone.document).toBe(base)
    expect(undone.selection).toEqual({ volumeId: 'v1', tierId: 't1' })
    const redone = redo(undone)
    expect(redone.document).toBe(renamed.document)
    expect(redone.selection).toEqual(EMPTY_SELECTION)
  })

  it('treats undo/redo on an empty stack as a no-op', () => {
    const history = createHistory(base)
    expect(undo(history)).toBe(history)
    expect(redo(history)).toBe(history)
  })

  it(`keeps at most ${HISTORY_LIMIT} entries, dropping the oldest`, () => {
    let history = createHistory(base)
    for (let step = 1; step <= HISTORY_LIMIT + 1; step += 1) {
      history = execute(history, rename(`Step ${step}`))
    }
    expect(history.undoStack).toHaveLength(HISTORY_LIMIT)
    expect(history.undoStack[0]?.before.name).toBe('Step 1')
  })
})

describe('preview transactions', () => {
  const resize = (storeys: number) => (document: ScenarioDocument) => ({
    ...document,
    volumes: document.volumes.map((volume) => ({
      ...volume,
      tiers: volume.tiers.map((tier) => ({ ...tier, storeys })),
    })),
  })

  it('commits a multi-step drag as exactly one entry', () => {
    let preview = beginPreview(base)
    for (const storeys of [4, 5, 6]) preview = updatePreview(preview, resize(storeys))
    const history = commitPreview(createHistory(base), preview, 'Set storeys')
    expect(history.undoStack).toHaveLength(1)
    expect(history.document.volumes[0]?.tiers[0]?.storeys).toBe(6)
    expect(undo(history).document).toBe(base)
  })

  it('applies each update to the base, not the previous preview', () => {
    const shifts: number[] = []
    let preview = beginPreview(base)
    for (const storeys of [5, 4]) {
      preview = updatePreview(preview, (document) => {
        shifts.push(document.volumes[0]?.tiers[0]?.storeys ?? -1)
        return resize(storeys)(document)
      })
    }
    expect(shifts).toEqual([3, 3])
  })

  it('cancels back to the exact base with no entry', () => {
    const history = createHistory(base)
    const preview = updatePreview(beginPreview(history.document), resize(5))
    expect(cancelPreview(preview)).toBe(base)
    expect(history.undoStack).toHaveLength(0)
  })

  it('records nothing when a preview never changed', () => {
    const history = createHistory(base)
    expect(commitPreview(history, beginPreview(base), 'Click')).toBe(history)
  })

  it('refuses to commit a preview started from a different document', () => {
    const history = execute(createHistory(base), rename('A'))
    const stale = updatePreview(beginPreview(base), resize(5))
    expect(() => commitPreview(history, stale, 'Set storeys')).toThrow('stale')
  })
})
