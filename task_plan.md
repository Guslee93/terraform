# Task Plan — Terraform v1

## Goal

Ship Terraform v1: a credible, interactive architectural site-planning portfolio prototype with two curated Oslo sites, conceptual massing, truthful geometry-derived analysis, scenario comparison and a polished case study.

## Current Phase

**M0 — Foundation and visual shell** (shell implemented; design, visual and code gates pending)

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
- [ ] `ux-architect` layout/CSS review
- [ ] `ui-designer` token/component review
- [ ] `ui-finish-gate-reviewer` visual gate
- [ ] `code-reviewer` gate
- **Status:** in_progress

### Phase 2 — M1 Site packages and camera

- [ ] Licence and provenance record
- [ ] Offline preprocessing pipeline
- [ ] Two packages + manifest validation
- [ ] Terrain/context/parcel/layers
- [ ] Camera presets, compass, scale
- [ ] Performance trace and budget
- **Status:** pending

### Phase 3 — M2 Massing engine

- [ ] Immutable domain model and fixtures
- [ ] Add/draw/transform/storeys/tiers
- [ ] Numeric inspector and validation
- [ ] Undo/redo transactions
- [ ] QA-03–08
- **Status:** pending

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

## Decisions made

| Decision | Rationale |
|---|---|
| Curated static site packages, no live GIS | Reliable demo; PRD §9 |
| Local ENU metres, Y-up renderer mapping | Precision, testability; ADR-0002 |
| Zustand for UI state; command layer for document | Separate transient from durable; ADR-0003 |
| Studio route lazy-loaded | Keeps landing at ~91 kB gzip instead of loading Three.js |
| TypeScript 6.0.3, not 7 | `typescript-eslint` 8.72 supports `<6.1.0` |
| AI excluded until M6 | PRD non-goal for v1 |

## Errors encountered

| Error | Attempt | Resolution |
|---|---|---|
| `npm create vite` hung on an interactive prompt | 1 | Killed process; scaffolded manually with pinned versions |
| Vitest DOM leaked between tests | 1 | Added explicit `cleanup()` in `src/test/setup.ts` |
| Lazy studio route made a synchronous test fail | 1 | Switched the unknown-site assertion to `findByRole` |
| Studio chunk >500 kB warning | 1 | Accepted for M0; route is lazy-loaded; vendor splitting scheduled for M1 |

## Next actions

1. Run `design-ux-architect` and `design-ui-designer` reviews of the M0 shell.
2. Apply visual fixes and capture reference screenshots.
3. Run `code-reviewer` and `ui-finish-gate-reviewer`; record both in `docs/reviews/`.
4. Only then start M1: provenance first, geometry second.
