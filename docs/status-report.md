# Terraform v1 — Project Status Report

| | |
|---|---|
| **Document** | Terraform v1 status report for revision and assessment |
| **Prepared by** | Cline (implementing agent for M0–M1 and the M2 domain-model start) |
| **Updated by** | Claude Code (Opus 5.5) — M2 domain layer, tests, history; work split with DeepSeek (§15) |
| **Prepared for** | Claude Code Opus 5.5 — continuation/revision agent |
| **Date** | 2026-10-27 |
| **Source of truth** | `Terraform_Comprehensive_PRD_v1.md` (v1.0, 26 Oct 2026) |
| **Headline state** | **M0 complete · M1 complete · M2 in progress — domain, validation, serialization, commands and undo/redo committed and tested; tools/scene/inspector not started** |
| **Build status** | `typecheck` ✅ · `lint` ✅ · `test` 205/205 ✅ (22 files) · `test:e2e` 2/2 ✅ · `build` ✅ (re-run 2026-10-28 after stacked tiers — see §10) |

> **How to read this report.** Every claim below is traceable to a file in this repository, a command output, or a review record. Sections 4–6 are history; section 7 is the state of the in-progress milestone; sections 8–11 describe the architecture, evidence and debt; section 13 tells you exactly what to verify and do next. If anything here contradicts the PRD, the PRD wins.

---

## 1. Executive summary

Terraform is an **architectural portfolio prototype** — not a commercial SaaS — in which a visitor picks one of two curated Oslo study sites, explores a real simplified terrain and context model, shapes conceptual building massing, reads geometry-derived metrics (GFA, footprint, coverage, height, volume), tests sun/shadow, saves two scenarios and compares them, and exports PNGs. The v1 release path is M0 → M5; M6 (AI, reports, GLB, map context) is optional and gated separately.

Two of the six release milestones are complete and gate-signed:

- **M0 — Foundation and visual shell.** Pinned Vite/React/TypeScript scaffold, design tokens, landing/About/404, a canvas-first studio shell, a focus-managed responsive inspector, R3F viewport, and a hard visual gate that **PASSED with follow-ups**.
- **M1 — Site packages and camera.** Two immutable, openly licensed Oslo site packages (Compact Infill, Sloped Edge) built offline from OSM footprints + Kartverket DTM1 terrain, validated manifests, local ENU rendering with terrain/context/boundary layers, deterministic camera presets, compass, scale bar. Geometry QA and code review both **PASSED with follow-ups**. Measured **60.1 fps at 1440×900** on an Apple M1 Pro.

**M2 — Massing engine — is the active milestone.** The renderer-free half is done and committed: the immutable model, factories, aggregates, footprint/tier/volume/scenario validation, JSON serialization, the command set and a snapshot undo/redo history with preview/commit/cancel transactions. It is covered by fixture tests (QA-04/05/07/08 at domain level, plus the domain side of QA-16). Still to build: the pointer/tool state machine, scene adapters and gizmos, the numeric inspector, snapping, and clearance/boundary feedback (QA-06). M2 has **no gate yet** and must not be marked complete.

Work is now split between **Claude Code** (architecture, domain, interaction, review) and **DeepSeek V4 Flash in Antigravity** (low-risk, tightly specified follow-ups). See §15.

Repo now: 7 commits on `main`, 94 unit/component tests across 12 files, 2 Playwright smoke tests, 26 reference screenshots, 4 ADRs (ADR-0004 amended), 7 milestone briefs, 7 review records.

---

## 2. Milestone progress at a glance

| Milestone | Status | Gate / evidence | PRD gate (§13) |
|---|---|---|---|
| **M0** Foundation | ✅ **Complete** | Visual gate **PASS** + code review **PASS**, both with follow-ups | Cohesive UI at 1440×900; keyboard/focus basics |
| **M1** Site packages & camera | ✅ **Complete** | Geometry QA **PASS** + code review **PASS** + visual review **PASS**, with follow-ups | No live GIS; north/scale aligned; stable FPS (60.1) |
| **M2** Massing engine | 🔄 **In progress** | Code review + QA-03–08 **pass with follow-ups** (`docs/reviews/M2-code-review.md`); milestone acceptance open: add-at-point/scale/vertex tools, width/depth/rotation + palette, WCAG 2.5.7 move alternative, DeepSeek round 2 | QA-03–08; stepped forms correct |
| **M3** Live analysis | ✅ Reviewer pass (owner sign-off pending) | `docs/reviews/M3-code-review.md` | Fixtures match; sun reference verified; disclaimers visible |
| **M4** Scenarios & persistence | ⏳ Pending | — | QA-09/12 after reload |
| **M5** Portfolio polish | ⏳ Pending | — | Full 3-min workflow; final visual gate |
| **M6** Optional extensions | ⏳ Gated after M5 | — | Never destabilises v1 |

---

## 3. Product definition recap (what we are building)

- **Value proposition:** *Explore a site. Shape a concept. Understand the impact.*
- **Signature experience (PRD §1):** drag a roof handle to add two storeys → massing animates, GFA/height update immediately, a max-height indicator moves within/over a demo limit, sun/shadow scrubs with date/time, then duplicate-compare two scenarios.
- **Non-goals (PRD §2.3, immutable):** no BIM authoring, no planning/TEK17 compliance claims, no live GIS, no cadastral data pipeline, no photoreal rendering, no multi-user auth/payments/analytics, no AI before M6.
- **Truthfulness guardrails (AGENTS.md §1, §7):** numbers must derive from geometry/tests, not constants; disclaimers must stay visible; constraints are labelled *Illustrative — not planning advice*; never invent Oslo parcels or regulations.

### Claim language (approved vs forbidden)

| Use | Never use |
|---|---|
| `Curated Oslo demo · simplified context` | `planning compliant` |
| `Illustrative design constraints` | `verified daylight` |
| `Local ENU metres` | `official parcel` |
| `Geometric sun direction` | `BIM-ready`, `IFC deliverable` |

---

## 4. Phase 0 — Setup and governance (complete)

| Item | State | Evidence |
|---|---|---|
| Repo audit (PRD + 90 skills, no code, no git) | Done | `findings.md` |
| Agent operating model: roster, gates, handoffs | Done | `AGENTS.md` |
| Git on `main` | Done | 3 commits |
| Scaffold Vite 8 + React 19 + TypeScript 6, pinned | Done | `package.json`, lockfile, `ADR-0001` |
| ADR-0001 stack · ADR-0002 coordinates · ADR-0003 state | Done | `docs/decisions/` |
| Milestone briefs M0–M6 | Done | `docs/milestones/` |
| Design contract, site-package spec, QA fixtures | Done | `docs/design/`, `docs/data/`, `docs/qa/` |
| Planning files (`task_plan.md`, `findings.md`, `progress.md`, agent log) | Done | root + `docs/agent-log.md` |

Key stacking decisions that still stand: TypeScript pinned to **6.0.3** (not 7) because `typescript-eslint` 8.72 supports `<6.1.0`; the studio route is **lazy-loaded** so the landing stays ~92 kB gzip; Tailwind 4 + PRD-token CSS variables instead of a component library; self-hosted fonts for the offline demo.

## 5. M0 — Foundation and visual shell (complete, 2026-10-27)

**Delivered** (commit `ae11d3f` bootstrap, `67123cb` gate fixes; evidence `docs/reviews/M0-*`, `docs/screenshots/m0-*`):

- Routing `/`, `/studio/:siteId`, `/about`, 404; landing with editorial serif hero and two site cards; About with scope/limitations/stack/attribution.
- Studio shell: 56 px top bar, 56 px tool rail, 336 px inspector that becomes a focus-managed drawer below **1100 px**, footer status/disclaimer.
- R3F canvas with ground, grid, lighting, orbit controls, `fit-site` event and a **WebGL fallback** (QA-15).
- Reusable primitives `Button`, `ButtonLink`, `Icon`, `IconButton`; coordinate utilities with ENU↔Three tests (`ADR-0002`).
- Honest empty studio state — no fabricated geometry, no fake metrics (PRD §2.2).
- Vitest + Testing Library + Playwright configuration; `docs/design/design-contract.md` plus token layer (`tokens.css`) matching PRD §7.2.

**Gates passed:**

| Review | Outcome | Highlights |
|---|---|---|
| `design-ux-architect` (`M0-ux-review.md`) | 16 findings, 3 blockers → resolved | Removed fabricated scenario selector, off-screen focusable inspector, placeholder tool wall |
| `design-ui-designer` (`M0-ui-review.md`) | 14 findings, 6 majors → resolved | Hero orphan, thumbnail contrast, warning contrast, micro-type floor |
| `engineering-code-reviewer` (`M0-code-review.md`) | **Pass with follow-ups** | 1 blocker fixed (empty-state overlay blocked canvas pointer events); drawer focus tests added |
| `design-ui-finish-gate-reviewer` (`M0-visual-gate.md`) | **PASS with follow-ups** | Cohesive canvas-first shell; mobile read-only + disclaimer added at sign-off |

**M0 verification:** typecheck ✅, lint ✅, 17 unit/component tests ✅, build ✅, 1 e2e smoke ✅. Screenshots at 1440×900, 1280×800, 1920×1080 and 390×844.

## 6. M1 — Site packages and camera (complete, 2026-10-27)

**Delivered** (commit `055dbc4`; evidence `docs/reviews/M1-*`, `docs/screenshots/m1-*`, `docs/data/site-package-spec.md`, `docs/qa/fixtures.md` §6):

1. **Two immutable, static packages** under `public/sites/` — **Compact Infill** (137 simplified OSM context buildings, 45 600 m² study area, 20.42 m origin elevation, −4.38…+5.98 m relief) and **Sloped Edge** (33 buildings, 71 300 m², 137.20 m origin, −26.98…+4.01 m relief). No live GIS at runtime.
2. **Offline preprocessing pipeline** (`scripts/build_site_packages.py`) with committed raw caches in `data/raw/` (1.1 MB), reproducible via `python3 scripts/build_site_packages.py --offline`.
3. **Validated manifest contract** — schema v1, units, CRS metadata (WGS84 horizontal + NN2000 vertical datum), statistics cross-checks, simple-ring topology, finite geometry all validated at load without React/Three.
4. **Scene layers** — one merged context mesh, one terrain mesh (13 × 13 samples) + mesh grid + skirt, dashed study boundary; working layer toggles; ~5 draw calls.
5. **Camera & HUD** — deterministic presets (Isometric, Top, North, South, Eye Level; perspective only), animated transitions (reduced-motion snaps), `F` fit-site, dynamic compass + scale bar derived from camera basis, layer legend.
6. **Provenance & licensing** — OSM ODbL 1.0 and Kartverket CC BY 4.0 approved and visible (footer, Inspector, About, per-package `attribution.md`).

**Gates passed:**

| Review | Outcome | Highlights |
|---|---|---|
| `research-synthesist` | Approved | OSM ODbL 1.0 + Kartverket CC BY 4.0 usage, attribution, redistribution confirmed |
| `gis-qa-engineer` (`M1-geometry-qa.md`) | **PASS with follow-ups** | Found 12 self-intersecting simplified footprints → fixed with repair pass + runtime validation; CRS/topology/north/origin tables clean |
| `engineering-code-reviewer` (`M1-code-review.md`) | **PASS with follow-ups** | Domain/package code free of React/Three; no blockers after topology fix |
| Lead visual pass (`M1-visual-review.md`) | **PASS with follow-ups** | Both sites read correctly at four viewports + top views |

**M1 verification:** typecheck ✅, lint ✅, **33 unit/component tests** ✅ (11 package fixtures against the real generated JSON), build ✅ (landing ~92 kB gzip, studio ~264 kB gzip), **2 Playwright tests** ✅, performance **60.1 fps / 0 page errors** at 1440×900 (Apple M1 Pro, ANGLE Metal; SwiftShader 39.6 fps is not the target case).

---

## 7. M2 — Massing engine (IN PROGRESS)

**Plan & brief:** `docs/milestones/M2-massing-engine.md`; contract `docs/decisions/ADR-0004-massing-model.md` (accepted, §3 amended); QA gate = PRD QA-03–08 against `docs/qa/fixtures.md`.

### 7.1 What exists (all committed and tested)

| Commit | File | Purpose |
|---|---|---|
| `5e92e12` | `src/lib/polygon.ts` | Planar helpers: area, normalize/CCW, simple ring, point-in-polygon, centroid, translate/rotate |
| `5e92e12` | `src/features/massing/{types,factories,aggregate}.ts` | Immutable model, factories, tier/volume/scenario GFA, volume, max height, union footprint, coverage |
| `f250232` | `src/features/massing/*.test.ts`, `src/lib/polygon.test.ts` | Fixtures §2–3: rectangle, L-shape, stepped mass, coverage, validation rejections |
| `f250232` | fixes | `maxHeight` no longer floors at 0 (sloped sites); `isSimpleRing` rejects collinear overlap, vertex-on-edge, fold-back; `sites/package.ts` uses the shared check |
| `4d09bfc` | `src/features/massing/validation.ts` | `validateAssumptions`/`validateVolume`/`validateScenario`: schema, required strings, unique volume/tier ids, ranges bounded to v1 limits |
| `4d09bfc` | `src/features/massing/serialize.ts` | `serializeScenario` (refuses invalid) / `parseScenarioDocument` (untrusted JSON, path errors, rejects unknown schema, drops unknown fields) |
| `4c054cd` | `src/features/editor/history.ts` | `execute`/`undo`/`redo`/`select`, 100-entry bound, `beginPreview`/`updatePreview`/`cancelPreview`/`commitPreview` |
| `4c054cd` | `src/features/editor/commands.ts` | add/remove/duplicate/move/rotate/update volume; add/update/remove tier |

Nothing in `src/features/massing/**`, `src/features/editor/**` or `src/lib/polygon.ts` imports React, R3F, Three, Zustand or Dexie.

### 7.2 Deliverables against the brief

| # | Brief deliverable | State | Owner |
|---|---|---|---|
| 1 | Immutable domain model | ✅ | — |
| 2 | Factories + validation | ✅ (winding is normalised by factories but not enforced on load) | — |
| 3 | Tools (add, draw, move/rotate/scale, roof handle, vertex edit) | 🟡 draw, move (1 m grid snap) and roof handle live in the studio; rotate/scale/vertex edit ❌ | Claude |
| 4 | Tier volumes + double-count-free aggregation | ✅ `stackTier` (60 % setback, concave fallback), upper tiers follow lower-tier edits, inspector tier switcher + Remove tier (top tier only), per-tier selection in 3D | — |
| 5 | Numeric inspector | ✅ name, storeys, storey height, base elevation, use, visible, locked + height/footprint readouts; width/depth/rotation readouts wait for D9 | — |
| 6 | Interaction state machine | ✅ `interaction.ts`, wired to the scene via `MassLayer` | — |
| 7 | Undo/redo | ✅ domain + tool-rail buttons; keyboard shortcuts wait for D7 | DeepSeek (D7) → Claude wiring |
| 8 | Snapping | 🟡 grid maths merged (D1, `snapping.ts`); wiring + P1 edge/vertex ❌ | Claude |
| 9 | Clearance feedback | ✅ `clearance.ts`: boundary inside/crossing/outside per tier; floating > 0.5 m and cuts deeper than one storey on ground tiers; amber highlight, inspector list, viewport line; no auto-warp | — |

### 7.3 QA status

| QA | Domain | Scene/UI |
|---|---|---|
| QA-03 create polygon | ✅ factories + validation | ✅ draw tool → visible, selectable mass (persistence is M4) |
| QA-04 self-intersection | ✅ rejected in commands and draw tool, points kept | ✅ "Footprint edges must not cross." status, model unchanged |
| QA-05 storeys 3→5 | ✅ 16 m / 1 080 m² | ✅ roof drag 3 → 5 storeys · 16.0 m (GFA card is M3) |
| QA-06 boundary warning | ✅ crossing/outside/inside fixtures, stepped tiers, slope + interior hump | ✅ drag across boundary → amber mass + "crosses the study boundary" warning, live during drag |
| QA-07 drag + Esc | ✅ roof gesture + Esc/pointer loss restore exact base, no entry | ✅ roof drag to 18 storeys, Esc → exact 3 storeys, camera unchanged |
| QA-08 undo/redo dup/delete/rotate | ✅ geometry + selection | ✅ inspector Duplicate/Delete/Rotate ±15° + rail Undo/Redo: duplicate→undo→redo, rotate 45°→3× undo, delete→undo all restore geometry and selection (shortcuts still wait on D7) |
| QA-16 numeric rejection | ✅ invalid storeys rejected, no entry | ✅ "-1" and "abc" refused with field errors, "41" refused with the domain message; field reverts to the prior value |

### 7.4 Open decisions (Claude-owned)

1. ~~Locked volumes~~ **Decided 2026-10-27:** enforced in the command layer (ADR-0004 §3 amendment). Locked masses refuse move/rotate/tier edits/add/remove/delete; rename, hide, unlock and duplicate (copy is unlocked) stay allowed.
2. **Height reference** — `maxHeight` is top elevation relative to site origin (ADR-0004). Grade vs datum for the demo limit is PRD FR-073, owned by M3.
3. **Floor-level GFA** — PRD line 403 asks for level-indexed occupied polygons before FR-051 ships. Current GFA is Σ(footprint × storeys) per tier, correct for set-back stacks but double-counts tiers that overlap at the same level. ADR-0004 revisit trigger; decide before M3.

## 8. Architecture and decisions (all ADRs accepted)

| ADR | Decision | Consequences relied on today |
|---|---|---|
| **ADR-0001** | Pinned stack — TS 6.0.3, React 19.3.1, Vite 8, Three 0.186.1, R3F 9, Drei 10, Zustand 5, Tailwind 4, Dexie 4, SunCalc 2, Turf 7 | Studio chunk large (~264 kB gzip) but lazy-loaded; **do not upgrade three/R3F/drei independently** |
| **ADR-0002** | **Local ENU metres.** `east`, `north`, `up`; renderer consumes `(east, up, −north)`; one conversion pipeline in `src/lib/coordinates.ts`; lat/lon only for solar + provenance, never mesh vertices | All domain maths is renderer-free and testable in metres; M3 sun vectors must align with visual north |
| **ADR-0003** | Two state domains: **Zustand for ephemeral UI**, **immutable document + command layer for durable state**; preview/commit transactions; history bounded to 100; Dexie/IndexedDB debounced autosave in M4 | M2 history tests run without React or IndexedDB; `Esc` = zero history entries |
| **ADR-0004** | Immutable `ScenarioDocument` model; derived-value naming (footprint vs GFA vs volume vs coverage); snapshot-based `MassingHistory`; validation boundaries; JSON `schemaVersion: 1` shape for M4 | Module map in `src/features/massing/` matches the implemented files; Turf used only for ground-footprint union |

Repository map that must be preserved (`AGENTS.md` §3): `src/app`, `src/components/{marketing,studio,ui}`, `src/features/{sites,editor,massing,analysis,scenarios,exports}`, `src/scene`, `src/lib`, `src/styles`, `public/sites`, `docs/*`, `data/raw`, `e2e`, `scripts`. `src/features/editor`, `analysis`, `scenarios`, `exports` are future modules.

## 9. Data, provenance and QA fixtures

- **Packages** (`public/sites/`): `compact-infill` (~95 kB) and `sloped-edge` (~32 kB) JSON assets; each ships `manifest.json`, `terrain.json`, `buildings.json`, `study-area.json`, `attribution.md`. Thumbnails are the committed SVGs. **These are immutable** — massing never mutates them (a scenario is a separate document referencing `siteId`).
- **Sources**: OSM ways only (ODbL 1.0, 1.2 m simplification, relation/multipolygon building shapes omitted and documented); Kartverket DTM1 (CC BY 4.0, NN2000, 13 × 13 grids); study boundaries are **authored rectangles explicitly not cadastral parcels**.
- **Fixtures** (`docs/qa/fixtures.md`): coordinate cases, area/height/volume fixtures incl. the stepped mass, validation cases, M1 package baselines, and the **solar verification protocol for M3** (independent NOAA reference vs SunCalc, Δ ≤ 0.5°; DST boundary case; night state).
- **Files added during the collection run** show no drift: manifest statistics, building count, origin elevation, relief ranges and attribution text match the QA record in `docs/reviews/M1-geometry-qa.md`.

## 10. Verification state (re-run 2026-10-27 after DeepSeek round 1 merge)

| Command | Result |
|---|---|
| `npm run typecheck` | ✅ no errors |
| `npm run lint` | ✅ no errors/warnings |
| `npm run test` | ✅ **205/205 across 22 files** |
| `npm run build` | ✅ landing ~92 kB gzip; studio 276.5 kB gzip (+12.6 kB for massing since M1; known >500 kB raw warning, lazy route) |
| `npm run test:e2e` | ✅ 2/2 re-run after stacked tiers |
| `npm run capture` | 26 reference images; no UI change since M1 |

### 10.1 The one change made while preparing this report

When I opened the tree, `npm run typecheck`, `lint` and `build` **failed** on `src/features/massing/validation.ts`:

```
error TS6133: 'SCENARIO_SCHEMA_VERSION' is declared but its value is never read.
```

`validation.ts` imported `SCENARIO_SCHEMA_VERSION` before document-level validation existed to consume it. I removed that single unused import (behaviour-preserving, verified by the full green run above). The receiving agent should expect to **re-import `SCENARIO_SCHEMA_VERSION` when implementing `validateScenario`** (ADR-0004 §4). Everything else in the working tree is untouched.

## 11. Codebase inventory at handover

- **Git:** 7 commits — `ae11d3f` bootstrap → `67123cb` M0 gates → `055dbc4` M1 → `5e92e12` M2 checkpoint → `f250232` fixtures + fixes → `4d09bfc` validation + serialization → `4c054cd` commands + history.
- **Source:** 56 files under `src/`; **tests:** 12 Vitest files (94 tests) + 1 Playwright spec.
- **Dependencies:** 12 runtime + 21 dev (exact pins, lockfile committed; no new dependency added since M0 sign-off — Turf was already pinned).
- **Screenshots:** `docs/screenshots/` (26 PNGs).
- **Tooling:** `scripts/build_site_packages.py` (offline pipeline), `scripts/capture.mjs` (reference capture), `playwright.config.ts`, `vitest.config.ts`, `eslint.config.js`.

---

## 12. Open follow-ups (accepted debt, by milestone)

**From M0 reviews (carry into M2/M5):**
1. Drawer background is not `inert` to assistive technology behind the focus trap → move to portal/`<dialog>` or inert the top bar/rail/canvas. (`M0-code-review.md` #4)
2. Guard focus restoration when the viewport grows past 1100 px with the drawer open. (`M0-code-review.md` #5)
3. Static `Concept A` scenario chip needs a real control + accessible description in M4 (`M0-code-review.md` #7, `M0-visual-gate.md` #5).
4. Capture hover/focus and layer-off states; add a 1024×800 screenshot proving the 1100 px breakpoint (`M0-visual-gate.md` #1–2).

**From M1 reviews (carry into M2/M5):**
5. `useSitePackage` with `null` site id stays `loading` — make the state a discriminated `idle` state (`M1-code-review.md` #3).
6. Compass projection degenerates near eye level along north — hide/deemphasise below a threshold (`M1-code-review.md` #4, `M1-visual-review.md` #3).
7. Aspect-based camera framing for narrow/mobile viewports (`M1-code-review.md` #5, `M1-visual-review.md` #2).
8. `fetchJson` has no timeout for stalled local requests (`M1-code-review.md` #7).
9. Document the Python `certifi` prerequisite in README (`M1-code-review.md` #8).
10. Minor façade z-fighting between adjacent OSM footprints (`M1-visual-review.md` #1).
11. Terrain is coarse at 13 × 13 — increase to 17 × 17 if M2 clearance checks need finer grade (`M1-geometry-qa.md` #4, M1 brief follow-up).
12. Add a checksum for the Kartverket terrain response (`M1-geometry-qa.md` #7, M1 brief follow-up).

**Closed by DeepSeek round 1 (merged):** #5 (D2), #8 (D3, with Claude fix), #9 (D4), #12 (D6); #4 partly (D5 — 1024×800 captured; hover/focus/layer-off states still open). New: **#13** at 1024×800 the "Site notes" drawer button overlaps the study-boundary legend label (Claude, visual).

**Cross-cutting next-milestone note:** M3 owns the sun-independent reference, DST and night-state fixtures; M4 owns persistence/migrations. M2 must not start either.

## 13. Known limitations, risks and the error log

**Honest limitations of the current demo:** context buildings are simplified OSM ways without multipolygon relations; terrain resolution is intentionally low; the scale bar is camera-derived, not survey-grade; one context building base elevation uses the footprint minimum so it "embeds" on steep ground (documented and accepted for M1 context); orthographic presets are explicitly rejected by the manifest validator.

**Risks carried into M2** (from the brief): editor vs camera control fights → tool-state machine first; GFA/footprint/coverage naming ambiguity → fixed by ADR-0004 explicit naming; gizmo instability at zoom → fixed screen-space sizes; sloped terrain intersecting masses → explicit base elevation + clearance warnings, no auto-deformation; Turf union cost inside the 150 ms metric budget (measure it).

**Error log** (quoted from `progress.md` — every row resolved): `npm create vite` interactive hang → manual pinned scaffold; Vitest DOM leak → explicit `cleanup()`; lazy route vs sync test → `findByRole`; studio chunk warning → accepted, lazy route; Playwright asserted stale copy → updated to product-facing heading; empty-state overlay blocked OrbitControls → `pointer-events-none`; Python TLS vs elevation API → `certifi`; 12 self-intersecting OSM footprints → repair pass + runtime simple-ring validation; Ekeberg cliff (−91 m relief) → moved to the 31 m-relief hillside.

---

## 14. Definition-of-done standing at handover

Per `AGENTS.md` §7: **M0 and M1 are done on every applicable checklist row** — scope matches the brief; tests pass against fixtures; `typecheck`/`lint`/`test`/`build` green; no `any` or unchecked casts; keyboard/focus/reduced-motion present; every visible control works; numbers derive from geometry; disclaimers and provenance visible; agent-log and progress updated; screenshots captured.

**M2 is partly done** — domain tests and fixtures pass, history is transactional, nothing in the UI uses it yet. No gate record, no screenshots. Do not mark M2 complete.

## 15. Work split — Claude Code vs DeepSeek

The goal is to save Claude tokens on work where a mistake is cheap and easy to spot in review. DeepSeek V4 Flash (`deepseek/deepseek-v4-flash`, in Antigravity) takes small, fully specified tasks. Claude keeps everything that shapes architecture, geometry correctness, interaction, or a gate.

### 15.1 Rules for DeepSeek (paste these with every task)

1. Read `AGENTS.md` first, then only the files named in the task card.
2. Work on the branch `deepseek/followups` (create it from `main`). **One commit per task**, message prefix given in the card. Do not push, merge or rebase `main`.
3. **Do not touch:** `src/features/massing/**`, `src/features/editor/history.ts`, `src/features/editor/commands.ts`, `src/lib/polygon.ts`, `src/lib/coordinates.ts`, `docs/decisions/**`, `public/sites/**`, `docs/status-report.md`, `progress.md`, `package.json`/lockfile. No new dependencies.
4. Before each commit, `npm run lint && npm run test && npm run build` must pass. If a task can't pass, stop and report — don't weaken or delete tests.
5. No `any`, no unchecked `as` casts, no React/Three imports in pure modules.
6. Log each task as one row in `docs/agent-log.md` (agent = `DeepSeek V4 Flash (Antigravity)`, outcome = `Pending Claude review`). Claude consolidates `progress.md` when it merges.
7. Finish with a short report: files changed, test count before/after, anything skipped or uncertain.

### 15.2 Claude-owned (do not delegate)

- Pointer/tool state machine, scene adapters, gizmos, raycasting (M2 deliverables 3, 6).
- Numeric inspector and its validation states (deliverable 5, QA-16 UI).
- Undo/redo keyboard wiring; locked-volume decision (§7.4.1).
- Clearance/boundary feedback, QA-06 (deliverable 9); snapping wiring and P1 edge/vertex snapping.
- Accessibility follow-ups: drawer `inert`, focus restore (§12 #1–2). Visual judgement calls: compass near eye level, mobile framing, z-fighting (§12 #6, #7, #10).
- Anything in the don't-touch list above, ADRs, M2 code review gate, QA table, screenshots of masses.
- **Reviewing and merging every DeepSeek commit.**

### 15.3 DeepSeek task cards (in priority order)

**D1 — Grid snapping helpers** · commit `feat(m2): add grid snapping helpers`
- New files only: `src/features/editor/snapping.ts`, `src/features/editor/snapping.test.ts`. Do not wire into commands or UI.
- Export `DEFAULT_GRID_STEP_M = 1`, `snapValue(value: number, step: number): number` and `snapPoint(point: Vec2, step: number, origin: Vec2 = [0, 0]): Vec2` (`Vec2` from `src/lib/coordinates.ts`).
- Rules: nearest multiple of `step`; ties round away from zero (`2.5 → 3`, `-2.5 → -3` at step 1); if `step` is not finite and > 0, or `value` is not finite, return the input unchanged; never return `-0`; results are clean for decimal steps (`snapValue(0.29, 0.1) === 0.3`, `snapValue(1.26, 0.25) === 1.25`). `snapPoint` snaps relative to `origin` (`snapPoint([3.4, 7.6], 2, [1, 1])` → `[3, 7]`).
- Done when: tests cover each rule above; pure module (no React/Three).

**D2 — `useSitePackage` idle state** (§12 #5) · commit `fix(m1): add idle state to useSitePackage`
- Files: `src/features/sites/useSitePackage.ts`, its consumers (`grep -rn useSitePackage src`), a new `useSitePackage.test.tsx`.
- Add `{ status: 'idle'; data: null; error: null }` to `PackageState`. A `null` `siteId` gives `idle`, including when it changes from a real id to `null`. Consumers must render for `idle` exactly what they render today for a missing site (no new UI).
- Test with `renderHook` from `@testing-library/react`; mock `loadSitePackage`. Done when: null → idle, id → loading → ready, id → null → idle.

**D3 — `fetchJson` timeout** (§12 #8) · commit `fix(m1): time out stalled site package requests`
- File: `src/features/sites/package.ts` (`fetchJson` only) + tests in `package.test.ts` or a new test file.
- Add a 15 000 ms default timeout. Combine with the caller's `signal` using a local `AbortController` (don't rely on `AbortSignal.any`); clear the timer in `finally`. On timeout throw the same error type `fetchJson` already uses for HTTP failures, with a message naming the URL and "timed out". A caller abort must still behave as it does today.
- Test with `vi.useFakeTimers()` and a mocked `fetch` that only settles when aborted. Done when: the timeout fires, the caller abort still works, the timer is cleared on success.

**D4 — Docs housekeeping** · commit `docs: sync plan, agent log and README`
- `task_plan.md` Phase 3: tick "Immutable domain model and fixtures" and "Undo/redo transactions"; add "(domain done; UI pending)" to "Numeric inspector and validation"; add the §7.4 decisions to "Key questions".
- `docs/agent-log.md`: add four rows for Claude Code (Opus 5.5), outcome `Accepted`, artifacts = commits `5e92e12`, `f250232`, `4d09bfc`, `4c054cd` with their subject lines (`git log --oneline`).
- `README.md`: list `python3 -m pip install certifi` as a prerequisite for rebuilding packages (§12 #9).
- Done when: no code changed; lint/test/build still pass.

**D5 — 1024×800 breakpoint screenshots** (§12 #4, partial) · commit `docs(m0): capture 1024x800 drawer breakpoint`
- File: `scripts/capture.mjs` — add `{ name: '1024x800', width: 1024, height: 800 }` to `viewports`.
- Run `npm run capture`. **Commit only the new `*-1024x800.png` files**; restore any other changed screenshot with `git checkout -- docs/screenshots`.
- Done when: the new images show the inspector collapsed into the drawer (below 1100 px). If capture fails, report the error; don't modify the app.

**D6 — Raw terrain checksums** (§12 #12) · commit `chore(m1): verify cached raw source checksums`
- Files: new `data/raw/SHA256SUMS` (from `shasum -a 256 data/raw/*.json data/raw/*.osm`), `scripts/build_site_packages.py`, README.
- In `--offline` mode, verify each cached file against `SHA256SUMS` before use and exit non-zero naming the file on mismatch.
- Run `python3 scripts/build_site_packages.py --offline`, then `git status public/sites` — it **must be clean**. If anything under `public/sites/` changed, revert it and report; packages are immutable.

### 15.3a Round 1 result (D1–D6)

All six merged into `main` (merge `9ebb4e4`) after review. Five accepted as delivered; **D3 accepted with a fix** — `response.json()` was returned un-awaited, so the timeout and caller abort no longer covered the body read (fixed test-first by Claude). Rows in `docs/agent-log.md` are marked accepted.

### 15.3b Round 2 cards (D7–D9)

Same rules as §15.1. Branch: `deepseek/round2` from current `main`. The don't-touch list now also includes `src/features/editor/snapping.ts` and `src/features/sites/**`.

**D7 — Undo/redo shortcut matcher** · commit `feat(m2): add undo/redo shortcut matcher`
- New files only: `src/features/editor/shortcuts.ts` + `.test.ts`. Not wired into the UI.
- Export `type ShortcutEvent = { key: string; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; targetTag?: string; targetEditable?: boolean }` (plain object, no DOM types) and `matchHistoryShortcut(event: ShortcutEvent): 'undo' | 'redo' | null`.
- Rules: mod = `metaKey || ctrlKey`. Undo = mod + `z` without Shift. Redo = mod + Shift + `z`, or Ctrl + `y` (not Meta + `y`). Key comparison is case-insensitive. Alt held → `null`. `targetTag` of `INPUT`, `TEXTAREA` or `SELECT`, or `targetEditable: true` → `null`, so native text undo keeps working.
- Done when: a test per rule, including Shift + `Z` arriving as uppercase `key`.

**D8 — Inspector input parsing and formatting** — ✅ **done by Claude** (needed for the inspector before round 2 started); `src/features/editor/inspectorInput.ts` follows this spec. **DeepSeek: skip D8.**

~~D8 original card~~ · commit `feat(m2): add inspector input parsing and formatting`
- New files only: `src/features/editor/inspectorInput.ts` + `.test.ts`. Read `parseMetres` in `src/lib/coordinates.ts` first; reuse it, do not modify it.
- Export `parseStoreys(text: string): number | null` — trims; digits only → integer; anything else (`''`, `'3.5'`, `'-1'`, `'3 storeys'`, `'1e2'`) → `null`. Range checks stay in `validateTier`.
- Export `formatInputValue(value: number): string` — 2 decimal places with a `.` separator, no unit (the design contract puts the unit as a suffix inside the field): `9.6 → '9.60'`, `-0.001 → '0.00'` (never `'-0.00'`), non-finite → `''`.
- Done when: tests cover every listed input; pure module.

**D9 — Footprint dimensions** · commit `feat(m2): add footprint dimension helper`
- New files only: `src/lib/dimensions.ts` + `.test.ts`. Import `Vec2` from `src/lib/coordinates.ts`; do not modify `polygon.ts`.
- Export `footprintDimensions(vertices: readonly Vec2[]): { width: number; depth: number; rotation: number }` — the minimum-area bounding rectangle, testing each convex-hull edge direction (O(n²) is fine for ≤ 200 vertices). `width ≥ depth`; `rotation` is the angle of the width axis from east, counter-clockwise, normalised to `[0, π)`; on ties prefer the smallest rotation. Fewer than 3 vertices → `{ width: 0, depth: 0, rotation: 0 }`.
- Tests: 18 × 12 rectangle → `18, 12, 0`; the same rotated 30° about its centre → `18, 12, π/6` (±1e-9); the 20 × 10 L-shape from `docs/qa/fixtures.md` → `20, 10, 0`; a 10 × 10 square → `10, 10, 0`; a 12 × 18 rectangle (taller than wide) → `18, 12, π/2`.

### 15.3c Round 3 cards (D14–D20) — scene look follow-ups

Same rules as §15.1. Branch: `deepseek/round3` from `deepseek/round2` at `e011315` or later (land cover and tree variety have landed; ready to start). Three-way split for this round: Claude owns visuals and review, Codex owns the land cover data pipeline (`docs/handoffs/C1-landcover.md`), DeepSeek owns the cards below.

**Don't touch (round 3):** `src/scene/**` except `CameraHud.tsx` for D17; `src/features/sites/**`; `scripts/build_site_packages.py`; `public/sites/**`; `docs/decisions/**`; `package.json` dependencies.

**D14 — Cull trees inside proposed masses (pure helper)** · commit `feat(scene): add point culling helper for masses`
- New files only: `src/lib/cullPoints.ts` + `.test.ts`. Reuse `pointInPolygon` from `src/lib/polygon.ts`; do not modify it.
- Export `pointsOutsideRings(points: readonly Vec2[], rings: readonly (readonly Vec2[])[]): Vec2[]` — keeps input order; a point on a ring edge counts as inside (removed); empty `rings` returns a copy of `points`.
- Tests: no rings; one square ring removing 2 of 5 points; a point exactly on an edge; two overlapping rings; order preserved. Claude wires it into `Trees.tsx`.

**D15 — E2E for the Streets and Trees layer toggles** · commit `test(e2e): cover streets and trees layer toggles`
- New file only: `e2e/layers.spec.ts`. Copy the canvas-compare technique from `e2e/smoke.spec.ts` ("the 3D view redraws…"): screenshot a 300 × 200 clip at the canvas centre, uncheck **Trees**, poll until the clip differs; re-check, poll until it differs again. Same for **Streets**. Use `/studio/compact-infill`, viewport 1440 × 900.
- Also assert the Streets and Trees checkboxes exist on both sites.

**D16 — Fixed-view screenshot refresh** · commit `docs(screenshots): refresh scene-look set at all viewports`
- Run `SHOT_PREFIX=scene-look-final npm run capture` (no `SHOT_VIEWPORT`) and commit only `docs/screenshots/scene-look-final-*` files. Delete the generated `scene-look-final-landing-*` files before committing. Do not commit any `m1-*` file.
- Report: list the files and flag any image where the 3D view looks blank, frozen (Top identical to Iso) or cut off.

**D17 — Legend swatches for the new layers** · commit `feat(scene): legend swatches for streets, trees, green and water`
- Edit `src/scene/CameraHud.tsx` only. Extend the bottom-left legend (the "Study boundary" row) to a vertical list. Add rows in this order, each a 12 × 8 px swatch with `rounded-[2px]` plus the existing label style: **Green space** `#CBDBC5`, **Water** `#BCD6E6`, **Streets** `#E2E1DD` with a 1 px `border-line` border, **Trees** a 8 px circle `#9BBA94`. Keep the study boundary row first.
- Show a row only when its layer is on: add a prop `layers: SceneLayers` (type from `ViewportCanvas.tsx`) and pass it from where `CameraHud` is rendered. Green and Water rows show when the `terrain` layer is on. If you cannot find where `CameraHud` is rendered without touching another `src/scene` file, stop and report.
- Keep it hidden below `sm` and keep the 1100 px offset rule. No new colours beyond these four.

**D18 — About page data notes** · commit `docs(about): list streets, trees and land cover sources`
- Edit `src/app/AboutPage.tsx` text only, in the existing © OpenStreetMap block: add one sentence saying streets, trees, parks, grass, woods and water come from the same OpenStreetMap extract, are simplified, and are drawn at illustrative widths and sizes. Use only the claim-policy wording in `AGENTS.md` §7. No new sections, no styling changes.

**D19 — Road-edge AO specks: investigation report (no code)** · commit `docs(qa): road edge AO speck investigation`
- In a local, uncommitted edit, try `ROAD_LIFT` 0.05 / 0.15 / 0.3 in `src/scene/siteGeometry.ts` and `aoRadius` 3 / 5 in `src/scene/SceneComposer.tsx`. For each of the 6 combinations, capture `compact-infill` Iso at 1440 × 900 and crop the park's north-west corner.
- Commit only `docs/qa/road-ao-specks.md` with a table (setting → speck count by eye, crop path) and the crops under `docs/qa/road-ao/`. **Revert both source files** before committing. Recommend one setting; Claude decides.

**D20 — Reusable GPU frame-rate probe** · commit `chore(scripts): add GPU frame-rate probe`
- New file only: `scripts/measure-fps.mjs`. Launch Chromium with `--use-angle=metal --enable-gpu --ignore-gpu-blocklist` (fall back to no flags off macOS), start or reuse the dev server like `scripts/capture.mjs`, and for each site at device scale 1 and 2 load `/studio/<site>`, wait 3 s, count `requestAnimationFrame` callbacks over 4 s and print `site dpr fps`. Add a row to the README commands table. Must pass `npm run lint`.

### 15.3c result (reviewed 2026-10-28)

D14–D20 accepted (agent log). D16 screenshots predate the later grade, so they are superseded; refresh at the M5 gate. D19: no specks, settings kept. Remaining issue: `e2e/massing.spec.ts` exceeds 30 s under software GL, assigned as D28.

### 15.3d Round 4 cards (D22, D21, D23, D26) — site import groundwork (M6 track, ADR-0006)

Same rules as §15.1. **Start only after round 3 has been reviewed and merged**, on branch `deepseek/round4`, preferably in its own git worktree (`git worktree add ../Terraform-ds4 -b deepseek/round4`) so it does not share a working tree with Claude or Codex. Background: `docs/plans/site-import-plan.md` §3–§5. Order: D22 → D21; D23 and D26 are independent.

**Don't touch (round 4):** everything outside the files named in each card. In particular `src/scene/**`, `src/features/sites/**`, `scripts/build_site_packages.py`, `scripts/spike-import.mjs`, `public/**`, `docs/decisions/**`. No new dependencies.

**D22 — Fixture recorder** · commit `chore(import): record site-import fixtures`
- New file `scripts/record-import-fixtures.mjs` (Node 22, `fetch`, descriptive `User-Agent`, one request per second). Writes into `src/features/import/__fixtures__/`:
  - `photon-grunerlokka.json` — `https://photon.komoot.io/api/?q=Grünerløkka%20Oslo&limit=5`
  - `photon-sodermalm.json` — same for `Södermalm Stockholm`
  - `kartverket-adresse.json` — `https://ws.geonorge.no/adresser/v1/sok?sok=Thorvald%20Meyers%20gate%2040%20Oslo&treffPerSide=5`
  - `kartverket-hoyde.json` — one `punkt` batch of 9 points around 59.9225, 10.7595 (`koordsys=4326`)
  - `README.md` — each file's URL, fetch date (UTC), licence (Photon/OSM ODbL; Kartverket CC BY 4.0).
- Do not record map tiles (Codex owns tiles). Commit the script and the fixtures.

**D21 — Geocoder clients** · commit `feat(import): Photon and Kartverket geocoder clients`
- New files only: `src/features/import/geocode.ts` + `.test.ts` (tests use the D22 fixtures via a mocked `fetch`; no live network in tests).
- Export `type PlaceResult = { id: string; label: string; detail: string; latitude: number; longitude: number; source: 'photon' | 'kartverket' }`.
- `searchPhoton(query: string, signal?: AbortSignal): Promise<PlaceResult[]>` — `https://photon.komoot.io/api/?q=…&limit=8&lang=en`, bias to the Nordics with `&bbox=4,54,32,71`; label from `name` (or `street housenumber`), detail from `district/city/country`.
- `searchKartverket(query: string, signal?: AbortSignal): Promise<PlaceResult[]>` — Adresse-API `sok`, `treffPerSide=8`; label `adressetekst`, detail `poststed`; coordinates from `representasjonspunkt` (`lat`, `lon`).
- `searchPlaces(query, signal)` — runs both, Kartverket results first, de-duplicates results within 25 m, max 8. Empty / whitespace query → `[]` without a request. Every request has an 8 s timeout and honours `signal`; one failing source must not fail the other.
- Validate every response field; drop malformed entries instead of throwing. No `any`.

**D23 — Licence and usage verification (no code)** · commit `docs(data): verify site-import sources`
- New file `docs/data/import-sources.md`. For each source in plan §3 (OpenFreeMap tiles + style, OpenMapTiles schema, OpenStreetMap, Kartverket høydedata, Kartverket Adresse-API, AWS Terrain Tiles, Photon, Nominatim, Overpass, Dataforsyningen, Lantmäteriet Byggnad, Kartverket FKB): official licence link, exact attribution string to display, usage policy limits (rate, caching, autocomplete, commercial), and a verdict **Ship / Ship with conditions / Do not ship (needs backend or agreement)**. Quote at most one short phrase per source; link the rest. Flag anything that contradicts plan §3.

**D26 — City quick picks** · commit `feat(import): Nordic city quick picks`
- New files only: `src/features/import/cities.ts` + `.test.ts`.
- Export `type QuickPick = { id: string; label: string; country: 'NO' | 'SE' | 'DK' | 'FI'; latitude: number; longitude: number; frameMetres: 400 }` and `QUICK_PICKS` for Oslo (Grünerløkka), Bergen (Bryggen), Trondheim (Bakklandet), Stockholm (Södermalm), Göteborg (Haga), Malmö (Möllevången), Copenhagen (Nørrebro), Aarhus (Latinerkvarteret), Helsinki (Kallio). Coordinates from OpenStreetMap place nodes, 4 decimals, source noted in a comment per row.
- Tests: ids unique; each point lies inside its country's bounding box (NO 4–31.5 E / 57.9–71.2 N, SE 10.9–24.2 / 55.3–69.1, DK 8–15.2 / 54.5–57.8, FI 19–31.6 / 59.7–70.1).

### 15.3d result (reviewed 2026-10-28)

D17b, D22, D21, D26, D23 accepted and merged (`d7921e4`). Suite after merge: lint, typecheck, 314 unit tests, build pass; e2e 9/10 (massing timeout, D28).

### 15.3e Round 4b cards (D28–D29) — after round 4, same worktree and branch

Same rules as §15.1. Continue on `deepseek/round4` in `../Terraform-ds4` after D17b/D22/D21/D26/D23. Codex is working in the main checkout on `src/features/import/**` and `src/features/sites/manifest.ts`; do not touch those.

**D28 — No ambient occlusion on software renderers** · commit `perf(scene): skip AO on software WebGL renderers`
- Problem: `e2e/massing.spec.ts` now exceeds its 30 s test timeout because N8AO is very slow under software GL (SwiftShader in headless Chromium); weak laptops pay the same cost.
- New files `src/scene/rendererTier.ts` + `.test.ts`: export `isSoftwareRenderer(rendererName: string): boolean`, true when the name matches `/swiftshader|llvmpipe|softpipe|software|basic render/i`. Test real strings: `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) …), SwiftShader driver)` → true; `ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version)` → false; `llvmpipe (LLVM 15.0.7, 256 bits)` → true; `''` → false.
- Edit `src/scene/ViewportCanvas.tsx`, the `AmbientOcclusion` component only: read the renderer name once via `gl.getContext()` and the `WEBGL_debug_renderer_info` extension (`UNMASKED_RENDERER_WEBGL`); if the extension is missing, treat it as hardware. Return `null` when `isSoftwareRenderer` is true. Comment why.
- Done when: `npx playwright test e2e/massing.spec.ts` passes **without** raising any timeout; `e2e/smoke.spec.ts` (including "the 3D view redraws…") still passes. Do not change `playwright.config.ts` or any timeout.

**D29 — Hide trees inside proposed masses** · commit `feat(scene): hide trees inside proposed masses`
- Uses your D14 `pointsOutsideRings` (`src/lib/cullPoints.ts`); do not modify it.
- New files `src/scene/massFootprints.ts` + `.test.ts`: export `visibleTierFootprints(document: ScenarioDocument): Vec2[][]`, the footprint vertices of every tier of every **visible** volume (hidden volumes excluded). Tests: hidden volume excluded; stacked tiers both included; empty document → `[]`.
- Edit `src/scene/Trees.tsx`: new optional prop `exclude?: readonly (readonly Vec2[])[]`; filter `sitePackage.trees` with `pointsOutsideRings` before variant/placement (memoised on trees and exclude). Edit `src/scene/ViewportCanvas.tsx` only to pass `exclude={visibleTierFootprints(displayedDocument(editor))}` (memoised) to `<Trees>`. Live drag previews may update the culling; that is fine.
- Done when: unit tests pass; e2e still passes; describe in the report how you verified a drawn mass over the Compact Infill park removes the trees under it (DOM/instance-count evidence, since you cannot view images; e.g. expose nothing new, but compare a canvas clip before/after like `e2e/layers.spec.ts`).

### 15.4 Handoff back to Claude

When DeepSeek finishes, tell Claude "review `deepseek/round2`" (round 1 used `deepseek/followups`). Claude will diff it against `main`, check the work against the task cards and AGENTS.md, re-run the suite, merge accepted commits, fix or reject the rest, mark the rows in `docs/agent-log.md` and update `progress.md` and this report.

## 16. Next actions

**M2 gate (2026-10-28):** code review and QA-03–08 pass with follow-ups — see `docs/reviews/M2-code-review.md` (self-review; independent review recommended). Milestone acceptance is **not** met until the follow-ups below land or are descoped by ADR.

**DeepSeek (in progress):** round 2 on `deepseek/round2` — D7, D9, D10–D13 from the prompt given 2026-10-28 (D8 already done by Claude).

**Claude (next, on `main`) — from the M2 review follow-ups:**
1. Review and merge `deepseek/round2`; wire D7 shortcuts and D9 width/depth/rotation readouts; add the M2 review row to `docs/agent-log.md`.
2. Missing tools: add mass at point, scale footprint, vertex edit — or an ADR descoping them (user decision).
3. Accessibility: position alternative to dragging (WCAG 2.5.7) and arrow keys on the roof handle.
4. Snap drawn corners to the grid; place lower-tier handles on exposed roof; count only visible masses in the warning summary; dispatch `pointerCancel` on unmount.
5. Palette decision (design contract), drag-time FPS measurement, short interaction recording, legend overlap if D11 does not land.
6. Independent review, then M2 acceptance (G4).

## 17. Appendix — key artifact index

| Artifact | Path |
|---|---|
| Product requirements | `Terraform_Comprehensive_PRD_v1.md` (648 lines) |
| Operating guide | `AGENTS.md` |
| Milestone briefs M0–M6 | `docs/milestones/*.md` |
| Decisions | `docs/decisions/ADR-000{1,2,3,4}-*.md` |
| Review records | `docs/reviews/M0-*.md`, `docs/reviews/M1-*.md` |
| QA fixtures & protocol | `docs/qa/fixtures.md` |
| Data / design contracts | `docs/data/site-package-spec.md`, `docs/design/design-contract.md` |
| Planning memory | `task_plan.md`, `findings.md`, `progress.md`, `docs/agent-log.md` |
| Site packages (immutable) | `public/sites/{compact-infill,sloped-edge}/` |
| M2 domain + history | `src/features/massing/*`, `src/features/editor/*`, `src/lib/polygon.ts` |
| DeepSeek task cards | §15.3 of this report; branch `deepseek/followups` |

*Report ends. Prepared by Cline on 2026-10-27; updated by Claude Code (Opus 5.5) on 2026-10-27 after commit `4c054cd`. Everything claimed green in §10 was re-run that day.*