# Task Plan — Terraform v1

## Goal

Ship Terraform v1: a credible, interactive architectural site-planning portfolio prototype with two curated Oslo sites, conceptual massing, truthful geometry-derived analysis, scenario comparison and a polished case study.

## Current Phase

**M4 — UI implemented; integration and gate next.** C12–C14 are on `m4/ui`; see `docs/reviews/M4-codex-ui-review.md` for evidence and remaining work. Historical M2 acceptance checkboxes below have not been independently reconciled.

## Phases

### Phase 0 — Setup and governance

- [x] Audit repository and 90-skill library
- [x] Define agent operating model and roster
- [x] Initialise git and scaffold Vite/React/TypeScript
- [x] Pin dependencies and lockfile
- [x] Write ADR-0001 (stack), ADR-0002 (coordinates), ADR-0003 (state/persistence)
- [x] Write milestone briefs M0–M6
- [x] Write design contract, site package spec, QA fixtures
- [x] Create persistent planning files
- **Status:** complete

### Phase 1 — M0 Foundation

- [x] Routing, tokens, typography, Tailwind entry
- [x] Landing, About, 404
- [x] Studio shell, tool rail, inspector, responsive drawer
- [x] R3F canvas, ground/grid/lighting/orbit, WebGL fallback
- [x] Coordinate utilities + tests
- [x] Vitest/RTL/Playwright configuration
- [x] Chromium smoke path passing
- [x] Reference screenshots at 1440×900, 1280×800, 1920×1080 and 390×844
- [x] `ux-architect` layout/CSS review
- [x] `ui-designer` token/component review
- [x] Review findings applied (fabricated control removed, drawer hardened, chrome condensed, hero/grid/thumbnail polish)
- [x] `code-reviewer` gate — pass with follow-ups
- [x] `ui-finish-gate-reviewer` visual gate — pass with follow-ups
- **Status:** complete

### Phase 2 — M1 Site packages and camera

- [x] Licence and provenance record (OSM ODbL 1.0, Kartverket CC BY 4.0)
- [x] Offline preprocessing pipeline with cached raw sources
- [x] Two packages + manifest/statistics/topology validation
- [x] Terrain/context/study-boundary layers with working toggles
- [x] Camera presets, compass, scale, layer legend
- [x] Performance trace and budget (60.1 fps at 1440×900 on Metal)
- [x] `gis-qa-engineer` geometry QA — pass with follow-ups
- [x] `code-reviewer` gate — pass with follow-ups
- **Status:** complete

### Phase 3 — M2 Massing engine

- [x] Immutable domain model and fixtures
- [ ] Add/draw/transform/storeys/tiers
- [ ] Numeric inspector and validation (domain done; UI pending)
- [x] Undo/redo transactions
- [x] QA-03–08 (code review pass with follow-ups, `docs/reviews/M2-code-review.md`; acceptance open)
- [x] Scene look (ADR-0005): white-model palette, fitted shadows, AO, contours, storey bands, OSM streets/trees — owner request, landed beside M2
- **Status:** in_progress

### Phase 4 — M3 Live analysis

- [x] Areas, volume, coverage (ADR-0007 floor-level GFA)
- [x] Solar + shadows + DST (time controls, night state, quality profiles)
- [x] Demo constraints and warnings (ADR-0008 height reference)
- [x] Independent sun reference (NREL SPA + NOAA oracle)
- [x] QA-06/10/11/15
- **Status:** complete — owner sign-off 2026-10-29 (`docs/reviews/M3-code-review.md`)

### Phase 5 — M4 Scenarios and comparison

- [x] Domain CRUD, autosave, migrations and studio hook
- [x] C12 scenario menu and notes
- [x] C14 recovery and backup UI (raw-export API repaired)
- [x] C13 matched-camera comparison
- [ ] QA-09/12/14
- **Status:** in_progress — C12–C14 implemented and locally verified; D35 integration, D36/D37 and independent review gate pending

### Phase 6 — M5 Portfolio polish

- [ ] ~~PNG export~~ (dropped, ADR-0012), onboarding, states
- [ ] Accessibility and performance passes
- [ ] Deployment and case study
- [ ] Final visual/code gates
- **Status:** pending

### Phase 7 — M6 Optional

- [ ] Separate gate after M5
- **Status:** pending

## Key questions

1. Which curated Oslo morphology will each package represent, and is the source licence unambiguous?
2. Does the terrain representation need a heightfield or a mesh for the stepped-site demo?
3. Which polygon clipping library survives the M2 benchmark for union/difference?
4. What independent solar reference is authoritative enough for the M3 fixture?
5. Which static host best supports a clean HTTPS portfolio deployment with no secrets?
6. ~~Locked volumes: enforce in commands or only in UI?~~ **Decided:** enforced in commands (ADR-0004 §3 amendment).
7. Max-height reference: top elevation relative to site origin vs grade level for the demo limit? (M3 / PRD FR-073)
8. Floor-level GFA: count overlapping tiers floor by floor before FR-051? (ADR-0004 revisit trigger)

## Decisions made

| Decision | Rationale |
|---|---|
| Curated static site packages, no live GIS | Reliable demo; PRD §9 |
| Local ENU metres, Y-up renderer mapping | Precision, testability; ADR-0002 |
| Zustand for UI state; command layer for document | Separate transient from durable; ADR-0003 |
| Studio route lazy-loaded | Keeps landing at ~91 kB gzip instead of loading Three.js |
| TypeScript 6.0.3, not 7 | `typescript-eslint` 8.72 supports `<6.1.0` |
| AI excluded until M6 | PRD non-goal for v1 |
| Static Concept A chip in M0 | Avoid fabricated scenario switching before M4 |
| 1100 px drawer breakpoint | Matches the design contract; canvas stays dominant |
| OSM ODbL + Kartverket CC BY 4.0 packages | Openly licensed, real context and terrain; static and offline |
| Local tangent-plane projection, NN2000 vertical datum | Accurate metric editing with provenance; ADR-0002 |
| One merged context mesh + 13 × 13 terrain | ~5 draw calls, 60 fps; sufficient for conceptual massing |

## Errors encountered

| Error | Attempt | Resolution |
|---|---|---|
| `npm create vite` hung on an interactive prompt | 1 | Killed process; scaffolded manually with pinned versions |
| Vitest DOM leaked between tests | 1 | Added explicit `cleanup()` in `src/test/setup.ts` |
| Lazy studio route made a synchronous test fail | 1 | Switched the unknown-site assertion to `findByRole` |
| Studio chunk >500 kB warning | 1 | Accepted for M0; route is lazy-loaded; vendor splitting scheduled for M1 |
| E2E asserted old milestone copy after the UI copy change | 1 | Updated the smoke test to the product-facing empty-state heading |
| Full-screen empty-state overlay blocked canvas pointer events | 1 | Added `pointer-events-none` to the overlay; card keeps `pointer-events-auto` |
| Python framework TLS failed against the elevation API | 1 | Use `certifi` explicitly for preprocessing requests |
| 12 simplified OSM footprints self-intersected | 1 | Added ring repair/validation in the pipeline and loader; QA re-check is clean |
| Old slope bbox included the Ekeberg cliff (−91 m relief) | 1 | Moved to a 31 m-relief hillside study area with 33 context buildings |

## Next actions

### C1 — Land cover work order (2026-10-28)

- [x] Read C1, AGENTS, ADR-0005 §5, package spec and roads/trees precedent.
- [x] Add offline polygon extraction, clipping/joining and builder fixtures.
- [x] Add optional manifest path, validated loader/types and tests.
- [x] Rebuild offline, verify protected bytes, run Python/lint/test/build and report.
- Scope: data/loading only; no rendering, dependencies, network or commit.
- Result: Compact 10 areas (water 1 / park 1 / grass 8 / wood 0); Sloped 2
  (water 0 / park 0 / grass 1 / wood 1). Python checks, lint, 269 tests and build pass.
  All 10 protected files match baseline and HEAD; second offline rebuild is deterministic.
- Resolved error: nested f-string in count logging failed on local Python; extracted
  the count string and reran successfully. Detailed evidence is in `progress.md`.

1. Write the M2 domain model and command contracts with `engineering-software-architect`.
2. Implement and test `MassVolume`, footprint creation, storeys, tiers and validation before touching gizmos.
3. Add the numeric inspector and transactional undo/redo; keep one drag = one history entry.
4. Carry M1 follow-ups: terrain resolution if needed, aspect-aware mobile framing, compass near eye level.
5. Preserve the generated site packages as immutable; massing never mutates context or terrain.

## P4 My sites — 2026-11-03
- [x] Read C7/P3 handoffs, storage/parser contracts and ADR-0006.
- [x] Implement separate imports database, validated reads, async routes and My sites deletion.
- [x] Complete regression tests and code review: lint, 847 tests, build pass.
- [ ] Production-preview persistence check/screenshots blocked by sandbox socket EPERM.
- [x] Write P4 report and session logs.
- [ ] Commit blocked: sandbox denies parent checkout worktree index.lock. No push, merge or deployment.


## C28 studio simplification — 2026-11-10
- [x] Read handoff/HARD RULE, ADR-0020 and simplify plan; identify protected/shared files.
- [x] Remove scenario/planning UI; retain analysis/export and implement session-only minimal blocks.
- [x] Remove dead components/commands/tests and update remaining unit/e2e coverage.
- [x] Lint, 898 unit tests, production build and source review pass; report file inventory.
- [ ] Browser execution and fixed-camera screenshots: Vite listen EPERM in sandbox.
- No commit. Report: `docs/reviews/C28-simplify-studio.md`.

## Sun analyses — ADR-0021 (2026-11-10)

- [x] Shared exact shadow ray + 20 m spatial index (`shadowRay.ts`)
- [x] Ground sun hours at 10 m for the selected date, with bands and disclaimer
- [x] Clear-sky annual roof solar at 2 m, run in `roofSolarWorker.ts`
- [x] Façade sun hours on user-drawn blocks (3 m edges, 3 m heights)
- [x] VSC on user-drawn blocks (5° CIE overcast grid, 39.6 % fixture)
- [x] Segmented control in the Sun card; ground/roof/façade scene layers
- [x] Unit/UI tests, exact claim wording, ADR, agent log, progress log
- [x] 8 screenshots at 1440×900 for both sites (`docs/screenshots/sun-*`)
- **Status:** complete — lint, 936 tests, build pass; no new dependency
- **Known limitations:** terrain and trees do not shade; clear sky only; flat roofs; façade/VSC cover
  user masses only. Embodied carbon excluded until material data exists.


## GIS data audit and fixes — 2026-11-11

- [x] Read-only audit of roads, trees, water and greenery on the curated and import paths, with counts computed from the shipped JSON and the recorded tiles.
- [x] Close a multipolygon whose outer ring leaves the extract (sloped-edge forest and recreation ground) by caching the missing member ways.
- [x] Keep covered passages as streets; split roads at missing nodes rather than joining across the gap.
- [x] Draw waterway lines and pedestrian areas as ground tints; correct the park/protected-area labels; width the `path` class per subclass.
- [x] Make the curated attribution file reachable; drop asset paths user imports do not have.
- [x] Add a Land cover layer toggle; keep the legend in step.
- [x] Replace loose assertions with exact counts in the import and builder tests.
- [x] `npm run lint`, `npm run test` (978 passed / 4 skipped), `npm run build` and the builder self-checks pass.
- [ ] NVDB as the road source — needs an ADR and a product decision, not a bug fix.

## Data check and bug review — 2026-11-11

- [x] Confirm each ground layer reaches the screen on both sites; fix the Land cover toggle (e2e test added).
- [x] Four read-only reviews (analysis, data/persistence, scene/editor, app/UI): 22 candidates.
- [x] Fix 15 confirmed bugs with tests; `npm run lint`, `npm run test` (989 / 4 skipped), `npm run build` pass.
- [ ] Verify the 4K export and sloped-site façade fixes in a browser.
- [ ] Open items: stale import title, no saved-sites list, Baltic time zone, constraints outside-boundary check, trees inside footprints.

## Context fidelity work order — 2026-11-11

Implemented: tree placement and vegetation (ADR-0023).

- [x] Establish what Hektar loads: Mapbox composite tiles, per-part building extrusion, OSM trees
      with a size, wider scene. Evidence: `docs/research/hektar-underlay.md`.
- [x] Measure our own gap: no building relations or parts in the curated builder, too few mapped
      trees and no tree rows, OpenMapTiles `building` capped at z14 with no `building_part` layer.
- [x] Find and verify Norwegian sources: Oslo Bymiljøetaten tree inventory (51 measured trees in the
      Compact Infill bbox), Oslo park outlines, Kartverket DTM1/DOM (already in use).
- [x] Write the phased plan with owner decisions: `docs/plans/context-fidelity-plan.md`.
- [x] **Owner decision:** keep the tree objects as they are; improve placement and vegetation only.
      `trees.json` stays `schemaVersion 1`.
- [x] A — placement: 200 m context halo, `natural=tree_row` rows at 8 m, 128 → 926 trees on
      Compact Infill; nothing invented where OSM has no tree.
- [x] Vegetation: twelve land-cover kinds on both paths; the greenery the tiles already carried is
      mapped instead of dropped; 10 → 58 land-cover areas on Compact Infill.
- [x] Context: the `buildings[:220]` ceiling no longer discards real footprints (137 → 520
      buildings); the terrain grid scales with the extent (13 × 13 → 40 × 47).
- [x] Roof solar is scoped to the site, so the neighbourhood does not enter the site's yield.
- [x] Low render tier draws one lump per tree, so a software rasteriser can still show the scene.
- [x] The density cost is fixed: the road-noise screening used a linear scan over all 520 context
      buildings for every cell and street (1021 ms per pass). A uniform-grid building index
      (`indexBuildings`, ADR-0023 §8) returns the same candidate set in 145 ms, and the studio's
      Undo click fell from 4976 ms to 1774 ms. Unit-tested against a linear scan.
- [x] The D34 claim audit is consistent again: the e2e sweep expected the pre-ADR-0021 sun note and
      banned the phrase "sun hours", which ADR-0021 deliberately introduced. It now checks the
      ADR-0021 wording and allows only the sanctioned mode label and note.
- [x] `npm run lint`, `npm run test` (992 / 4 skipped), `npm run build` and the builder self-checks
      pass; the site packages were regenerated deterministically.
- [ ] B1–B2 — building relations and `building:part` in the curated builder (Phase B, next).
- [ ] B4 — Overpass buildings on the import path, so imports carry roof parts too.
- [ ] A6 — tree shadows, which changes the ADR-0021 limitation wording.
- [ ] F — visual gate and reference screenshots for the new density.


## Water as a surface — 2026-11-12

Implemented: water is a surface, not a tint on the terrain (ADR-0025).

- [x] Diagnose the report against live data, not from the screenshot: the terrain-tint renderer and
      the import path's river-surface samples were both confirmed to be causes.
- [x] Water level per outline vertex, smoothed over a plan window that reaches across the body and
      along it; the estimator was chosen by measuring four candidates on real data.
- [x] The ground inside the mapped outline is cut down to the water surface; the ground outside is
      untouched, and the streets keep the package terrain so a crossing street bridges the cut.
- [x] Import path: `høydekurver` samples are `river`, their height is not used, their cells are
      filled from the banks, and they no longer count against the 5 % land-estimate cap.
- [x] The curated packages stay byte-identical — the rule is applied when the studio loads a package.
- [x] Unit tests: `src/features/sites/waterSurface.test.ts` (11),
      `src/features/sites/waterSurfaceShipped.test.ts` (3, over the shipped package),
      `src/scene/waterGeometry.test.ts` (3), plus the import-path cases.
- [x] `npm run lint`, `npm run test` (1026 / 4 skipped), `npm run build` pass.
- [x] Evidence screenshots at a fixed camera: `docs/screenshots/water-*.png`, captured by
      `scripts/capture-water.mjs`.
- [ ] The `engineering-code-reviewer` pass over the change.
- [ ] The `design-ui-finish-gate-reviewer` pass over the water screenshots.

## One card per analysis in the panel — 2026-11-13

Implemented: the analysis cards moved from the bottom dock into the Parameters panel (ADR-0026).

- [x] One card per analysis in the Parameters panel: Sun, Wind, Noise (`AnalysisCards.tsx`), each with
      its figure, its claim and its controls.
- [x] The open card is the analysis on the map: opening a card turns its layer on, closing it turns
      the layer off. One climate layer at a time, as ADR-0016 had it.
- [x] The bottom dock is gone; the viewport takes the height. The dock's "Blocks" card became the
      Selected block group (count in the header, draw hint and button in the body).
- [x] The dock's claim ("Indicative screening — not planning advice") moved above the cards; a closed
      card states its claim, an open card states it in its controls, so no claim is printed twice.
- [x] Back in the studio: an imported site returns to `/new?lat&lon&label&size` — the same place, the
      same frame size (recovered from the study area), the same title. A curated site still returns to
      the site list.
- [x] "Open in 3D" shows a determinate progress bar above the six import steps.
- [x] `dockValues.ts` → `analysisValues.ts`, `DockStat` → `AnalysisStat`.
- [x] Unit tests: `AnalysisCards.test.tsx` (3), `StudioShell.test.tsx` (back link, cards), `framing.test.ts`
      (frame size), `NewSitePage.test.tsx` (progress bar, frame size).
- [x] e2e and capture scripts updated to the card layout.
- [x] `npm run lint`, `npm run test` (1031 / 4 skipped) and `npm run build` pass.
- [x] Evidence screenshots: `docs/screenshots/panel-*.png`, captured by `scripts/capture-panel.mjs`.
- [ ] The `engineering-code-reviewer` and `design-ui-finish-gate-reviewer` passes over the change.


## The water's geometry on the import path — 2026-11-13

Implemented: the import reads the water outlines and the mapped trees from OpenStreetMap's own
geometry, and a river is recognised as a river (ADR-0027).

- [x] The river rule ADR-0025 introduced now runs: a sample is a river when the answer says
      `terreng: "Elv"` or when the source is an elevation curve under either spelling
      (`høydekurver`, `hoydekurver` — Kartverket's answers use the ASCII one, so the ø spelling
      never matched and every imported river was a 16–20 m wall of ground).
- [x] One OpenStreetMap request per frame (`api/0.6/map?bbox=…`) answers for the water outlines
      and the mapped trees; the Overpass tree source is removed.
- [x] The mapped water: closed ways that map a surface, relations that map a body, and the centre
      lines of the watercourses that have no area. A centre line that runs inside a mapped area
      is not drawn a second time.
- [x] The generalised map-tile outline stays as the fallback, with the `water-coarse` warning; a
      rate-limited answer is repeated once after a pause.
- [x] Unit tests: the OSM reader (5), the water (6), the trees (7), the river classification, the
      import wiring and the tile fallback.
- [x] `npm run lint`, `npm run test` (1044 passed / 4 skipped) and `npm run build` pass.
- [x] Evidence: `docs/screenshots/water-import-bakklandet-1440x900.png` and
      `docs/screenshots/water-import-bakklandet-low-1440x900.png` — the river reads as a
      meandering channel with banks; `docs/decisions/ADR-0027-osm-water-geometry.md`;
      `docs/reviews/water-geometry-review.md`.
- [x] The curated packages are byte-identical: the rule is applied when the studio loads a package.
- [ ] The `engineering-code-reviewer` and `design-ui-finish-gate-reviewer` passes over the change.
