# Findings and decisions

## Requirements

- Two curated Oslo demonstration sites; no live GIS at runtime.
- Conceptual massing with footprints, storeys, tiers, numeric editing and undo/redo.
- Geometry-derived GFA, footprint, coverage, height and volume.
- Geometric sun/shadow from Oslo coordinates, including DST and night states.
- Illustrative demo constraints, clearly not planning advice.
- Two scenarios, local persistence, reload and matched comparison.
- PNG export, polished light-mode UI, responsive read-only mobile.
- Portfolio case study and 90-second walkthrough.
- No auth, payments, backend, telemetry or AI in v1.

## Repository audit

| Finding | Detail |
|---|---|
| Existing content | One PRD (648 lines) and `.agents/skills/` with 90 skill prompts |
| Code | None at audit time |
| Git | Not initialised at audit time |
| Skill mix | 10 design, 66 engineering, 13 GIS, 1 research |
| Relevant subset | ~20 skills; the rest are unrelated specialisms |
| Planning skill | `planning-with-files` present globally but not in the project |

## Technical findings

- Node 22.23.1, npm 10.9.8, git 2.50.1.
- Latest registry versions at setup: React 19.3.1, Vite 8.3.5, TypeScript 7.0.2, Three 0.186.1, R3F 9.8.2, Drei 10.7.9, Zustand 5.0.16, Tailwind 4.3.3, Vitest 5.0.5, Playwright 1.64.1.
- R3F 9.8.2 peer range is React `>=19 <19.4`, so React 19.3.1 is compatible.
- `typescript-eslint` 8.72.1 supports TypeScript `<6.1.0`; therefore TypeScript is pinned to 6.0.3, not 7.
- Vite 8 requires Node `^20.19.0 || >=22.12.0`; runtime satisfies it.
- Self-hosted fonts work offline; no Google Fonts request.
- Studio bundle after lazy loading: `StudioPage` ≈ 952 kB raw / 253 kB gzip; landing ≈ 290 kB raw / 91 kB gzip. Vendor splitting remains an M1 task.
- Vitest does not auto-clean the DOM without globals; explicit `cleanup()` is required in setup.

## Decisions

| Decision | Rationale |
|---|---|
| Curated static packages | Reliability; PRD §9 |
| Local ENU frame with `(east, up, -north)` renderer mapping | Precision and one conversion pipeline; ADR-0002 |
| Separate UI store and document command layer | Testable transactions; ADR-0003 |
| Tailwind 4 + CSS variables from PRD §7.2 | Token fidelity without a component library |
| Lazy-load studio route | Landing stays light; Three.js only loads on entry |
| `postprocessing` 6.39.5 (Zlib) + `n8ao` 2.0.1 (ISC) for AO, lazy chunk | ADR-0005; 96 kB gzip, kept off the first frame |
| `NeutralToneMapping` for the white model | ACES greyed albedo whites to ~215/255 |
| three r186 removed `PCFSoftShadowMap` | Use PCF + `shadow-radius` |
| postprocessing `EffectComposer.dispose()` empties `passes` | Never memoise a composer that an effect disposes (StrictMode) |
| TypeScript 6.0.3 | Lint compatibility; ADR-0001 |
| Editorial Newsreader display + Inter UI | Distinctive but restrained; self-hosted |
| Empty studio state instead of invented geometry | Truthfulness; no fabricated site data |

## Issues encountered

| Issue | Resolution |
|---|---|
| `npm create vite` waited on an interactive prompt | Killed it; wrote scaffold and pinned manifest manually |
| DOM leaked across tests | Explicit `afterEach(cleanup)` |
| Lazy route broke a synchronous assertion | `findByRole` for the unknown-site route |
| Build warned about the studio chunk | Route is lazy-loaded; landing ~92 kB gzip, studio ~263 kB gzip |
| Python framework TLS failed on the elevation API | Explicit `certifi` context in the build script |
| Simplified OSM rings self-intersected | Repair/finer-tolerance pass plus runtime simple-ring validation |
| Original slope bbox included the Ekeberg cliff | Moved to a 31 m-relief hillside with 33 context buildings |

## M1 data and performance findings

- OSM building footprints: © OpenStreetMap contributors, ODbL 1.0; ways only, 1.2 m simplification, heights from `height` / `building:levels` / typology fallback.
- Kartverket DTM1: © Kartverket, CC BY 4.0; 13 × 13 samples, NN2000 heights recentred to each site origin.
- Study boundaries are authored rectangles, explicitly not cadastral parcels.
- Compact Infill: 137 buildings, 45 600 m² study area, 20.42 m origin elevation, −4.38…+5.98 m relief.
- Sloped Edge: 33 buildings, 71 300 m² study area, 137.20 m origin elevation, −26.98…+4.01 m relief (31 m relief).
- Package sizes: ~95 KB Compact, ~32 KB Sloped; ~5 draw calls; 60.1 fps at 1440×900 on Apple M1 Pro via ANGLE Metal; 0 page errors.
- Headless SwiftShader measured 39.6 fps; software rendering is not the target hardware case.

## Resources

- PRD: `Terraform_Comprehensive_PRD_v1.md`
- R3F docs: https://r3f.docs.pmnd.rs/
- Three.js docs: https://threejs.org/docs/
- SunCalc: https://www.npmjs.com/package/suncalc
- Kartverket terrain: https://ws.geonorge.no/hoydedata/v1/
- Kartverket terms: https://www.kartverket.no/api-og-data/vilkar-for-bruk/
- OSM attribution: https://www.openstreetmap.org/copyright
- ODbL 1.0: https://opendatacommons.org/licenses/odbl/1-0/
- Design contract: `docs/design/design-contract.md`
- QA fixtures: `docs/qa/fixtures.md`

## M0 gate outcome (2026-10-27)

- `agency-ux-architect`: 16 findings, 3 blockers; resolved.
- `agency-ui-designer`: 14 findings, 6 majors; resolved.
- `agency-code-reviewer`: 1 blocker (empty-state overlay blocked canvas pointer events); fixed, 3 drawer tests added; pass with follow-ups.
- `agency-ui-finish-gate-reviewer`: **PASS with follow-ups**.
- Final suite: typecheck, lint, 17 unit/component tests, production build and 1 Playwright smoke test all pass.
- Remaining follow-ups: inert the drawer background for assistive technology, guard focus restoration on resize, capture focus/hover states, add a 1024 px breakpoint screenshot, replace the static scenario chip in M4.

## M1 gate outcome (2026-10-27)

- `agency-research-synthesist`: confirmed OSM ODbL 1.0 and Kartverket CC BY 4.0 usage, attribution and redistribution constraints.
- `agency-gis-qa-engineer`: initial build had 12 self-intersecting simplified footprints; fixed, re-check clean; **PASS with follow-ups**.
- `agency-code-reviewer`: **PASS with follow-ups**; no blockers after the topology fix.
- Final suite: typecheck, lint, 33 unit/component tests, production build and 2 Playwright tests pass.
- Performance: 60.1 fps at 1440×900 on hardware GPU; no page errors.

## City-context implementation findings (2026-11-11)

- The curated extracts already held **real** mapped trees (128 and 122 `natural=tree` nodes) — the
  gap was coverage and the absence of `natural=tree_row`, not invented positions. A 200 m context
  halo took Compact Infill to 935 trees and 520 context buildings.
- The OSM trees in Oslo carry the city's own inventory reference (`ref:oslo:tree`) on 598 of the
  935 trees, so the municipal positions are available under ODbL without a second source. The
  municipal ArcGIS service was flaky during the session and its items carry no `licenseInfo`.
- The tile path was throwing greenery away: the OpenMapTiles fixtures hold 100 gardens, 20 scrub,
  29 pitches, 35 playgrounds, 5 cemeteries, beaches and bare rock, all dropped by a four-kind
  taxonomy. Twelve kinds now map them.
- `buildings[:220]` was silently discarding real context (296 of 516 footprints once the extract
  grew). The ceiling is 900; buildings under 25 m² were dropped for being small, not for crossing
  themselves — the log message was wrong and is now accurate.
- The terrain grid had to grow with the extent (13 × 13 → 40 × 47) or a wider extract would have
  made the relief coarser. Sample spacing now stays near 16 m.
- Roof solar was quadratic twice over: a per-building scan of every other building. Hoisting it to
  one pass cut the compact site from 8.3 s to 6.1 s; scoping the analysis to the site and the
  masses on it is what actually made it fast, and it stops the neighbourhood entering the site's
  yield.
- Performance: GPU 112.5 → 90.2 fps at 1440 × 900 @1× (M1 Pro, headed). Headless SwiftShader
  fell to 3.2 fps, which broke the Playwright suite; the Low render tier now draws one icosahedron
  per tree instead of 18–28 clumps, taking headless back to 8.6 fps.
- Full record: `docs/decisions/ADR-0023-city-context.md`, `docs/plans/context-fidelity-plan.md`.

## Hektar underlay findings (2026-11-11)

- Hektar's underlay is Mapbox composite vector tiles (`mapbox.mapbox-streets-v8` +
  `mapbox.mapbox-terrain-v2` + `mapbox.mapbox-terrain-dem-v1`) in a custom Studio style; evidence
  is the style JSON fetched with the public token embedded in their public bundle. Their
  context trees and buildings are imported from OSM into their own backend as sized objects
  (`ContextTreeHektarObject`, `ContextBuildingHektarObject`); per-layer attribution also names
  Nimbo, TopoExport and Lantmäteriet for other markets.
- Mapbox's `building` layer extrudes per *part* (`height`, `min_height`, `building:part`,
  `building_id`), which is why their volumes read as individual buildings with roof boxes.
  Our renderer already models `render_height`/`render_min_height`; the data is what is missing.
- Our curated packages carry **no** building multipolygon relations and **no** `building:part`
  (the builder parses ways only). The raw Oslo extracts hold 128 and 122 real `natural=tree`
  nodes, but no `natural=tree_row` ways, and the extract was only 190 × 210 m — so the trees were
  mapped but far too few to read as a canopy.
- The import path uses OpenFreeMap/OpenMapTiles at z14; that schema caps `building` at z14 and
  publishes no `building_part` layer, so imported buildings never have parts.
- Oslo Bymiljøetaten's `Tredata` service (geodata.bymoslo.no, EPSG:25832) holds real per-tree
  points with species, trunk diameter and crown diameter — 51 in the Compact Infill bbox, 11,103
  in a wider Oslo bbox. `Trær_rundt` (SceneServer) adds height above ground and crown diameter as
  a 3D layer. **Licence still to be confirmed**: the ArcGIS items carry no `licenseInfo`.
- Full research and evidence: `docs/research/hektar-underlay.md`; work order:
  `docs/plans/context-fidelity-plan.md`.

## Density has a cost, and it showed up in the wrong place

- After the context grew to 520 buildings (ADR-0023), an edit in the studio took seconds. A CPU
  profile of the Undo click in headless Chromium put **62 % of the main thread in polygon tests**
  (`orientation`, `pointInPolygon`, `segmentsIntersect`) — not in the renderer.
- The cause is the road-noise screening: for every study-area cell (456) and every mapped street
  (627 road pieces), it tested whether a building stands between the receiver and the road, and
  that test was a linear scan over all 520 buildings. Measured: **1021 ms** per pass, twice per
  render (the noise cells and the climate view each compute it).
- The fix is the same pattern as ADR-0021's shadow-ray index: a uniform-grid index over building
  bounding boxes (`indexBuildings`). The candidate set is exactly what a linear scan found — unit
  tested against a linear scan on seeded random buildings and query boxes — so the numbers do not
  change. Measured: **145 ms** per pass, and the Undo click fell from 4976 ms to 1774 ms.
- Lesson: a data-density change is also a complexity change. The roof-solar scan and the noise
  screening both multiplied by the building count, and only one of them was measured at the time.

## Headless Chromium cannot be trusted to capture a busy WebGL canvas

- With the full city context, `page.screenshot()` on the studio canvas occasionally never
  completed: the call hung for the full 90 s test timeout while the page was healthy — the
  failure's page snapshot showed a fully loaded studio with live values.
- The same capture takes ~940 ms in a standalone script and the page renders at ~93 ms a frame
  (about 11 fps at 1440 × 900 in software), so it is the compositor path, not the scene.
- Reading the canvas inside the page works and is fast: `canvas.toDataURL()` called from a
  `requestAnimationFrame` callback returns the last rendered frame even with
  `preserveDrawingBuffer: false` (the buffer still holds the frame at that point in the frame).
- The canvas tests now compare a hash of those pixels. Two side effects, both good: the HUD is
  DOM and can no longer satisfy a "the canvas changed" check, and the comparison is a direct
  statement about the rendered picture rather than about a screenshot.

## Two stale artefacts, both older than the change that broke them
- `e2e/m3-disclaimers.spec.ts` still expected the pre-ADR-0021 sun method note
  ("Not a daylight or sun-hours assessment.") and banned the phrase "sun hours" from the rendered
  UI. ADR-0021 (later that day) deliberately added a sun-hours analysis and changed the note to
  "Not a daylight assessment." — its commit message says "the sun note no longer denies sun hours" —
  and updated the unit-level audit (`claims.test.tsx`) but not the end-to-end one. The e2e audit
  now checks the ADR-0021 wording and allows only the sanctioned mode label and the qualified note.
- The unit audit and the e2e audit had drifted apart because only one of them was updated when the
  sun analyses landed. They now state the same rule: the words "sun hours" may appear only as the
  analysis-mode label or inside ADR-0021's qualified note.

## Visual notes
- Landing: warm off-white paper, serif hero, two site cards with diagrammatic SVG thumbnails, thin rules, restrained blue-grey accent.
- Studio: 56 px top bar, 56 px rail, 336 px inspector, live terrain/context study area, dashed boundary, dynamic compass, scale bar and layer toggles.
- Reference screenshots captured in `docs/screenshots/` at 1440×900, 1280×800, 1920×1080 and 390×844, plus top views at three desktop sizes.
- The 1440 hero holds three lines; the first site section enters the viewport.
- Context is merged into one mesh; terrain uses a subtle mesh grid and solid edge skirt.
- Remaining polish: mobile aspect framing, compass behaviour near eye level, hover/focus state captures.

## Trees on water: the cause, and where it hides (2026-11-12)

- **The water is a texture, not a surface.** `src/scene/landCoverTexture.ts` fills every land-cover
  polygon of kind `water` onto a 2048 px canvas and multiplies it over the terrain mesh. There is no
  water geometry to sit under. So "a tree on water" is exactly "a tree whose plan position falls
  inside a water polygon" — a data problem, and it can be tested without a renderer.
- **The park polygon and the water polygon do not agree.** The tile's landcover and water layers are
  simplified independently, so a park that runs into a lake keeps its ground over the water. Measured
  on the recorded Oslo Bjørvika fixture: the park polygon `landcover-5456992072` has **3 of its 12
  vertices inside a water area**. The import path fills that polygon with a 16 m grid, and the grid
  lands on the water. This is the screenshot the owner reported.
- **The grid was laid on the raw clipped ring, the ground was painted from the repaired ring.**
  `extractLandCover` runs `repairRing`; `illustrativeTrees` did not. Where the two differ, the canopy
  stands on a colour the studio never paints. The grid now uses the repaired ring.
- **The curated path had it too, in small numbers.** 9 of the 935 mapped Compact Infill trees fell
  inside a water polygon — a `natural=tree_row` way that reached into the river. Sloped Edge had none.
- **An on-edge point reads as outside.** The shared ray-casting helper (`pointInPolygon`) reports a
  point exactly on a polygon edge as outside, so a tree exactly on the water's edge survives the rule.
  The painted texture resolves about a pixel of the edge, so the visual gap is under 0.4 m.
- **Street trees and courtyard trees are real and stay.** A tree inside a building footprint on the
  curated path is usually in a courtyard (OSM draws the building as a ring around the yard); a tree
  in a street is a mapped street tree. Only water is excluded — the rule stays narrow enough to be
  honest.

## The studio had two homes for one figure (2026-11-13)

- **The dock and the panel were one feature split in two.** The bottom dock carried the Sun, Wind and
  Noise figures with one quick control each; the Parameters panel carried the *active* card's full
  controls. Reading one number meant looking in one place and understanding it in another, and the
  claim under the figure sat apart from the controls that produced it.
- **One card per analysis keeps ADR-0016's real rule.** The rule that mattered was never "a dock" but
  "exactly one analysis colours the ground". Moving the cards into the panel keeps that rule as "the
  open card is the analysis on the map", and the panel becomes the only place a figure appears.
- **The claim must not be printed twice.** A closed card states its claim under the figure; an open
  card states it in its controls (the legend, the sun method note). The figure that needs a claim is
  only on screen while its card is open — except the sun elevation and the noise peak, whose cards
  keep their claim while closed.
- **An imported site knows the frame it came from.** The import writes a study area that is the frame
  inset 15 % on every side, so the frame side is the study side ÷ 0.7 and the frame size can be
  recovered from the saved package. Back can therefore restore the frame, not just the coordinates.
- **The import progress was already known.** `importSite` reports every step (`start`, `done`,
  `skipped`, `failed`); the bar is the share of settled steps plus half for the step in flight. The
  step list was never missing information — it was missing a shape you could read at a glance.


## 2026-11-13 — Wind lift, Phase 1: seven slice heights (ADR-0028)

- **The cost is in the ground slice, not the upper ones.** The 2 m slice is solved on the full grid and
  dominates the stack (Compact Infill ≈ 7.5 s of 11–13 s). Upper slices run on the ≤ 80-cell grid,
  warm-started from the slice below, so adding three of them costs ≈ 0.4–0.8 s each on the dense site
  and ≈ 0.1 s each where the buildings below have already dropped out (Sloped Edge 20–30 m).
- **Measured** (`WIND_BENCHMARK=1`, two runs each): Compact Infill full stack 11.2–11.4 s → 13.1–13.3 s
  (1.17×), Sloped Edge 5.8 s → 6.5 s (1.11×). Inside the plan's 2× budget.
- **Index-based tests were the fragile part.** Three tests picked slices by array position
  (`[pedestrian, ten, twenty] = slices`); with seven heights position 1 is 5 m, not 10 m. They now look
  slices up by `z`, so a future change of heights only touches `SLICE_HEIGHTS_M`.
- **The top-slice threshold followed the list.** `sliceHeightsFor` read the threshold as
  `SLICE_HEIGHTS_M[3]`; it now takes the highest standard slice, so a 31–35 m roof gets a top slice
  (31 m → 40 m) instead of falling under the old 35 m slice.

## 2026-11-14 — Wind lift to every metre (ADR-0029)

- **Between roof heights the layered model has nothing new to say.** A slice's solve depends only on
  which buildings are taller than it; the height enters as a scale factor afterwards
  (`profileFactor(z) / profileFactor(2)` in `flowRunner.ts`). So every metre is the covering solve
  scaled, exact within the model, and the solves needed are one per roof height, not one per metre.
- **Roof heights cluster.** Inside the default solve frame Compact Infill has 149 buildings, but their
  heights round up to just 9 values (4, 7, 10, … 30 m: storey multiples). Sloped Edge has 4.
- **Measured** (full stack, 4-core container, two runs): Compact Infill 16.0 s → 18.2–19.6 s,
  Sloped Edge 7.6–8.0 s → 8.5–9.1 s. The 2 m ground solve (≈ 9 s and 5 s) dominates both.
- **A one-slice stack was never cached.** With fixed heights a stack always had ≥ 7 slices, so caching
  lived in the upper-slice branch only; a frame with no roof above 2 m completes at the ground solve.
- **Blending between slices breaks with irregular heights.** The 3D streamline sampler blended linearly
  between neighbouring slices; with solves at 2 m and 40 m around a 40 m tower, a point at 5 m blended
  toward the open 40 m field and passed through the tower. Sampling the covering slice fixes it.
- **Visible in the captures:** at 9 m Compact Infill reads 94 % calm; at 10 m, where a group of roofs
  ends, a jet opens (81 % calm, 1 % ≥ 10 m/s); at 13 m it is the 10 m picture, slightly faster.
