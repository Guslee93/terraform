import { describe, expect, it } from 'vitest'
import { matchHistoryShortcut, type ShortcutEvent } from './shortcuts'

// Spec: status report §15.3b D7. One test per rule.

function modEvent(overrides: Partial<ShortcutEvent> = {}): ShortcutEvent {
  return {
    key: 'z',
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    ...overrides,
  }
}

describe('matchHistoryShortcut', () => {
  it('undoes on mod + z without Shift (Meta)', () => {
    expect(matchHistoryShortcut(modEvent({ metaKey: true, key: 'z' }))).toBe('undo')
  })

  it('undoes on mod + z without Shift (Ctrl and Meta together)', () => {
    expect(matchHistoryShortcut({ ...modEvent(), metaKey: true, ctrlKey: true })).toBe('undo')
  })

  it('compares the key case-insensitively when Shift+Z arrives as uppercase', () => {
    // A DOM Shift+Z reports key "Z" and shiftKey true → redo.
    expect(matchHistoryShortcut(modEvent({ metaKey: true, shiftKey: true, key: 'Z' }))).toBe(
      'redo',
    )
    // The same uppercase key without Shift still matches undo (key-driven match).
    expect(matchHistoryShortcut(modEvent({ metaKey: true, key: 'Z' }))).toBe('undo')
  })

  it('redoes on mod + Shift + z', () => {
    expect(matchHistoryShortcut(modEvent({ metaKey: true, shiftKey: true }))).toBe('redo')
  })

  it('redoes on Ctrl + Shift + Z', () => {
    expect(matchHistoryShortcut(modEvent({ ctrlKey: true, shiftKey: true, key: 'Z' }))).toBe('redo')
  })

  it('redoes on Ctrl + y', () => {
    expect(matchHistoryShortcut(modEvent({ ctrlKey: true, key: 'y' }))).toBe('redo')
  })

  it('does not redo on Meta + y', () => {
    expect(matchHistoryShortcut(modEvent({ metaKey: true, key: 'y' }))).toBeNull()
  })

  it('does not redo on Ctrl + Shift + y', () => {
    expect(matchHistoryShortcut(modEvent({ ctrlKey: true, shiftKey: true, key: 'y' }))).toBeNull()
  })

  it('returns null while Alt is held', () => {
    expect(matchHistoryShortcut(modEvent({ metaKey: true, altKey: true }))).toBeNull()
    expect(
      matchHistoryShortcut(modEvent({ ctrlKey: true, altKey: true, key: 'y' })),
    ).toBeNull()
  })

  it('returns null inside an INPUT so native text undo keeps working', () => {
    expect(
      matchHistoryShortcut(modEvent({ metaKey: true, targetTag: 'INPUT' })),
    ).toBeNull()
  })

  it('returns null inside a TEXTAREA', () => {
    expect(
      matchHistoryShortcut(modEvent({ metaKey: true, targetTag: 'TEXTAREA' })),
    ).toBeNull()
  })

  it('returns null inside a SELECT', () => {
    expect(matchHistoryShortcut(modEvent({ metaKey: true, targetTag: 'SELECT' }))).toBeNull()
  })

  it('returns null for a contenteditable target', () => {
    expect(
      matchHistoryShortcut(modEvent({ metaKey: true, targetEditable: true })),
    ).toBeNull()
  })

  it('returns null without a modifier or for unknown keys', () => {
    expect(matchHistoryShortcut(modEvent())).toBeNull()
    expect(matchHistoryShortcut(modEvent({ metaKey: true, key: 'x' }))).toBeNull()
    expect(matchHistoryShortcut(modEvent({ shiftKey: true, key: 'Z' }))).toBeNull()
  })
})