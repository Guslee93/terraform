import { describe, expect, it } from 'vitest'
import {
  tierFootprintArea,
  tierGfa,
  tierHeight,
  volumeGfa,
  volumeGroundFootprintArea,
  volumeMaxHeight,
  volumeVolume,
} from '../massing/aggregate'
import { ringWithin } from '../../lib/polygon'
import {
  createFootprint,
  createRectangleFootprint,
  createScenario,
  createTier,
  createVolume,
} from '../massing/factories'
import { EMPTY_SELECTION } from '../massing/types'
import { MassingValidationError } from '../massing/validation'
import {
  addTier,
  addVolume,
  duplicateVolume,
  moveVolume,
  removeTier,
  removeVolume,
  rotateVolume,
  stackTier,
  updateTier,
  updateVolume,
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

describe('QA-08 undo/redo duplicate, delete, rotate', () => {
  it('duplicates with fresh ids, selects the copy, and undoes exactly', () => {
    const duplicated = execute(selectedHistory, duplicateVolume('v1', { id: 'v1-copy', offset: [0, 30] }))
    const copy = duplicated.document.volumes[2]
    expect(copy?.id).toBe('v1-copy')
    expect(copy?.name).toBe('Block A copy')
    expect(copy?.tiers.map((tier) => tier.id)).not.toContain('t1')
    expect(copy && volumeGfa(copy)).toBeCloseTo(760, 6)
    expect(copy?.tiers[0]?.footprint.vertices[0]).toEqual([-10, 25])
    expect(duplicated.selection).toEqual({ volumeId: 'v1-copy', tierId: copy?.tiers[0]?.id })

    const undone = undo(duplicated)
    expect(undone.document).toBe(base)
    expect(undone.selection).toEqual({ volumeId: 'v1', tierId: 't1' })
    const redone = redo(undone)
    expect(redone.document).toEqual(duplicated.document)
    expect(redone.selection).toEqual(duplicated.selection)
  })

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

  it('rotates every tier about one pivot and undoes to exact vertices', () => {
    const rotated = execute(selectedHistory, rotateVolume('v1', Math.PI / 2))
    const [rotatedLower, rotatedUpper] = rotated.document.volumes[0]?.tiers ?? []
    // 20 × 10 about the origin becomes 10 × 20; the upper tier stays stacked on the same pivot.
    expect(rotatedLower?.footprint.vertices[0]?.[0]).toBeCloseTo(5, 9)
    expect(rotatedLower?.footprint.vertices[0]?.[1]).toBeCloseTo(-10, 9)
    expect(rotatedUpper?.footprint.vertices[0]?.[0]).toBeCloseTo(4, 9)
    expect(rotatedUpper?.footprint.vertices[0]?.[1]).toBeCloseTo(-5, 9)

    const undone = undo(rotated)
    expect(undone.document.volumes[0]?.tiers[0]?.footprint.vertices).toEqual(
      lower.footprint.vertices,
    )
    expect(undone.selection).toEqual({ volumeId: 'v1', tierId: 't1' })
    expect(redo(undone).document).toBe(rotated.document)
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

  it('updates volume properties', () => {
    const history = execute(selectedHistory, updateVolume('v2', { name: 'Tower', locked: true }))
    expect(history.document.volumes[1]).toMatchObject({ name: 'Tower', locked: true })
  })

  it('stacks and removes tiers', () => {
    const top = createTier({
      id: 't4',
      footprint: createRectangleFootprint(6, 6),
      baseElevation: 16,
      storeys: 1,
    })
    const stacked = execute(selectedHistory, addTier('v1', top))
    expect(stacked.document.volumes[0]?.tiers.map((tier) => tier.id)).toEqual(['t1', 't2', 't4'])
    expect(stacked.selection).toEqual({ volumeId: 'v1', tierId: 't4' })

    const removed = execute(stacked, removeTier('v1', 't4'))
    expect(removed.document.volumes[0]?.tiers.map((tier) => tier.id)).toEqual(['t1', 't2'])
    expect(removed.selection).toEqual({ volumeId: 'v1', tierId: null })
  })

  it('rejects removing the last tier through validation', () => {
    expect(() => execute(selectedHistory, removeTier('v2', 't3'))).toThrow(MassingValidationError)
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

describe('locked masses', () => {
  const locked = execute(selectedHistory, updateVolume('v1', { locked: true }))
  const top = createTier({ id: 't4', footprint: createRectangleFootprint(6, 6), baseElevation: 16 })

  it.each([
    ['move', moveVolume('v1', 1, 0)],
    ['rotate', rotateVolume('v1', Math.PI / 4)],
    ['edit tier', updateTier('v1', 't1', { storeys: 5 })],
    ['add tier', addTier('v1', top)],
    ['remove tier', removeTier('v1', 't2')],
    ['delete', removeVolume('v1')],
  ])('blocks %s without a history entry', (_name, command) => {
    expect(() => execute(locked, command)).toThrow('locked')
    expect(locked.undoStack).toHaveLength(1)
  })

  it('still allows rename, hide and unlock', () => {
    const renamed = execute(locked, updateVolume('v1', { name: 'Kept', visible: false }))
    expect(renamed.document.volumes[0]).toMatchObject({ name: 'Kept', visible: false, locked: true })
    const unlocked = execute(locked, updateVolume('v1', { locked: false }))
    expect(execute(unlocked, moveVolume('v1', 1, 0)).undoStack).toHaveLength(3)
  })

  it('duplicates a locked mass as an unlocked copy', () => {
    const duplicated = execute(locked, duplicateVolume('v1', { id: 'v1-copy' }))
    expect(duplicated.document.volumes[0]?.locked).toBe(true)
    expect(duplicated.document.volumes[2]?.locked).toBe(false)
  })

  it('leaves other masses editable', () => {
    expect(execute(locked, moveVolume('v2', 1, 0)).undoStack).toHaveLength(2)
  })
})

describe('stacked tiers', () => {
  // Lower tier of the stepped-mass fixture (docs/qa/fixtures.md §2): 20 × 10 m, 3 × 3.2 m.
  const lowerOnly = createVolume({
    id: 'v1',
    tiers: [createTier({ id: 't1', footprint: createRectangleFootprint(20, 10), storeys: 3, use: 'mixed' })],
  })
  const single = createHistory(createScenario({ siteId: 'compact-infill', volumes: [lowerOnly] }))
  const tiersOf = (history: ReturnType<typeof createHistory>) => history.document.volumes[0]?.tiers ?? []

  it('stacks a set-back tier on top and selects it', () => {
    const history = execute(single, stackTier('v1', { id: 't2' }))
    const [lower, upper] = tiersOf(history)
    expect(upper?.baseElevation).toBeCloseTo(9.6, 9)
    expect(upper?.storeys).toBe(2)
    expect(upper?.storeyHeight).toBe(lower?.storeyHeight)
    expect(upper?.use).toBe('mixed')
    expect(upper && tierFootprintArea(upper)).toBeCloseTo(200 * 0.36, 6)
    expect(lower && upper && ringWithin(upper.footprint.vertices, lower.footprint.vertices)).toBe(true)
    expect(history.selection).toEqual({ volumeId: 'v1', tierId: 't2' })
    const volume = history.document.volumes[0]
    expect(volume && volumeGroundFootprintArea(volume)).toBeCloseTo(200, 6)
  })

  it('stacks the next tier on the current top', () => {
    const twice = execute(execute(single, stackTier('v1', { id: 't2' })), stackTier('v1', { id: 't3' }))
    expect(tiersOf(twice)[2]?.baseElevation).toBeCloseTo(16, 9)
  })

  it('falls back to the full outline when a setback would leave a concave base', () => {
    const u = createFootprint([[0, 0], [30, 0], [30, 20], [20, 20], [20, 5], [10, 5], [10, 20], [0, 20]])
    const concave = createHistory(
      createScenario({
        siteId: 'compact-infill',
        volumes: [createVolume({ id: 'v1', tiers: [createTier({ id: 't1', footprint: u })] })],
      }),
    )
    const history = execute(concave, stackTier('v1', { id: 't2' }))
    expect(tiersOf(history)[1]?.footprint.vertices).toEqual(u.vertices)
  })

  it('keeps upper tiers attached when a lower tier changes height or base', () => {
    const stacked = execute(single, stackTier('v1', { id: 't2' }))
    const taller = execute(stacked, updateTier('v1', 't1', { storeys: 4 }))
    expect(tiersOf(taller)[1]?.baseElevation).toBeCloseTo(12.8, 9)
    const raised = execute(stacked, updateTier('v1', 't1', { baseElevation: 1 }))
    expect(tiersOf(raised)[1]?.baseElevation).toBeCloseTo(10.6, 9)
    const upperOnly = execute(stacked, updateTier('v1', 't2', { storeys: 5 }))
    expect(tiersOf(upperOnly)[0]?.storeys).toBe(3)
  })

  it('reproduces the stepped-mass fixture through the command path', () => {
    const stacked = execute(single, stackTier('v1', { id: 't2' }))
    const fixture = execute(stacked, updateTier('v1', 't2', { footprint: createRectangleFootprint(10, 8), storeys: 2 }))
    const volume = fixture.document.volumes[0]
    expect(volume && volumeGroundFootprintArea(volume)).toBeCloseTo(200, 6)
    expect(volume && volumeGfa(volume)).toBeCloseTo(760, 6)
    expect(volume && volumeVolume(volume)).toBeCloseTo(2432, 6)
    expect(volume && volumeMaxHeight(volume)).toBeCloseTo(16, 6)
  })

  it('refuses to stack on a locked mass', () => {
    const locked = execute(single, updateVolume('v1', { locked: true }))
    expect(() => execute(locked, stackTier('v1'))).toThrow('locked')
  })
})
