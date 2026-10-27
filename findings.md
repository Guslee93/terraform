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
| Build warned about the 952 kB studio chunk | Accepted for M0; planned M1 vendor split |

## Resources

- PRD: `Terraform_Comprehensive_PRD_v1.md`
- R3F docs: https://r3f.docs.pmnd.rs/
- Three.js docs: https://threejs.org/docs/
- SunCalc: https://www.npmjs.com/package/suncalc
- Kartverket terrain: https://www.kartverket.no/en/api-and-data/terrengdata
- Design contract: `docs/design/design-contract.md`
- QA fixtures: `docs/qa/fixtures.md`

## Visual notes

- Landing: warm off-white paper, serif hero, two site cards with diagrammatic SVG thumbnails, thin rules, restrained blue-grey accent.
- Studio: 56 px top bar, 56 px rail, 336 px inspector, light grid canvas, explicit empty state. No site geometry shown yet by design.
- Reference screenshots captured in `docs/screenshots/` at 1440×900, 1280×800, 1920×1080 and 390×844.
- After first capture: reduced hero height so the site section enters the 900 px viewport, hid the mobile tagline, stopped the mobile CTA from wrapping, replaced the faint Drei grid with two `gridHelper` layers, and raised disabled-control opacity.
- Remaining polish before the M0 gate: inspector density, hover/focus states, drawer focus trap, and a final type/colour pass by the design agents.
