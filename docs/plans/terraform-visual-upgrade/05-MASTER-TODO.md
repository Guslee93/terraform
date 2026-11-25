# 05 — Master backlog

Gate-ordered, dependency-driven, no calendar estimates. Each task names its owner model, a different reviewer, its files, its tests and its acceptance. Handoff prompts for the first packages are in `06-AGENT-HANDOFF-PROMPTS.md`; later ones use the template there.

**Task types:** `[FIX]` confirmed necessary fix · `[EXP]` research experiment · `[CAND]` candidate integration (go/no-go gate before production) · `[OPT]` optional improvement · `[DOC]` documentation · `[TEST]` test or evidence.

**Base branch.** Until PR #18 is merged, all work branches from `build/foundation` and PRs target `build/foundation`. After the merge, branch from and target `main`. Agents open PRs; **only the owner merges**, because `main` deploys to production.

**Model roster** (availability confirmed by the owner, 08 Q3):

| Model | Role in this plan |
|---|---|
| Fable 5.2 | Planner, integration decisions, final design authority. Writes ADR drafts and handoffs. Not a default implementer |
| Claude Opus 5.5 | Renderer and shader integration, risk-sensitive domain or input work, substantive code review |
| Codex (model as available) | Well-scoped TypeScript/R3F modules, tests, harnesses, refactors with a pixel or test oracle |
| DeepSeek | Tests, fixtures, evidence runs, reference comparisons (as in M3–M5) |
| Cline + small model (MiniMax M3.1-Flash is the one wired in `agent-round.yml`) | Copy edits, docs, small components, repetitive fixtures |
| Owner | Merges, deploys, Vercel access, visual choices, licence questions |

**Roster update (18 Nov 2026, `09-VISUAL-IDENTITY-INTEGRATION.md` §5.3).** Claude Opus 5.5 is now the primary model: it may plan, implement and integrate any task, including those assigned to Fable or Codex above. Self-review is not independent: a task Opus implements needs review by a different model or the owner, and high-risk changes (renderer, input, export, domain, claims) also need automated evidence (tests, zero-pixel diff, perf run). Visual acceptance stays with the owner. The per-task owners below are kept as history; where Opus implements, the listed reviewer must not also be Opus.

**Visual identity (18 Nov 2026).** The approved art direction (`Terraform_Visual_Identity_FINAL.md`, owner's copy) closes the A/B/C direction search. Gate 2 below is revised for it; changed tasks say *Revised 18 Nov*. Reconciliation, evidence and the compatibility matrix are in `09-VISUAL-IDENTITY-INTEGRATION.md`.

**Visuals first (19 Nov 2026, D23).** Work now follows `10-VISUALS-FIRST.md` (steps V1–V8). Gate 3–7 tasks are parked, not cancelled.

## Verified status (18 Nov 2026)

From code, PRs and the Run 1 ledger, not from checkboxes (09 §2). **Done:** 004 (#19, #20), 011 (#21). **In draft PR #25, unmerged:** 010 and 012 (owner GPU run and baselines outstanding), 013, 014, 030, 040 part A (model only), 054. **In progress:** 005 (part 1, #22). **Closed, awaiting merge:** 007 (PR #23 — no defect; closed 19 Nov). **In draft PR, reviewed:** 002 (PR #26, pass with minor follow-ups, second review added), 003 (PR #27, all rows reproduced). **Also in PR #25 since Run 1 T8–T10:** 015, 016, 034 (reviewed). **Blocked:** 008 (on 001, 006, and merging #23/#26/#27). **Still open:** 001 (production still 404s on 18 Nov), 006, 009 and every later task.

## File ownership

`src/scene/ViewportCanvas.tsx` and `src/components/studio/StudioShell.tsx` are touched by most visual work. **At most one open task may edit each of these files at a time.** Tasks marked ⚠VC edit `ViewportCanvas.tsx`; ⚠SS edit `StudioShell.tsx`. Schedule them serially. Everything else can run in parallel when dependencies allow.

---

## Gate 0 — Foundation release correctness

**Exit:** production serves the studio; PR #18's open decisions are answered; Water and Snow have had an independent review; the runoff reference comparison has a result (pass, or a written explanation).

- [x] **TF-VIS-001** `[FIX]` — Diagnose why production 404s on `/studio/*` and `/about` — *2026-11-24: no longer reproduces, `docs/reviews/production-404-diagnosis.md`*
  - Priority: P0
  - Owner/model: Owner with Fable (needs Vercel access)
  - Reviewer: Opus (reads the finding)
  - Depends on: —
  - Scope/files: Vercel project `terraform-studio`; `vercel.json`, `.vercelignore` on `origin/main`
  - Output: `docs/reviews/production-404-diagnosis.md` naming the deployment production points at, its commit and the cause
  - Tests: `curl -s -o /dev/null -w '%{http_code}'` on `/`, `/about`, `/studio/compact-infill`, `/sites/compact-infill/manifest.json`
  - Acceptance: cause identified with evidence; a fix proposed that does not require merging PR #18 if the cause is independent of it
  - Risk/rollback: read-only; any redeploy is an owner action
  - Handoff prompt: `06#tf-vis-001`

- [x] **TF-VIS-002** `[TEST]` — Independent code review of the runoff and snow work (ADR-0038, ADR-0039) — *2026-11-24: PR #26 (pass with follow-ups) and follow-ups PR #28 merged*
  - Priority: P0
  - Owner/model: Opus (`engineering-code-reviewer`)
  - Reviewer: Fable (accepts or rejects findings)
  - Depends on: —
  - Scope/files: commit `01c514b`: `src/features/analysis/{runoff,runoffWorker,useRunoff,snowClimate}.ts`, `src/scene/RunoffOverlay.tsx`, `src/components/studio/{WaterPanel,SnowPanel}.tsx`, `scripts/site-assets/{snow.build,utm33}.ts`
  - Output: `docs/reviews/water-snow-code-review.md` (REVIEW-TEMPLATE); fixes as a separate PR by Codex
  - Tests: existing suite; new tests for every correctness finding
  - Acceptance: every finding fixed or explicitly accepted by the owner; lint/test/build green
  - Risk/rollback: fixes are small PRs on `build/foundation`
  - Handoff prompt: `06#tf-vis-002`

- [x] **TF-VIS-003** `[TEST]` — Independent re-run of foundation numbers (feasibility RV-1) — *2026-11-24: PR #27 merged, every number reproduced*
  - Priority: P1
  - Owner/model: Codex
  - Reviewer: Fable
  - Depends on: —
  - Scope/files: read-only; build report §3 acceptance table; `scripts/check-sources.mjs`
  - Output: `docs/reviews/foundation-rv1.md` — same numbers within tolerance, or written disagreement
  - Tests: parcel area 0301-228/255; section 8.98–21.44 m; measured-height counts; noise registration
  - Acceptance: each row reproduced or explained
  - Risk/rollback: none (read-only)
  - Handoff prompt: template

- [x] **TF-VIS-004** `[FIX]` — Correct the About page's stale noise and wind copy
  - Priority: P0
  - Owner/model: Cline + small model
  - Reviewer: Opus (claim policy check)
  - Depends on: —
  - Scope/files: `src/app/AboutPage.tsx` (lines 9, 24, 56 and nearby); its test if present
  - Output: copy that matches ADR-0034 (official map), ADR-0028–0030 (wind lift), ADR-0038/39 (Water, Snow)
  - Tests: a component test asserting the deleted heuristic text is absent and "Statens vegvesen" is present
  - Acceptance: no claim the code does not support; AGENTS.md §7 claim policy respected; lint/test/build
  - Risk/rollback: copy only
  - Handoff prompt: `06#tf-vis-004`

- [x] **TF-VIS-005** `[DOC]` — Bring AGENTS.md, milestone briefs and status report up to date — *2026-11-24: every 01 §10.1 item resolved; AGENTS.md §10 and the status report updated*
  - Priority: P1
  - Owner/model: Cline + small model
  - Reviewer: Fable
  - Depends on: TF-VIS-006 (so the text records the owner's decisions)
  - Scope/files: `AGENTS.md` §3, §10, §1.11 note; `docs/milestones/M2…M5`; `docs/status-report.md`
  - Output: documents that match 01 §10.1
  - Tests: none (docs)
  - Acceptance: every stale item in 01 §10.1 resolved; no ADR changed
  - Risk/rollback: docs only
  - Handoff prompt: `06#tf-vis-005`

- [x] **TF-VIS-006** `[DOC]` — Owner answers PR #18's open decisions — *2026-11-24: all answered, `progress.md`*
  - Priority: P0
  - Owner/model: Owner; Fable prepares a one-page decision sheet
  - Reviewer: —
  - Depends on: —
  - Scope/files: `docs/reviews/build-foundation-report.md` §8; 08 D1–D6
  - Output: decisions recorded in the PR description and `progress.md`
  - Acceptance: all eight answered (a deferral is an answer)
  - Handoff prompt: none (owner)

- [x] **TF-VIS-007** `[TEST]` — Runoff reference comparison against WhiteboxTools (feasibility IT-7)
  - Priority: P0 (must not wait for visual work)
  - Owner/model: DeepSeek (runs) with Opus (reviews the method)
  - Reviewer: Opus
  - Depends on: —
  - Scope/files: new `scripts/reference/runoff-whitebox/` (README, export script, comparison script); fixtures under `src/features/analysis/__fixtures__/runoff-reference/`; no change to `runoff.ts`
  - Output: `docs/qa/runoff-reference.md` with agreement on main paths, figures and the tool version
  - Tests: a Vitest test comparing `computeRunoff` on the fixture tile to the stored reference within the stated tolerance
  - ~~Acceptance: ≥ 95 % main-path cell agreement, or a written explanation of every disagreement class accepted by Opus~~
  - *Revised 18 Nov (owner decision):* acceptance is (1) no invented paths — ≥ 95 % of Terraform main-path cells within 2 cells of a WhiteboxTools main path (crop 97.0 %, enforced in `runoff.reference.test.ts`), and (2) missed paths disclosed in the Water card's limits. Full-tile confirmation of (1) still open. Recorded in ADR-0038 amendment and `docs/qa/runoff-reference.md` (PR #23)
  - *Closed 19 Nov (owner decision):* no defect in `runoff.ts`. Full tile 92.3–93.3 % within 2 cells (95.0 % within 3, standard); every divergence explained (Runs 3–6), 11–12 per variant a WhiteboxTools fill artefact. Rule 1 kept as a documented measurement and crop regression guard. Done on PR #23, awaiting merge
  - Risk/rollback: WhiteboxTools is not added to `package.json`; RichDEM output only if used (GPL, 02 §2.5)
  - Handoff prompt: `06#tf-vis-007`

- [ ] **TF-VIS-008** `[FIX]` — Merge PR #18 and verify production
  - Priority: P0
  - Owner/model: Owner
  - Reviewer: Fable verifies after deploy
  - Depends on: TF-VIS-001, 002, 004, 006 (007 should have a result; owner decides if it blocks)
  - Acceptance: production returns 200 for the four URLs in TF-VIS-001; smoke e2e against production URL passes
  - Risk/rollback: Vercel instant rollback to the previous production deployment

- [ ] **TF-VIS-009** `[TEST]` — Finish-gate visual review of the unreviewed captures
  - Priority: P1
  - Owner/model: Opus (`design-ui-finish-gate-reviewer`)
  - Reviewer: Fable
  - Depends on: —
  - Scope/files: `docs/screenshots/{context,water,panel,wind-lift,build}-*.png`
  - Output: `docs/reviews/foundation-visual-gate.md`; its findings feed Gates 2–5, not fixed here
  - Handoff prompt: template

## Gate 1 — Baseline, inventory, Visual Lab scaffold

**Exit:** a reproducible capture set and performance baseline exist on the base branch; scene and analysis colours have one home each with no pixel change; the Lab route runs in dev and is absent from production builds.

- [ ] **TF-VIS-010** `[TEST]` — Reference capture script
  - Priority: P0
  - Owner/model: Codex
  - Reviewer: DeepSeek runs it twice and compares
  - Depends on: TF-VIS-008 (or owner decides to baseline on `build/foundation`)
  - Scope/files: new `scripts/capture-reference.mjs`; `docs/screenshots/vis/baseline/`
  - Output: the matrix in 03 §7, including the four export passes
  - Tests: two consecutive runs compared with Playwright's comparator; report differing pixels per image
  - Acceptance: every image reproducible within the threshold set in TF-VIS-012, or the non-determinism named and fixed
  - Risk/rollback: script only
  - Handoff prompt: `06#tf-vis-010`

- [x] **TF-VIS-011** `[TEST]` — Performance harness and baseline
  - Priority: P0
  - Owner/model: Codex
  - Reviewer: Opus
  - Depends on: TF-VIS-008 (same note as 010)
  - Scope/files: promote `feasibility/scratch/perf.mjs` (on `build/foundation`) to `scripts/measure-perf.mjs`; output `docs/perf/baseline.json` and `docs/perf/README.md`
  - Output: per site and state (neutral, sun hours, wind, noise, water, slope on): fps, frame p50/p95/p99, long tasks, draw calls (`gl.info.render.calls`), triangles, time to first site frame, 4K export time, pointer-to-frame latency for a mass drag
  - Tests: harness runs three times; spread reported
  - Acceptance: 04 §7 metrics all recorded with machine, browser, commit; no metric invented
  - Handoff prompt: `06#tf-vis-011`

- [ ] **TF-VIS-012** `[TEST]` — Opt-in visual regression spec
  - Priority: P1
  - Owner/model: DeepSeek
  - Reviewer: Codex
  - Depends on: TF-VIS-010
  - Scope/files: new `e2e/visual-reference.spec.ts`, opt-in like existing opt-in specs (skipped unless `VISUAL=1`); snapshots in `e2e/__screenshots__/` for the reference machine only
  - Acceptance: passes twice in a row locally; skipped in CI
  - Handoff prompt: `06#tf-vis-012`

- [ ] **TF-VIS-013** `[CAND]` — Scene style module, no pixel change ⚠VC
  - Priority: P0
  - Owner/model: Codex
  - Reviewer: Opus
  - Depends on: TF-VIS-010, TF-VIS-012
  - Scope/files: new `src/scene/style.ts` + test; `src/scene/ViewportCanvas.tsx` (constants only), `SceneComposer.tsx` (AO values), `landCoverTexture.ts` (`WATER_COLOR`) as needed
  - Output: `NORDIC` style with today's exact values; all reads go through it
  - Tests: unit test that `NORDIC` equals the previous constants; visual regression spec passes with zero diff
  - Acceptance: pixel-identical reference captures; lint/test/build; no behaviour change
  - Risk/rollback: revert the PR
  - Handoff prompt: `06#tf-vis-013`

- [ ] **TF-VIS-014** `[CAND]` — Analysis graphics registry, no pixel change
  - Priority: P0
  - Owner/model: Codex
  - Reviewer: Opus
  - Depends on: —
  - Scope/files: new `src/features/analysis/graphics.ts` + test; re-exports from `circleSunHours.ts`, `climateView.ts`, `terrainTools.ts`, `runoff.ts`, `officialNoise.ts`; `src/scene/WindStreamlines.tsx` colours
  - Output: 04 §4.1 contract; old names still exported
  - Tests: registry rule tests (no shared hex across meanings is **reported** as a list, not yet enforced — it fails today by design; enforcement is switched on in Gate 5)
  - Acceptance: no import site changes outside the listed files; visual regression zero diff; lint/test/build
  - Handoff prompt: `06#tf-vis-014`

- [ ] **TF-VIS-015** `[CAND]` — Visual Lab route scaffold + ADR-0040
  - Priority: P0
  - Owner/model: Opus
  - Reviewer: Codex
  - Depends on: TF-VIS-013
  - Scope/files: new `src/app/LabPage.tsx`, `src/app/lab/` (state builders, tweak panel); `src/app/App.tsx` (flagged route); `docs/decisions/ADR-0040-visual-lab.md`
  - Output: `/lab/:siteId` with the seven fixed states of 03 §7 using the real hooks; style picker reading `style.ts`
  - Tests: unit test that the route is absent with the flag off; build check that `dist/` contains no Lab chunk; one e2e opening `/lab/compact-infill` in dev
  - Acceptance: production bundle unchanged in size (±0.5 kB); no copied domain computation
  - Handoff prompt: `06#tf-vis-015`

- [ ] **TF-VIS-016** `[DOC]` — Design inventory
  - Priority: P2
  - Owner/model: Cline + small model
  - Reviewer: Fable
  - Depends on: TF-VIS-013, TF-VIS-014
  - Output: `docs/design/visual-inventory.md` — every scene colour, line, ramp, legend and floating surface with file and line
  - Handoff prompt: template

## Gate 2 — Identity rendering (revised 18 Nov 2026)

*19 Nov: the visual target is `docs/design/identity-look-spec.md` (owner reference images). Runs 7–8 (PR #29) built stages A–C in the Lab with the land-cover fallback; the orthophoto (028a → 028) is the critical path.*

*Was: "Scene rendering, material and lighting prototypes", exit "the owner has chosen a direction (A/B/C) from Lab captures". The approved identity replaces the direction choice; dependency graph in 09 §5.1.*

**Exit:** the integrated prototype (TF-VIS-02B) passes 09 §7 at the analysis-off and wind-on states and the owner accepts it; the `IDENTITY` style ships (TF-VIS-027) only after **Gate 0 exit (TF-VIS-008)** and within 04 §7 budgets, or with budget exceptions the owner approves in writing. Lab work does not wait for Gate 0; production work does.

**Common to every Gate 2 task:** Lab only until 027; `NORDIC` stays the production style and the rollback; captures with `scripts/capture-reference.mjs` at the 09 §7 view; perf with `scripts/measure-perf.mjs` against `docs/perf/baseline-build-foundation.json`; `e2e/camera-input.spec.ts` and `claims.test.ts` stay green; implementer and reviewer are different models (roster update above).

- [ ] **TF-VIS-020** `[EXP]` — Progressive identity stages in the Lab *(Revised 18 Nov; was "Direction presets A, B, C" with `DIAGRAM`/`ATMOSPHERIC`)*
  - Priority: P1 · Owner: Opus · Reviewer: Codex · Depends on: TF-VIS-015
  - Scope/files: `src/scene/style.ts` (add `IDENTITY` beside `NORDIC`; the `id` union gains `'identity'`, drops nothing until 027), `src/app/lab/*` (stage picker)
  - Stages: **A** orthophoto (or labelled land-cover fallback) + matte-white massing + white contours on charcoal `#171B19`; **B** A + HDRI ambient + atmospheric dissolve + shadow/AO tuning; **C** B + point-cloud vegetation + wind on
  - Tests: `style.test.ts` keeps `NORDIC` byte-identical; Lab renders every stage without console errors
  - Acceptance: captures of A, B, C in `docs/screenshots/vis/gate2/`; production bundle unchanged (Lab excluded)
  - Risk/rollback: Lab only; delete the stage
  - Handoff: 06#tf-vis-020

- [ ] **TF-VIS-021** `[EXP]` → `[CAND]` — Fat-line system with light-white contours (EX-1) *(Revised 18 Nov: contour colour pale white on dark ground; zoom-based density)*
  - Priority: P1 · Owner: Opus · Reviewer: Codex · Depends on: TF-VIS-015
  - Scope/files: new `src/scene/lines.ts`; `style.ts` `lines.contourMinor/Major` for `IDENTITY`; Lab only at first
  - Adds: minor contours fade out beyond a camera-distance threshold (value proposed from captures, owner approves); majors stay
  - Acceptance: 02 §2.2 criteria; contours legible at three zooms over the orthophoto; owner decision on white-pass edges (08 D8)

- [ ] **TF-VIS-023** `[OPT]` `[EXP]` — Cartographic hillshade from the 1 m tile (EX-6) *(Revised 18 Nov: demoted — the orthophoto carries relief shading; only for the land-cover fallback)*
  - Priority: P3 · Owner: Codex · Reviewer: Opus · Depends on: TF-VIS-028 result
  - Scope/files: new renderer-free `src/features/analysis/hillshade.ts` + test; Lab material

- [ ] **TF-VIS-024** `[CAND]` — AO and soft shadows on a dark ground, export quality *(Revised 18 Nov: tune for matte white on charcoal/orthophoto)*
  - Priority: P1 · Owner: Codex · Reviewer: Opus · Depends on: TF-VIS-011, TF-VIS-020 stage A
  - Scope/files: `src/scene/SceneComposer.tsx`, `PassExporter.tsx`, `style.ts` (`ao` for `IDENTITY`)
  - Acceptance: 02 §2.3 criteria; depth pass byte-identical; sun shadow positions unchanged

- [ ] **TF-VIS-025** `[EXP]` → `[CAND]` — HDRI ambient, no visible sky, sun untouched + ADR-0042 (EX-4) *(Revised 18 Nov: one soft overcast Nordic HDRI for ambient; the three named atmospheres are dropped)*
  - Priority: P1 · Owner: Opus · Reviewer: Codex · Depends on: TF-VIS-015
  - Scope/files: `ViewportCanvas.tsx` `EnvironmentLight` ⚠VC (load a file into the same PMREM path, keep `RoomEnvironment` as fallback), `lighting.ts` + test (intensities per style), `public/env/<name>.hdr` with licence note (CC0 preferred), ADR-0042
  - Tests: sun position and shadow direction identical for every style; fallback to Room environment when the file fails to load; background remains the flat style colour
  - Acceptance: 03 §4 rule ("the sun is the Sun card's time") met; asset size and licence in the ADR; studio chunk +0 kB (file fetched lazily)
  - Risk/rollback: style flag; Room environment

- [ ] **TF-VIS-026** — Identity decision board and owner acceptance *(Revised 18 Nov; was a direction choice)*
  - Priority: P0 for Gate 2 exit · Owner: Opus (board) + Owner (acceptance) · Reviewer: Owner · Depends on: TF-VIS-02B
  - Output: `docs/design/identity-decision.md` — captures, perf, greyscale/CVD checks per 09 §7; ADR-0045 (identity scene; supersedes ADR-0017 for the working view) drafted with the evidence

- [ ] **TF-VIS-027** `[CAND]` — Ship the `IDENTITY` style ⚠VC *(Revised 18 Nov)*
  - Priority: P1 · Owner: Opus · Reviewer: Codex · Depends on: TF-VIS-026, ADR-0041, ADR-0045, **TF-VIS-008 (Gate 0 exit)**
  - Acceptance: 04 §7 budgets; visual regression baselines re-approved by owner; ADR-0041 and ADR-0045 accepted; `NORDIC` retained as a selectable rollback for one release
  - Risk/rollback: switch the default style back to `NORDIC` (one-line revert)

- [x] **TF-VIS-028a** `[DOC]` — Orthophoto source and licence research *(New 18 Nov; done 19 Nov: `docs/data/orthophoto-source.md` — Norge i bilder needs written permission; request drafted for the owner)*
  - Priority: P0 for TF-VIS-028 · Owner: Opus (`research-synthesist`) · Reviewer: Owner · Depends on: —
  - Scope/files: `docs/data/orthophoto-source.md` (new); no code
  - Output: for Norge i bilder (Kartverket/Geovekst) and fallbacks (Sentinel-2, others): licence text and URL, permitted use (public web display, caching, redistribution in a static package, export stills/clips), attribution wording, resolution, capture year for both curated sites, endpoint and CRS options
  - Acceptance: each permission answered with a quoted source or marked "unconfirmed — asked Kundesenter"; recommendation for D13
  - Risk/rollback: none

- [ ] **TF-VIS-028** `[EXP]` → `[CAND]` — Orthophoto terrain pipeline (curated sites) *(New 18 Nov)*
  - Priority: P1 · Owner: Opus · Reviewer: Codex (code) + `gis-qa-engineer` role run by DeepSeek (registration) · Depends on: TF-VIS-028a with D13 cleared for the intended use, TF-VIS-015
  - Scope/files: new `scripts/site-assets/orthophoto.build.ts` (request with an EPSG:4326 bbox equal to the terrain extent, as `terrain1m.build.ts` does, so the image is exact in ENU — ADR-0033 §3); package layer `orthophoto.json` + `orthophoto.webp` (optional; schema in `features/sites/package.ts`, `manifest.ts`, `docs/data/site-package-spec.md`); `features/sites/provenance.ts` (credit); new `src/scene/terrainMaterial.ts` (map + desaturation uniform, default 0.8; dark/contrast curve from `style.ts`); `TerrainMesh` in `ViewportCanvas.tsx` ⚠VC
  - Out of scope: import path (keeps land cover); analyses never sample the image
  - Tests: package schema accepts and rejects; registration test (a surveyed corner or building footprint centroid in ENU lands on the expected pixel within 1 px at the stored resolution); credit appears in still/white/analysis credits and not in depth; with the layer absent the scene is pixel-identical to today
  - Acceptance: Lab stage A capture; package size and GPU texture memory recorded; owner approves resolution (2 048 vs 4 096 px) from measured cost
  - Risk/rollback: optional layer + style flag → land-cover look. **No imagery committed or deployed before D13 clears**
  - Handoff: 06#tf-vis-028

- [ ] **TF-VIS-029** `[EXP]` — Airy point-cloud vegetation prototype *(New 18 Nov; revised 19 Nov: Runs 7–8 built round point clusters; the target is now tree-shaped instances with speckled, see-through crowns — `docs/design/identity-look-spec.md` §3, D22)*
  - Priority: P1 · Owner: Opus · Reviewer: Codex · Depends on: TF-VIS-015
  - Scope/files: new pure `src/scene/vegetationPoints.ts` (seeded cluster per mapped tree; optional forest fill inside land-cover `wood` polygons) + test; new `src/scene/PointVegetation.tsx` (`THREE.Points` or instanced sprites, DPR-stable size, distance LOD, green-grey from `style.ts`, static — never animated); `exportPasses.ts` handling for override passes; `Trees.tsx` untouched (Low tier and rollback)
  - Tests: same seed → same points; point count per LOD within the proposed budget; points excluded from raycasting (`camera-input.spec.ts` green); white and depth passes per D15
  - Acceptance: Lab stage C capture near/mid/far reads as porous; forest reads as a body, not a block; perf against baseline with counts recorded; provenance says forest density is illustrative
  - Risk/rollback: style flag → `Trees.tsx`
  - Handoff: 06#tf-vis-029

- [ ] **TF-VIS-02A** `[EXP]` → `[CAND]` — Atmospheric terrain dissolve *(New 18 Nov; Run 8 fades every edge; revised 19 Nov: fade to haze colour with a vignette, buildings and trees fade too — look spec §3, D22)*
  - Priority: P1 · Owner: Opus · Reviewer: Codex · Depends on: TF-VIS-020 stage A (028 or land-cover fallback)
  - Scope/files: `terrainMaterial.ts` (radial fade to the background colour beyond a radius ≥ the study halo), `style.ts` (fade start/end, fog colour), `ViewportCanvas.tsx` ⚠VC (hide skirt and floor grid in `IDENTITY`)
  - Tests: pure test that the fade start ≥ halo radius and ≥ analysis-circle radius for both sites; overlays drawn above the fade are unaffected; depth pass unchanged
  - Acceptance: no visible rectangular edge at any preset; site crisp; no spotlight or haze effects
  - Risk/rollback: style flag

- [ ] **TF-VIS-02B** `[EXP]` — Integrated identity prototype: analysis off / wind on *(New 18 Nov)*
  - Priority: P0 for Gate 2 exit · Owner: Opus · Reviewer: Codex + Owner · Depends on: TF-VIS-020, 021, 024, 025, 028 (or labelled fallback), 029, 02A, 040 part B (legend component)
  - Scope/files: Lab only; capture label `identity-02b`
  - Output: the brief in 09 §7 — same site, camera, crop and lighting; State 01 analysis off; State 02 wind on with legend and screening caveat; reference captures and perf
  - Acceptance: all seven comparison criteria in 09 §7 recorded; critical success test judged by the owner
  - Handoff: 06#tf-vis-02b

## Gate 3 — Camera, navigation and input

**Exit:** interruptible transitions and cursor zoom ship without any regression in editing, lift handle or presets.

- [ ] **TF-VIS-030** `[TEST]` — Characterisation tests for camera and input before any change
  - Priority: P0 · Owner: DeepSeek · Reviewer: Opus · Depends on: Gate 1 exit
  - Scope/files: new `e2e/camera-input.spec.ts`; unit tests for `CameraRig`
  - Covers: preset arrival positions; drag on a mass does not orbit; one drag = one undo entry; Escape cancels mid-drag; lift handle drag does not orbit; click vs orbit tolerance; reduced motion snaps

- [ ] **TF-VIS-034** `[CAND]` — Pure ground-click arbitration ⚠VC
  - Priority: P1 · Owner: Codex · Reviewer: Opus · Depends on: TF-VIS-030
  - Scope/files: new `src/features/editor/groundClick.ts` + table test; `ViewportCanvas.tsx` handler
  - Acceptance: no behaviour change; TF-VIS-030 green

- [ ] **TF-VIS-031** `[EXP]` — Camera controller A/B (EX-2)
  - Priority: P1 · Owner: Opus · Reviewer: Codex · Depends on: TF-VIS-015, TF-VIS-030
  - Acceptance: 02 §2.1 criteria; written result

- [ ] **TF-VIS-032** `[CAND]` — Adopt controller, `CameraHandle`, arc transitions + ADR-0043 ⚠VC
  - Priority: P1 · Owner: Opus · Reviewer: Codex · Depends on: TF-VIS-031, TF-VIS-034
  - Scope/files: `CameraRig.tsx`, `ViewportCanvas.tsx`, `HudProbe.tsx`, `PassExporter.tsx`, `MassLayer.tsx`, `WindLiftHandle.tsx`
  - Acceptance: TF-VIS-030 green unchanged; 04 §7 budgets

- [ ] **TF-VIS-033** `[OPT]` `[CAND]` — Orthographic plan view
  - Priority: P2 · Owner: Opus · Reviewer: Codex · Depends on: TF-VIS-032
  - Acceptance: scale bar correct (unit test on `HudProbe` maths); compass; export depth range

- [ ] **TF-VIS-035** `[CAND]` — Keyboard camera controls
  - Priority: P1 · Owner: Codex · Reviewer: Opus (a11y) · Depends on: TF-VIS-032
  - Acceptance: arrow keys orbit, +/− zoom, number keys select presets when the viewport has focus; documented in the viewport's accessible label; no conflict with editor shortcuts

- [ ] **TF-VIS-036** `[OPT]` — First-visit settle
  - Priority: P2 · Owner: Codex · Reviewer: Fable · Depends on: TF-VIS-032
  - Acceptance: ≤ 1.2 s; any input cancels; none under reduced motion; never on return visits within a session

## Gate 4 — Shared analysis graphic system; Wind and Water pilots

**Exit:** one legend, overlay fades, the four output-class grammars, and two analyses redesigned on them, with no stale-result regressions.

- [ ] **TF-VIS-040** `[CAND]` — `legendFor()` model and `MapLegend` ⚠VC
  - Priority: P1 · Owner: Codex · Reviewer: Opus · Depends on: TF-VIS-014
  - Scope/files: `graphics.ts`, new `MapLegend.tsx`; remove caption blocks in `ViewportCanvas.tsx:636–661`, `WindRampBar.tsx`, `SunHoursRampBar`
  - Acceptance: every claim sentence still visible with its layer (`e2e/m3-disclaimers.spec.ts` green); states rendered

- [ ] **TF-VIS-041** `[CAND]` — Overlay fade and cross-fade ⚠VC
  - Priority: P1 · Owner: Opus · Reviewer: Codex · Depends on: TF-VIS-040
  - Scope/files: new `src/scene/overlayFade.ts`; layer components gain `opacity`
  - Acceptance: no extra React render per frame; textures disposed (heap test); reduced motion instant

- [ ] **TF-VIS-042** `[EXP]` → `[CAND]` — Screening hatch (EX-3)
  - Priority: P1 · Owner: Opus · Reviewer: Codex · Depends on: TF-VIS-015

- [ ] **TF-VIS-043** `[CAND]` — Analysis-focus dimming ⚠VC
  - Priority: P2 · Owner: Codex · Reviewer: Opus · Depends on: TF-VIS-027

- [ ] **TF-VIS-044** `[CAND]` — Wind pilot
  - Priority: P1 · Owner: Opus · Reviewer: Codex · Depends on: TF-VIS-040, 041, 042; owner decision D2 (Lawson names)
  - Scope/files: `WindHeatmap.tsx`, `WindParticles.tsx`, `WindStreamlines.tsx`, `ClimatePanel.tsx`, `climateView.ts` (labels only)
  - Acceptance: screening grammar on the map; trails coloured from the map; `e2e/wind*.spec.ts` green; perf budget with wind on
  - *Revised 18 Nov:* the map and trails must read on the dark orthophoto ground (03 §2.1 column C) and stay visually distinct from the static point vegetation (TF-VIS-029)

- [ ] **TF-VIS-045** `[CAND]` — Water pilot
  - Priority: P1 · Owner: Opus · Reviewer: Codex · Depends on: TF-VIS-040, 041, 042, TF-VIS-002, TF-VIS-007
  - Scope/files: `RunoffOverlay.tsx`, `WaterPanel.tsx`, optional new `runoffPaths.ts` + test
  - Acceptance: hatch for depressions, weighted paths; legend leads with what is absent; no depth or volume shown

- [ ] **TF-VIS-046** `[TEST]` — Stale-result and rapid-change tests
  - Priority: P1 · Owner: DeepSeek · Reviewer: Opus · Depends on: TF-VIS-041
  - Covers: switching cards during a computation; moving the circle repeatedly; changing date while sun hours compute; dragging a mass with Water open. Asserts the legend says "computing" and the final overlay matches the final inputs

- [ ] **TF-VIS-047** `[CAND]` — Charcoal studio theme *(New 18 Nov)* ⚠SS
  - Priority: P1 · Owner: Opus · Reviewer: Codex + `engineering-section-508-specialist` role (contrast) · Depends on: TF-VIS-026 (identity accepted); production merge after TF-VIS-008
  - Scope/files: `src/styles/tokens.css`, `src/styles/global.css` (charcoal `#171B19` / `#252A27`, off-white `#F7F7F2`, secondary `#9DA49F`, divider `#414743`; provisional per the brief); right `aside` as charcoal frosted glass (`--frost`, restrained `backdrop-filter`); `StudioShell.tsx` only for class names; landing and About untouched
  - Tests: `e2e/m5-a11y.spec.ts` contrast (AA for text; units rule kept); `keyboard.spec.ts`; visual baselines re-approved
  - Acceptance: every text/background pair ≥ 4.5:1 (≥ 3:1 large); focus ring visible on charcoal; panel never auto-hides; essentials-first order inside each card unchanged or improved
  - Risk/rollback: token revert (ADR-0016 values kept in git history); records an ADR-0016 amendment

- [ ] **TF-VIS-048** `[CAND]` — Always-visible horizontal analysis toolbar *(New 18 Nov)* ⚠SS
  - Priority: P1 · Owner: Opus · Reviewer: Codex · Depends on: TF-VIS-047, ADR-0046 (amends ADR-0026)
  - Scope/files: new `src/components/studio/AnalysisToolbar.tsx` + test; `StudioShell.tsx` (mount; one source of state shared with `AnalysisCards`)
  - Behaviour: one button per analysis (Sun, Wind, Noise, Water, Snow, Terrain — only those that work on the current site); pressing opens the same card/layer as the panel; extra information on hover **and** keyboard focus; visible label or long-press on touch; no hover-only content
  - Tests: toolbar and panel stay in sync (unit); keyboard reach and `aria-pressed` (e2e); touch target ≥ 24 × 24 px
  - Acceptance: no second state path; WCAG 2.2 AA; disclaimers unchanged
  - Risk/rollback: remove the component

## Gate 5 — Rollout to Sun, Noise, Snow, Terrain; legends and claim guardrails

**Exit:** every analysis uses the registry, the legend and its class grammar; colour rules enforced by test.

- [ ] **TF-VIS-050** `[CAND]` — Sun ramp and legend (EX-5) · P1 · Codex · Rev Opus · Dep TF-VIS-040 · *Revised 18 Nov: derive the ramp for the dark orthophoto ground; EX-5's pale-ground premise no longer holds*
- [ ] **TF-VIS-051** `[CAND]` — Noise mapped grammar and palette · P1 · Codex · Rev Opus · Dep TF-VIS-040, owner D7
- [ ] **TF-VIS-052** `[OPT]` — Snow winter chart in the panel · P2 · Codex · Rev Opus · Dep —
- [ ] **TF-VIS-053** `[CAND]` — Terrain: contours from the 1 m tile on curated sites, weights, optional labels · P2 · Opus · Rev Codex · Dep TF-VIS-021 (measure the 458 k-cell marching squares; worker if > 16 ms) · *Revised 18 Nov: also a dependency of TF-VIS-02B, so white contours register with the orthophoto*
- [ ] **TF-VIS-054** `[TEST]` — Claim guardrail tests: no forbidden term (AGENTS.md §7, "safe", "flood depth", "snow load", "comfortable" without "screening") in any legend or caption · P1 · DeepSeek · Rev Opus
- [ ] **TF-VIS-055** `[DOC]` — Regenerate design contract §8 from `style.ts` and the registry; switch on the shared-hex rule · P1 · Cline · Rev Fable · Dep TF-VIS-050, 051

## Gate 6 — Exports and landing

**Exit:** stills and clips match the viewport style, carry credits, and clips are smooth; the landing shows the product.

- [ ] **TF-VIS-060** `[CAND]` — Export parity: style, line resolution, analysis pass contents · P1 · Opus · Rev Codex · Dep TF-VIS-027, 021 · *Revised 18 Nov: also orthophoto, dissolve and point vegetation in still and clip; white pass drops the orthophoto map and treats vegetation per 09 D15; `scene.overrideMaterial` must not be applied to `Points` as a mesh material; depth pass unchanged*
- [ ] **TF-VIS-061** `[CAND]` — Clip camera paths (data + preview) · P1 · Codex · Rev Opus · Dep TF-VIS-032
- [ ] **TF-VIS-062** `[EXP]` → `[CAND]` — Deterministic MP4 (EX-7) + ADR-0044 · P2 · Opus · Rev Codex · Dep TF-VIS-061 · **Go/no-go:** 02 §2.6 criteria and licence note
- [ ] **TF-VIS-063** `[TEST]` — Credit and depth invariants across all passes and clip frames · P0 for Gate 6 · DeepSeek · Rev Opus · *Revised 18 Nov: includes the orthophoto credit on every credited pass and clip frame*
- [ ] **TF-VIS-064** `[OPT]` — Landing: a real captured still of the product, static image, no three.js on the landing (I10) · P2 · Codex · Rev Fable · *Revised 18 Nov: plus licensed Nordic climate photography (human scale, overcast default), optional muted loop later with a reduced-motion still; no forced intro; depends on owner decision 09 D16 (asset source and AI disclosure); landing chunk size unchanged*
- [ ] **TF-VIS-065** `[DOC]` — About page full refresh after Gate 5 · P2 · Cline · Rev Opus

## Gate 7 — Validation and release

**Exit:** 07's release checklist complete.

- [ ] **TF-VIS-070** `[OPT]` `[TEST]` — Sun-hours point vs Ladybug/Radiance (IT-6) · P2 · DeepSeek · Rev Opus
- [ ] **TF-VIS-071** `[TEST]` — Accessibility audit of new UI (legend, keyboard camera, Lab excluded) · P1 · Opus (`engineering-section-508-specialist`) · Rev Fable · *Revised 18 Nov: plus the analysis toolbar (hover/focus/touch) and text contrast on the charcoal glass panel; reviewer must not be Opus*
- [ ] **TF-VIS-072** `[TEST]` — Browser and device matrix (MP-1): Safari, Firefox, one mid-range Android, one iPhone · P1 · Owner + DeepSeek · *Revised 18 Nov: check `backdrop-filter`, the orthophoto texture size against each device's max texture size, point-sprite size, and HDRI load fallback*
- [ ] **TF-VIS-073** `[TEST]` — Performance regression against Gate 1 baseline · P0 · Codex · Rev Opus · *Revised 18 Nov: add windows for identity neutral, identity wind-on, and the denser-vegetation site; record GPU texture memory (`renderer.info.memory`) and point counts*
- [ ] **TF-VIS-074** — Release acceptance and deploy · P0 · Owner · Fable prepares the record

## Rejected directions (do not reopen without an owner decision)

- Replacing R3F with deck.gl or adding it as a second renderer.
- `@react-three/postprocessing` (ADR-0005).
- three-geospatial atmosphere in production (36 MB; wrapper conflict).
- Bloom on the light scene (ADR-0018).
- A physical sky as the working view (Direction C) — Lab and export only unless the owner decides otherwise. *18 Nov: the identity also forbids a visible HDRI sky; HDRI is ambient only.*
- Re-opening the A/B/C direction search (closed by the approved identity, 18 Nov). Light-scene `NORDIC` stays only as the rollback style.
- Dense photoreal mesh foliage or raw LiDAR point clouds as the default vegetation (18 Nov identity).
- Spotlights, visible sun beams, bloom haze or other theatrical effects (18 Nov identity; ADR-0018).
- Any lighting change that moves the sun away from the Sun card's time.
- Animated water, reflections, snow drapes, or particles not driven by solved flow.
- A guided tour or forced cinematic intro (ADR-0020 removed the guide).
- Reintroducing scenarios, compare, design checks or BIM authoring.
- Animation or GUI libraries (motion, theatre.js, leva).
