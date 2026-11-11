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
