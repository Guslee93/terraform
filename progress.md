# Progress log

## Session: 2026-10-27 — Project bootstrap

### Phase 0: Setup and governance

- **Status:** complete
- **Started:** 2026-10-27
- Actions taken:
  - Audited the workspace: PRD plus 90 skills, no application code and no git repository.
  - Designed the agent operating model: one lead per milestone, time-boxed specialists, five gates.
  - Initialised git on `main`.
  - Scaffolded Vite 8 + React 19 + TypeScript 6 with pinned versions after `create-vite` hung interactively.
  - Installed 456 packages in 39 s.
  - Implemented tokens, landing, About, 404, studio shell, R3F viewport, inspector.
  - Added coordinate utilities, site catalogue, component tests, Playwright smoke spec.
  - Installed Chromium and verified the landing → studio smoke path.
  - Captured eight reference screenshots at four viewports and inspected the landing/studio compositions.
  - Adjusted hero spacing, mobile wordmark, grid contrast and disabled-control opacity after visual review.
  - Wrote AGENTS.md, three ADRs, seven milestone briefs, design contract, site package spec, QA fixtures.
  - Created `task_plan.md`, `findings.md`, `progress.md` and an agent log.
- Files created/modified:
  - Root: `package.json`, `package-lock.json`, `.gitignore`, `index.html`, `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `eslint.config.js`, `README.md`, `AGENTS.md`
  - App: `src/main.tsx`, `src/app/*`, `src/components/**`, `src/features/sites/*`, `src/scene/*`, `src/lib/*`, `src/styles/*`, `src/test/setup.ts`, `e2e/smoke.spec.ts`
  - Assets: `public/sites/compact-infill.svg`, `public/sites/sloped-edge.svg`
  - Docs: `docs/decisions/*`, `docs/milestones/*`, `docs/design/design-contract.md`, `docs/data/site-package-spec.md`, `docs/qa/fixtures.md`, `docs/reviews/REVIEW-TEMPLATE.md`, `docs/agent-log.md`
  - Planning: `task_plan.md`, `findings.md`, `progress.md`
  - Tooling: `scripts/capture.mjs`, `docs/screenshots/*.png`

### Phase 1: M0 shell

- **Status:** complete
- **Started:** 2026-10-27
- Actions taken:
  - Built the responsive studio frame and explicit empty state.
  - Lazy-loaded the studio route to keep the landing bundle small.
  - Verified typecheck, lint, unit/component tests and production build.
  - Ran `agency-ux-architect` and `agency-ui-designer` audits; consolidated 30 findings.
  - Applied blocker/major fixes with `agency-minimal-change-engineer`.
  - Ran `agency-code-reviewer`; fixed the pointer-event blocker and added drawer tests.
  - Ran `agency-ui-finish-gate-reviewer`; final decision **PASS with follow-ups**.
  - Added the mobile read-only notice and mobile disclaimer before sign-off.
- Files created/modified: see Phase 0 plus `docs/reviews/M0-*.md`, `src/components/studio/Inspector.test.tsx`, `e2e/smoke.spec.ts`.

### Phase 2: M1 site packages and camera

- **Status:** complete
- **Started:** 2026-10-27
- Actions taken:
  - `agency-research-synthesist` confirmed OSM ODbL 1.0 and Kartverket CC BY 4.0 usage and attribution.
  - Built `scripts/build_site_packages.py` with cached OSM XML and DTM1 elevation responses.
  - Generated Compact Infill (137 simplified buildings) and Sloped Edge (33 buildings, 31 m relief) with 13 × 13 terrain grids.
  - Added a runtime-repairing ring simplifier after QA found 12 self-intersecting footprints.
  - Implemented `SiteManifest` and package parsers with schema, unit, topology, statistics and provenance validation.
  - Implemented local ENU rendering: terrain mesh/grid/skirt, merged context geometry, dashed study boundary.
  - Added deterministic camera presets, animated transitions, dynamic compass, scale bar and layer legend.
  - Added working terrain/context/boundary layer toggles and package loading/error/retry states.
  - Ran `agency-gis-qa-engineer`; fixed the topology and attribution findings; pass with follow-ups.
  - Ran `agency-code-reviewer`; pass with follow-ups.
  - Measured 60.1 fps at 1440×900 on Apple M1 Pro / ANGLE Metal.
- Files created/modified: `scripts/build_site_packages.py`, `data/raw/*`, `public/sites/*`, `src/features/sites/{manifest,package,geometry,useSitePackage}.ts`, `src/scene/{ViewportCanvas,siteGeometry,CameraRig,HudProbe,CameraHud,hudStore}.tsx`, `src/components/studio/{CameraPresets,StudioShell,StudioTopBar,Inspector}.tsx`, `docs/reviews/M1-*.md`, `docs/data/site-package-spec.md`, `docs/qa/fixtures.md`.

## Test results

| Test | Input | Expected | Actual | Status |
|---|---|---|---|---|
| Typecheck | `npm run typecheck` | No errors | No errors | pass |
| Lint | `npm run lint` | No errors | No errors | pass |
| Unit/component | `npm run test` | All pass | 33/33 pass | pass |
| Production build | `npm run build` | Success | Success; landing ~92 kB gzip, studio ~263 kB gzip | pass |
| E2E smoke | `npm run test:e2e` | Both packages, presets, layer toggle | 2/2 pass | pass |
| Reference screenshots | `npm run capture` | 18 images at 4 viewports | 18 images in `docs/screenshots/` | pass |
| M1 performance | rAF sample at 1440×900, Metal | >45 fps | 60.1 fps, 0 page errors | pass |
| M1 geometry QA | `agency-gis-qa-engineer` | No blockers | Pass with follow-ups | pass |
| M1 code review | `agency-code-reviewer` | No blockers | Pass with follow-ups | pass |

## Error log

| Timestamp | Error | Attempt | Resolution |
|---|---|---|---|
| 2026-10-27 | `npm create vite` hung on an interactive prompt | 1 | Killed process; scaffolded manually with pinned versions |
| 2026-10-27 | Tests found duplicate DOM nodes across cases | 1 | Added explicit `cleanup()` in `src/test/setup.ts` |
| 2026-10-27 | Lazy studio route failed a synchronous test | 1 | Used `findByRole` for the unknown-site assertion |
| 2026-10-27 | Build warning: studio chunk >500 kB | 1 | Accepted for M0; route lazy-loaded; vendor split scheduled M1 |
| 2026-10-27 | ESLint `no-undef` in `scripts/capture.mjs` | 1 | Added Node globals for JS/MJS/CJS files in flat config |
| 2026-10-27 | Wide studio screenshots showed an illegible grid | 1 | Replaced Drei Grid with two `gridHelper` layers and stronger contrast |
| 2026-10-27 | Full-screen empty-state overlay blocked OrbitControls | 1 | Added `pointer-events-none` to the overlay; card keeps `pointer-events-auto` |
| 2026-10-27 | E2E asserted removed milestone copy | 1 | Updated the smoke test to the product-facing empty-state heading |
| 2026-10-27 | Python framework TLS failed against the elevation API | 1 | Used `certifi` explicitly for preprocessing requests |
| 2026-10-27 | 12 simplified OSM footprints self-intersected | 1 | Ring repair + runtime simple-ring validation; QA re-check clean |
| 2026-10-27 | Old slope bbox included the Ekeberg cliff (−91 m relief) | 1 | Moved to a 31 m-relief hillside with 33 context buildings |

## Session: 2026-10-27 — Status report handover

- **Status:** complete (reporting only; no milestone work)
- Actions taken:
  - Audited the full repo: milestone briefs, ADRs, review records, QA fixtures, git log, screenshots, package manifests, the M2 WIP working tree.
  - Re-ran `typecheck`, `lint`, `test` and `build`; found the M2 WIP had broken the build via an unused `SCENARIO_SCHEMA_VERSION` import in `src/features/massing/validation.ts`.
  - Removed that single unused import (behaviour-preserving); full suite green again: 33/33 tests, build OK (landing 91.87 kB gzip, studio 263.94 kB gzip).
  - Wrote `docs/status-report.md` — the handover/status report for Claude Code Opus 5.5: exec summary, milestone table, M0/M1 gate history, detailed M2 WIP inventory and gap list, ADRs, data/provenance, fresh verification state, open follow-ups, risks/error log, DoD standing, suggested brief and assessment focus.
- Files created/modified: `docs/status-report.md` (new), `src/features/massing/validation.ts` (removed unused import).
- Tests: typecheck/lint/test/build all pass at handover (see `docs/status-report.md` §10).

| Question | Answer |
|---|---|
| Where am I? | M1 complete; M2 massing engine next |
| Where am I going? | M2 domain model → massing tools → numeric inspector → undo/redo → QA-03–08 |
| What's the goal? | Terraform v1: credible interactive architectural site-planning portfolio prototype |
| What have I learned? | See `findings.md` — versions, data provenance, bundle sizes, review findings |
| What have I done? | See Phase 0/1/2 above, `docs/reviews/M1-*.md`, and `git log` |

## Session: 2026-10-27 — M2 checkpoint and domain fixtures

- **Status:** complete (M2 still in progress; no gate)
- Actions taken:
  - Committed the M2 domain WIP as checkpoint `5e92e12` (ADR-0004, `src/features/massing/*`, `src/lib/polygon.ts`).
  - Added fixture tests from `docs/qa/fixtures.md` §2–3: rectangle, L-shape, stepped mass (union 200 m², GFA 760, volume 2 432, max height 16), 2 000 m² parcel coverage, bow-tie / 2-point / zero-area rejection, negative width, storeys 0/41/non-integer, field-specific issue paths.
  - Envelope rows of §3 (within/exceeds/not evaluated) left for M3.
- Files created: `src/features/massing/aggregate.test.ts`, `src/features/massing/validation.test.ts`.
- Tests: lint ✅ · test 50/50 ✅ (8 files) · build ✅.

### Bug fixes (test-first)

- `volumeMaxHeight`/`scenarioMaxHeight` reduced from 0, so masses below the site origin on Sloped Edge reported 0. Now reduce from `-Infinity` (empty scenario → 0); semantics stay ADR-0004 `max(tier.top)` relative to origin. Grade-vs-datum height reference is FR-073, owned by M3.
- `isSimpleRing` only caught proper crossings. Now also rejects collinear overlaps, vertex-on-edge touches and adjacent fold-backs. `src/features/sites/package.ts` had a duplicate copy; it now imports the shared one. All 170 real package footprints and both study boundaries still validate.
- Files: `src/lib/polygon.ts`, `src/lib/polygon.test.ts` (new), `src/features/massing/aggregate.ts`, `src/features/massing/aggregate.test.ts`, `src/features/sites/package.ts`.
- Tests: 4 new tests failed before the fix; after: lint ✅ · test 56/56 ✅ (9 files) · build ✅.

### Document validation and serialization (test-first)

- `validation.ts`: added `validateAssumptions`, `validateVolume`, `validateScenario` per ADR-0004 §4 — schema version, non-empty id/site/name, volume name and ≥1 tier, unique volume ids, unique tier ids within and across volumes, assumption ranges bounded by the global 1–40 storeys and 2.2–6.0 m storey height, scenario storey range applied to every tier. Issue paths are document-relative (`volumes[1].tiers[0].id`).
- `serialize.ts` (new): `serializeScenario` refuses invalid documents; `parseScenarioDocument` decodes untrusted JSON structurally (path-specific type errors), rejects unknown schema versions without guessing, drops unknown fields, then runs `validateScenario`. Migrations remain M4.
- Files: `src/features/massing/{validation,validation.test,serialize,serialize.test}.ts`.
- Tests: 14 new tests failed before implementation; after: lint ✅ · test 70/70 ✅ (10 files) · build ✅.

### Command layer and history (test-first)

- `src/features/editor/history.ts`: snapshot history per ADR-0003/0004 §3 — `createHistory`, `execute` (validates, throws without touching history, no-op on same document), `undo`/`redo` with selection restore, `select`, 100-entry bound dropping oldest. Preview transactions: `beginPreview`, `updatePreview` (always from base — no drift), `cancelPreview` (exact base by reference, zero entries), `commitPreview` (one entry; rejects stale previews). Recorded as an amendment in ADR-0004 §3.
- `src/features/editor/commands.ts`: `addVolume`, `removeVolume`, `duplicateVolume` (fresh ids, optional offset), `moveVolume`, `rotateVolume` (all tiers about one pivot), `updateVolume`, `addTier`, `updateTier`, `removeTier`. Unknown ids throw.
- QA coverage: QA-05 (3→5 storeys → 16 m, 1 080 m² GFA), QA-07 (roof drag + Esc → identical document, no entry), QA-08 (duplicate/delete/rotate undo+redo with exact geometry and selection), QA-16 domain side (negative/NaN/0/41 storeys rejected, no entry).
- Not yet enforced: `locked` volumes are still editable at the command level — decide in the tool/inspector layer.
- Files: `src/features/editor/{history,history.test,commands,commands.test}.ts`, `src/features/massing/factories.ts` (exported `createId`), ADR-0004 amendment.
- Tests: both new suites failed before implementation; after: lint ✅ · test 94/94 ✅ (12 files) · build ✅.

## Session: 2026-10-27 — DeepSeek round 1 review and merge

- **Status:** complete
- Reviewed D1–D6 on `deepseek/followups` against status report §15.3: scope clean (no protected files), offline rebuild leaves `public/sites` unchanged, 107/107 on the branch.
- Merged with `--no-ff` (`main` had diverged by the M6 docs commit).
- **D3 defect fixed:** `fetchJson` returned `response.json()` un-awaited, so `finally` cleared the timeout and dropped the caller-abort listener before the body was read. Added a stalled-body test (failed: hung), then awaited the body inside `try`.
- Visual follow-up from D5: at 1024×800 the "Site notes" drawer button overlaps the study-boundary legend label.
- Wrote round-2 DeepSeek cards D7–D9 in the status report.
- Tests: lint ✅ · test 108/108 ✅ (15 files) · build ✅.

### Locked masses (test-first)

- Decision with the user: lock is enforced in `src/features/editor/commands.ts`. Move, rotate, tier edit/add/remove and delete throw on a locked mass before any history entry; rename, show/hide, unlock and duplicate stay allowed, and duplicates come out unlocked. Recorded as an ADR-0004 §3 amendment.
- 9 new tests (7 failed before the change); lint ✅ · test 117/117 ✅ · build ✅.

### Tool/pointer state machine (test-first)

- New `src/features/editor/interaction.ts`: pure reducer `reduceEditor(state, event)` over `{ history, tool, interaction, error }`. Tools `select` | `draw`; pointer-down without a gesture is navigation (camera), with a gesture it captures the pointer (`cameraLocked`). Drag previews always apply to the gesture base; release commits one entry; Esc / pointer loss / tool switch cancel with zero entries; undo/redo ignored mid-gesture; invalid commits, locked masses and bad drawings set `error` and never throw.
- Gestures: `moveGesture` (optional grid step via D1 `snapValue`), `roofGesture` (vertical metres → whole storeys). Ghost preview carries live validation issues.
- Draw tool: click adds a point (with terrain elevation), Backspace removes, Enter creates `Mass N` at the lowest clicked elevation with 3 storeys at the scenario default height and returns to select, Esc discards. Self-intersecting drawings are rejected with points kept (QA-04).
- 18 new tests (module absent before); lint ✅ · test 135/135 ✅ (16 files) · build ✅.

### Mass scene adapter and studio wiring

- `src/scene/massGeometry.ts` (tested): tier → `ExtrudeGeometry` in (east, north), rotated into (east, up, −north); roof handle at the top-face centroid.
- `src/scene/MassLayer.tsx`: one mesh per visible tier, clay `#F2EFE7`, selection outline `#355E79`, invalid previews tinted; roof handle is a focusable DOM button (`<Html>`) with a live "N storeys · H m" label; drags follow a plane with window listeners (vertical camera-facing plane for the roof, horizontal at base for moves) and switch OrbitControls off for the gesture.
- `StudioShell` owns `useReducer(reduceEditor)` with an empty `Concept A` per site (keyed by site). Draw footprint tool in the rail; Esc/Enter/Backspace routed to the reducer; status line for draw hints and errors. Editing is off below 640 px (read-only preview).
- Reducer additions (test-first): `select` event; plain-language errors ("Footprint edges must not cross."); Esc and tool changes clear errors. Validation message changed from "must be a simple ring without crossings" to "edges must not cross".
- Inspector selection card no longer claims massing is unavailable: it shows the selected mass with geometry-derived storeys/height, or how to add one, or the small-screen read-only note.
- Browser verification (Compact Infill + Sloped Edge, ~800 px pane and 375 px mobile): draw → mass created and selected (QA-03); roof drag preview 18 storeys → Esc restores exact 3 storeys with camera unchanged (QA-07); roof drag 3 → 5 storeys · 16.0 m committed (QA-05); body drag moves the mass without orbiting; bow-tie → friendly error, points kept (QA-04); mobile shows no draw tool. Found and fixed during verification: selection outline hidden by `polygonOffset`, passive-listener `preventDefault` console error, raw developer error text, stale inspector copy.
- Evidence: `docs/screenshots/m2-*.jpg` (8 images).
- Tests: lint ✅ · test 142/142 ✅ (17 files) · e2e 2/2 ✅ · build ✅ (studio 272.5 kB gzip).
- Open: undo/redo shortcuts wait for D7; rotate/scale/vertex-edit gestures; numeric inspector; clearance warnings (masses can overlap context buildings or embed in slopes).

## Session: 2026-10-28 — Numeric inspector

- **Status:** complete
- DeepSeek round 2 had not started, so Claude implemented D8 to its card spec (`src/features/editor/inspectorInput.ts`: `parseStoreys`, `formatInputValue`) and marked D8 done in the report; D7 and D9 stay with DeepSeek.
- Reducer (test-first): `command` event and `commandError(state, command)`, so a form field can learn why an edit would be refused and keep its prior value; both refuse while a gesture or drawing is open.
- `src/components/studio/MassFields.tsx` (test-first): name, storeys, storey height, base elevation, use, visible, locked; commit on Enter/blur, revert on Escape; invalid text or refused commands show an error under the field and restore the last valid value (QA-16). Locked masses disable geometry fields but keep name/visible/lock. Height and footprint readouts derive from geometry.
- Inspector shows `MassFields` for the selected mass (live during drags); drawer focus trap now skips disabled inputs/selects. Roof handle hidden for invisible masses.
- Browser verification (Compact Infill): fields show real values (base −1.19 m from terrain, 2 058 m² footprint); "-1" → "Enter a whole number of storeys.", "41" → "Storeys must be an integer between 1 and 40.", both revert to 3 with the model unchanged; 5 storeys × "3,5" m → 17.5 m; Locked disables storeys and removes the roof handle; Visible off hides the mass. No new console errors.
- Evidence: `docs/screenshots/m2-inspector-fields.jpg`, `m2-inspector-locked.jpg`, `m2-qa16-not-a-number.png`, `m2-qa16-out-of-range.png` (replaces the old `m2-inspector-selection.jpg`).
- Tests: lint ✅ · test 167/167 ✅ (19 files) · e2e 2/2 ✅ · build ✅ (studio 273.9 kB gzip).
- Open: hidden masses cannot be reselected once deselected (needs a mass list); width/depth/rotation readouts after D9.

### Clearance and boundary feedback (QA-06, test-first)

- `src/lib/polygon.ts`: exported `segmentsIntersect` (crossings and touches); `isSimpleRing` now reuses it — real package footprints still validate.
- `src/features/massing/clearance.ts`: `checkClearance(document, { studyArea, heightAt })` → warnings per volume id. Boundary: every tier classified inside / crossing / outside (a tier sticking out makes the mass "crosses"). Terrain, ground tiers only: samples corners, edges and an interior grid; floats when the base is > 0.5 m above the lowest ground, cuts when the slope buries more than one storey of the tier. Illustrative warnings, never validation errors; nothing auto-corrects.
- Threshold decision from browser testing: a 1.0 m cut threshold flagged almost every drawn mass on Compact Infill (relief −4…+6 m) — a normal plinth. Changed to "more than one storey" (test-first), so the warning keeps its meaning.
- UI: amber tint `#EFD9AC` on flagged masses (red still wins for an invalid preview); inspector lists the selected mass's warnings with "Illustrative check · not planning advice"; viewport status line summarises when no error or drawing hint is showing. Computed on the displayed document, so warnings follow a drag live.
- Flaky test fixed: `App.test.tsx` unknown-site test waited 1 s for the lazy studio route; it failed 1 run in 3 under full-suite load. Given a 5 s budget; 4/4 full runs pass.
- Browser verification: Compact Infill mass inside → clear; dragged across the boundary → amber, "crosses the study boundary · floats up to 1.8 m above the ground" (moved onto lower ground, base kept); inspector lists both. Sloped Edge mass across the slope → "cuts up to 14.2 m into the slope". No new console errors.
- Evidence: `docs/screenshots/m2-qa06-*.jpg`, `m2-slope-cut-warning.jpg`.
- Tests: lint ✅ · test 181/181 ✅ (20 files) · e2e 2/2 ✅ · build ✅ (studio 275.0 kB gzip).
- Open: excluding outside area from coverage is M3 (fixtures §3); terrain sampling is a fixed-density grid (`ponytail:` note in code).
