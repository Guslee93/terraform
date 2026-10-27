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
