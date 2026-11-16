# Terraform — Project Report

**Subject:** Terraform v1 — an architectural site-analysis portfolio prototype
**Date:** 16 November 2026
**Report prepared by:** Cline (continuation agent)
**Source of truth:** `Terraform_Comprehensive_PRD_v1.md` (v1.0, 26 Oct 2026)
**Code state reported on:** branch `build/foundation` @ `01c514b`
**Production state:** `main` @ `2089fd4` (deployed)

---

## 1. Executive summary

Terraform is a browser-based 3D architectural workspace that lets a visitor explore a real
Oslo site, shape a conceptual building on it, and read how that building sits in its
environment. It is a **portfolio prototype**, not a commercial product: no accounts, no
payments, no backend, no multi-tenancy, and no claim to regulatory or engineering authority.

The product does three things, in this order (ADR-0020):

> **Find a site → analyse it → export an image or a clip.**

Two curated Oslo study areas ship as static, openly licensed site packages — *Compact Infill*
and *Sloped Edge* — and any address can be imported live. On top of the 3D model sit five
analysis cards, each a separate discipline, with the open card being the analysis drawn on the
map:

| Card | What it does | ADR |
|---|---|---|
| **Sun** | Sun hours on every surface in the analysis circle — ground, roofs and façades — from a worker, for a date and a time window | ADR-0031 |
| **Wind** | Live 2D lattice-Boltzmann flow, liftable to every whole metre, with Comfort/Direction/Worst-case views, an 8-direction rose and streamlines | ADR-0014/15/28/29/30 |
| **Noise** | Statens vegvesen's official strategic road-noise map as 5 dB bands | ADR-0034 |
| **Water** | Runoff screening on the 1 m terrain: flow paths and depressions, buildings as blocks | ADR-0038 |
| **Snow** | Winter climate context from NVE's snow model, for open terrain | ADR-0039 |

The defining constraint of the whole project is that **every number is derived from geometry or
a tested algorithm**, and **where the tool cannot make a claim, the interface says so**. The
domain logic is renderer-free and unit-tested without React or Three.js.

### Where it stands

- **1 196 unit tests** pass, 4 skipped, across 124 test files.
- The **full Playwright suite** on the production build: **49 passed, 12 opt-in skipped, 0 failed**.
- **GitHub CI** (lint, test, build, and the Playwright suite in three shards) is **green** on the branch.
- **39 ADRs**, 257 commits on the branch, 315 across all refs, 125 reference screenshots.
- ~**38 400 lines** of TypeScript/TSX/Python/MJS across `src/`, `scripts/` and `e2e/`.

**The important caveat:** none of the foundation work is on the live site yet. `main` is 13
commits behind the branch, and production is serving an older bundle
(`index-CGMY84U2.js`) that does not even contain the site packages at their current paths. See
§8.

---

## 2. What the project is — and is not

The PRD is explicit, and the repository enforces the line in code, in ADRs and in the UI copy.

| It is | It is not |
|---|---|
| A portfolio piece and case study | A commercial SaaS |
| An early-stage site-planning tool | A BIM authoring environment |
| A screening and comparison instrument | An engineering wind study or noise survey |
| Geometry-derived figures | A dashboard with decorative charts |
| Built on openly licensed public data | A holder of official parcels or regulations |

**Approved claim language** (AGENTS.md §7):

| Use | Never use |
|---|---|
| `Curated Oslo demo · simplified context` | `planning compliant` |
| `Illustrative design constraints` | `verified daylight` |
| `Local ENU metres` | `official parcel` |
| `Geometric sun direction` | `BIM-ready`, `IFC deliverable` |

---

## 3. Architecture and the engineering rules

### 3.1 The coordinate contract (ADR-0002)

All authored geometry lives in a **local East/North/Up metre frame**. Latitude and longitude are
never mesh vertices. One conversion pipeline serves raycasts, snapping, measurement and export.
This is the single most load-bearing rule in the codebase: it is what makes the domain logic
testable without a renderer, and what lets the import path, the curated packages and the exports
all agree.

### 3.2 Renderer-free domain logic

Every analysis — solar position, sun hours, the lattice-Boltzmann wind solver, flow routing,
terrain sections, runoff, snow statistics, area and coverage — is a **pure function over plain
data**. `src/features/analysis/` contains 40 modules — 35 domain modules and 5 React hooks —
and none of the domain modules import React or Three.js. They are exercised by 124 test files
with no canvas mounted.

### 3.3 Workers for anything heavy

Five analyses move off the main thread so the studio never blocks:

| Worker | Module | Why |
|---|---|---|
| `circleSunWorker.ts` | Sun hours over every surface in the circle | Per-surface ray sampling |
| `roofSolarWorker.ts` | Roof solar irradiation | Roof-by-roof sampling |
| `flowWorker.ts` | Lattice-Boltzmann wind solve | ~1.8 m cells across a 60–250 m circle |
| `runoffWorker.ts` | Runoff screening | 458 016 cells filled and routed |
| `sweepWorker.ts` | 8-direction wind sweep | 8 full solves |

`useRunoff` adds a 250 ms debounce so a drag cannot start a computation per frame; the previous
result stays on the map, marked as computing, until the new one arrives.

### 3.4 Layer provenance (ADR-0032)

Every layer carries its provenance in a typed contract: owner, dataset, URL, licence, licence
URL, attribution, retrieval date, data year and a use limitation. The **Parameters panel lists
the sources of the layers actually on screen**, and the **export credits are burned into the
still, the white-model pass and the analysis pass** (never into the depth pass — a text band
would corrupt the depth signal).

This is the mechanism that makes the truthfulness rule enforceable rather than aspirational.

### 3.5 Stack

| Layer | Choice | Note |
|---|---|---|
| Build | Vite 8 + TypeScript 6.0.3 | Pinned: `typescript-eslint` 8.72 requires `<6.1.0` |
| UI | React 19, Tailwind 4, PRD-token CSS variables | No component library |
| 3D | React Three Fiber + Three.js, `postprocessing`, `n8ao` | |
| State | Zustand | |
| Data | `suncalc`, `@turf/turf`, `maplibre-gl`, `@mapbox/vector-tile`, `pbf` | Import path only |
| Storage | `dexie` (IndexedDB) | |
| Fonts | `@fontsource-variable/geist` + Geist Mono | Self-hosted, for the offline demo |
| Test | Vitest + Testing Library + jsdom; Playwright (Chromium) | 124 unit files, 15 e2e specs |

The studio route is **lazy-loaded**, so the landing stays at ~92 kB gzip.

---

## 4. Milestone history

The v1 release path is M0 → M5, with M6 (AI, reports, GLB, map context) gated separately and
never allowed to destabilise v1.

| Milestone | Outcome | Evidence |
|---|---|---|
| **M0** Foundation and visual shell | Pinned scaffold, design tokens, landing/About/404, canvas-first studio shell, focus-managed responsive inspector | Visual gate **PASS**, code review **PASS**, both with follow-ups (`M0-visual-gate.md`, `M0-code-review.md`) |
| **M1** Site packages and camera | Two immutable Oslo packages, local ENU rendering, terrain/context/boundary layers, camera presets, compass, scale bar | Geometry QA **PASS**, code review **PASS**, visual review **PASS**. Measured **60.1 fps at 1440×900** on an M1 Pro |
| **M2** Massing engine | Immutable model, factories, aggregates, validation, serialisation, command set, snapshot undo/redo with preview/commit/cancel | `M2-code-review.md` — pass with follow-ups |
| **M3** Live analysis | Sun, wind and the analysis circle; the sun card becomes the default | `M3-code-review.md`, `M3-evidence.md` |
| **M4** Scenarios and persistence | Scenario repository, migrations, autosave | `M4-code-review.md` — pass with follow-ups; persistence core reviewed independently |
| **M5** Portfolio polish | Landing, empty/error states, onboarding, deployment | `M5-a11y.md`, `M5-perf.md` |
| **M6** Optional | AI suggestions, report, GLB, map context | Not started — gated after M5 |

### 4.1 A scope reduction the reader should know about

**ADR-0020 (owner, 10 Nov 2026) simplified the product** from the PRD's original shape to
search → analyse → export. The recovery tag is `pre-simplify`.

Removed from the UI and the code:

- the **scenario system** (Concept A/B, autosave, recovery, notes) and **Compare**;
- the studio guide;
- project JSON export/import and data notes (the attribution line stays);
- the **design check** (envelope, setback, height limit, terrain checks);
- the study-boundary, setback and height-limit layers;
- the study-area facts and the area/GFA tile;
- tiers, use, storey height, base elevation and the name field;
- manual render-quality and size controls (the automatic tiers of ADR-0018 remain).

**Blocks are session-only** and are not saved across a reload. The `src/features/scenarios/`
domain module still exists and is still tested, but the UI for it was removed.

This is a deliberate, documented product decision — not an unfinished milestone. Any report that
counts M4 as "delivered" without this caveat would mislead.

---

## 5. What is actually built, area by area

### 5.1 Site data and the two curated packages

Built offline from openly licensed sources and committed as immutable packages under
`public/sites/`. Raw caches live in `data/raw/` with SHA-256 checksums, so rebuilds are
reproducible offline and the Python builder verifies them before use.

| | Compact Infill | Sloped Edge |
|---|---|---|
| Origin (WGS84) | 59.9235 N, 10.758 E | 59.89825 N, 10.77375 E |
| Buildings | **520** | **230** |
| Context halo | 200 m | 200 m |
| Study area | 45 600 m² | 71 300 m² |
| Terrain samples | 1 880 | 2 100 |
| Trees | 926 | 251 |
| Measured heights | 520 of 520 (100 %) | 220 of 230 (95.7 %) |

Layers and assets per package: `terrain`, `buildings`, `studyArea`, `thumbnail`, `attribution`,
`roads`, `trees`, `landcover`, `heights`, `noise`, `parcels`, `hazards`, `terrain1m`, `snow`.

**Sources:** OpenStreetMap footprints (ODbL 1.0) · Kartverket DTM1 terrain (CC BY 4.0) ·
Kartverket surface model for measured heights (CC BY 4.0) · Kartverket eiendomskart parcels ·
Statens vegvesen strategic noise map · NVE and Kartverket hazard layers · NVE snow model.
**Twelve land-cover kinds** on both the curated and import paths. No invented parcel or
regulation data anywhere.

### 5.2 The import path

A visitor can enter any address. The importer geocodes, frames the site, and assembles a
package from live services: OpenMapTiles for buildings, roads and land cover; Kartverket for
elevation; Statens vegvesen for noise; Geonorge WFS for parcels and hazards; OpenStreetMap's
own API for water outlines and mapped trees.

Three defects were found and fixed here, each with its own ADR:

- **ADR-0027** — a river is recognised as a river. Kartverket spells the elevation-curve source
  `hoydekurver`, but ADR-0025's rule only matched `høydekurver`, so the rule had *never run* and
  every imported river was a 16–20 m wall of ground. The unit test had the same wrong spelling,
  so it passed.
- **ADR-0027** — one OpenStreetMap answer per frame replaces the generalised z14 tiles and the
  unreachable Overpass instances.
- **ADR-0024** — no tree stands on painted water, on either path.

### 5.3 The five analyses

**Sun (ADR-0031).** Sun hours on every surface inside the analysis circle — the open ground and
every roof and façade of the buildings touching it — for the card's date and a From–To window,
computed in a worker. The separate Façade option was folded into it, and sun hours became the
Sun card's default. The card follows the measured heights when the site has them (the sun figure
moved 9.0 → 8.5 h on Compact Infill when the heights arrived).

**Wind (ADR-0014/15/28/29/30).** A D2Q9 lattice-Boltzmann flow in a worker, solved inside a
movable 60–250 m circle at roughly 1.8 m cells. Views: Comfort (Lawson activity bands),
Direction (continuous m/s ramp), Worst case (8 directions, equally weighted — not climate-
weighted), and Delta against a saved baseline. The lift reaches **every whole metre**: the solver
solves at 2 m and wherever a roof ends near the circle, and each metre between is the covering
solve scaled by the wind profile. ADR-0030 lets wakes above 2 m refill with air from above, so
calm bands no longer lie over buildings lower than the disc. A red handle at the centre lifts
the map; terrain-following, m/s above 2 m, buildings below the disc faded.

**Noise (ADR-0034).** Statens vegvesen's published strategic map as 5 dB bands, on curated sites
and imports alike. **The old highway-class heuristic was deleted**, not kept as a fallback. The
registration gate — 90 % of major-road samples in the ≥ 65 dB band — passes at 100 %.

**Water (ADR-0038).** New in this branch. A renderer-free port of the feasibility
`terrain_bench.py`: Priority-Flood+Epsilon fills the hollows, D8 hands each cell its water to its
steepest downhill neighbour, and **every building — context and drawn — is raised 10 m as a
block** so the flow goes around it. Runs in a worker; draped by the same texture path as the
noise bands.

The one figure is the share of open ground in depressions or enclosed courtyards: **16 % on
Compact Infill, most of it courtyards**. No depth, volume, rainfall or return period appears
anywhere. The card states the model's limits plainly, including that *a courtyard closed in by
buildings shows as a depression, because the model has no gateways or drains* — the courtyards
are a property of the block structure, not of flood risk. Conserved on the shipped tile with 520
buildings burned in: 458 016 cells, all drained, 0 pits.

**Snow (ADR-0039).** New in this branch. Winter climate context from NVE's grid time-series API
(`sd` theme only, daily snow depth in cm back to 1957, 1 km seNorge grid, no credentials needed).
The `snowload` theme the same API offers is **never read** — a snow load is an engineering value
(NS-EN 1991-1-3), and the ADR says why.

| Site | Cell altitude | Snow days, median (fewest–most) | Deepest snow, median (range) | Snowiest month |
|---|---|---|---|---|
| Compact Infill | 22 m | 30 (0–131) | 16 cm (5–56 cm) | February, 8 cm |
| Sloped Edge | 139 m | 52 (1–138) | 20 cm (5–61 cm) | February, 12 cm |

The card says it is a 1 km model for open terrain, not a measurement at the site, and that a
street, courtyard or roof will differ. A winter cut short, or with more than 10 missing days, is
**dropped**, not summarised from part of a season.

### 5.4 Editing

A minimal but complete massing editor: draw a footprint, set storeys and height, delete, undo
and redo. **One pointer drag = one undo entry; `Esc` cancels; pointer release commits** — the
transactional rule from AGENTS.md §1.6, enforced by a snapshot history with preview/commit/cancel.

Wind, sun and noise all react live to the drawn geometry. A block you draw is a block in the
runoff model too: the paths go around it.

### 5.5 The scene

Rendered with React Three Fiber. Terrain, context buildings, trees, land cover, roads, water as
a true surface (ADR-0025), measured roofs (ADR-0022), the analysis circle, and the overlays:
slope (ADR-0037), noise bands, roof solar, sun hours, parcels, hazard outlines, runoff.

Camera presets (3D, plan, north, south, street), a compass, a scale bar and a HUD. The scene is
draped, not lit flat; buildings sit on the ground rather than hovering.

### 5.6 Export (ADR-0019)

Four passes — depth, white model and analysis overlay — plus a 6-second clip recording. Credits
for the visible layers are burned into the still, the white-model pass and the analysis pass, and
deliberately **not** into the depth pass, which would corrupt the depth signal.

---

## 6. The foundation branch (`build/foundation`)

13 commits ahead of `main`, cut from the closed feasibility study, on draft PR #18.

| Package | What it adds | ADR | Status |
|---|---|---|---|
| WP-0/1 | Baseline and label corrections: the wind view lost its safety class; sun hours read in 0.5 h steps | — | ✅ |
| WP-2 | Per-layer provenance, attribution panel, export credits | ADR-0032 | ✅ |
| WP-3 | Measured building heights and gables from Kartverket's surface model | ADR-0033 | ✅ |
| WP-4 | Official road-noise map; the heuristic deleted | ADR-0034 | ✅ |
| WP-5 | Parcel layer from the eiendomskart, with property number and area | ADR-0035 | ✅ |
| WP-6 | Hazard facts as "mapped here / nearby / not mapped"; source health check | ADR-0036 | ✅ |
| WP-7 | 1 m terrain tile; slope overlay and a section tool | ADR-0037 | ✅ |
| WP-8 | Runoff screening — the owner's request | ADR-0038 | ✅ |
| — | Snow as winter climate context — the owner's request | ADR-0039 | ✅ |
| WP-9 | Cut/fill pad | — | ❌ not started |

Two details worth recording. First, the review of WP-5 to WP-7 found **eight issues** — three
correctness, four efficiency, one convention — and all eight were fixed. Second, the **licence
correction** committed alongside this work: NVE names NLOD without a version, so the provenance
contract gained the value `NLOD` (no version) and the hazard layers' "NLOD 1.0" was corrected.
Claiming a version the publisher does not state would be exactly the kind of overreach this
project forbids elsewhere.

---

## 7. Quality evidence

### 7.1 Tests

| Suite | Result |
|---|---|
| Vitest unit/component | **1 196 passed**, 4 skipped, 124 files |
| Playwright, full suite, production build | **49 passed**, 12 opt-in skipped, **0 failed** |
| CI | lint + test + build + 3 Playwright shards — **all green** |
| Source health check | 20 sources, **20 unchanged**, 0 failed |
| QA fixture rows | QA-01 … QA-18 all present |

### 7.2 Performance

Measured on an Apple M1 Pro, 1440×900 @2×, at commit `2089fd4`:

| Window | Compact Infill | Sloped Edge |
|---|---|---|
| Idle steady | 68.3–68.6 fps, p95 17.4–17.8 ms | 72.4–73.5 fps, p95 17.4–17.8 ms |
| Orbit drag | 64.9–65.8 fps, p95 18.4–24.3 ms | 69.3–70.2 fps, p95 17.7–18.1 ms |
| Wind card open (solve) | 66.2–66.7 fps, 0–1 long task | 71.8–72.0 fps, 0–1 long task |
| Wind steady | 67.3 fps, p95 17.4–17.8 ms | 65.1–65.5 fps, p95 17.6–24.1 ms |

**90 draw calls** idle, 99–102 with wind on. Time to canvas 911 ms; time to the Sun card 919 ms.

### 7.3 Records

39 ADRs, 125 reference screenshots, 30 review documents, 18 QA fixture rows, a feasibility study
in nine parts, and a `docs/agent-log.md` recording every engagement with its rationale and its
accept/reject decision.

### 7.4 Governance

The project runs a **roster-and-gates** model rather than autonomous agents: one lead per
milestone, written handoffs, and named gates — G0 architecture, G1 code review, G2 domain QA,
G3 visual, G4 acceptance. Every deviation from the plan became an ADR.

---

## 8. The gap between the branch and production

This is the most operationally important thing in this report.

| | Branch `build/foundation` | Production (`main`) |
|---|---|---|
| Commit | `01c514b` | `2089fd4` (15 Nov) |
| Foundation layers | All present | **Absent** |
| Water / Snow cards | Present | **Absent** |
| Studio route | `200` | **`404`** |
| `/sites/*/manifest.json` | `200` | **`404`** |
| Bundle | `index-DpLE-LiN.js` | `index-CGMY84U2.js` |

**Production does not currently serve the site packages at all.** The live site 404s on
`/studio/compact-infill`. Whatever the intent, the deployed artefact is far behind both `main`
and the branch.

The foundation work is on **draft PR #18**, open and green. The PR description instructs that it
not be merged before the owner decides eight open points:

1. The old noise estimate is deleted, not kept as a fallback.
2. The wind legend still carries the Lawson activity names.
3. A weekly CI run of the source health check is proposed; no workflow is added.
4. `data/raw/` grows from ~5 MB to ~21 MB.
5. Sloped Edge has 95.7 % measured heights against a 99 % plan figure.
6. WP-9 (cut/fill) is not started.
7. **The NVE licence** — confirm with NVE before any commercial use.
8. The runoff screening is not compared against a reference tool (WhiteboxTools or TauDEM).

---

## 9. Open work, in priority order

### 9.1 Blocking

1. **Get the foundation work in front of users.** Merge PR #18, or promote the preview
   deployment. Until then the live site is missing most of the product.
2. **Confirm the NVE licence** before any commercial use (ADR-0039).
3. **The independent review** the plan foresees before merge (owner: Opus or Codex).
4. **The runoff and snow work has had no `/code-review` pass and no finish-gate pass** over its
   captures. The earlier WP-5–WP-7 review found eight real issues; a comparable pass here is
   warranted.

### 9.2 Product and data

5. **Phase B of the context-fidelity plan** — building **parts** and relations. The curated
   builder reads building *ways* only, so a building drawn as a multipolygon relation, or one
   with `building:part`, still arrives as a single plain volume. The import path is capped at
   z14 by the OpenMapTiles schema.
6. **WP-9** — the cut/fill pad, the last stretch package.
7. **Tree shadows**, which changes ADR-0021's limitation wording and must change it in the same
   change.
8. **An import-path capture** of the new land-cover taxonomy, and a sloped import capture of the
   wind lift.

### 9.3 Housekeeping

9. **The About page is out of date.** Its "How the model stays honest" section still describes
   noise as *"road class and distance, with a fixed reduction behind buildings"* — the heuristic
   ADR-0034 deleted — and describes the wind in pre-lift terms. The PRD is the source of truth
   and is accurate; the About copy is not. This is the single cheapest correctness fix
   available.
10. **The milestone briefs** in `docs/milestones/` still show M2–M5 as "Pending" and
    `docs/status-report.md` is dated 27 October and describes M2 as the active milestone. Both
    are stale against the code.
11. **The `design-ui-finish-gate-reviewer` pass** over `context-*.png`, `water-*.png`,
    `panel-*.png` and `wind-lift-*.png` — still self-reviewed, never independently gated.
12. **M1/M2 follow-ups** in `docs/reviews/M1-code-review.md` and `M0-code-review.md`.

---

## 10. Honest assessment

**What is genuinely strong.**

The truthfulness discipline is the project's best feature and it is unusual. The runoff card
tells you it has no drains; the snow card tells you it is a 1 km model and not a measurement;
the noise card says "not mapped" is not "safe". Every layer names its publisher and licence.
This is a portfolio piece that would survive a sceptical technical reviewer, because the
weaknesses are stated rather than hidden.

The engineering is disciplined in the ways that matter: renderer-free domain logic, a single
coordinate pipeline, typed boundaries with no `any` in domain schemas, workers for everything
heavy, and a transactional edit model.

The data is real. 520 individual context buildings with measured heights, 926 trees, twelve
land-cover kinds, official noise maps, real parcels, real hazard layers — all from public
sources, all attributable, all reproducible offline from checksummed caches.

**What is weak, honestly.**

The **documentation drift** is the clearest weakness. The About page describes a noise model
that no longer exists; the milestone briefs and the status report describe a project state
months out of date. The code is in far better shape than the prose describing it, which means a
reviewer reading the docs first would draw wrong conclusions.

**Deployment** is the other. The live site is missing the site packages entirely. Whatever the
history, it is the single most visible gap between what the project is and what a visitor sees.

The **scope churn** from ADR-0020 removed real functionality — scenarios, comparison, the design
check — and the domain code for scenarios still sits in the tree, tested but unreachable. That is
untidy, though the decision itself was sound and properly recorded.

**Density is a live cost.** Every analysis that scales with building count has had to be
re-measured: the roof-solar scan and the noise screening both were (ADR-0023 §8), and the runoff
screening adds a 458 016-cell computation. A live source is also a moving target — Kartverket's
source names and OpenStreetMap's endpoints both changed under the studio (ADR-0027).

---

## 11. Where to look

| | |
|---|---|
| **Local** | `npm run dev`, or `npm run preview` for the production build |
| **Live studio (branch)** | `http://127.0.0.1:4173/studio/compact-infill` |
| **Public preview** | `https://terraform-studio-597hvyzvz-guslee93-7797s-projects.vercel.app/studio/compact-infill` |
| **Production** | `https://terraform-studio.vercel.app` — currently behind, see §8 |
| **Pull request** | [#18](https://github.com/Guslee93/terraform/pull/18) — draft, green, not merged |
| **PRD** | `Terraform_Comprehensive_PRD_v1.md` — the source of truth |
| **ADRs** | `docs/decisions/` — 39 records, ADR-0001 to ADR-0039 |
| **Build report** | `docs/reviews/build-foundation-report.md` — §11 covers the runoff and snow work |
| **Decision records** | `docs/agent-log.md`, `task_plan.md`, `progress.md`, `findings.md` |
| **Milestone briefs** | `docs/milestones/M0`–`M6` |
| **Context plan** | `docs/plans/context-fidelity-plan.md` — Phase B is the next build |
| **QA fixtures** | `docs/qa/fixtures.md` — QA-01 to QA-18 |

---

*Prepared by Cline from the repository's own records: the PRD, 39 ADRs, the milestone briefs, the
build report, the QA fixtures, the feasibility study, the performance evidence and the git
history. Every figure in this report was read from a file or a command output; where a document
and the code disagreed, the code was taken as the state and the drift is recorded in §9.*
