# M4 — Scenarios and comparison: plan and delegation

**Status:** Draft for owner approval, 2026-11-02 · **Milestone brief:** `docs/milestones/M4-scenarios.md` · **PRD:** FR-040–FR-048, FR-080–FR-084, QA-09, QA-12, QA-14, §8.3–§8.4 · **Architecture:** ADR-0003 (state and persistence), ADR-0010 (editor layout)

**Principle (as in M3):** the session that owns correctness keeps the parts where a mistake silently loses a user's work or shows a wrong number: the persisted schema, migrations, the repository and autosave ordering, and the comparison maths. Everything with a clear contract goes to Codex (UI and scene wiring) and DeepSeek (fixtures, tests, evidence). Claude subagents take independent pieces and the review gate.

---

## 1. Where M4 starts (checked in the repo)

| Need | Already exists | Gap |
|---|---|---|
| Scenario document | `ScenarioDocument` v1 (`id`, `siteId`, `name`, `assumptions`, `volumes`) in `src/features/massing/types.ts`; `createScenario` defaults to "Concept A" | No notes, camera bookmark or timestamps (FR-041); only one scenario exists at a time |
| Serialisation | `serializeScenario` / `parseScenarioDocument` with structural decode + `validateScenario` (`serialize.ts`) | No migration path, no version gate, no project index |
| Storage | `dexie` 4.4.7 pinned (ADR-0001) | Not used anywhere; nothing survives a reload |
| History | Per-document undo/redo with transactional drags (`features/editor`) | Must become per-scenario (PRD §8.4) and survive switching within a session |
| Comparison inputs | `scenarioMetrics`, `evaluateEnvelope`, `massSummary` (renderer-free) | No comparison model, no matched-camera thumbnails |
| UI | Top bar shows a static "Concept A · local session" label | Picker, save status, compare view, recovery states |

## 2. Who does what

| Agent | Role | Items |
|---|---|---|
| **Claude (this session)** | Contract and correctness core; integration; gate | **S1** schema v2 + migrations + ADR-0011 · **S2** repository (Dexie) with ordered writes and typed failures · **S3** autosave controller + per-scenario editor sessions, **plus the studio hook `useScenarioProject`**, moved here from Codex because it is where saves can be lost · **S4** comparison model · integration of Codex's work · M4 review gate |
| **Codex** | UI and scene wiring against S1–S4 | **C12** scenario picker + save status in the top bar · **C13** compare view (table, deltas, matched thumbnails, "Edit this scenario") · **C14** recovery and backup UI (QA-14 states, export/import JSON) |
| **DeepSeek** | Fixtures, tests, evidence | **D35** persisted-document fixtures (v0, v1, corrupt, newer, quota) · **D36** M4 e2e (QA-09, QA-12, QA-14, no autosave during drag) · **D37** evidence screenshots + `docs/reviews/M4-evidence.md` |
| **Claude subagents** | Independent pieces, review | **K1** keyboard tab-order e2e (carried over from the Studio v2 review) · **R1** `engineering-code-reviewer` gate on the M4 diff |

## 3. Phases

```text
Phase 0 (now, parallel)   Claude S1 (schema + ADR-0011)      DeepSeek D35 (fixtures; needs S1's ADR text only)
                          Subagent K1 (keyboard e2e, independent)
                                    │
Phase 1                   Claude S2 → S3 → S4 (domain, renderer-free, tested against D35's fixtures)
                                    │   contracts frozen → Codex work order finalised with real signatures
Phase 2                   Codex C12 → C13 → C14 (one run, one branch)
                                    │
Phase 3                   DeepSeek D36 (e2e) + D37 (evidence)  →  Claude integration fixes  →  R1 review gate
```

Why this order: Codex can't build the picker before the repository's states exist, and DeepSeek's e2e needs the real UI. Fixtures (D35) and the keyboard test (K1) don't depend on anything new, so they start now.

## 4. Decisions to record in ADR-0011 (S1)

1. **Schema v2.** `ScenarioDocument` gains `notes: string` (≤ 2 000 chars), `camera?: CameraBookmark` (preset id, position and target in ENU metres), `createdAt` and `updatedAt` (ISO strings). Derived values (metrics, envelope) are never persisted (PRD §8.4).
2. **Project index per site.** `ProjectRecord { schemaVersion, siteId, activeScenarioId, scenarioIds (display order), updatedAt }`. One project per site; the site package stays shared, immutable data.
3. **Versions and migration.**
   - **v0:** unversioned v1-shaped JSON. No such records were ever persisted, but the brief requires a v0 fixture, so v0 is defined as "v1 without `schemaVersion`".
   - **v1:** the M2/M3 serialiser output.
   - **v2:** current.
   - Migrations are pure functions `v0 → v1 → v2`.
   - A record with a version newer than v2 is not migrated; it surfaces as `newer-version` with an export option.
4. **Defaults.** A site with no stored project starts with **Concept A and Concept B**, both empty (FR-040). "Reset scenario" restores an empty scenario with the same name; "Reset demo" deletes the site's project and recreates the defaults (ADR-0003: the packaged baseline, not the last autosave). Both need confirmation.
5. **Storage.**
   - One Dexie database `terraform` with two tables: `projects` (key `siteId`) and `scenarios` (key `id`, index `siteId`).
   - Writes are serialised per scenario (a promise chain keyed by id), so a slow write can't overwrite a newer one.
6. **Autosave.**
   - Runs about 800 ms after a committed history change, never during a pointer gesture (the editor's interaction is not `idle`).
   - It also flushes immediately on scenario switch and when the page is hidden.
   - The status shown is the real state: `saved`, `saving`, `unsaved`, `error`.
   - When storage is unavailable the status reads "Not saved — this browser can't store data" instead of pretending.
7. **History.** Undo/redo is per scenario and lives only in memory for the session. Switching keeps each scenario's stack, and a reload starts with empty stacks.
8. **Comparison.**
   - The fixed metric set from FR-080: Concept GFA, footprint, coverage, tallest above the reference, volume, building count, envelope status and notes.
   - Deltas are B − A with a sign and a unit, written neutrally ("+1 200 m² in B"). There are no green/red colours and no wording like "better" or "worse" (FR-081).
   - Thumbnails come from the same camera preset and the same sun date and time for both scenarios (FR-082, FR-084).

## 5. Contracts (S1–S4), renderer-free, in `src/features/scenarios/`

Names are the starting point. The final signatures go into the Codex work order once S4 is merged, as in M3.

```ts
// S1 — schema.ts / migrate.ts
type CameraBookmark = { presetId: CameraPresetId; position: Vec3; target: Vec3 }
type ScenarioDocument = { schemaVersion: 2; id; siteId; name; assumptions; volumes; notes: string; camera?: CameraBookmark; createdAt: string; updatedAt: string }
type ProjectRecord = { schemaVersion: 2; siteId: string; activeScenarioId: string; scenarioIds: string[]; updatedAt: string }
migrateScenario(raw: unknown): ScenarioDocument            // throws ScenarioLoadError { kind: 'corrupt' | 'newer-version', path?, version? }
createDefaultProject(siteId, now): { project: ProjectRecord; scenarios: ScenarioDocument[] }   // Concept A + Concept B

// S2 — repository.ts (Dexie behind an interface so tests use an in-memory fake)
type LoadResult =
  | { status: 'ready'; project: ProjectRecord; scenarios: ScenarioDocument[]; skipped: { id: string; error: ScenarioLoadError }[] }
  | { status: 'empty' }                                     // first visit → caller creates defaults
  | { status: 'unavailable'; reason: string }               // IndexedDB blocked / private mode
interface ScenarioRepository {
  load(siteId): Promise<LoadResult>
  saveScenario(doc): Promise<void>                          // ordered per id; rejects with ScenarioSaveError { kind: 'quota' | 'unavailable' }
  saveProject(project): Promise<void>
  deleteScenario(siteId, id): Promise<void>
  resetSite(siteId): Promise<void>
  exportProject(siteId): Promise<string>                    // JSON with schemaVersion, provenance (site id, app version, exportedAt)
  importProject(json): Promise<LoadResult>                  // validates + migrates; never partially writes
}

// S3 — autosave.ts + sessions.ts
createAutosave({ save, delayMs = 800, now, setTimer }): { commit(doc): void; flush(): Promise<void>; status(): SaveStatus; subscribe(fn) }
type SaveStatus = 'saved' | 'saving' | 'unsaved' | { error: 'quota' | 'unavailable' }
// editor sessions: Map<scenarioId, EditorState>; switching flushes autosave first (FR-046)

// S4 — compare.ts
compareScenarios(a, b, site): { rows: { key; label; a: string; b: string; delta: string | null; unit }[]; envelope: { a; b } }
```

## 6. Work orders

### C12–C14 — Codex (finalised after S4, written to `docs/handoffs/C12-C14-m4-ui.md`)

- **C12 Scenario picker + save status (FR-040, 043, 046, 047).**
  - The top-bar scenario label becomes a menu: switch, create, duplicate, rename (inline field), delete (confirmation; the last scenario can't be deleted), reset scenario, reset demo (confirmation).
  - A save status sits next to it, showing the real `SaveStatus` text and never colour alone.
  - Keyboard: the menu is a disclosure button with a list of options, `Esc` closes it and focus returns to the button.
- **C13 Compare view (FR-045, 080–084).**
  - A "Compare" action opens a comparison view in the right panel's place. It shows two scenario pickers (default: the active scenario and the next one), the S4 table with neutral deltas, two thumbnails rendered from the same camera preset and the same sun time, and an "Edit this scenario" button on each side (FR-083).
  - The live 3D view keeps showing the active scenario.
  - Thumbnails come from the existing canvas: render scenario A, read the pixels, render B, read, then restore. There is no second WebGL context. Dual live 3D is P1 and stays out.
- **C14 Recovery and backup (QA-14, FR-048 P1).**
  - States:
    - `unavailable`: works in memory, with a visible "not saved" status.
    - A skipped corrupt record is listed by name with "Export raw data" and "Discard".
    - `newer-version`: read-only notice plus export.
    - Quota error: the status shows the error plus an "Export project" button.
  - Export and import JSON live in the panel's "Site and sources" group.
  - Ownership: `src/components/studio/**`, `src/scene/**` (thumbnail capture only) and their tests. Not `src/features/**`.

### D35 — DeepSeek, start now (`docs/handoffs/D35-m4-fixtures.md`)

Fixtures under `src/features/scenarios/__fixtures__/`, each a JSON file plus one line in `README.md` saying what it proves:
- **v0:** an unversioned document with a stepped mass.
- **v1:** the current serialiser output for the same mass, generated with `serializeScenario`, not by hand.
- **v2 expected:** the expected migration result, with notes empty, timestamps fixed from an injected clock, and no camera.
- **corrupt-json:** truncated text.
- **corrupt-shape:** a tier without a footprint.
- **invalid-geometry:** a self-intersecting footprint.
- **newer-version:** `schemaVersion: 99`.
- **project-index:** two scenarios, one of which points at a missing record.
- **export bundle:** a project export bundle for the import round-trip.

No production code. ADR-0011 is the spec; if it's ambiguous, write the question in the README, don't guess.

### D36–D37 — DeepSeek, Phase 3 (written after C12–C14 land)

- **D36:** e2e coverage of:
  - QA-09: two scenarios differ, reload, both are still distinct;
  - QA-12: compare A/B deltas match a hand calculation, and both thumbnails use the same camera;
  - QA-14: corrupt and newer-version records, and quota simulated by stubbing `IDBObjectStore.put`;
  - no write during a roof drag, checked by spying on the repository and asserting zero `saveScenario` calls between pointer down and up;
  - switch-then-reload keeps the pending edit (FR-046).
- **D37:** evidence screenshots at 1440×900: picker open, compare view, recovery state. Write `docs/reviews/M4-evidence.md` with a table of fixtures against tests.

### K1 — Claude subagent, start now

Add a keyboard e2e test covering:
- Tab order: top bar → toolbar → views → sun band → panel.
- Enter opens each panel group.
- Focus is visible on each stop.

Edits are limited to `e2e/`. If it finds a product bug, it reports it rather than working around it.

## 7. File ownership (no two writers on one file)

| Area | Owner |
|---|---|
| `src/features/scenarios/**` (new), `src/features/massing/{types,serialize,factories}.ts`, `src/features/editor/**`, ADR-0011 | Claude (S1–S4) |
| `src/components/studio/**`, `src/scene/**` | Codex (C12–C14) after S4; Claude only for integration fixes after Codex hands back |
| `src/features/scenarios/__fixtures__/**` | DeepSeek (D35) |
| `e2e/**` | K1 now (keyboard spec only); DeepSeek D36 later |
| `docs/reviews/M4-*` | DeepSeek D37 (evidence), Claude/R1 (code review) |

## 8. Definition of done (M4 gate)

- QA-09, QA-12, QA-14 pass in e2e after reload; migration v0 → v2 passes; export → import round-trip keeps geometry and assumptions exactly; no autosave during pointer movement.
- Saved/unsaved status is truthful in every state, including storage unavailable.
- Deltas are neutral; envelope status and the disclaimer appear in the comparison.
- `npm run lint`, `typecheck`, `test`, `build` and `test:e2e` pass; `docs/reviews/M4-code-review.md` and `M4-evidence.md` written; agent log and progress updated.

## 9. Open questions for the owner

1. **Default content.** Should Concept A and B both start empty (as planned), or should B start as a copy of A once A has masses?
2. **Compare placement.** Should Compare replace the right panel (as planned, keeping the 3D view), or take over the whole studio area with two large thumbnails?
3. **P1 items.** Should project JSON export/import (FR-048) and the shadow comparison at the same time (FR-084) be included in M4? They're planned as included because they're cheap once S2 and C13 exist.
