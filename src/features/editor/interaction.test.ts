import { describe, expect, it } from 'vitest'
import type { Vec2 } from '../../lib/coordinates'
import { tierHeight } from '../massing/aggregate'
import {
  createRectangleFootprint,
  createScenario,
  createTier,
  createVolume,
} from '../massing/factories'
import { updateVolume } from './commands'
import { createHistory, execute } from './history'
import {
  cameraLocked,
  createEditorState,
  displayedDocument,
  moveGesture,
  reduceEditor,
  roofGesture,
  type EditorEvent,
  type EditorState,
} from './interaction'

const base = createScenario({
  id: 'scenario-1',
  siteId: 'compact-infill',
  volumes: [
    createVolume({
      id: 'v1',
      name: 'Block A',
      tiers: [createTier({ id: 't1', footprint: createRectangleFootprint(18, 12), storeys: 3 })],
    }),
  ],
})
const start = createEditorState(createHistory(base))

function run(state: EditorState, ...events: EditorEvent[]): EditorState {
  return events.reduce(reduceEditor, state)
}

const down = (point: Vec2, extra: Partial<Extract<EditorEvent, { type: 'pointerDown' }>> = {}) =>
  ({ type: 'pointerDown', point, ...extra }) as const
const move = (point: Vec2) => ({ type: 'pointerMove', point }) as const
const up = { type: 'pointerUp' } as const
const key = (name: 'Escape' | 'Enter' | 'Backspace') => ({ type: 'key', key: name }) as const

describe('navigation vs edit', () => {
  it('leaves a pointer-down without a gesture to the camera', () => {
    const state = run(start, down([0, 0]))
    expect(state.interaction.kind).toBe('idle')
    expect(cameraLocked(state)).toBe(false)
  })

  it('captures the pointer for a gesture and releases it on commit', () => {
    const dragging = run(start, down([0, 0], { gesture: moveGesture('v1') }))
    expect(dragging.interaction.kind).toBe('dragging')
    expect(cameraLocked(dragging)).toBe(true)
    expect(cameraLocked(run(dragging, up))).toBe(false)
  })
})

describe('drag transactions', () => {
  it('previews from the gesture origin and commits one entry on release', () => {
    const dragging = run(start, down([0, 0], { gesture: moveGesture('v1') }), move([3, 1]), move([5, 2]))
    expect(dragging.history.document).toBe(base)
    expect(displayedDocument(dragging).volumes[0]?.tiers[0]?.footprint.vertices[0]).toEqual([-4, -4])

    const committed = run(dragging, up)
    expect(committed.history.undoStack).toHaveLength(1)
    expect(committed.history.document.volumes[0]?.tiers[0]?.footprint.vertices[0]).toEqual([-4, -4])
    expect(committed.interaction.kind).toBe('idle')
  })

  it('snaps the move delta to the grid when a step is given', () => {
    const state = run(start, down([0, 0], { gesture: moveGesture('v1', 1) }), move([2.4, -0.6]), up)
    expect(state.history.document.volumes[0]?.tiers[0]?.footprint.vertices[0]).toEqual([-7, -7])
  })

  it('QA-07: roof drag then Esc restores the exact document with no entry', () => {
    const gesture = roofGesture('v1', 't1')
    const dragging = run(start, down([0, 9.6], { gesture }), move([0, 12.8]), move([0, 16]))
    expect(displayedDocument(dragging).volumes[0]?.tiers[0]?.storeys).toBe(5)

    const cancelled = run(dragging, key('Escape'))
    expect(cancelled.history.document).toBe(base)
    expect(cancelled.history.undoStack).toHaveLength(0)
    expect(displayedDocument(cancelled)).toBe(base)
  })

  it('QA-05 via roof drag: 3 → 5 storeys commits a 16 m tier', () => {
    const state = run(start, down([0, 9.6], { gesture: roofGesture('v1', 't1') }), move([0, 16]), up)
    const tier = state.history.document.volumes[0]?.tiers[0]
    expect(tier && tierHeight(tier)).toBeCloseTo(16, 6)
    expect(state.history.undoStack).toHaveLength(1)
  })

  it('treats a lost pointer like Esc', () => {
    const state = run(
      start,
      down([0, 0], { gesture: moveGesture('v1') }),
      move([4, 4]),
      { type: 'pointerCancel' },
    )
    expect(state.history.document).toBe(base)
    expect(state.interaction.kind).toBe('idle')
  })

  it('shows invalid previews and refuses to commit them', () => {
    const dragging = run(start, down([0, 9.6], { gesture: roofGesture('v1', 't1') }), move([0, 140]))
    expect(dragging.interaction.kind === 'dragging' && dragging.interaction.issues.length).toBeGreaterThan(0)

    const released = run(dragging, up)
    expect(released.history.document).toBe(base)
    expect(released.history.undoStack).toHaveLength(0)
    expect(released.error).toBe('Storeys must be an integer between 1 and 40.')
  })

  it('refuses to start a gesture on a locked mass', () => {
    const locked = createEditorState(execute(createHistory(base), updateVolume('v1', { locked: true })))
    const state = run(locked, down([0, 0], { gesture: moveGesture('v1') }))
    expect(state.interaction.kind).toBe('idle')
    expect(state.error).toMatch(/locked/)
  })

  it('ignores undo/redo mid-gesture and allows them when idle', () => {
    const committed = run(start, down([0, 0], { gesture: moveGesture('v1') }), move([1, 0]), up)
    const dragging = run(committed, down([0, 0], { gesture: moveGesture('v1') }), move([2, 0]))
    expect(run(dragging, { type: 'undo' })).toBe(dragging)
    expect(run(committed, { type: 'undo' }).history.document).toBe(base)
  })

  it('cancels an active drag when the tool changes', () => {
    const state = run(start, down([0, 0], { gesture: moveGesture('v1') }), move([4, 0]), {
      type: 'setTool',
      tool: 'draw',
    })
    expect(state.history.document).toBe(base)
    expect(state.tool).toBe('draw')
    expect(state.interaction.kind).toBe('idle')
  })

  it('clears a previous error after a successful action', () => {
    const failed = run(start, down([0, 9.6], { gesture: roofGesture('v1', 't1') }), move([0, 140]), up)
    const recovered = run(failed, down([0, 0], { gesture: moveGesture('v1') }), move([1, 0]), up)
    expect(recovered.error).toBeNull()
  })
})

describe('selection', () => {
  it('selects without a history entry and is ignored mid-gesture', () => {
    const selected = run(start, { type: 'select', selection: { volumeId: 'v1', tierId: 't1' } })
    expect(selected.history.selection).toEqual({ volumeId: 'v1', tierId: 't1' })
    expect(selected.history.undoStack).toHaveLength(0)

    const dragging = run(selected, down([0, 0], { gesture: moveGesture('v1') }))
    expect(run(dragging, { type: 'select', selection: { volumeId: null, tierId: null } })).toBe(dragging)
  })
})

describe('draw footprint', () => {
  const drawing = run(start, { type: 'setTool', tool: 'draw' })

  it('adds points on click, removes with Backspace, and creates a mass on Enter', () => {
    const clicked = run(
      drawing,
      down([20, 0], { elevation: 2 }),
      down([30, 0], { elevation: 1 }),
      down([30, 8], { elevation: 3 }),
      down([25, 12], { elevation: 4 }),
      key('Backspace'),
      down([20, 8], { elevation: 1.5 }),
    )
    expect(clicked.interaction.kind === 'drawing' && clicked.interaction.vertices).toHaveLength(4)

    const finished = run(clicked, key('Enter'))
    const created = finished.history.document.volumes[1]
    expect(created?.name).toBe('Mass 2')
    expect(created?.tiers[0]?.baseElevation).toBe(1)
    expect(created?.tiers[0]?.storeys).toBe(3)
    expect(created?.tiers[0]?.storeyHeight).toBe(base.assumptions.defaultStoreyHeight)
    expect(finished.history.undoStack).toHaveLength(1)
    expect(finished.history.selection.volumeId).toBe(created?.id)
    expect(finished.tool).toBe('select')
    expect(finished.interaction.kind).toBe('idle')
  })

  it('tracks the cursor for the ghost edge', () => {
    const state = run(drawing, down([0, 0]), move([4, 2]))
    expect(state.interaction.kind === 'drawing' && state.interaction.cursor).toEqual([4, 2])
  })

  it('needs at least three points', () => {
    const state = run(drawing, down([0, 20]), down([10, 20]), key('Enter'))
    expect(state.error).toMatch(/three/)
    expect(state.interaction.kind).toBe('drawing')
    expect(state.history.undoStack).toHaveLength(0)
  })

  it('QA-04: rejects a self-intersecting footprint and keeps the points to fix', () => {
    const state = run(
      drawing,
      down([20, 0]),
      down([30, 10]),
      down([30, 0]),
      down([20, 10]),
      key('Enter'),
    )
    expect(state.history.document).toBe(base)
    expect(state.error).toBe('Footprint edges must not cross.')
    expect(state.interaction.kind === 'drawing' && state.interaction.vertices).toHaveLength(4)
  })

  it('clears an error on Esc or a tool change', () => {
    const failed = run(drawing, down([0, 20]), down([10, 20]), key('Enter'))
    expect(run(failed, key('Escape')).error).toBeNull()
    expect(run(failed, { type: 'setTool', tool: 'select' }).error).toBeNull()
  })

  it('discards the drawing on Esc', () => {
    const state = run(drawing, down([20, 0]), down([30, 0]), key('Escape'))
    expect(state.interaction.kind).toBe('idle')
    expect(state.tool).toBe('draw')
    expect(state.history.document).toBe(base)
  })

  it('does not lock the camera while drawing', () => {
    expect(cameraLocked(run(drawing, down([20, 0])))).toBe(false)
  })
})
