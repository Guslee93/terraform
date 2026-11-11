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

### Studio v2 — draft 4 editor layout (2026-11-02)

- UX assessment (`docs/design/ux-assessment.md`, images 01–06) → owner chose the editor layout, then iterated four drafts against `References images UX UI/`; draft 4 approved and built (ADR-0010, proposed).
- Built: two-column studio (canvas + always-visible panel), text toolbar and views, legend pill, sun band with the barcode slider, design check with one row per issue and the reference stated, scenario figures (Tallest uses the envelope reference everywhere), buildings with the selected mass as a solid accent row, collapsible groups. Scene colours softened through `soften()` (60 % saturation); selected mass solid blue; scene labels are chips with a status dot.
- Removed: tabs, drawer, coverage gauge, insight tiles, `Card`/`Metric` primitives.
- Fixes found on the way: list rows and scene labels showed different heights (storeys × storey height vs envelope height) → both use the envelope height; Tallest without envelope data said "above grade" → now "Above site origin"; toolbar and views overlapped at 1024 px → views drop to a second row below 1280 px; phone canvas squeezed by the sun band → fixed 360 px scene below 640 px.
- Verification: lint ✅ · typecheck ✅ · 705 unit tests ✅ · build ✅ · e2e 18 passed, 1 opt-in skipped · browser check at 1440, 1024 and 375 px.
- e2e migration done by a subagent (e2e/ only); its one failure was the 1024 px overlap above, fixed in product code.

### Studio v2 close-out (2026-11-02)

- Review: `docs/reviews/studio-v2-code-review.md` — pass with follow-ups after fixes (1 blocker: false "saved locally" claim; Enter on group summaries; tab order; one height/floor count via `massSummary`; sun axis label positions; dead code).
- Evidence: `docs/screenshots/studio-v2-*.png` (capture script now uses "Plan") and the M3 evidence set recaptured on the new layout; evidence spec scrolls the panel to the design check before the violation shot.
- Motion (re-scoped round 3): one-time surface fade-in, figure tweens, masses rise once; reduced motion off. Warning toast removed (design check covers it).
- Verification: lint ✅ · typecheck ✅ · 710 unit tests ✅ · build ✅ · e2e 18 passed, 1 opt-in skipped.
- ADR-0009 and ADR-0010 accepted by the owner (2026-11-02). Open: keyboard e2e follow-up; then M4.

### M4 Phase 0 (2026-11-02)

- Plan: `docs/plans/M4-plan.md` (Claude: contracts/correctness; Codex: UI; DeepSeek: fixtures/e2e/evidence; subagents: K1, review).
- S1 (Claude): scenario format 2 (`notes`, optional `camera`, `createdAt`/`updatedAt`), strict v2 decoder (`decodeScenarioDocument`), `src/features/scenarios/{migrate,project}.ts` (v0 → v1 → v2, typed `ScenarioLoadError`, `ProjectRecord`, `ProjectExport`, `createDefaultProject`), `CAMERA_PRESET_IDS`; ADR-0011 (proposed).
- K1 (subagent): `e2e/keyboard.spec.ts`: tab order in visual order, visible focus, Enter toggles groups, slider keys. 4/4 pass; no product bugs.
- D35 (DeepSeek): work order `docs/handoffs/D35-m4-fixtures.md`; worktree `../Terraform-d35` on `deepseek/d35` prepared; not started yet.
- Verification: lint ✅ · typecheck ✅ · 719 unit tests ✅ · build ✅.

### M4 Phase 1 (2026-11-02)

- S2: `src/features/scenarios/{store,repository,defaultRepository}.ts` cover:
  - Dexie and in-memory stores holding rows of validated JSON;
  - load with repair, reporting skipped records as corrupt, newer-version or missing;
  - writes ordered per id;
  - typed quota and unavailable failures;
  - reset;
  - export, and import that is all-or-nothing.
- S3: `autosave.ts` saves about 800 ms after a change, waits while a gesture is open, flushes, discards and reports a truthful status. `sessions.ts` keeps one undo history per scenario.
- S4: `compare.ts` builds the FR-080 rows with B − A deltas, the envelope status and notes.
- Studio integration (moved from Codex to Claude): `useScenarioProject` plus `StudioShell` wiring. The top bar now shows a truthful save status. `updateScenarioDetails` is a new command. `massSummary` moved to `features/analysis`. `__APP_VERSION__` is injected from package.json.
- Browser check: drawing a mass goes "Unsaved changes" → "Saved"; after a reload the mass is still there.
- Codex work order: `docs/handoffs/C12-C14-m4-ui.md`, written against the real hook API.
- Verification: lint ✅ · typecheck ✅ · 749 unit tests ✅ · build ✅ · e2e 22 passed, 1 opt-in skipped.
- Bundle: the studio chunk is 324 kB raw / 105 kB gzipped (+122 / +40 kB), from Dexie's first use; recorded in ADR-0011.

### M4 Codex resumption audit (2026-11-02)

- Confirmed clean m4/ui checkout at cc02494; read C12–C14 handoff, M4 plan/brief, ADR-0011, relevant PRD, design contract and frontend skill. Installed locked dependencies with npm ci.
- D35 is now committed separately at 416773a on deepseek/d35; not integrated here. Corrected task_plan.md's stale current-phase heading without claiming historical M2 acceptance closure.
- Recorded docs/handoffs/M4-codex-resumption.md. Found C14 contract gap: read-only newer-version export through the hook returns fresh defaults, not original saved data; repository export also omits the raw project index. Work order says stop/report missing API capabilities; requested authorization to take over the bounded hook/domain repair. No production files changed.
- Verification: lint pass; 749 tests / 73 files pass; typecheck + build pass (existing bundle warning). E2E initially blocked by sandbox localhost EPERM; approved retry: 20 passed, 1 skipped, 2 failed. Both failures pass on targeted one-worker rerun (render-quality reload and committed roof drag). Parallel suite stability is not established.
- Audit-only documentation; no UI screenshots, milestone completion, commits or merges. A documentation patch initially failed because it expected an absent heading; corrected without changing application files.

### M4 repair and C12 (2026-11-02)

- Owner asked to proceed after the protected-API repair proposal. Added exportSavedData on the hook; newer-version repository export preserves rawProject plus unreadable scenario rows. Regression test verifies verbatim original data, unchanged storage, and separate export of current unsaved edits.
- C12: scenario disclosure/list, metrics/status, keyboard navigation, rename errors, duplicate/create/delete/reset confirmations, and notes committed on blur. Native dialog shared with upcoming recovery UI.
- Targeted verification: repository/hook 18 tests pass; menu/hook 10 tests pass; typecheck and lint pass. Full suite and screenshots follow C13/C14.

### M4 C13 comparison (2026-11-02)

- Added comparison panel with pair selectors, neutral B − A metrics, envelope disclaimer, notes, Edit A/B and matched snapshots in the existing WebGL context. Capture restores the live scene even on failure; no second context or blank placeholder images.
- Targeted comparison/capture tests: 3 pass. Lint and typecheck pass. Fixed new test-only errors found by checks (RTL exact option and row accessible-name spacing).

### M4 C14 and UI handoff verification (2026-11-02)

- Added recovery strips and project export/import in Site and sources. Confirmation precedes import/discard; bad JSON and wrong-site files leave the project unchanged. Original newer-format data is exported separately from the temporary working project.
- Review caught and reproduced inactive rename reverting on session restore. A minimal hook correction applies the rename command to the parked session, preserving undo history; regression passes.
- Full suite initially found one old shell test depending on MassLayer being a direct Canvas child. Updated it to traverse the live scenario group without changing its drag/envelope assertions. Final lint, 766 tests (77 files), typecheck and build pass.
- Full existing browser suite: 22 passed, 1 opt-in evidence test skipped with one worker. No e2e source files modified. Browser verification in isolated storage confirms distinct matched thumbnails, switch/reload, corrupt recovery and original newer-format download with zero page errors. Six screenshots captured and viewed, including 1024/375 menu checks with no horizontal overflow.
- Report: docs/reviews/M4-codex-ui-review.md (self-review, not the independent M4 gate). Studio bundle 345.93 kB raw / 110.42 kB gzip; existing Three.js size/deprecation warnings remain.
- D35 integration, D36/D37, independent gate and ADR-0011 acceptance remain. No merge. Existing hook failure-reporting and camera-bookmark gaps are recorded for integration.

### M4 UI integration (2026-11-02)

- Codex built C12–C14 on `m4/ui` (3 commits); fast-forwarded into `main`. Independent review: `docs/reviews/M4-ui-independent-review.md` (no blockers; 2 majors, 6 minors fixed here).
- Fixes: thumbnail pending/failed states; `remove`/`resetDemo` hit storage first and throw on failure; wrong-site import guard in the repository; menu role and shortcut exemption; stale compare pair; plural.
- Verification: lint ✅ · typecheck ✅ · 770 unit tests ✅ · build ✅ · e2e 22 passed, 1 skipped.
- Next: D35 fixtures integration, D36/D37 (work order written), camera-bookmark decision, M4 gate.

### D35 integration (2026-11-02)

- DeepSeek's fixtures (`416773a`) cherry-picked onto `main` (only `agent-log.md` conflicted; both rows kept).
- Its test ran against the old reader, so 6 of 13 tests failed on the v2 code. Rewritten to use the production paths: v1 and v0 migrate to exactly `stepped-v2.expected.json`; every broken file is reported with its kind and path and skipped on load without a crash, kept verbatim; the index naming a missing scenario is repaired; export bundle round-trips through import and export; a legacy bundle still imports; a wrong-site bundle is refused and writes nothing.
- Fixture fix: D35's `export-bundle.json` was labelled format 2 but held format-1 scenarios. Kept as `export-bundle-legacy.json`; a true v2 bundle is generated from it by `generate-v2.ts` (through the real migration). README explains why `generate.ts` must not be re-run on current code.
- Verification: lint ✅ · typecheck ✅ · 779 unit tests ✅ · build ✅.
- Next: D36/D37 for DeepSeek (work order ready), camera-bookmark decision, M4 gate.
- Camera bookmarks deferred out of M4 by the owner (ADR-0011 §9); the unused optional `camera` field stays in format 2.
### D36–D37 M4 e2e and evidence (2026-11-02)

- New files: `e2e/m4-scenarios.spec.ts` (QA-09 distinct-after-reload with per-scenario undo, FR-046 immediate switch, QA-12 hand-calculated comparison, FR-083 Edit B, dialog Escape/focus restoration, no autosave write during a roof drag, duplicate/rename-collision/delete), `e2e/m4-recovery.spec.ts` (QA-14 corrupt record + raw export, newer-version read-only never-written, quota → Try again, storage-unavailable memory mode, FR-048 export → reset → import round trip, bad import), `e2e/m4-evidence.spec.ts` (opt-in 1440×900 screenshots), shared `e2e/m4-helpers.ts`.
- Storage is seeded through the page's real IndexedDB (`terraform`, tables `projects`/`scenarios`) at Dexie's native version 10 (store.ts `version(1)` is scaled ×10 by Dexie — opening at 1 throws VersionError or lets the app upgrade the seeded rows away). Corrupt/newer fixtures reuse D35's files; rows are read back byte-for-byte via raw IDB for the never-written assertions.
- Fixed while iterating: `<summary>Details</summary>` has no button role (locate via summary); a 3-storey 200 m² block shows `3 floors · Concept GFA 600 m²`; two spec files had swallowed closing braces from the editing channel (repaired so all 13 tests register); seed write pattern simplified to the proven put-only transaction.
- Verification so far: corrupt-record e2e green with the final seeds; the remaining specs and the evidence capture were interrupted mid-session by the local terminal failing (commands stopped being delivered). Re-run before the M4 gate: `npx playwright test --workers=1` and `SHOT_EVIDENCE=1 npx playwright test --workers=1 e2e/m4-evidence.spec.ts` (see `docs/reviews/M4-evidence.md` §8).

## 2026-11-03 — C7 / P4 My sites (Codex)
- Worktree `/Users/gustavekamanzi/Downloads/2026/Terraform-p4`, branch `m6/p4-my-sites`; read AGENTS/C7/P3 reports, ADR-0006, design contract and existing parsers/storage. Applied senior-developer and code-reviewer roles within C7 scope.
- Added versioned Dexie imports store and memory implementation, full package/summary validation, async save/read with explicit one-session fallback, My sites listing and confirmed site/scenario deletion. Reused the route loading fallback.
- Verification: final `npm run lint && npm run test && npm run build` passed; 86 files / 847 tests. `git diff --check` passed. No dependency changes.
- Failed attempts resolved: `python` executable absent (used python3); warning-code inference fixed with explicit return type; test query unsupported `exact` option removed; type-import lint violations fixed; mock returned from beforeEach treated as hook cleanup (changed to void); existing lazy route assertion exceeded 1 s under concurrent suite/build load (explicit 10 s wait).
- Browser blockers: preview binding 127.0.0.1:4173 failed EPERM. `npm run test:e2e` also blocked at server startup, binding 127.0.0.1:5173 EPERM. No live import/reload/delete or screenshots claimed.
- See `docs/reviews/P4-codex-report.md` for acceptance status, review and remaining verification.

- Commit attempt after passing checks: `git add ... && git commit -m "feat(import): persist imported sites and add My sites"` stopped at staging; cannot create `/Users/gustavekamanzi/Downloads/2026/Terraform/.git/worktrees/Terraform-p4/index.lock` (Operation not permitted). No commit created; changes remain in this worktree.

## 2026-11-03 — Integration on main (Claude)
- Merged locally into `main`: `m5/onboarding` (C18 guide), `deepseek/d39` (D39/D40 perf + a11y checks), `m6/p4-my-sites` (P3 find & frame + P4 My sites + fixes). Not pushed.
- Disk filled (ENOSPC) during `npm ci`; owner freed space. Cleanup had also deleted 108 tracked files from the working tree; restored the ones tests need (`src/features/import/__fixtures__/tiles/*.pbf`, `data/raw/*.osm`). Still deleted, left for the owner: 95 `docs/screenshots/*`, 8 `docs/design/ux-assessment/*` (restore with `git restore docs`).
- Integration fix `45a9c09`: two strict type errors in `e2e/m5-a11y.spec.ts` (from D39) broke `npm run build`'s `tsconfig.node.json` check.
- Verification on merged main: lint ✅ · 853 unit tests ✅ · build ✅ · e2e 55 passed, 4 skipped (fixme: studio h1, studio touch targets A11Y-2, opt-in evidence), 1 timed out under parallel load (`m3-rendering` quality test; passes 2/2 alone in ~20 s against the 30 s limit).
- Pending: DeepSeek D24 (import e2e) still uncommitted in `../Terraform-d24`, written against P3's sync session API — needs adapting to P4's async store when integrated. Production deploy awaits owner approval.

## 2026-11-04 — Microclimate pivot steps 1–3 (Claude)
- Plan: `docs/plans/microclimate-pivot.md`. ADR-0013 accepted: wind and road-noise *screening* layers; main path becomes address → study area → analysis; massing/scenarios demoted, not deleted.
- Added `src/features/analysis/{grid,noise,wind}.ts` (renderer-free) and `microclimate.test.ts` (12 hand-computed cases: 3.01 dB per doubling, +3.01 dB for two equal sources, −10 dB screening, exposure 1 / 0 / 0.857).
- Verification: new tests ✅ · lint ✅ · typecheck ✅. Full `npm run test` and `build` not yet re-run.
- Not wired into UI yet (step 4). Wind direction table not written yet.

### Microclimate pivot step 4 (2026-11-04, Claude)
- Added `climateView.ts` (cells → colours + legend shares), `scene/ClimateLayer.tsx` (one instanced ground overlay), `ClimatePanel.tsx` (Off/Wind/Noise, wind-from select, legend, claim label), wired into `StudioShell`, `Inspector` (new "Wind and noise" group) and `ViewportCanvas` (`climate` prop). Context buildings only; user-drawn masses are not yet obstacles.
- Deviation from plan: no built-in "typical wind direction" table — that would be invented climate data. The user picks the direction (default West) and the panel says so.
- Verification: lint ✅ · typecheck ✅ · 874 unit tests ✅ · browser on compact-infill: noise legend 32% / 68% in two bands, wind legend 63/13/16/8% for West wind, overlay visible in plan view. `npm run build` and e2e not re-run. A pre-existing dev-mode "unmount a root" console error appears on every fresh load.

### Microclimate pivot step 5 (2026-11-04, Claude)
- Studio now opens analysis-only: study-area facts (area, buildings, built footprint clipped to the boundary, coverage, tallest, mean height — `siteFacts.ts`, hand-computed tests), Wind and noise (open, Noise by default), Sun, Layers, Site. "Test a building" (top bar, remembered in `terraform:test-building:v1`) brings back the tools, design check, scenarios, Compare and the guide.
- Drawn masses are now obstacles for wind/noise and count in the area facts, so Test a building changes the readings.
- Landing and About rewritten for the new pitch; primary CTA "Try it" → `/new`. MySites focus fallback now targets the card link (`#sites a[href="/new"]`).
- Existing unit and e2e specs opt into the tools (StudioShell test beforeEach; Playwright storageState). New test covers the default.
- Verification: lint ✅ · typecheck ✅ · 879 unit tests ✅ · build ✅ · e2e massing/layers/m4-scenarios 14 passed · browser check at 1440×900. Full e2e suite not re-run; a saved mass from an earlier session still draws and counts in analysis mode.

### Wind W1 — live 2D flow in the studio (2026-11-06, Claude)
- Wind mode now runs the D2Q9 solver in a Web Worker (`flowRunner.ts` pure + `flowWorker.ts`, `useWindFlow.ts`): 128² grid, warm start on building edits (50 ms debounce), restart on direction change, idles after 6000 steps. Old ray-cast `wind.ts` removed.
- Ground overlay = speed-ratio bands (calm blue → red), `WindParticles.tsx` = 2500 advected comet segments (still arrows under reduced motion). Direction select replaced by a 15° range slider with arrow and `aria-valuetext`.
- Solver fix found on real sites: zero-gradient outlet let density climb (1.0 → 1.28) and stalled the flow. Outlet now pins density to 1; obstacles kept 3 cells off inlet/outlet. Floating inlet density was tried and blew up (NaN) — reverted.
- Verification: lint ✅ · 901 unit tests ✅ · build ✅ · browser on both curated sites (gap jet on Compact Infill, wake behind the cluster on Sloped Edge). e2e not re-run. Not done: speed slider (needs W2 comfort), adaptive particle count, GPU path.

### Wind W2 — comfort domain + activity view (2026-11-06, Claude + MiniMax)
- MiniMax X1 delivered `comfort.ts` (Lawson Norconsult thresholds, safety, downwash rule, Weibull exceedance, classifier) + tests; reviewed and accepted unchanged.
- UI: Speed / Activity toggle, reference wind at 10 m (2–15 m/s), downwash checkbox (applied in the worker via `downwashBoost`). Activity bands are labelled "at this wind only — not an annual comfort rating".
- Annual Lawson not shown: needs a measured wind rose per site; no invented climate data.
- Verification: lint ✅ · unit tests ✅ · build ✅ · browser on Sloped Edge (activity bands at 6 m/s). Downwash verified by unit test (no tall building on curated sites).

### Wind C20 — analysis circle (2026-11-06, Claude; Codex unavailable)
- Forma-style analysis circle: flow solved only around it (160² grid over 1.4 × r → ≈ 1.8 m cells at r = 100 m, vs ≈ 3 m for the whole site). Heatmap (4 m cells) and particles clipped to the circle; ring + centre tick on the terrain; radius slider 60–250 m; "Move circle" then click the ground, Esc cancels.
- Visibly sharper result on Compact Infill: jet through the western gap with swirls downstream.
- Verification: lint ✅ · unit tests ✅ · build ✅ · browser: place/move circle on Compact Infill. Edge fade not done (instanced colours have no per-cell alpha).

### Wind C21 + X3 — streamlines, baseline delta, validation (2026-11-06, Codex + MiniMax + Claude)
- Codex C21: `streamlines.ts` (deterministic RK2 tracing, importance-ranked) + `WindStreamlines.tsx`; Comfort/Direction tabs (Comfort default); Set/Clear baseline + Delta view with mismatch message. Codex could not run a dev server (sandbox EPERM).
- Claude fix: Codex hid the field after every edit (blank heatmap mid-drag). Now the live field always shows; only a fresh settled field can become the baseline. Worker requests throttled (≤ every 80 ms) instead of debounced so a continuous drag re-solves live.
- MiniMax X3: six canonical cases + stability in `wind-validation.test.ts`; `docs/research/wind-validation-note.md`. Case 2 (slab wake longer than block) not reproduced — documented 2D limit. Also `docs/research/forma-wind-notes.md` (X2).
- Verification: lint ✅ · 928 tests ✅ · build ✅ · browser: streamlines on Compact Infill (vortex in court, gap jet), baseline → Delta 100 % "No change". Delta after a geometry edit covered by unit tests only.

### Wind gate (2026-11-06, Claude)
- e2e: 53 pass / 4 skip / 3 fail before fixes. Failures were from the analysis-first pivot, not wind: smoke expected the old landing headline; m5-guide needs the test-building opt-in (the guide belongs to "Test a building"). m3-rendering passes alone (load flake). All three pass after the fix.
- Solver fix #2: zero-gradient side boundaries let a jet pour in sideways on small analysis-circle domains (Sloped Edge: 38 % of the circle > 1.3×, max 2.2×). Sides are now a uniform free stream; obstacles kept 3 cells off every edge → 1 % > 1.3×.
- Validation: cases 4 and 5 used tight domains (wind-tunnel blockage). Re-run with app-like margins; the gap now reads 0.87× (no channelling), consistent with passage-flow literature. Assertion and note revised honestly, not tuned.
- Browser: Sloped Edge comfort at 6 m/s plausible (strolling/walking open ground, standing in the lee). Baseline → 38 m tower drawn upwind → Delta shows windier shoulders and calm wake (18 % much calmer, 13 % much windier). Test tower deleted afterwards.
- lint ✅ · 928 tests ✅ · build ✅. Screenshots for the case study not yet captured.

### Wind C23 review + fixes (2026-11-06, Codex review, Claude fixes)
- Codex C23 failed the gate with 6 findings (stale baseline capture, downwash missing from baseline match, claim hidden with panel closed, no keyboard circle placement, large-site downwash backlog, particles escaping the circle). All fixed minimally; resolution table in `docs/reviews/wind-code-review.md`.
- Gate: lint ✅ · 941 tests ✅ · build ✅ · e2e 53/8 skipped, 2 load-only flakes pass alone, wind spec ✅.

### Wind W5b + W5c — Forma-style 3D look (2026-11-06, Codex + Claude)
- Codex C25 (W5b): slices on whenever Wind is on; worker posts only on change; Direction view is continuous m/s on a Forma-like ramp (white→blue→violet→magenta) with a bottom-centre ramp bar; smooth vertex-coloured wind heatmap (hard circle edge); roof colouring from the slice just above each roof; streamline height (3D / 2 / 10 / 20 / 35 m) and opacity controls, disabled until slices exist.
- Claude W5c: `streamlines3d.ts` — lines seeded upwind at 2–28 m, horizontal flow interpolated between slices, rise over buildings they can clear within 15 m (rule, labelled), go round taller ones, relax back down; rendered as one thick drei `Line` (blue→violet by speed).
- Browser (Compact Infill, W, Direction): streamlines arc over the blocks and curl into the courtyard, roofs coloured, ramp bar shown; height options enabled after ~60 s of background slice solving.
- lint ✅ · 972 tests ✅ · build ✅ · e2e wind/smoke/layers ✅. Known: roofs taller than the 35 m slice stay uncoloured; slice solve ~10 s per height.

### Wind C26 — faster height slices (2026-11-06, Codex + Claude)
- Codex: upper slices on an 80² coarse lattice, bilinear-upsampled to the fine frame; early stop on convergence (Δspeed < 2e-4 every 250 steps, MAX_STEPS cap); warm start from the slice below; progressive posting with `slicesComplete`. Codex hit its usage limit before the build/benchmark; Claude finished: `slicesComplete` optional (older fixtures), 3D streamline tests wait for the full stack, benchmark run.
- Claude UI: per-height availability in the streamline-height select, "Upper heights computing… n/4 ready", 3D lines from 2 slices on.
- Timing: Node 39 s → 9.3 s (2 m 7.0 s, 10 m 1.6 s, 20 m 0.6 s, 35 m 0.1 s). Browser: full stack 8.2 s (was ~60 s).
- lint ✅ · 976 tests ✅ · build ✅ · wind e2e ✅ · validation suite unchanged ✅.

### Wind finish session (2026-11-06, Claude, autonomous — owner away)
- Plan `docs/plans/wind-finish-plan.md`; report `docs/reviews/wind-session-report-2026-11-06.md`.
- Fixed: reduced-motion Play demo crash (negative first rAF time); e2e load flakes (`test.slow()`); tall-roof top slice; C23 test gaps; memoised analysis circle; halved 3D streamline segments.
- Measured: perf floor (software GL) off 13.8 / particles 14.0 / 3D 9.0 fps; 2 000-building stack 4.7 s, view 2.6 ms; direction sweep table (Sloped Edge low-rise 2D limit recorded).

### Wind sweep — worst case + exposure rose (2026-11-07, Codex + Claude; owner away)
- Owner asked for Forma's right-hand panel (direction + comfort, "where it's worst"). The new image didn't arrive; built from the earlier Forma screenshot. ADR-0015.
- Codex C27: 8-direction sweep worker/hook/summary (12.6 s Node). Claude: DirectionRose (keyboard wedges, worst outlined, click sets the dial), ShareBar (comfort shares), Worst case display + WorstArrows; particles/roofs hidden in Worst case.
- Tuning: 6 m/s threshold gave ≤ 1 % on the sheltered site → wedge = mean speed, worst = share ≥ 4 m/s then mean.
- Verified in the browser (rose S 180°, mean 1.4 m/s, 6 % ≥ 4 m/s; Enter on a wedge sets the dial); new e2e + evidence `wind-worst-case.png`.

### Bug hunt (2026-11-08, Claude + 3 review subagents)
- Baseline green: lint, typecheck, 1004 tests, build, e2e 55 passed.
- Fixed (with tests): no-op edits (zero-delta drag, "3.20" vs 3.2) cleared redo — structural no-op guard in `execute`; Finland time-zone box swallowed Norrland/Finnmark (Umeå, Luleå, Kiruna, Alta, Kirkenes got Helsinki time); save-error strip stuck after its scenario was deleted; unknown manifest time zone crashed the studio instead of failing validation; partial sweep map claimed "8 directions".
- Fixed (no unit test): /new search list reopened after picking a result, and stale results landed after abort; cancelling during the save step still saved the site.
- Open (not fixed): roof handle unusable in Top view; typed inspector value lost when a drag starts; notes draft lost on reload; failed Reset demo drops edits; re-import deletes unreadable rows; undo can duplicate scenario names; index-write failures hidden; Terrarium sea cells as land; border frames fail instead of falling back; 600 m import presets beyond orbit limit/fog; Cmd/Ctrl+Z not wired (matcher exists); draw clicks swallowed by masses; CameraRig keeps old fov.
- Follow-up (2026-11-09): fixed Top-view roof drag (horizontal plane, screen-up = metres), blur inspector before scene gestures, draw clicks pass through masses, ⌘/Ctrl+Z wired, notes draft committed on hide/pagehide, failed Reset demo re-queues edits, re-import keeps unreadable rows, newer-only records stay read-only, delete writes the index first (no swallowed failure), Terrarium sea → 0 m water, gappy Kartverket grid falls back to the next provider (never flat), fog/orbit/far scale for large imports, CameraRig fov falls back to 32°. Browser-verified: Top-view roof drag, ⌘Z/⇧⌘Z, typed Storeys kept on scene click. Left as a design call: rename is undoable, so undo can restore a name another scenario took.


### Studio v3 redesign — card layout + analysis dock (2026-11-10, Claude)
- Owner brief with two reference images (assembly-steps app layout, grey metric cards). ADR-0016; design contract §0a.
- Built: tokens (canvas, card, card-line, ink-unit, shadows, frost, rounded-panel, text-stat/eyebrow); top bar with centred pill toolbar (Select, Draw, Delete selected mass, Undo, Redo, accent Export); Parameters panel (Selected mass + mass list, Design check / Study area, Site, View, Notes); viewport Layers card, frosted compass bottom-centre, legend top-right; drei Grid floor (1 m / 10 m, ENU-aligned, 2 m below lowest terrain, no z-fighting) + fogged ground plane; outline selection; AnalysisDock (DRAW, SUN, WIND, NOISE, AREA; S/M/L; active card drives the climate layer) with values from `dockValues.ts`.
- Not wired (no real data): shadow hours on plot, façade dB, prevailing wind, multi-card notes, contact shadow — see ADR-0016.
- Tests: Inspector/ToolRail/StudioShell updated; new dockValues.test.ts (values from scenarioMetrics, computeNoise, sunState, Comfort legend), AnalysisDock.test.tsx, shell wiring test (Area card GFA = metrics panel).
- lint ✅ · 1031 tests (4 skipped) ✅ · build ✅. e2e not run: several specs use old names (Inspector, Layers and render quality, Sun summary) and need updating.
- Screenshots: docs/screenshots/studio-v3-before-{1440x900,1280x800,1920x1080}.png, studio-v3-after-{…}.png, studio-v3-after-wind-1440x900.png (scripts/capture-studio.mjs; no horizontal overflow at any size).
- Rev 2 (owner: too cramped): dock is summary cards + the active analysis's quick control (sun band, wind direction/speed, noise share bar); every other control moved to the Parameters panel's first group (340 px); quiet segmented/pill/range controls; two-layer grid (10 m fading, 1 m only close to the camera). lint ✅ · 1031 tests ✅ · build ✅. Screenshots: studio-v3-after-*, studio-v3-analysis-{wind,sun}-1440x900.png.
- e2e update (2026-11-10): new `e2e/studio-helpers.ts` (`parameters`, `openAnalysis`, `openGroup`); keyboard spec rewritten for the new visual order (top bar → toolbar → viewport → Parameters → dock); Sun/Wind/Area specs open their dock card; Inspector → Parameters; "Site and sources" → "Site". Real bugs found by e2e and fixed: unit grey after figures was 2.98:1 on the card fill (now `#828280`, 3.3:1); the scenario menu opened off-screen (x = −62) because it was right-anchored and its trigger moved left — now left-anchored and card-styled; Layers button named "Layers" (count hidden from the name); Streamlines checkbox target enlarged to 32 px; "All wind directions" region name restored.
- Deployed (2026-11-10): Vercel production, project terraform-studio, from branch studio-v3-redesign (fe2a461) via `vercel deploy --prod`. Live: https://terraform-studio-murex.vercel.app — studio loads with the new layout, no console errors.
- Deployed (2026-11-10): Vercel production from main (ae2d9bf) via `vercel deploy --prod` — studio layout: viewport to top with floating back pill, full-height Parameters panel, dock under viewport only. Live: https://terraform-studio-murex.vercel.app — verified at 1440×900, no console errors.

### Rendering spec Phases 1–2 (2026-11-10, Claude)
- Phase 1 (a4fc27c): RoomEnvironment PMREM as image-based fill, light rig rebalanced (ADR-0017). Kept Neutral tone mapping, MSAA and the white context model.
- Phase 2 (ADR-0018): Balanced gets half-res N8AO; Auto drops one tier when a 3 s window averages over 33 ms; AO switches off during mass drags and fades back over 300 ms. Selective bloom tried and removed (bleaches wind lines on a light scene).
- fps (M1 Pro, 1440×900, wind on): High 51, Balanced 60, Low 60. lint ✅ · 1035 tests ✅ · build ✅.

- Deployed (2026-11-10): Vercel production from main (0063654) via `vercel deploy --prod` — rendering spec Phases 1–2. Live: https://terraform-studio-murex.vercel.app — live bundles contain the half-res AO switch and environment light; compact-infill studio loads with no console errors.

### Rendering spec Phase 3 (2026-11-10, Claude)
- ADR-0019: View → Export visuals. "Image passes" saves 4K still (with AO), linear depth, white model and a transparent analysis overlay; "Record 6 s clip" saves WebM/MP4 of the live viewport. Reverses ADR-0012 for these passes only.
- Verified headless on M1 Pro: 4 × 3840×2498 PNGs + 3.4 MB WebM; Low tier exports too; viewport normal afterwards.



## C28 — 2026-11-10 — Codex
Executed `docs/handoffs/C28-simplify-studio.md` within its HARD RULE. Removed studio scenarios, comparison, guide, project JSON, planning checks/layers, facts/GFA and detailed block/render controls. Session-only blocks retain validated transactional editing and feed unchanged analysis/export. Full inventory and retained-module reasoning: `docs/reviews/C28-simplify-studio.md`.

Validation: lint and build pass; final full Vitest 97 files passed / 1 skipped, 898 tests passed / 4 skipped (24.68 s); Playwright discovery 58 tests in 14 files. Browser run failed before launch: Vite `listen EPERM 127.0.0.1:5173`; no screenshots produced. Initial unit run: obsolete Export assertion fixed; protected wind test timed out under concurrent check load then passed full reruns unchanged. Initial script/typecheck mistakes resolved, detailed in report. No commit/deploy. Parallel Claude page/styles/smoke edits and pre-existing screenshot deletions left untouched.

### Simplification — search-first landing + studio cuts (2026-11-10, Claude + Codex)
- Owner: keep the wow (3D site, sun, full wind incl. expert controls, noise, export, cameras, labels, minimal Add a block); cut the rest. ADR-0020; recovery tag `pre-simplify` (also captures the rendering-spec session's uncommitted export wiring, committed as found in 1cc150a).
- Claude: search-first landing (one screen, frosted search card, ready-made templates + city chips, lime/grey wash from the owner's references), `/new` reduced to the framing step and opened at the searched place (`?lat&lon&label`), `PlaceSearch` split out so the landing doesn't load maplibre (index 1.55 MB → 280 KB); old marketing components removed.
- Codex C28: studio cuts (scenarios, compare, guide, project JSON, design check, boundary/setback/height layers, facts/GFA, tiers/detail, render knobs); session-only minimal blocks; dead code + tests removed (report `docs/reviews/C28-simplify-studio.md`).
- Browser: landing search → framing at Karl Johans gate 1 → studio; Add a block → 12 storeys (38.4 m) → wind solves around it; export actions present.

### Sun analyses — ADR-0021 (2026-11-10, Claude)

Owner brief: `docs/plans/sun-analyses-deepseek-prompt.md`. All four phases were implemented in one
session because they share the shadow-ray core; each phase was tested before the next was wired.

- **Phase 1 — ground sun hours.** `shadowRay.ts` is the shared exact test: extruded footprints,
  first-crossing logic, sun-below-horizon handling, and a 20 m bounding-box grid walked with
  Amanatides–Woo so a ray only visits nearby cells. `sunHours.ts` samples the study area at 10 m,
  15-minute sun samples, bands 0–2 / 2–4 / 4–6 / 6–8 / 8+ h. `climateView` gained a `sun-hours`
  branch and `SunPanel` gained the labelled segmented control. Measured 21.9 ms on the compact site
  (456 cells, 137 buildings, 75 samples) — the spatial index cut 59 ms → 22 ms.
- **Phase 2 — roof solar.** `roofSolar.ts`: 2 m roof samples (centroid under 4 m²), 15th of each
  month at 30-minute steps, Meinel clear-sky DNI `1000 × 0.7^(AM^0.678)`, 10 % constant diffuse,
  monthly weights summing 365. Unshaded Oslo roof fixture = **915.9 kWh/m²·yr**. Exact site compute
  is ≈1.1 s, so `roofSolarWorker.ts` + `useRoofSolar.ts` run it off the main thread with a 250 ms
  debounce and a result cache. `RoofSolar.tsx` colours flat roof polygons; the optional readout uses
  20 % panel efficiency and 0.8 performance ratio and says so.
- **Phase 3 — façade sun hours.** `facadeSamples.ts` walks only user-mass exterior edges at 3 m,
  mid-storey heights every 3 m, 0.1 m outward with CCW outward normals. `facadeSun.ts` counts a
  sample when the sun is in front and the ray is clear; no self-skip, so another wing shades it.
  `FacadeSun.tsx` is one instanced quad mesh. Fixtures cover the summer ordering, the decisive
  midwinter north/south gap (0 h north, full day south) and the shaded inside corner of an L.
- **Phase 4 — VSC.** `vsc.ts` integrates the CIE overcast sky on a 5° hemisphere grid; the horizontal
  reference uses the full 360° sky. Unobstructed vertical façade = **39.6 %** for all orientations;
  a wall subtending ≈26.6° drops it clearly. Bands < 15 / 15–27 / 27 %+. 196 samples compute in
  ≈21 ms. The first run returned 1425 % because the horizontal reference was missing a 2π azimuth
  factor; the 39.6 % fixture caught it immediately.

Claim wording is exact in the dock and panel:
`Indicative sun hours — geometric, clear sky, buildings only. Not a daylight assessment.`,
`Indicative clear-sky irradiation — upper bound, no weather or cloud data. Not a yield estimate.` and
`Indicative Vertical Sky Component — early massing screening, not a daylight assessment.`

Evidence: `docs/screenshots/sun-{hours,roof-solar,facade,vsc}-{compact-infill,sloped-edge}-1440x900.png`
(8 images, 1440×900, isometric, façade/VSC views zoomed to the drawn block). Capture script:
`scripts/capture-sun.mjs`.

Gate: `npm run lint` ✅ · `npm run test` **936 passed / 4 skipped** (104 files, 1 skipped) ✅ ·
`npm run build` ✅. No new dependency. No wind, noise or export behaviour changed.

Limitations carried, not fixed: terrain does not cast shade (sloped sites read sunny), trees are
ignored, clear sky only, roofs are flat, façade/VSC sample user masses only, VSC is not a daylight
factor or a BRE check. Embodied carbon was not attempted: there is no material data, so any number
would be invented.

Open: roof solar is the only worker; façade/VSC stay on the main thread and would need the same
worker treatment if a scenario ever draws many blocks. The captured façade/VSC views deliberately
zoom in because the quads are small at the default site camera.


## 2026-11-10 — Sun analyses review fixes
- Roof solar: Meinel solar constant corrected to 1353 W/m²; fixture 1239.3 kWh/m²·yr; bands 0–300…1200+.
- Sun hours: bands are now shares of the day's possible sun, so 21 June no longer paints one colour.
- Sun panel note: "Not a daylight assessment" (was also denying sun hours).
- `npm run lint`, `npm run test` (936 passed / 4 skipped), `npm run build` pass. Browser: compact site 21 Jun spreads across bands, no console errors.
- Not done: the `sun-hours-*` and `sun-roof-solar-*` screenshots still show the old bands; rerun `scripts/capture-sun.mjs`.
- Deployed (2026-11-10): Vercel production from main (7a84ab5) via `vercel deploy --prod` — sun analyses (ADR-0021). Live: https://terraform-studio-murex.vercel.app — compact-infill Sun → Roof solar runs in the worker and colours roofs, no console errors. Imported-site links are per-browser (local storage), so they can't be checked from another browser.

## 2026-11-10 — Measured roof shapes (ADR-0022)
- Import now downloads Kartverket's surface model (DOM) for the frame and fits each building: gabled, flat, complex (flat at measured height) or not measured. Heights of measured buildings are now measured too.
- First fit called low gables "flat" and rejected roofs with dormers; reordered (gable first) and relaxed the fit share 0.6 → 0.7 after dumping stats from a real Grünerløkka import (84 → 105 pitched).
- Stray fan-shaped edge lines on one frame-edge building were checked against production: they predate this work (clipped footprint), not fixed here.
- `npm run lint`, `npm run test` (955 passed / 4 skipped), `npm run build` pass. Real imports captured with `scripts/capture-roofs.mjs` (Grünerløkka, Kampen).
- Not done: demo sites (immutable packages), pitched-roof-aware analyses, hipped/mansard shapes. Not deployed.

## 2026-11-10 — Wind on steep sites
- Reproduced on a dense Bergen hillside (42 m relief in the circle): roof wind colours floated metres off the roofs.
- Fix: roof overlays (wind, solar) use the building's own `baseElevation`; drawn masses still use terrain at the centroid.
- Fix: `sampleTerrainHeight` follows the same two triangles per cell as the drawn terrain, so heatmaps, particles, roads and trees sit on the surface on twisted cells.
- Not fixed, by design: the solver does not model terrain-driven flow (ADR-0014). Added a "Steep site" note in the wind panel when the circle's relief is 10 m or more.
- `npm run lint`, `npm run test` (960 passed / 4 skipped), `npm run build` pass. Evidence: `docs/screenshots/wind-slope-roofs-{before,after}-1440x900.png`.
- Deployed (2026-11-10): Vercel production from main (72acce6) via `vercel deploy --prod` — measured roofs (ADR-0022) and the slope fixes. Live: https://terraform-studio-murex.vercel.app — real imports of Grünerløkka (105 pitched / 53 flat / 42 other / 2 unmeasured) and Kampen (106 / 57 / 45 / 0) run from the production origin, so the Kartverket surface download works there.

## 2026-11-10 — Ground colours up to the building footprints
- Wind heatmap, noise and sun hours left a ragged empty strip along walls. One shared draped surface now covers each sample's whole cell with averaged corner colours, and fills the nearest missing cells under buildings from their measured neighbours.
- Noise and sun hours are no longer flat 10 m squares: they drape on the terrain and blend between cells.
- Numbers, legends and shares are unchanged (display only). With the Context buildings layer off, a one- to two-cell fringe of filled colour is visible inside footprints.
- `npm run lint`, `npm run test`, `npm run build` pass. Evidence: `docs/screenshots/ground-edge-*`.
- Deployed (2026-11-10): Vercel production from main (3af201f) via `vercel deploy --prod` — ground overlays reach the footprints. Live: https://terraform-studio-murex.vercel.app — Bergen (Bryggen) import, wind Direction view: no gap along the walls.

## 2026-11-10 — Wind trails
- Particles were 2,500 straight dashes sampling the nearest flow cell. Now up to 4,000 trails, each a 16-point ribbon (about 1 s of travel), carried with interpolated velocity and midpoint steps so they curve round buildings; tails fade out and retract instead of popping.
- Trails fly 2 m above the ground (was 1.5 m) and keep a constant width on screen; fewer are shown when zoomed out so they never merge into a wash.
- Budget: the trail update's own time is measured; over 3 ms per frame it sheds a quarter of the trails (floor 1,200), and adds them back only with headroom.
- First attempt used GL lines and a whole-frame guard: lines were too faint at 2× DPR and the guard stripped trails whenever the scene itself was slow. Both replaced.
- Measured (M1 Pro, headed): about +1 ms per frame at 1×, +0.5 ms at 2×. `npm run lint`, `npm run test`, `npm run build` pass.
- Not checked: the reduced-motion still trails were not viewed in a browser (the studio shows streamlines in that mode).
- Deployed (2026-11-10): Vercel production from main (cc6d68e) via `vercel deploy --prod` — wind ribbon trails. Live: https://terraform-studio-murex.vercel.app — Bergen (Bryggen) import, wind Direction view at 2× DPR: trails curve round the buildings; 25.3–25.7 ms per frame (24.6–25.0 ms with the old particles).

## 2026-11-11 — GIS data audit and fixes
- Read-only audit of the four context layers on both data paths. Provenance held up: the cached OSM extracts match `data/raw/SHA256SUMS`, and Kartverket's live elevation service returns the exact origin elevation the packages publish. Coverage did not: two large multipolygons were silently dropped, pedestrian areas and rivers-as-lines were missing on both paths, and the import path labelled urban parks as grass.
- **Curated packages.** The sloped-edge wood (`Ekebergskogen`) and recreation ground (`Ekebergsletta`) were missing because one outer member way lies outside the bbox extract; the builder now fetches those ways separately and caches them in `data/raw/sloped-edge-ways.xml`. Land cover for that site went from 9,331.9 m² (9.5 % of the terrain extent) to 73,100.6 m² (74.4 %). A covered passage through a building is kept as a street, roads split at a missing node instead of joining across the gap, and the builder prints every land cover feature it drops with the reason.
- **Import path.** Pedestrian areas and plazas now draw as paved ground tints, rivers and streams mapped as lines draw as water ribbons, the OpenMapTiles `path` class gets its own width per subclass (pedestrian 5 m, footway 2.5 m, steps 2 m) instead of a flat 2.5 m, and urban parks are read from the land cover subclass while protected areas get their own `nature` kind. The Overpass tree query now POSTs, retries with a backoff and fails over between planet instances inside a 15 s budget.
- **Truthfulness.** The curated `attribution.md` is now linked from the inspector, user imports no longer advertise asset files they do not have, and the manifest's thumbnail and attribution paths are optional.
- **Evidence.** `npm run lint`, `npm run test` (978 passed / 4 skipped) and `npm run build` pass. `python3 scripts/test_build_site_packages.py` now checks the shipped packages against the cached extracts, and the import test asserts exact road and land cover counts.
- **Not done.** NVDB as a road source: it is the only candidate that clears the browser-without-a-key bar, but it is a new source and needs an ADR and a product decision.

## 2026-11-11 — Data check and bug review
- **Data check.** Both curated packages and the import path take roads, trees, water and greenery from OpenStreetMap; Kartverket supplies terrain (DTM1), surface heights for roofs (DOM) and address search only. Compact Infill: 137 roads, 128 trees, one park (8,351 m²), one pond (61 m²), 8 flowerbeds. Sloped Edge: 33 roads, 122 trees, 2 woods (3,348 m²), one park (61,353 m²), one grass area (8,400 m²), no water. Every layer was confirmed on screen by toggling it off and on in plan view.
- **Land cover toggle did nothing.** Turning it off left the green and blue tint on screen: three.js compiles the texture into the shader, and removing `map` from a live material does not recompile it. The terrain material now gets a new key per state. New e2e test fails without the fix and passes with it.
- **Import fixes.** A building over 200 m or with more than 200 outline points failed the whole import (now clamped and coarsened). The 3,000-tree cap kept the first 3,000 in scan order, leaving the east of a forest bare (now thins evenly). One-float-step rounding split roads and stream ribbons inside the frame (1,122 of 2,000 random segments; Grünerløkka now 135 roads instead of 162, Bjørvika 162 instead of 180). A tile class named `constructor` passed as a width. An Overpass timeout remark read as "no trees here".
- **Analysis fixes.** A street split into several ways counted once per piece (+3 dB at splits); pieces joined end to end with under 35° turn now form one source, while separate streets and side streets still add. Roof area under a taller block was averaged in as fully shaded roof and double-counted in m² and kWh; it is now left out. Tiers of one block measured height from different ground levels on slopes; each block now uses one ground level, and façade squares are drawn from it.
- **Scene and UI fixes.** 4K export dropped back to screen resolution if the canvas re-rendered during capture (now re-raised before capturing). Façade overlay vanished after moving a block (stale culling sphere). Block rise animation hovered on low ground. `F` swallowed Cmd/Ctrl+F. "Move circle" kept capturing keys and clicks after leaving the Wind card. Image passes locked forever with no 3D canvas. `/about#data` links did not scroll. Enter on a wind rose wedge also committed a half-drawn block.
- **Evidence.** `npm run lint`, `npm run test` (989 passed / 4 skipped) and `npm run build` pass. Playwright layers, keyboard, sun analysis, massing, smoke and studio specs: 19 passed; the landing smoke test timed out once under parallel load and passed when re-run alone.
- **Not verified live.** The 4K export fix and the façade height fix are confirmed by unit tests and reading only, not by an export run or a sloped-site screenshot.
- **Open.** Six Compact Infill trees sit inside building footprints (OSM data; 0–1.5 m from a wall). Import title stays the searched place name after the map is dragged elsewhere. Saved imports cannot be listed or deleted. Frames in Estonia/St Petersburg get the Oslo time zone. `constraints.ts` skips the outside-boundary check without a setback (not used by the app). `/#sites` points at an id that no longer exists (harmless). White-model export may draw line layers black (unconfirmed).
- Deployed (2026-11-11): Vercel production from main (31f9e2d) via `vercel deploy --prod` — data audit and bug fixes. Live: https://terraform-studio-murex.vercel.app — both curated sites in plan view: Land cover, Streets and Trees each change the view when toggled, Land cover off removes the tint, no page errors; `/sites/compact-infill/attribution.md` returns 200.
- Deployed (2026-11-11): Vercel production from main (6b14e6e) via `vercel deploy --prod` — darker roads (`#ADAAA3`). Live: https://terraform-studio-murex.vercel.app — both curated sites in plan view: streets and park paths clearly visible, no page errors.
- Deployed (2026-11-11): Vercel production from main (30cb019) via `vercel deploy --prod` — roads `#C1BEB7`, half the on-screen contrast of `#ADAAA3`. Live: https://terraform-studio-murex.vercel.app — Compact Infill plan view: road 225 vs ground 247 (was 202 vs 247), no page errors.
