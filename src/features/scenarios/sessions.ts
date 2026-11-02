import { createHistory } from '../editor/history'
import { createEditorState, type EditorState } from '../editor/interaction'
import type { ScenarioDocument } from '../massing/types'

/**
 * Per-scenario editor sessions (ADR-0011 §7): each scenario keeps its own undo/redo for the
 * browser session. Parking a session drops any unfinished gesture, so nothing half-done is kept.
 */
export type Sessions = ReadonlyMap<string, EditorState>

/** The stored session for a scenario, or a fresh one with an empty history. */
export function sessionFor(sessions: Sessions, document: ScenarioDocument): EditorState {
  return sessions.get(document.id) ?? createEditorState(createHistory(document))
}

/** Keep a scenario's session when switching away: committed history stays, gestures are cancelled. */
export function parkSession(sessions: Sessions, state: EditorState): Sessions {
  const next = new Map(sessions)
  next.set(state.history.document.id, { ...state, tool: 'select', interaction: { kind: 'idle' }, error: null })
  return next
}

/** Forget a scenario's session (delete, reset). */
export function dropSession(sessions: Sessions, scenarioId: string): Sessions {
  const next = new Map(sessions)
  next.delete(scenarioId)
  return next
}
