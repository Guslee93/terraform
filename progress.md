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

### Mass list and undo/redo UI (QA-08, test-first)

- `MassList` (new, tested): every mass incl. hidden ones, with a geometry-derived summary, "Hidden" and "Needs attention" tags; click selects (first tier). Shown above Selection in the inspector when the scenario has masses.
- `MassFields`: Duplicate (copy placed east of the original, widest tier + 5 m), Rotate 15° counter-clockwise / clockwise, Delete. Locked masses keep Duplicate only; all actions off when editing is off.
- `ToolRail`: Undo/Redo buttons (tested), disabled when the stack is empty, during a gesture, or below 640 px. Keyboard shortcuts still wait on DeepSeek D7.
- Browser verification (Compact Infill): duplicate → list shows "Mass 1 copy" selected → Undo removes it and reselects Mass 1 → Redo restores it selected and disables Redo; rotate 3 × 15° clockwise (footprint stays 900 m²) → 3 × Undo matches the pre-rotate screenshot; Delete → list "Mass 1", nothing selected → Undo restores the copy at its index, selected; hidden copy → deselect → selected again from the list. No new console errors.
- Evidence: `docs/screenshots/m2-qa08-*.jpg`, `m2-hidden-mass-from-list.jpg`.
- Tests: lint ✅ · test 190/190 ✅ (22 files) · e2e 2/2 ✅ · build ✅ (studio 276.0 kB gzip).

### Stacked tiers (test-first)

- `src/lib/polygon.ts`: `ringWithin(inner, outer)` (all vertices inside, no edge contact).
- `stackTier(volumeId)`: new tier on the current top tier — base at its top, 2 storeys, same storey height and use, outline scaled 60 % about its centre (area × 0.36); concave bases where the scaled copy would leave the outline fall back to the full outline. Selects the new tier. Refused on locked masses.
- `updateTier` now keeps stacks attached: when a tier's top moves (storeys, storey height, base), every tier at or above its old top moves by the same delta — also during roof drags.
- The stepped-mass fixture (20 × 10 m × 3 + 10 × 8 m × 2 at 9.6 m) is reproduced through `stackTier` + `updateTier`: ground 200 m², GFA 760 m², volume 2 432 m³, max height 16 m.
- UI: "Add tier" action; "Tiers" switcher (Tier 1…n by elevation) when a mass has several tiers; "Remove tier" on the topmost tier only (no gaps), selecting the ground tier after. In 3D only the selected tier is outlined and carries the roof handle; clicking a tier selects it.
- Browser verification (Compact Infill): upper tier stacked at 7.39 m = lower base −2.21 + 9.6, footprint 629 m² = 36 % of 1 748 m²; Tier 1 → 4 storeys moved the upper base to 10.59 m; real roof drag on the upper tier changed only it; clicking the lower tier moved the outline; dragging the lower tier's handle raised the upper tier with it; Remove tier → one tier, Undo restores both. No new console errors.
- Known limitation: a lower tier's roof handle sits at its roof centroid, which can be under the upper tier (handle still works; inspector switcher is the alternative).
- Evidence: `docs/screenshots/m2-stepped-*.jpg`.
- Tests: lint ✅ · test 205/205 ✅ (22 files) · e2e 2/2 ✅ · build ✅ (studio 276.5 kB gzip).

### M2 review gate

- Ran in an isolated worktree of `main` because DeepSeek round 2 was active in the main checkout (branch `deepseek/round2`). A first attempt symlinked `node_modules`, which loaded two React copies and shared Vite's dependency cache with DeepSeek's dev server; stopped it, installed the worktree's own `node_modules`, and confirmed the 5173 server still rendered.
- Gate commands on `main` (`5b244a3`): typecheck ✅ · lint ✅ · test 205/205 ✅ · build ✅ (landing 91.88 kB, studio 276.54 kB gzip) · Playwright smoke 2/2 ✅ on a dedicated port.
- Fixed-camera evidence: flat, L-shaped and stepped masses on Compact Infill at the ISO and TOP presets (`docs/screenshots/m2-gate-flat-l-stepped-{iso,top}.jpg`).
- `docs/reviews/M2-code-review.md`: no blockers; 3 major (missing add-at-point/scale/vertex-edit tools, no single-pointer alternative to moving a mass, missing width/depth/rotation + palette), 7 minor, 2 nits. QA-03–08 all pass (QA-03 persistence is M4). Decision: **pass with follow-ups** for G1 + QA gate; **milestone acceptance not met**. Self-review — independent review recommended.
- `docs/agent-log.md` row deferred until round 2 is merged (DeepSeek edits that file on its branch).

### Scene look — Phase 1 (white model, `docs/design/scene-look-plan.md`)

- Context buildings: one matte `#F3F2EE` (per-kind tints and the context colour attribute removed) plus crease edge lines (`EdgesGeometry`, 30°, `#6F6E6A` at 0.3 — one `EDGE_OPACITY` knob).
- Ground near-white `#F0EFEC` → `#E6E5E1` by elevation; skirt `#D8D7D3`; background/fog/`--surface-viewport` `#EEEDE9`.
- Light rig: `NeutralToneMapping` (ACES greyed the whites to ~215), ambient 0.3, hemisphere `#FFFFFF`/`#CDD0D4` 1.6, sun 2.4 from `sunPosition(225°, 35°)` (`src/scene/lighting.ts`, tested). Measured viewport luminance: shadows p5–p15 170–182, lit 231–237 (was 118–145 / 214–237 on the first pass).
- Terrain grid only in Top view or while drawing.
- Proposal mass `#C9DBE5` (pale accent) pulled forward from Phase 3: with a white context the old `#F2EFE7` mass disappeared.
- Browser verification: drew a mass on Compact Infill (Top → Iso); reads clearly against the context; no console errors.
- Evidence: `docs/screenshots/scene-look-{before,after}-*-1440x900*.png`, `scene-look-after-mass-iso.png`. `scripts/capture.mjs` takes `SHOT_PREFIX` / `SHOT_VIEWPORT`.
- Tests: lint ✅ · test 229/229 ✅ (25 files) · e2e 4/4 ✅ · build ✅.
- Known limitations: with the grid hidden in Iso, Sloped Edge's slope reads less (silhouette and plinth only) → contour lines are the honest fix. three r186 removed `PCFSoftShadowMap` (falls back to PCF, console warning) → Phase 2 must use PCF + `shadow-radius` or VSM.

### Scene look — Phases 2–3 (ADR-0005)

- ADR-0005 accepted: palette/light, fitted shadows, AO dependencies, contours, OSM roads/trees, storey bands.
- Shadows: `fitShadowFrustum` (tested) sizes the ortho shadow camera to the site's bounding sphere; 4096 map ≈ 0.10 m/texel (was ≈ 0.5 m). PCF + `shadow-radius` (r186 dropped PCFSoft). Context buildings receive shadows.
- Storey bands: `createStoreyLineGeometry` (tested) at every intermediate floor; faint accent outline on unselected masses; polygon offset on mass faces.
- Contours: `contourSegments` (marching triangles, renderer-free, tested) → 1 m / 5 m lines, only with ≥ 2 m relief.
- AO: `postprocessing` 6.39.5 (Zlib) + `n8ao` 2.0.1 (ISC), pinned; `SceneComposer` lazy chunk 96.0 kB gzip, studio chunk unchanged at ~36 kB gzip. 60 fps at 1440×900, 1× and 2× DPR (ANGLE Metal, M1 Pro).
- **Bug found and fixed:** the first composer used `useMemo` + effect cleanup; StrictMode's double mount disposed it (postprocessing empties `passes`), freezing the canvas on its first frame (presets and new masses never redrew). Unit tests and DOM-only e2e passed throughout; it was caught by checking a drawn mass visually. Fix builds the composer in the effect; new e2e `the 3D view redraws when the camera preset changes` fails on the old code and passes now. The first 60 fps figure had been measured against the frozen composer and was re-measured after the fix (still 60).
- Streets/trees: builder emits additive `roads.json` (136 / 32 runs) and `trees.json` (128 / 122 points); `terrain.json`, `buildings.json`, `study-area.json` byte-identical after `--offline` rebuild. Optional manifest paths, validated parsers, loader tests for present and absent cases, `scripts/test_build_site_packages.py` for clipping. Streets/Trees layer toggles hidden when a package lacks the file.
- Evidence: `docs/screenshots/scene-look-final-*.png` (ISO + Top for both sites, mass close-up).
- Tests: lint ✅ · test 246/246 ✅ · e2e 5/5 ✅ (now ~52 s: AO under software GL) · build ✅ · Python clip check ✅.
- Study boundary fix: `drapePolyline` (tested) resamples the boundary every 4 m on the terrain, so its sides no longer sink under the slope on Sloped Edge (pre-existing since M1). Tests 247/247, e2e 5/5.
- Known gaps: faint AO specks at some road edges; one illustrative tree size.

### C1 — Offline land cover data and loading (2026-10-28)

- Work order: `docs/handoffs/C1-landcover.md`; implementer using the spatial data engineer role. Data/loading only; no network, dependencies or commits.
- Changed `scripts/build_site_packages.py` and `scripts/test_build_site_packages.py`: exact water/wood/park/grass tag mapping; closed ways and end-to-end multipolygon outer joining (including reversed ways); Sutherland–Hodgman extent clipping; 0.5 m simplification; <4 m² filtering; open CCW output sorted by source ID. Incomplete rings skipped, inner rings ignored as specified.
- Added `public/sites/{compact-infill,sloped-edge}/landcover.json`; changed only `manifest.json` and `attribution.md` beside those new assets. Compact: water 1, park 1, grass 8, wood 0 (10 total). Sloped: water 0, park 0, grass 1, wood 1 (2 total).
- Changed `src/features/sites/{manifest.ts,package.ts,package.test.ts,fetchJson.test.ts,useSitePackage.test.tsx}`: optional path, typed data, validation, conditional fetching, matching site IDs and empty fallback. A listed file containing JSON null is rejected.
- Changed `docs/data/site-package-spec.md`, `task_plan.md`, `progress.md` and `docs/agent-log.md` for the schema and execution evidence.
- Python tests cover inside/half-outside/outside clipping, extent enclosure/touching, reversed joining, multiple rings, missing members/nodes, open/tiny/outside ways, tag classification, ignored holes, sorted IDs and CCW output. TypeScript tests cover both real packages, each rejection rule, valid kinds/5000-area boundary, optional paths, absent-file request suppression and site-ID mismatch.
- Verification: `python3 scripts/test_build_site_packages.py` → all four groups print ok; `npm run lint && npm run test && npm run build` → pass, 269 tests across 29 files. Existing Three.js CJS deprecation and large vendor-chunk warnings remain non-blocking.
- Offline rebuild run twice. Second run reproduced every site asset byte-for-byte. SHA-256 checks against the pre-edit baseline and byte comparison against HEAD confirm all 10 protected terrain/buildings/study-area/roads/trees files unchanged.
- Failed attempt: initial count-report line used a nested f-string with an escaped quote unsupported by the local Python; extracted the count string and reran successfully.
- Limitations: inner holes intentionally ignored; incomplete cached rings skipped; multiple outer rings retain the same relation source ID. No rendering/UI changes or screenshots were required by C1. All requested work completed.
- Concurrent unrelated changes appeared in scene files and `docs/status-report.md` during execution; they were not edited or reverted by this work. Full test/build results describe the shared working tree at verification time.

### C2 — Leaf-cluster tree foliage (2026-10-28)

- Executed `docs/handoffs/C2-foliage.md` using `gis-3d-scene-developer`. Changed only its five owned scene files and the two explicitly required logs; no dependency changes or commit. Status: **Pending Claude review**.
- Added `src/scene/foliage.ts`: seeded Mulberry32 generation; 18–28 outward-biased clumps in round/tall ellipsoids, detail-zero icosahedra with bounded vertex jitter and random rotation, per-face linear greens, non-indexed flat normals. Repeated corners share displacement to keep clumps closed. Unit-height trunks and two/three tapered five-sided branches; merged parts disposed.
- Updated `Trees.tsx`: six memoized canopy/branch pairs per shape, grouped by shape and variant (at most 24 instanced meshes), unmount disposal, existing terrain placement/rotation/size retained with unit-geometry scaling. Requested vertex-colour canopy material, opacity 0.9, depth writing and shadows; branch colour `#A39A8C`.
- Updated `treeVariants.ts` with salt-5 variant hashing and near-white tint multipliers. Added `foliage.test.ts` and extended `treeVariants.test.ts` for seed repeatability/variation, padded ellipsoid bounds, flat normals/face colours, colour range/diversity, geometry budgets and variant coverage across 40 trees.
- Measured canopy vertices for seeds 0–5 (each shape): **1200, 1440, 1560, 1500, 1680, 1500**; branch vertices **180, 240, 240, 240, 240, 240**.
- Verification: focused foliage/variant tests **19/19 pass**; `npm run lint && npm run test && npm run build` **pass**, **293 tests across 32 files**; `git diff --check` clean. Existing Three.js CJS deprecation and vendor chunk-size warnings remain.
- Failed/limited verification: initial read guessed a nonexistent `scripts/capture-screenshots.ts`; actual script is `scripts/capture.mjs`. Vite SSR count inspection succeeded but emitted an HMR socket `EPERM`. `npm run test:e2e` could not start the dev server (`listen EPERM 127.0.0.1:5173`). Computer-use fallback reported no available browser. Fresh fixed-view screenshots and runtime visual verification could not be completed in this sandbox; no visual acceptance claim.
- Other agents concurrently modified lighting/UI/docs/screenshots; those files were neither edited nor reverted here. Test/build results describe the shared working tree at verification time. No other implementation gaps identified.

### DeepSeek rounds 3 and 4 review (2026-10-28)

- Round 3 (D14–D20) accepted; rows added to the agent log. D16 screenshots superseded by later grade commits. D19 crops checked visually: no AO specks.
- Round 4 (D17b, D22, D21, D26, D23) reviewed and merged as `d7921e4`. Geocoder field names verified against the live Kartverket fixture. D26 uses OSM feature label points with cited ids where no place node exists.
- Suite after merge (Codex's untracked partial C4 files set aside during the run): lint ✅ · typecheck ✅ · 314 unit tests ✅ · build ✅ · e2e 9/10 (massing timeout under software GL, D28).
- Round 2 rows (D7–D13) are still "Pending" in the agent log; not reviewed in this session.

### M3 domain core — Fable session (2026-10-29)

- Branch `m3/domain` in worktree `../Terraform-m3`, six commits `737de0e`–`dd8b84b`; brief `docs/plans/M3-fable-plan.md` §2, delivered in order F4 → F1 → F3 → F2 → F5, one commit each, plus the handoff `docs/handoffs/M3-fable-remaining.md` (final public API, decisions, Codex next steps).
- F4 `src/features/analysis/time.ts`, `sun.ts`: Intl-only wall-clock ↔ instant with gap/overlap handling (every `dst-oslo.json` case), `sunState` with `belowHorizon` and ENU direction, `dayModel` incl. polar day/night, presets, scrubber helpers; QA-10 and QA-11 tests.
- F1 `src/features/massing/metrics.ts`, `src/lib/clip.ts`: one plate per storey, 0.1 m level tolerance, union per level (ADR-0007); stepped fixture 760 m² / 5 storeys; per-building sum reported separately.
- F3 `src/features/analysis/constraints.ts`, `insetPolygon`: boundary minus edge strips and vertex discs (48-gon), verified on rectangle, L-shape and a splitting dumbbell; per-mass status, reasons, offending rings, height above grade or datum (ADR-0008); disclaimer on every result.
- F2 coverage = union ∩ parcel / parcel, outside area separate; fixtures §2 rows and edge cases.
- F5 NOAA-equation oracle in tests only; ≤ 0.5° vs suncalc hourly through 2026 (Oslo, Tromsø) and vs every daytime NREL SPA row; fixtures §4 noon rows ≤ 0.05°.
- Verification: `npm run lint` ✅ (after a directive for the pre-existing `window` use in `scripts/capture.mjs`) · `npm run typecheck` ✅ · `npm run test` ✅ 669 tests / 55 files · `npm run build` ✅.
- Failed attempts: two hand-derived inset areas (L-shape, dumbbell) were wrong, not the code — the corner square at a reflex vertex and the lens at a neck were missed; expectations corrected with the derivation in the test. One metrics fixture overlapped the L-shape in plan; moved.
- Open: owner to accept ADR-0007/0008; hidden-mass counting and the noon preset (handoff §2); `docs/reviews/M3-*` not started; UI (C8–C10) builds against handoff §4.

### M3 gate review (2026-10-29)

- Fable F1–F5 (domain core), Codex C8–C11 (UI), DeepSeek D28–D34 (tests, evidence, reference data) merged on `main`.
- Claude review: 7 evidence images viewed; envelope evidence recaptured in daylight with a realistic mass; height-limit plane made readable; ESLint ignores venvs.
- Suite: lint 0 · 699 unit tests · build ✅ · e2e 18 passed (1 opt-in evidence spec skipped).
- Record: `docs/reviews/M3-code-review.md` — reviewer pass with follow-ups; **owner signed off M3 on 2026-10-29**.

### Studio v2 redesign — round 1 (2026-11-02)

- Input: `docs/design/ui-redesign-spec.md` (copied from the owner's spec). Contract §1–§7 rewritten from spec §2–§8; §8 notes scene constants are the single source; §12 gate gains the spec §11.3 checks.
- Round 1: `tokens.css` replaced (cool ground/surfaces, one blue accent, sun data palette, warning ink); Inter + Newsreader → Geist + Geist Mono 5.3.0 (ADR-0009, proposed); ten type-scale `@utility` classes; radii as theme tokens; mechanical class codemod over 23 components: no `text-[…]`, `tracking-[…]`, `shadow-*` or `rounded-[…]` classes remain; warning text uses `--warning-ink`.
- Deviation from the mechanical mapping: 9–11 px copy that was not uppercase became `text-body-sm`, so only labels are uppercase.
- Verification: lint ✅ · 699 unit tests ✅ · build ✅ · browser check at 1440×900 (landing + studio render in Geist, no console errors). e2e and `npm run capture` not run (layout unchanged until round 2).
- Not started: spec round 2 (primitives, studio grid, drawer, insight tiles), round 3 (motion, scene palette §9).

### Studio v2 redesign — round 2 (2026-11-02)

- Primitives: 16-grid icon set (spec §6), `controls.ts` (text button, segments, inputs), `Card`/`CardHeader`, `Metric`/`MetricRow`/`CheckRow`/`Figure`.
- Layout: studio is now the spec §7.1 grid (viewport 3 cols + panel 02 2 cols, five tiles; 2 cols 640–1199 px; 1 col below). Top bar holds the tabs (Model, Sun, Constraints); the inspector became a right drawer (bottom sheet < 640 px) that opens on selection or from the rail's layers button.
- Panel 02 by tab: coverage gauge + metric row; Sun panel (clock, metrics, presets, playback); Constraints panel (hero count, summary bar, limit rows, offending masses, disclaimer directly after the status).
- Tiles: 03 gross area stripes, 04 sun clock + day barcode (the `Local time` slider, 15 min / Shift 1 h / Home–End sunrise–sunset), 05 sun path (selected date, solstices, equinox from `sunDirection`), 06 height + floor stack + ruler vs the package height limit, 07 checks.
- Scene: two-line leader annotation per visible mass (metrics values); viewport clear colour → `#F3F3F1`.
- Deviations from the spec, all to avoid inventing data: the gauge has no limit pill (packages carry no coverage limit); metric row is Concept GFA / Footprint / Volume / Max height (no BRA/BYA); checks are the four the app evaluates (height, setback, study area, terrain contact), counted per mass by `summarizeChecks`. Compare tab stays hidden until M4. Scenario name has no chevron (no switcher yet). Legend shows only ≥ 1680 px.
- Tests: unit tests updated for the new structure (+ `checks.test.ts`, barcode keyboard test); e2e open the drawer from the rail before using layers, wait on the viewport region instead of `137 simplified`, and the legend test became an HUD-overlap + no-horizontal-scroll test at five widths.
- Verification: lint ✅ · typecheck ✅ · 704 unit tests ✅ · build ✅ · e2e 17 passed, 1 opt-in skipped · browser check at 1680, 1024 and 375 px (grid, drawer, tiles with a drawn mass, no horizontal scroll).
- Bugs found by e2e and fixed: Esc during a roof drag also closed the drawer (now an idle Esc only); the drawer covered panel 02 on the Sun/Constraints tabs (those tabs now close it, Model reopens it for a selection); the night status read `· Sun below horizon`; the legend touched the camera views at 1680 px. OSM/Kartverket attribution moved into the always-visible footer.
