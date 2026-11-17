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

## File ownership

`src/scene/ViewportCanvas.tsx` and `src/components/studio/StudioShell.tsx` are touched by most visual work. **At most one open task may edit each of these files at a time.** Tasks marked ⚠VC edit `ViewportCanvas.tsx`; ⚠SS edit `StudioShell.tsx`. Schedule them serially. Everything else can run in parallel when dependencies allow.

---

## Gate 0 — Foundation release correctness

**Exit:** production serves the studio; PR #18's open decisions are answered; Water and Snow have had an independent review; the runoff reference comparison has a result (pass, or a written explanation).

- [ ] **TF-VIS-001** `[FIX]` — Diagnose why production 404s on `/studio/*` and `/about`
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

- [ ] **TF-VIS-002** `[TEST]` — Independent code review of the runoff and snow work (ADR-0038, ADR-0039)
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

- [ ] **TF-VIS-003** `[TEST]` — Independent re-run of foundation numbers (feasibility RV-1)
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

- [ ] **TF-VIS-004** `[FIX]` — Correct the About page's stale noise and wind copy
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

- [ ] **TF-VIS-005** `[DOC]` — Bring AGENTS.md, milestone briefs and status report up to date
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

- [ ] **TF-VIS-006** `[DOC]` — Owner answers PR #18's open decisions
  - Priority: P0
  - Owner/model: Owner; Fable prepares a one-page decision sheet
  - Reviewer: —
  - Depends on: —
  - Scope/files: `docs/reviews/build-foundation-report.md` §8; 08 D1–D6
  - Output: decisions recorded in the PR description and `progress.md`
  - Acceptance: all eight answered (a deferral is an answer)
  - Handoff prompt: none (owner)

- [ ] **TF-VIS-007** `[TEST]` — Runoff reference comparison against WhiteboxTools (feasibility IT-7)
  - Priority: P0 (must not wait for visual work)
  - Owner/model: DeepSeek (runs) with Opus (reviews the method)
  - Reviewer: Opus
  - Depends on: —
  - Scope/files: new `scripts/reference/runoff-whitebox/` (README, export script, comparison script); fixtures under `src/features/analysis/__fixtures__/runoff-reference/`; no change to `runoff.ts`
  - Output: `docs/qa/runoff-reference.md` with agreement on main paths, figures and the tool version
  - Tests: a Vitest test comparing `computeRunoff` on the fixture tile to the stored reference within the stated tolerance
  - Acceptance: ≥ 95 % main-path cell agreement, or a written explanation of every disagreement class accepted by Opus
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

- [ ] **TF-VIS-011** `[TEST]` — Performance harness and baseline
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

## Gate 2 — Scene rendering, material and lighting prototypes

**Exit:** the owner has chosen a direction from Lab captures that passed 03 §2.3; the chosen style is in production behind no flag, within the performance budget.

- [ ] **TF-VIS-020** `[EXP]` — Direction presets in the Lab (A, B, C)
  - Priority: P1 · Owner: Opus · Reviewer: Fable · Depends on: TF-VIS-015
  - Scope/files: `src/scene/style.ts` (add `DIAGRAM`, `ATMOSPHERIC`), `src/app/lab/*`. Production style untouched
  - Acceptance: all three render every Lab state; captures in `docs/screenshots/vis/gate2/`

- [ ] **TF-VIS-021** `[EXP]` → `[CAND]` — Fat-line system (EX-1)
  - Priority: P1 · Owner: Opus · Reviewer: Codex · Depends on: TF-VIS-015
  - Scope/files: new `src/scene/lines.ts`; Lab only at first
  - Acceptance: 02 §2.2 criteria; owner decision on white-pass edges (08 Q8)

- [ ] **TF-VIS-023** `[OPT]` `[EXP]` — Cartographic hillshade from the 1 m tile (EX-6)
  - Priority: P2 · Owner: Codex · Reviewer: Opus · Depends on: TF-VIS-015
  - Scope/files: new renderer-free `src/features/analysis/hillshade.ts` + test; Lab material

- [ ] **TF-VIS-024** `[CAND]` — Export-quality AO and shadows
  - Priority: P1 · Owner: Codex · Reviewer: Opus · Depends on: TF-VIS-011
  - Scope/files: `src/scene/SceneComposer.tsx`, `PassExporter.tsx`
  - Acceptance: 02 §2.3 criteria; depth pass byte-identical

- [ ] **TF-VIS-025** `[EXP]` → `[CAND]` — Display-only lighting atmospheres + ADR-0042 (EX-4)
  - Priority: P1 · Owner: Opus · Reviewer: Codex · Depends on: TF-VIS-015
  - Scope/files: `src/scene/lighting.ts` + test (`atmosphere` argument); Lab
  - Tests: unit test that sun position is identical for every atmosphere; Sun-card-active override test
  - Acceptance: 03 §4 rules met; credit line added when non-default

- [ ] **TF-VIS-026** — Direction comparison board and owner decision
  - Priority: P0 for Gate 2 exit · Owner: Fable (board) + Owner (choice) · Depends on: TF-VIS-020, 021, 025
  - Output: `docs/design/direction-decision.md` with captures, perf and checks per 03 §2.3

- [ ] **TF-VIS-027** `[CAND]` — Ship the chosen style ⚠VC
  - Priority: P1 · Owner: Codex · Reviewer: Opus · Depends on: TF-VIS-026, ADR-0041
  - Acceptance: 04 §7 budgets; visual regression baselines re-approved by owner; ADR-0041 accepted

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

- [ ] **TF-VIS-045** `[CAND]` — Water pilot
  - Priority: P1 · Owner: Opus · Reviewer: Codex · Depends on: TF-VIS-040, 041, 042, TF-VIS-002, TF-VIS-007
  - Scope/files: `RunoffOverlay.tsx`, `WaterPanel.tsx`, optional new `runoffPaths.ts` + test
  - Acceptance: hatch for depressions, weighted paths; legend leads with what is absent; no depth or volume shown

- [ ] **TF-VIS-046** `[TEST]` — Stale-result and rapid-change tests
  - Priority: P1 · Owner: DeepSeek · Reviewer: Opus · Depends on: TF-VIS-041
  - Covers: switching cards during a computation; moving the circle repeatedly; changing date while sun hours compute; dragging a mass with Water open. Asserts the legend says "computing" and the final overlay matches the final inputs

## Gate 5 — Rollout to Sun, Noise, Snow, Terrain; legends and claim guardrails

**Exit:** every analysis uses the registry, the legend and its class grammar; colour rules enforced by test.

- [ ] **TF-VIS-050** `[CAND]` — Sun ramp and legend (EX-5) · P1 · Codex · Rev Opus · Dep TF-VIS-040
- [ ] **TF-VIS-051** `[CAND]` — Noise mapped grammar and palette · P1 · Codex · Rev Opus · Dep TF-VIS-040, owner D7
- [ ] **TF-VIS-052** `[OPT]` — Snow winter chart in the panel · P2 · Codex · Rev Opus · Dep —
- [ ] **TF-VIS-053** `[CAND]` — Terrain: contours from the 1 m tile on curated sites, weights, optional labels · P2 · Opus · Rev Codex · Dep TF-VIS-021 (measure the 458 k-cell marching squares; worker if > 16 ms)
- [ ] **TF-VIS-054** `[TEST]` — Claim guardrail tests: no forbidden term (AGENTS.md §7, "safe", "flood depth", "snow load", "comfortable" without "screening") in any legend or caption · P1 · DeepSeek · Rev Opus
- [ ] **TF-VIS-055** `[DOC]` — Regenerate design contract §8 from `style.ts` and the registry; switch on the shared-hex rule · P1 · Cline · Rev Fable · Dep TF-VIS-050, 051

## Gate 6 — Exports and landing

**Exit:** stills and clips match the viewport style, carry credits, and clips are smooth; the landing shows the product.

- [ ] **TF-VIS-060** `[CAND]` — Export parity: style, line resolution, analysis pass contents · P1 · Opus · Rev Codex · Dep TF-VIS-027, 021
- [ ] **TF-VIS-061** `[CAND]` — Clip camera paths (data + preview) · P1 · Codex · Rev Opus · Dep TF-VIS-032
- [ ] **TF-VIS-062** `[EXP]` → `[CAND]` — Deterministic MP4 (EX-7) + ADR-0044 · P2 · Opus · Rev Codex · Dep TF-VIS-061 · **Go/no-go:** 02 §2.6 criteria and licence note
- [ ] **TF-VIS-063** `[TEST]` — Credit and depth invariants across all passes and clip frames · P0 for Gate 6 · DeepSeek · Rev Opus
- [ ] **TF-VIS-064** `[OPT]` — Landing: a real captured still of the product, static image, no three.js on the landing (I10) · P2 · Codex · Rev Fable
- [ ] **TF-VIS-065** `[DOC]` — About page full refresh after Gate 5 · P2 · Cline · Rev Opus

## Gate 7 — Validation and release

**Exit:** 07's release checklist complete.

- [ ] **TF-VIS-070** `[OPT]` `[TEST]` — Sun-hours point vs Ladybug/Radiance (IT-6) · P2 · DeepSeek · Rev Opus
- [ ] **TF-VIS-071** `[TEST]` — Accessibility audit of new UI (legend, keyboard camera, Lab excluded) · P1 · Opus (`engineering-section-508-specialist`) · Rev Fable
- [ ] **TF-VIS-072** `[TEST]` — Browser and device matrix (MP-1): Safari, Firefox, one mid-range Android, one iPhone · P1 · Owner + DeepSeek
- [ ] **TF-VIS-073** `[TEST]` — Performance regression against Gate 1 baseline · P0 · Codex · Rev Opus
- [ ] **TF-VIS-074** — Release acceptance and deploy · P0 · Owner · Fable prepares the record

## Rejected directions (do not reopen without an owner decision)

- Replacing R3F with deck.gl or adding it as a second renderer.
- `@react-three/postprocessing` (ADR-0005).
- three-geospatial atmosphere in production (36 MB; wrapper conflict).
- Bloom on the light scene (ADR-0018).
- A physical sky as the working view (Direction C) — Lab and export only unless the owner decides otherwise.
- Any lighting change that moves the sun away from the Sun card's time.
- Animated water, reflections, snow drapes, or particles not driven by solved flow.
- A guided tour or forced cinematic intro (ADR-0020 removed the guide).
- Reintroducing scenarios, compare, design checks or BIM authoring.
- Animation or GUI libraries (motion, theatre.js, leva).
