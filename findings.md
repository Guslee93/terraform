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

## Visual notes

- Landing: warm off-white paper, serif hero, two site cards with diagrammatic SVG thumbnails, thin rules, restrained blue-grey accent.
- Studio: 56 px top bar, 56 px rail, 336 px inspector, live terrain/context study area, dashed boundary, dynamic compass, scale bar and layer toggles.
- Reference screenshots captured in `docs/screenshots/` at 1440×900, 1280×800, 1920×1080 and 390×844, plus top views at three desktop sizes.
- The 1440 hero holds three lines; the first site section enters the viewport.
- Context is merged into one mesh; terrain uses a subtle mesh grid and solid edge skirt.
- Remaining polish: mobile aspect framing, compass behaviour near eye level, hover/focus state captures.
