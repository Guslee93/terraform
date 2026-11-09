import {
  EMPTY_SELECTION,
  HISTORY_LIMIT,
  type MassSelection,
  type ScenarioDocument,
} from '../massing/types'
import { MassingValidationError, validateScenario } from '../massing/validation'

/** Snapshot-based command history (ADR-0003, ADR-0004 §3). Renderer-free and immutable. */

export type MassingCommand = {
  readonly label: string
  readonly apply: (document: ScenarioDocument) => ScenarioDocument
  /** Omit to keep the current selection. */
  readonly selectionAfter?: MassSelection
}

export type HistoryEntry = {
  readonly label: string
  readonly before: ScenarioDocument
  readonly after: ScenarioDocument
  readonly selectionBefore: MassSelection
  readonly selectionAfter: MassSelection
}

export type MassingHistory = {
  readonly document: ScenarioDocument
  readonly selection: MassSelection
  readonly undoStack: readonly HistoryEntry[]
  readonly redoStack: readonly HistoryEntry[]
}

export type Preview = {
  readonly base: ScenarioDocument
  readonly document: ScenarioDocument
}

export function createHistory(
  document: ScenarioDocument,
  selection: MassSelection = EMPTY_SELECTION,
): MassingHistory {
  return { document, selection, undoStack: [], redoStack: [] }
}

/** Selection changes are not undoable edits; they only update the current selection. */
export function select(history: MassingHistory, selection: MassSelection): MassingHistory {
  return { ...history, selection }
}

/** Applies and validates a command. Throws on invalid results; the input history is never changed. */
export function execute(history: MassingHistory, command: MassingCommand): MassingHistory {
  const after = command.apply(history.document)
  // Commands rebuild the document, so identity alone misses no-op edits (zero-delta drag, "3.20" vs 3.2).
  // ponytail: JSON compare is fine at scenario sizes; switch to a structural walk if documents grow large.
  if (after === history.document || JSON.stringify(after) === JSON.stringify(history.document)) return history
  const issues = validateScenario(after)
  if (issues.length > 0) throw new MassingValidationError(issues)

  const selectionAfter = command.selectionAfter ?? history.selection
  const entry: HistoryEntry = {
    label: command.label,
    before: history.document,
    after,
    selectionBefore: history.selection,
    selectionAfter,
  }
  return {
    document: after,
    selection: selectionAfter,
    undoStack: [...history.undoStack, entry].slice(-HISTORY_LIMIT),
    redoStack: [],
  }
}

export function undo(history: MassingHistory): MassingHistory {
  const entry = history.undoStack[history.undoStack.length - 1]
  if (!entry) return history
  return {
    document: entry.before,
    selection: entry.selectionBefore,
    undoStack: history.undoStack.slice(0, -1),
    redoStack: [...history.redoStack, entry],
  }
}

export function redo(history: MassingHistory): MassingHistory {
  const entry = history.redoStack[history.redoStack.length - 1]
  if (!entry) return history
  return {
    document: entry.after,
    selection: entry.selectionAfter,
    undoStack: [...history.undoStack, entry],
    redoStack: history.redoStack.slice(0, -1),
  }
}

export function beginPreview(document: ScenarioDocument): Preview {
  return { base: document, document }
}

/** Each update is applied to the gesture's base, so pointer moves never accumulate drift. */
export function updatePreview(
  preview: Preview,
  transform: (document: ScenarioDocument) => ScenarioDocument,
): Preview {
  return { base: preview.base, document: transform(preview.base) }
}

/** `Esc`: returns the exact pre-gesture document; nothing is recorded. */
export function cancelPreview(preview: Preview): ScenarioDocument {
  return preview.base
}

/** Pointer release: records the whole gesture as exactly one entry. */
export function commitPreview(
  history: MassingHistory,
  preview: Preview,
  label: string,
  selectionAfter?: MassSelection,
): MassingHistory {
  if (preview.base !== history.document) {
    throw new Error('Cannot commit a stale preview: the document changed since the gesture began')
  }
  const result = preview.document
  return execute(history, { label, apply: () => result, selectionAfter })
}
