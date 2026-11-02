# D36–D37 — M4 end-to-end tests and evidence (DeepSeek work order)

Role: QA. Project: Terraform v1, milestone **M4**. **Start only after `m4/ui` has been merged to `main`** (Claude merges it after the independent review; check `git log main --oneline | head` for the M4 UI commits). Work in a fresh worktree from `main`: `git worktree add ../Terraform-d36 -b deepseek/d36 main`, then `npm ci`. Don't edit `src/**`; if a test exposes a product bug, mark that test `test.fixme` with a comment and report it. Commit on your branch, don't merge.

Read in order: `AGENTS.md`; `docs/plans/M4-plan.md` (§6 D36/D37); `docs/decisions/ADR-0011-scenario-persistence.md`; `docs/reviews/M4-codex-ui-review.md`; `e2e/keyboard.spec.ts` and `e2e/massing.spec.ts` (conventions: wait for `page.getByRole('region', { name: /3D site viewport/ })`, draw with clicks in Plan view).

## UI names you can rely on (from `src/components/studio/`)

- **Scenario menu:** a disclosure button in the top bar showing the active scenario's name; the list is labelled `Scenarios`. Row actions: `Rename` (field labelled `Scenario name`, button `Save name`, errors in `role=alert`), `Duplicate`, `Reset`, `Delete`; footer `New scenario` and `Reset demo…`. Destructive actions open a native `<dialog>` with `Cancel`.
- **Save status:** text beside the scenario name in the header: `Saved`, `Saving…`, `Unsaved changes`, `Not saved — storage is full`, `Not saved — storage unavailable`, `Not saved — this browser can't store data`, `Read-only — saved by a newer version`.
- **Notes:** a textarea labelled `Notes`.
- **Compare:** a `Compare` action in the top bar opens a region named `Compare` (heading `Compare`, button `Close`) with a table (`Metric`, `Envelope`, `Notes` headers), two scenario selects, thumbnails and `Edit A` / `Edit B`.
- **Recovery strip:** region `Project recovery` with `Try again`, `Details`, `Discard`, `Export project`, `Import project…`. Import and discard ask for confirmation.
- Read the components for exact strings before you assert; prefer roles and accessible names over CSS.

## D36 — `e2e/m4-scenarios.spec.ts` (new file)

Isolate storage per test: use a fresh Playwright `browserContext` per test (IndexedDB is per origin and context). Wait for the save status to read `Saved` before reloading.

1. **QA-09.** Draw one mass in Concept A, switch to Concept B with the menu, draw a different one (different storeys), reload the page. Both scenarios still exist; Concept A shows its mass and Concept B its own; undo in each still works for the edit made in the same session (before the reload).
2. **FR-046.** Edit, switch scenario immediately (no wait), switch back: the edit is there; reload: still there.
3. **QA-12.** Seed two scenarios whose numbers you can compute by hand (reuse the rectangle sizes from `src/features/scenarios/compare.test.ts`: 20 × 10 m footprints, 3 vs 7 storeys of 3.2 m; storeys are editable in the panel, storey height defaults to 3.2). Open Compare. Assert the Concept GFA, footprint, tallest and volume cells and the B − A column equal your hand calculation; assert no colour class or word "better/worse/improved" appears in the table; assert both thumbnails are present (`<img>`) and that their `src` differ; assert the fallback text is shown only if capture fails.
4. **FR-083.** `Edit B` from Compare switches to B and closes Compare.
5. **No write during a gesture.** Before the page loads, wrap `IDBObjectStore.prototype.put` in an init script to count calls. Start a roof drag (see `massing.spec.ts`), hold the pointer down for more than 2 s, assert the put count didn't change between pointer-down and pointer-up; release; within 2 s the count increases and the status becomes `Saved`.
6. **Duplicate / rename / delete.** Duplicate A → `Concept A copy` appears and is active; renaming to an existing name shows the error and keeps the old name; delete asks for confirmation and the last scenario's `Delete` is unavailable.

## D36 — `e2e/m4-recovery.spec.ts` (new file)

Seed storage through `page.evaluate` with the Dexie database named `terraform`, tables `projects` (key `siteId`) and `scenarios` (key `id`), rows `{ siteId, json }` / `{ id, siteId, json }`. Use the D35 fixtures in `src/features/scenarios/__fixtures__/` (they will be on `main` after Claude integrates D35; if not yet, stop and report).

1. **Corrupt record (QA-14).** Seed Concept A valid and Concept B with `corrupt-truncated.json`; load: the studio renders, `Project recovery` lists the unreadable record, `Export project` downloads a file whose JSON has the raw text under `unreadable`.
2. **Newer version.** Seed a project row with `schemaVersion: 99`: the status reads `Read-only — saved by a newer version`, editing works in memory, and **nothing is written** (assert the row is unchanged after editing and reloading).
3. **Quota.** Stub `IDBObjectStore.prototype.put` to throw a `DOMException('…', 'QuotaExceededError')` after load: status becomes `Not saved — storage is full`; the strip offers `Export project` and `Try again`; restore the stub and `Try again` leads to `Saved`.
4. **Storage unavailable.** Replace `indexedDB.open` with a function that throws before the app loads: the studio still works, status `Not saved — this browser can't store data`, and no scenario is ever shown as `Saved`.
5. **Export → import round trip.** Draw a mass, `Export project`, `Reset demo…` (confirm), then `Import project…` with the downloaded file (confirm): the mass is back with identical numbers.
6. **Bad import.** Import `corrupt-truncated.json` as a project file: an error message appears and the current scenarios are unchanged.

## D37 — evidence (`docs/reviews/M4-evidence.md`)

- Screenshots at 1440×900 into `docs/screenshots/m4-evidence-*.png`: scenario menu open, comparison with two thumbnails, recovery strip (corrupt record), read-only newer-version state, storage-full state.
- A table mapping every row of the M4 brief's "Required tests" to the test that proves it (file and test name), plus the QA-09, QA-12 and QA-14 results.
- List anything you couldn't prove and why.

## Rules

- No new dependencies. Don't edit `src/**`, `package.json`, `playwright.config.ts`.
- If you need a stable hook the UI doesn't provide, report it rather than reaching into implementation details.
- Run `npx playwright test --workers=1` (parallel runs have been flaky on software GL) plus `npm run lint`; both must pass.
- Add a row to `docs/agent-log.md` ("Pending Claude review").
