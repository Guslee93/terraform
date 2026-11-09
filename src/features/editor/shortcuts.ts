/**
 * Undo/redo keyboard shortcut matcher (status report §15.3b D7).
 *
 * Pure module: it takes a plain, serialisable description of a keydown event and
 * returns the history action it maps to. React/Three types are deliberately
 * absent so the matcher stays renderer-free and trivially testable.
 * Wired in StudioShell's window keydown handler.
 *
 * Rules (spec §15.3b D7):
 * - mod = `metaKey || ctrlKey` (macOS ⌘ and Windows/Linux Ctrl).
 * - Undo  = mod + `z` without Shift.
 * - Redo  = mod + Shift + `z`, or Ctrl + `y` (never Meta + `y`).
 * - `key` comparison is case-insensitive (Shift+Z arrives as uppercase `Z`).
 * - Alt held → no match (Alt+Z is not an undo/redo shortcut).
 * - Focus in an editable control (`INPUT`, `TEXTAREA`, `SELECT` or
 *   `targetEditable`) → no match, so the browser's native text undo keeps working.
 */

export type ShortcutEvent = {
  readonly key: string
  readonly metaKey: boolean
  readonly ctrlKey: boolean
  readonly shiftKey: boolean
  readonly altKey: boolean
  readonly targetTag?: string
  readonly targetEditable?: boolean
}

export type HistoryShortcut = 'undo' | 'redo'

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

/**
 * Map a keydown description to `'undo'`, `'redo'` or `null`.
 * Returns `null` when the event must fall through to default handling.
 */
export function matchHistoryShortcut(event: ShortcutEvent): HistoryShortcut | null {
  if (event.altKey) return null

  const tag = event.targetTag?.toUpperCase()
  if ((tag !== undefined && EDITABLE_TAGS.has(tag)) || event.targetEditable === true) {
    return null
  }

  const mod = event.metaKey || event.ctrlKey
  if (!mod) return null

  const key = event.key.toLowerCase()
  if (key === 'z') return event.shiftKey ? 'redo' : 'undo'

  // Only Ctrl+Y redoes; Meta+Y (and Ctrl+Shift+Y) intentionally do not.
  if (key === 'y' && event.ctrlKey && !event.metaKey && !event.shiftKey) return 'redo'

  return null
}