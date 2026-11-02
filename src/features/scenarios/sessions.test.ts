import { describe, expect, it } from 'vitest'
import { reduceEditor } from '../editor/interaction'
import { addVolume } from '../editor/commands'
import { createRectangleFootprint, createScenario, createTier, createVolume } from '../massing/factories'
import { dropSession, parkSession, sessionFor } from './sessions'

const a = createScenario({ id: 'a', siteId: 's', now: '2026-11-02T00:00:00.000Z' })
const b = createScenario({ id: 'b', siteId: 's', name: 'Concept B', now: '2026-11-02T00:00:00.000Z' })

describe('editor sessions', () => {
  it('keeps each scenario\'s own undo history across a switch', () => {
    const volume = createVolume({ id: 'v', name: 'Block', tiers: [createTier({ id: 't', footprint: createRectangleFootprint(10, 10) })] })
    const editedA = reduceEditor(sessionFor(new Map(), a), { type: 'command', command: addVolume(volume) })
    let sessions = parkSession(new Map(), editedA)
    const onB = sessionFor(sessions, b)
    expect(onB.history.document.id).toBe('b')
    expect(onB.history.undoStack).toHaveLength(0)
    sessions = parkSession(sessions, onB)
    const backOnA = sessionFor(sessions, a)
    expect(backOnA.history.document.volumes).toHaveLength(1)
    expect(backOnA.history.undoStack).toHaveLength(1)
    expect(sessionFor(dropSession(sessions, 'a'), a).history.undoStack).toHaveLength(0)
  })

  it('parks a session idle, dropping any unfinished gesture', () => {
    const drawing = reduceEditor(sessionFor(new Map(), a), { type: 'setTool', tool: 'draw' })
    const parked = sessionFor(parkSession(new Map(), drawing), a)
    expect(parked.tool).toBe('select')
    expect(parked.interaction).toEqual({ kind: 'idle' })
  })
})
