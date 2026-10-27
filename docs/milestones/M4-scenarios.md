# M4 — Scenarios and comparison

- **Status:** Pending
- **PRD gate:** QA-09 and QA-12 pass after reload (§13)
- **Lead agent:** `engineering-senior-developer`
- **Architecture:** `engineering-software-architect` (versioned document schema/migrations)
- **Gate:** `engineering-code-reviewer`; `database-reliability-engineer` only if migrations become non-trivial

## Goal

Let a visitor keep two independent concepts, return after a reload, and compare them without losing geometry, assumptions or camera context.

## Deliverables

1. **Scenario CRUD** — default `Concept A`/`Concept B`; create, rename, duplicate, delete with confirmation, reset one/all.
2. **Isolation** — each scenario owns masses, assumptions, camera bookmarks and notes; site terrain/context remains shared immutable data.
3. **Persistence** — Dexie/IndexedDB, versioned document, debounced ~800 ms autosave after commits, save on switch/visibility change, saved/unsaved indicator.
4. **Restore and migrate** — validate persisted schema; migrate known older versions; reject unknown newer versions with export option; corrupt/quota states are recoverable (QA-14).
5. **Comparison** — side-by-side metric table (GFA, footprint, coverage, max height, volume, count, envelope status, notes), deltas with direction but no "bigger is better" implication.
6. **Matched visuals** — side-by-side thumbnails or offscreen renders with equal camera scale; same date/time for shadow comparison (P1).
7. **Activation** — switch from comparison into editing a scenario without losing pending edits.
8. **Backup** — project JSON export/import with schema version and provenance (P1).

## Required tests

- Two scenarios persist distinctly across reload (QA-09).
- Comparison deltas match fixture calculations (QA-12).
- Unknown site, missing record, corrupt JSON and quota failure produce recoverable UI.
- Migration fixture v0 → current.
- Export/import round-trip preserves geometry and assumptions.
- No autosave writes during pointer movement.

## Agent sequence

1. `software-architect` finalises the versioned schema and migration policy (ADR-0003 addendum).
2. `senior-developer` implements repository, autosave, migrations and comparison.
3. `frontend-developer` implements scenario picker, comparison panel and status states.
4. `code-reviewer` gate.

## Out of scope

Cloud sync, multi-user projects, accounts, real-time collaboration, server-side persistence, version history beyond undo/redo.

## Evidence

- Reload and migration test output.
- Comparison screenshot with matched cameras.
- QA-09, QA-12, QA-14 results.
- `docs/reviews/M4-code-review.md`.

## Risks

- Silent data loss on scenario switch — save or block with explicit status.
- Async write ordering — serialize per scenario.
- Comparison implying larger metrics are better — label deltas neutrally.
