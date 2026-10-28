# Task Plan — Terraform v1

## Goal

Ship Terraform v1: a credible, interactive architectural site-planning portfolio prototype with two curated Oslo sites, conceptual massing, truthful geometry-derived analysis, scenario comparison and a polished case study.

## Current Phase

**M2 — Massing engine next** (M1 packages are complete and immutable)

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
- **Status:** in_progress

### Phase 4 — M3 Live analysis

- [ ] Areas, volume, coverage
- [ ] Solar + shadows + DST
- [ ] Demo constraints and warnings
- [ ] Independent sun reference
- [ ] QA-06/10/11
- **Status:** pending

### Phase 5 — M4 Scenarios and comparison

- [ ] CRUD, autosave, migrations
- [ ] Matched-camera comparison
- [ ] QA-09/12/14
- **Status:** pending

### Phase 6 — M5 Portfolio polish

- [ ] PNG export, onboarding, states
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

1. Write the M2 domain model and command contracts with `engineering-software-architect`.
2. Implement and test `MassVolume`, footprint creation, storeys, tiers and validation before touching gizmos.
3. Add the numeric inspector and transactional undo/redo; keep one drag = one history entry.
4. Carry M1 follow-ups: terrain resolution if needed, aspect-aware mobile framing, compass near eye level.
5. Preserve the generated site packages as immutable; massing never mutates context or terrain.
