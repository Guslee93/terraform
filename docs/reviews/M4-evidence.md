# M4 evidence — QA-09, QA-12, QA-14 and required-test mapping (D36 / D37)

- **Date:** 2026-11-02
- **Agent:** DeepSeek (D36 e2e, D37 evidence) — QA role per `docs/handoffs/D36-D37-m4-e2e-evidence.md`
- **Branch:** `deepseek/d36` (worktree `../Terraform-d36`, fresh from `main`)
- **Scope:** `e2e/m4-scenarios.spec.ts`, `e2e/m4-recovery.spec.ts`, `e2e/m4-evidence.spec.ts` (opt-in), `e2e/m4-helpers.ts`; screenshots in `docs/screenshots/m4-evidence-*.png`; this document. No `src/**`, no dependencies, no `playwright.config.ts` edits.

## 1. M4 brief “Required tests” → proof

| Required test (docs/milestones/M4-scenarios.md) | Proof | Status |
|---|---|---|
| Two scenarios persist distinctly across reload (QA-09) | e2e: `m4-scenarios.spec.ts` → “QA-09: two concepts persist distinctly across a reload, each with its own undo”; unit: `useScenarioProject.test.ts` (“QA-09 …”), `repository.test.ts` | ✅ e2e + unit |
| Comparison deltas match fixture calculations (QA-12) | e2e: `m4-scenarios.spec.ts` → “QA-12: comparison rows and B − A deltas match the hand calculation”; unit: `compare.test.ts`, `ComparePanel.test.tsx` | ✅ e2e + unit |
| Unknown site, missing record, corrupt JSON and quota failure produce recoverable UI (QA-14) | e2e: `m4-recovery.spec.ts` → “QA-14: a corrupt saved scenario …”, “QA-14: a newer-version project …”, “QA-14: a quota failure …”, “QA-14: without IndexedDB …”; unit: `repository.test.ts`, `ProjectRecovery.test.tsx`, `useScenarioProject.test.ts`, `__fixtures__/fixtures.test.ts` | ✅ e2e + unit |
| Migration fixture v0 → current | unit only: `__fixtures__/fixtures.test.ts` (v0 and v1 → exactly `stepped-v2.expected.json`), `migrate.test.ts` | ✅ (unit; no UI surface) |
| Export/import round trip preserves geometry and assumptions | e2e: `m4-recovery.spec.ts` → “FR-048: export, reset demo and import restore the exact geometry”; unit: `repository.test.ts`, `fixtures.test.ts` | ✅ e2e + unit |
| No autosave writes during pointer movement | e2e: `m4-scenarios.spec.ts` → “no autosave write happens while the roof pointer is held down” (counts IndexedDB `put` calls); unit: `autosave.test.ts` (waits while busy) | ✅ e2e + unit |
## 2. QA-09 — two concepts, reload, distinct

Flow exercised in `m4-scenarios.spec.ts` (“QA-09…”):

1. Fresh context → open `/studio/compact-infill`, wait for `Saved`.
2. Draw one mass in **Concept A** (default 3 storeys).
3. Switch to **Concept B** via the scenario menu; draw a different mass and raise it to **5 storeys**.
4. Undo in B reverts only B’s storey edit (3), redo restores (5) — each scenario keeps its own undo across the switch.
5. Switch back to A; undo removes only A’s mass, redo restores it; both edits are autosaved.
6. Reload; A shows its own mass (storeys 3) and B shows its own (storeys 5).

**Result:** PASS. Both scenarios survive the reload with their own geometry, and per-scenario undo works for edits made in the session (undo history does not persist across reloads by design — ADR-0011).

## 3. QA-12 — comparison against a hand calculation

Seeded pair (20 × 10 m footprints, single tier, 3.2 m storeys):

| Row | A (3 storeys) | B (7 storeys) | B − A | Hand check |
|---|---|---|---|---|
| Concept GFA | 600 m² | 1 400 m² | +800 m² | 3×200 / 7×200 |
| Footprint | 200 m² | 200 m² | ±0 | 20 × 10 |
| Tallest above datum | 9.6 m | 22.4 m | +12.8 m | 3×3.2 / 7×3.2 |
| Volume | 1 920 m³ | 4 480 m³ | +2 560 m³ | 200×9.6 / 200×22.4 |
| Buildings | 1 | 1 | ±0 | one volume each |

- The height reference is set to **Datum** before opening Compare so “tallest” is terrain-independent (the studio default is Grade; ADR-0008).
- Envelope status rows show `Within demo envelope` / `Exceeds demo envelope` and the disclaimer `Illustrative constraint — not planning advice` is present; notes are shown for both sides.
- The table contains no colour class and no `better/worse/improved` wording (asserted on the table text and the panel’s coloured-class selectors).
- Both thumbnails are asserted present with `data:image/png` sources that differ; the fallback text (`Thumbnail unavailable in this browser`) is only ever expected when the capture itself fails (headless software GL), and the test asserts the two states are mutually exclusive.

**Result:** PASS.
## 4. QA-14 — recovery states

| Case | e2e proof | Expected | Result |
|---|---|---|---|
| Corrupt saved record | “QA-14: a corrupt saved scenario is skipped, listed and exported raw” | Studio renders with the readable scenario; recovery strip lists the record (`Details` shows id · reason + detail); `Export raw data` downloads a bundle whose `unreadable` entry carries the corrupted text verbatim | PASS |
| Newer-version project | “QA-14: a newer-version project is read-only, never written, and exportable” | Status `Read-only — saved by a newer version`; strip explains format 99; editing works in memory; the stored project row is byte-identical and no scenario rows are ever written (also after reload); `Export saved data` offered | PASS |
| Storage full | “QA-14: a quota failure is reported truthfully and Try again recovers to Saved” | After a simulated `QuotaExceededError`, status `Not saved — storage is full`, strip offers `Export project` and `Try again`; restoring storage and pressing `Try again` returns to `Saved` | PASS |
| Storage unavailable | “QA-14: without IndexedDB the studio still works and never claims Saved” | Status `Not saved — this browser can't store data`; strip explains the session-only mode; notes editing works; the header never shows `Saved` | PASS |
| Bad import | “a corrupt import is rejected and the current scenarios are unchanged” | Confirmation dialog appears, then an error (`This file couldn't be imported: $ The file is not valid JSON`) and the current mass stays intact | PASS |

QA-14 also covers **missing record** and **unknown site** — both proven at unit level (`repository.test.ts`: corrupt/newer/missing records skipped; unknown site) with the same recovery UI (`skipped` list).

## 5. FR-046 / FR-048 / FR-083 and the drag rule

- **FR-046:** “FR-046: an edit survives an immediate switch and a reload” — draw, switch to B and back immediately (no debounce wait), the edit is still on screen, then survives a reload.
- **FR-048:** “FR-048: export, reset demo and import restore the exact geometry” — draw + 4 storeys, export, `Reset demo…` (confirm), `Import project…` (confirm), the mass returns with identical name/storeys and survives a reload.
- **FR-083:** “FR-083: Edit B from Compare activates B and closes Compare”.
- **No write during a gesture:** roof drag held > 2 s with an `IDBObjectStore.prototype.put` counter installed before load — the counter does not move between pointer-down and pointer-up; on release the committed change is autosaved once and the status returns to `Saved`.
- **Escape / focus in dialogs:** “Escape cancels a confirmation dialog and restores focus to the scenario menu” — a native `<dialog>` opens with focus on `Cancel`; Escape closes it and focus returns to the scenario disclosure button.

## 6. Screenshots (1440×900, `docs/screenshots/`)

The opt-in spec `e2e/m4-evidence.spec.ts` writes these five PNGs:

| File | State |
|---|---|
| `m4-evidence-scenario-menu-open-1440x900.png` | Scenario menu open over the seeded QA-12 pair (status dot + GFA lines) |
| `m4-evidence-comparison-1440x900.png` | Compare open with two matched thumbnails and the hand-calculated table |
| `m4-evidence-recovery-corrupt-1440x900.png` | Recovery strip with a corrupt saved record |
| `m4-evidence-readonly-newer-version-1440x900.png` | Read-only newer-version state |
| `m4-evidence-storage-full-1440x900.png` | Storage-full (quota) state |

Regenerate with `SHOT_EVIDENCE=1 npx playwright test --workers=1 e2e/m4-evidence.spec.ts` and include the PNGs in the merge (they are generated output, not checked in by the branch author here).

## 7. Things this pass could not prove, and why

- **Real disk-quota exhaustion** — the browser quota is effectively unlimited for this workload; e2e simulates it by stubbing `IDBObjectStore.prototype.put` to throw `QuotaExceededError` (the same seam the unit tests use). The Dexie → `StoreError('quota')` mapping is exercised end to end.
- **A persisted v0 → current migration in the browser** — migrations are pure domain logic with no UI surface; proven by `fixtures.test.ts` against the real D35 fixtures. The e2e seeds format-2 rows (plus corrupt/newer paths).
- **Camera-bookmark persistence** — deferred out of M4 (ADR-0011 §9); the seeded documents carry no `camera`.
- **Thumbnail pixel-identity of the two cameras** — the e2e asserts both thumbnails exist, are PNG data URLs, and differ; the matched-camera composition is proven at component level (`ComparePanel.test.tsx`, `ScenarioSnapshots.test`) and by code (both renders use one `PerspectiveCamera` from the same preset).
- **Undo history across a reload** — intentionally not persisted (ADR-0011); the e2e proves per-scenario undo within a session only, as the card specifies.

## 8. Verification run (recorded by Claude on `deepseek/d36`, 2026-11-02)

```
npm run lint                         → pass
npx playwright test --workers=1      → 32 passed, 3 skipped, 1 fixed in review (see below); 11.1 min
SHOT_EVIDENCE=1 npx playwright test --workers=1 e2e/m4-evidence.spec.ts → passed; the five PNGs in §6 were viewed
```

The 3 skipped tests are the two opt-in evidence specs (M3 and M4) and one deliberate `test.fixme`:

- **Known product bug, open:** `Escape cancels a confirmation dialog and restores focus to the scenario menu` fails today. The scenario menu closes when a confirmation opens, so after Escape or Cancel focus drops to `<body>`. It is marked `test.fixme` with a note, and its fix is item 7 of `docs/handoffs/C15-m4-minors.md` (Codex). Remove the `.fixme` when C15 is merged. Until then the focus-return behaviour is **not proven** and the M4 gate checklist must say so.

Corrections made when this branch was integrated (the first full run, which DeepSeek could not do because its terminal failed, found them):

- The shared seeding helper stored the project row as the raw record; the app stores `{ siteId, json }`. A raw row was read as a damaged index and silently rebuilt, which made the newer-version test see "Saved" and let the corrupt-record test pass partly by accident. The helper now writes the real shape.
- The Compare panel is an `<aside>` (role complementary), not a region.
- Export and Import live inside the collapsed "Site and sources" group; the tests now open it (`openSiteGroup`).
- After a rejected rename, Escape may close the whole menu depending on focus; the test accepts both outcomes and still checks the name is unchanged.
- One M3 test failed once in the first full run and passed alone and in the later full run: treated as a flake, not investigated further. The first run also lost its dev server after two tests (connection refused, no Vite error); a rerun was clean.
