import { describe, expect, it } from 'vitest'
import {
  tierGfa,
  tierHeight,
} from '../massing/aggregate'
import {
  createRectangleFootprint,
  createScenario,
  createTier,
  createVolume,
} from '../massing/factories'
import { EMPTY_SELECTION } from '../massing/types'
import { MassingValidationError } from '../massing/validation'
import {
  addVolume,
  moveVolume,
  removeVolume,
  updateTier,
} from './commands'
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
} from './history'

const lower = createTier({ id: 't1', footprint: createRectangleFootprint(20, 10), storeys: 3 })
const upper = createTier({
  id: 't2',
  footprint: createRectangleFootprint(10, 8),
  baseElevation: 9.6,
  storeys: 2,
})
const stepped = createVolume({ id: 'v1', name: 'Block A', tiers: [lower, upper] })
const block = createVolume({
  id: 'v2',
  name: 'Block B',
  tiers: [createTier({ id: 't3', footprint: createRectangleFootprint(18, 12, [40, 0]), storeys: 3 })],
})
const base = createScenario({ id: 'scenario-1', siteId: 'compact-infill', volumes: [stepped, block] })
const selectedHistory = select(createHistory(base), { volumeId: 'v1', tierId: 't1' })

describe('QA-05 storeys 3 → 5', () => {
  it('updates height and concept GFA from the geometry', () => {
    const history = execute(selectedHistory, updateTier('v2', 't3', { storeys: 5 }))
    const tier = history.document.volumes[1]?.tiers[0]
    expect(tier && tierHeight(tier)).toBeCloseTo(16, 6)
    expect(tier && tierGfa(tier)).toBeCloseTo(1080, 6)
    expect(history.undoStack).toHaveLength(1)
  })
})

describe('QA-07 roof drag + Esc', () => {
  it('reverts to the exact pre-drag dimensions with no history entry', () => {
    const before = JSON.stringify(selectedHistory.document)
    let preview = beginPreview(selectedHistory.document)
    for (const storeys of [4, 5, 7]) {
      preview = updatePreview(preview, updateTier('v1', 't1', { storeys }).apply)
    }
    expect(preview.document.volumes[0]?.tiers[0]?.storeys).toBe(7)
    const reverted = cancelPreview(preview)
    expect(reverted).toBe(selectedHistory.document)
    expect(JSON.stringify(reverted)).toBe(before)
    expect(selectedHistory.undoStack).toHaveLength(0)
  })

  it('commits the same drag on release as one entry', () => {
    const preview = updatePreview(
      beginPreview(selectedHistory.document),
      updateTier('v1', 't1', { storeys: 5 }).apply,
    )
    const history = commitPreview(selectedHistory, preview, 'Set storeys')
    expect(history.undoStack).toHaveLength(1)
    expect(history.document.volumes[0]?.tiers[0]?.storeys).toBe(5)
  })
})

describe('QA-08 undo/redo delete', () => {
  it('deletes, clears selection, and restores the volume in place on undo', () => {
    const deleted = execute(selectedHistory, removeVolume('v1'))
    expect(deleted.document.volumes.map((volume) => volume.id)).toEqual(['v2'])
    expect(deleted.selection).toEqual(EMPTY_SELECTION)

    const undone = undo(deleted)
    expect(undone.document.volumes.map((volume) => volume.id)).toEqual(['v1', 'v2'])
    expect(undone.document).toBe(base)
    expect(undone.selection).toEqual({ volumeId: 'v1', tierId: 't1' })
    expect(redo(undone).selection).toEqual(EMPTY_SELECTION)
  })

})

describe('other commands', () => {
  it('adds a volume and selects it', () => {
    const added = createVolume({
      id: 'v3',
      tiers: [createTier({ id: 't9', footprint: createRectangleFootprint(6, 6, [0, 60]) })],
    })
    const history = execute(selectedHistory, addVolume(added))
    expect(history.document.volumes[2]).toBe(added)
    expect(history.selection).toEqual({ volumeId: 'v3', tierId: 't9' })
  })

  it('moves every tier of a volume', () => {
    const history = execute(selectedHistory, moveVolume('v1', 5, -2))
    const [movedLower, movedUpper] = history.document.volumes[0]?.tiers ?? []
    expect(movedLower?.footprint.vertices[0]).toEqual([-5, -7])
    expect(movedUpper?.footprint.vertices[0]).toEqual([0, -6])
  })

  it('rejects invalid numeric updates without an entry (QA-16)', () => {
    for (const storeys of [-1, Number.NaN, 0, 41]) {
      expect(() => execute(selectedHistory, updateTier('v1', 't1', { storeys }))).toThrow(
        MassingValidationError,
      )
    }
    expect(selectedHistory.undoStack).toHaveLength(0)
  })

  it('throws on unknown ids', () => {
    expect(() => execute(selectedHistory, moveVolume('missing', 1, 1))).toThrow('missing')
    expect(() => execute(selectedHistory, updateTier('v1', 'missing', { storeys: 2 }))).toThrow(
      'missing',
    )
  })
})
