# ADR-0003 — State topology, transactions and persistence

- **Status:** Accepted
- **Date:** 2026-10-27
- **Deciders:** Project owner, `engineering-software-architect`, `engineering-senior-developer`
- **PRD references:** §5.3, §5.4, §8.3, §8.4, §12.2

## Context

The studio mixes transient interaction state (hover, drag preview, camera, open panel) with durable document state (masses, assumptions, scenarios, notes). Undo/redo must restore exact geometry and selection, autosave must not block rendering, and persisted documents must survive schema changes.

## Decision

### Two state domains

1. **Ephemeral UI state** — Zustand store: active tool, hover/selection ids, drag preview, camera bookmarks, inspector tab, toasts. Never persisted.
2. **Document state** — immutable domain model plus a command layer: scenarios, masses, assumptions, notes, schema version. Persisted.

### Transactions and history

- A pointer interaction has explicit `begin → preview → commit | cancel` phases.
- Preview updates live UI state only; the document is not mutated during pointer movement.
- On commit, one command object is appended to the history stack; `Esc` discards preview with no history entry.
- Commands carry enough data to undo exactly (before/after patches or a full previous document for small edits).
- Redo is cleared by a new commit.
- Selection is stored by stable id, never by object reference. Undo restores selection where the PRD requires it (QA-08).

### Persistence

- Dexie/IndexedDB, one database, one record per scenario document plus a project index.
- Every document has `schemaVersion`, `savedAt`, `siteId`, `provenance`.
- Autosave is debounced ~800 ms after a committed change and on visibility change; it never runs on pointer movement.
- Load path validates the document; unknown newer versions are rejected with an export option; known older versions migrate.
- Corrupt or quota-exceeded storage produces a recoverable warning, never a crash.
- `Reset demo` restores the packaged baseline scenario, not the last autosave.

## Consequences

- More explicit code than a single store with history middleware, but domain tests do not need React or IndexedDB.
- History size must be bounded (e.g. 100 committed steps) and large geometry snapshots avoided.
- Async autosave must not reorder writes; serialize per scenario.
- Import/export uses the same versioned document schema (P1).

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| One Zustand store with `temporal`/undo middleware | Conflates UI and document state; hard to test; accidental history entries. |
| Redux Toolkit + listener middleware | Workable but heavier than the product needs. |
| localStorage JSON | Synchronous, size-limited, no migration ergonomics. |
| Persist on every change | Blocks rendering and creates noisy history. |
| Store Three.js objects in state | Not serializable, not testable, duplicates source of truth. |

## Tests

- Undo/redo across duplicate, delete, rotate and multi-step drag.
- `Esc` during drag leaves document hash unchanged.
- Export → import round-trip yields identical geometry.
- Migration fixture from v0 to current schema.
- Corrupt document and quota rejection produce recoverable UI state.

## Revisit triggers

A need for collaborative editing, server persistence, or document sizes that exceed practical IndexedDB snapshots.
