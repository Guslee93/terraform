# ADR-0011 — Scenario persistence: format v2, migrations, storage and autosave

- **Status:** Proposed (owner to accept)
- **Date:** 2026-11-02
- **Deciders:** Project owner, `engineering-software-architect`
- **PRD references:** FR-040–FR-048, FR-080–FR-084, §8.3–§8.4, QA-09, QA-12, QA-14
- **Related:** ADR-0003 (state and persistence; this ADR is its M4 addendum), ADR-0004 §5 (serialisation), ADR-0008 (height reference), `docs/plans/M4-plan.md`

## Context

M4 makes scenarios survive a reload and lets a visitor keep and compare two concepts. ADR-0003 set the principles: Dexie/IndexedDB, versioned documents, debounced autosave, recoverable failures. Until now the M2/M3 scenario document (format 1) was only ever serialised in tests; nothing was stored. This ADR fixes the stored shapes and rules before the repository, autosave and UI are built against them.

## Decision

### 1. Scenario format 2

`ScenarioDocument` (in `src/features/massing/types.ts`) adds:
- `notes: string`, at most 2 000 characters;
- an optional `camera: { presetId, position, target }` in local ENU metres;
- `createdAt` and `updatedAt` as ISO 8601 instants.

Derived values (metrics, envelope results, heights) are never stored (PRD §8.4). `parseScenarioDocument` and `decodeScenarioDocument` accept format 2 only.

### 2. One project record per site

```ts
ProjectRecord { schemaVersion: 2; siteId; activeScenarioId; scenarioIds /* display order */; updatedAt }
```

The site package stays shared, immutable data. A project export is `{ schemaVersion: 2, provenance: { siteId, appVersion, exportedAt }, project, scenarios }`.

### 3. Versions and migration (`src/features/scenarios/migrate.ts`)

| Format | Meaning | Upgrade |
|---|---|---|
| 0 | A format-1 document saved without `schemaVersion`. None were ever stored; it exists because the M4 brief requires a v0 fixture. | add `schemaVersion: 1` |
| 1 | M2/M3 serialiser output | add `notes: ""`, set `createdAt` and `updatedAt` to the migration instant |
| 2 | Current | — |

- Every stored record goes through `migrateScenario(raw, now)`, which ends in the strict format-2 decoder.
- A version higher than 2 throws `ScenarioLoadError { kind: 'newer-version', version }` and is never guessed at.
- Anything else that fails throws `{ kind: 'corrupt', path }`, where `path` is the first offending field.
- Project records start at format 2, so they are decoded but never migrated.

### 4. Defaults and reset

- **First visit to a site:** the site starts with **Concept A** and **Concept B**, both empty, with A active (FR-040).
- **Reset scenario:** empties that scenario but keeps its id and name.
- **Reset demo:** deletes the site's project and recreates the defaults. This is the packaged baseline, not the last autosave (ADR-0003).
- Both resets need confirmation (FR-047).

### 5. Storage

- **Database:** one Dexie database, `terraform`, with two tables:
  - `projects`, keyed by `siteId`;
  - `scenarios`, keyed by `id` and indexed by `siteId`.
- **Interface:** the repository sits behind an interface, so tests use an in-memory fake.
- **Write order:** writes are serialised per scenario id through a promise chain, so a slower earlier write never lands after a later one.
- **Typed failures:**
  - Load returns `ready` (with any records skipped as `corrupt` or `newer-version`), `empty`, or `unavailable`.
  - Save rejects with `quota` or `unavailable`.
  - Import validates and migrates everything before writing anything, so it never half-writes.

### 6. Autosave

- **When it runs:** about 800 ms after a committed history change, never during a pointer gesture (the editor interaction is not `idle`).
- **Flushes:** on scenario switch, before compare, and when the page becomes hidden.
- **Timestamps:** `updatedAt` is set at save time.
- **Status:** the status shown is the real one: `saved`, `saving`, `unsaved`, or an error.
- **No storage:** when storage is unavailable the studio keeps working in memory and says "Not saved — this browser can't store data".

### 7. History

- Undo and redo stay per scenario and in memory only.
- Switching scenarios keeps each scenario's stack for the session.
- A reload starts with empty stacks.

### 8. Comparison

- **Rows:** the fixed FR-080 set — Concept GFA, footprint, coverage, tallest above the envelope reference (ADR-0008, ADR-0010 §4), volume, building count, envelope status and notes.
- **Deltas:** B − A, with a sign and a unit, worded neutrally. No green/red, and no "better" or "worse" (FR-081).
- **Thumbnails:** both use the same camera preset and the same sun date and time (FR-082, FR-084), rendered in sequence with the existing WebGL context. A second live 3D view is P1 and stays out.

### 9. Camera bookmarks are deferred (owner, 2026-11-02)

The M4 brief lists camera bookmarks among what a scenario owns (FR-041). M4 does not save or restore one: the studio camera stays a session-wide setting, and Compare renders both scenarios from the current preset. The optional `camera` field stays in format 2, so a later release can start using it without a migration. Revisit at M5 if the demo needs a saved view per scenario.

## Consequences

- Every `createScenario` call now produces timestamps. Tests that compare whole documents inject `now`.
- `CAMERA_PRESET_IDS` is exported from `features/sites/manifest.ts` so the decoder can check bookmarks.
- Format-1 fixtures must be produced by the M3-era serialiser. D35 generates them in a pre-M4 worktree for that reason.
- **Studio integration.** Wiring storage, autosave and sessions into the studio is where a mistake loses work, so it lives in one hook, `src/components/studio/useScenarioProject.ts`, written with the domain rather than by the UI implementer. The hook:
  - holds the editor state;
  - parks and restores each scenario's session;
  - commits only committed history changes;
  - flushes before switching and when the page is hidden;
  - never writes in `memory` or `read-only` mode.
- **Bundle size.** This is Dexie's first real use (it was pinned in ADR-0001 but never imported). It grows the lazily loaded studio chunk from 201.6 kB to 323.6 kB raw, and from 64.7 kB to 104.9 kB gzipped. The landing chunk is unchanged. Dexie is Apache-2.0. A hand-written IndexedDB wrapper would save most of that, but it isn't worth the risk at this milestone; revisit at the M5 performance review if the budget is tight.

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| One record per project holding every scenario | One bad scenario would block loading all of them, and every edit rewrites everything. |
| localStorage | Synchronous and size-limited, with no transactions (ADR-0003). |
| Persist undo history | Large, rarely needed, and complicates migration; the PRD only asks for state, not history, to survive a reload. |
| Accept newer versions best-effort | Silently drops unknown fields on the next save, which is data loss. |

## Tests

- `src/features/massing/serialize.test.ts`: format-2 round-trip, including the camera; bad notes, timestamps and camera are reported with a path.
- `src/features/scenarios/migrate.test.ts`: v1 → v2 and v0 → v2; the current version is unchanged; newer versions are rejected; corrupt records are reported with a path.
- `src/features/scenarios/project.test.ts`: defaults; decoding the project record with paths.
- `src/features/scenarios/repository.test.ts` covers:
  - first visit;
  - QA-09 reload;
  - per-id write ordering with a slow first write;
  - corrupt, newer and missing records skipped and the index repaired;
  - a v1 record upgraded on load;
  - all records unreadable → fresh defaults;
  - newer project and unavailable storage as states;
  - a quota rejection that keeps the earlier data;
  - export → reset → import exactly;
  - a bad import writes nothing;
  - unreadable records exported verbatim.
- `autosave.test.ts`: about 800 ms with coalescing; no write during a gesture; flush; quota error and retry; discard.
- `sessions.test.ts`: per-scenario undo across a switch; parked sessions are idle.
- `compare.test.ts`: QA-12 against a hand calculation; empty scenarios.
- `projectOps.test.ts`: names, duplicate, reset, add and remove (the last scenario can't be removed).
- `useScenarioProject.test.ts`:
  - first visit saves the defaults;
  - QA-09 edits in two scenarios survive a reload with their own undo;
  - create, rename, duplicate and remove;
  - memory mode never writes;
  - export includes unsaved edits.

### Implementation clarification — recovery export (2026-11-02)

The UI hook keeps `exportProject()` for the current working scenarios, including unsaved in-memory edits. `exportSavedData()` calls the repository separately for recovery. When the stored project cannot be opened (notably a newer format), that recovery envelope retains `rawProject` (the original `{ siteId, json }` row) and `unreadable` scenario row strings verbatim. These bytes are not migrated or overwritten; a raw recovery envelope is not a current-format importable project. ADR status remains proposed pending owner acceptance.
