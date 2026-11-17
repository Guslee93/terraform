# 06 — Agent handoff prompts

Copy a block whole. Each one assumes nothing outside itself and the files it names.

**Shared facts every prompt relies on** (already written into each prompt where needed):

- Repository `Guslee93/terraform` (private). Until PR #18 is merged, the base branch is **`build/foundation`**; afterwards it is **`main`**. Check with `gh pr view 18 --json state`.
- `main` deploys to production. **Never push to `main`, never merge, never mark a PR ready or enable auto-merge.** Open a draft PR against the base branch.
- Required before any PR: `npm run lint && npm run test && npm run build`.
- Log the work as one row in `docs/agent-log.md` and one entry in `progress.md`.

---

## TF-VIS-001

**Owner action with Fable; not for an autonomous agent (needs Vercel access).**

```markdown
Task TF-VIS-001 — Diagnose the production 404s. Read-only.

Facts: https://terraform-studio.vercel.app/ returns 200 with bundle index-CGMY84U2.js, but
/about, /studio/compact-infill and /sites/compact-infill/manifest.json return a plain-text 404.
origin/main (2089fd4) contains vercel.json with an SPA rewrite and contains public/sites/*.
So production is probably not a correct build of origin/main.

Steps:
1. vercel ls terraform-studio --prod          → which deployment is aliased to production, from which commit
2. vercel inspect terraform-studio.vercel.app → build settings: root directory, output directory, framework
3. git show origin/main:.vercelignore         → does it exclude public/ or vercel.json?
4. Compare the production deployment's commit with 2089fd4.
5. Open the latest preview of PR #18 at /studio/compact-infill (it returns 200) and compare its settings.

Do not redeploy, promote or roll back. Write docs/reviews/production-404-diagnosis.md:
deployment id, commit, settings, cause with evidence, proposed fix, and whether merging PR #18
alone would fix it.
```

---

## TF-VIS-002

**Model:** Claude Opus 5.5 · **Reviewer of the review:** Fable 5.2

```markdown
Role: engineering-code-reviewer
Project: Terraform — browser-only architectural site-analysis prototype (React 19, R3F, three 0.186,
TypeScript 6, Vitest, Playwright). Repository Guslee93/terraform, branch build/foundation.

Read first: AGENTS.md; docs/decisions/ADR-0038-runoff-screening.md; ADR-0039-winter-climate-context.md;
docs/reviews/build-foundation-report.md §11; docs/reviews/REVIEW-TEMPLATE.md.

Review commit 01c514b ("a Water card that screens the runoff, and a Snow card"):
  git show --stat 01c514b
Focus files:
  src/features/analysis/runoff.ts, runoffWorker.ts, useRunoff.ts, snowClimate.ts (+ their tests)
  src/scene/RunoffOverlay.tsx
  src/components/studio/WaterPanel.tsx, SnowPanel.tsx, and their wiring in StudioShell.tsx
  scripts/site-assets/snow.build.ts, utm33.ts

Check, in this order:
1. Correctness of Priority-Flood+Epsilon and D8: flats, ties, edges as outlets, NaN cells, building
   burn-in (10 m blocks), conservation. Construct one small adversarial grid per suspected defect.
2. Worker lifecycle in useRunoff: stale results, termination, transfer of buffers, what the UI shows
   when footprints change during a computation.
3. Claims: no depth, volume, rainfall, return period, snow load, drift; limitations visible with the
   layer; "not available" on imported sites.
4. Snow statistics: dropped winters (> 10 missing days or cut short), median/min/max, month means,
   UTM33 conversion. The `snowload` theme must never be read.
5. Provenance: NVE licence spelled "NLOD" without a version; credits on exports.
6. Performance: anything on the main thread proportional to the 458 016 cells.

Rules: read-only. Do not edit source. Every finding has: file:line, failure scenario with concrete
input, severity (correctness / claim / performance / convention), and a proposed minimal fix.
Do not report style preferences.

Deliverable: docs/reviews/water-snow-code-review.md in the template's format, committed on a branch
review/water-snow from build/foundation, opened as a draft PR against build/foundation.
Report: findings count by severity, anything you could not verify.
```

---

## TF-VIS-004

**Model:** Cline + small model · **Reviewer:** Opus (claim policy)

```markdown
Task TF-VIS-004 — Correct the About page. Copy change only.
Repository Guslee93/terraform, branch from build/foundation (or main if PR #18 is merged); name the
branch fix/about-copy. Open a draft PR against that same base. Never push to main.

File: src/app/AboutPage.tsx
Problem: line ~24 says "Noise uses road class and distance, with a fixed reduction behind buildings."
That heuristic was deleted (docs/decisions/ADR-0034-official-road-noise.md). Line ~16 of the same
file already describes the official Statens vegvesen map correctly, so the page contradicts itself.
The page also does not mention the Water and Snow cards or the wind lift.

Read: ADR-0034, ADR-0028, ADR-0029, ADR-0038, ADR-0039 (the "Decision" and "Claims" sections only),
and AGENTS.md §7 "Claim policy".

Change:
1. Replace the noise sentence with one that says the noise bands are Statens vegvesen's published
   strategic road-noise map (2021), shown as published, not for assessing individual buildings.
2. Describe wind as a 2D screening flow in an analysis circle that can be read at any whole metre
   above the ground. No comfort or safety claim.
3. Add one sentence each for Water (runoff screening on 1 m terrain: flow paths and hollows; no
   drains, rainfall or depth) and Snow (winter climate context from NVE's 1 km snow model for open
   terrain; not a measurement at the site, not a snow load).
4. Keep every other sentence. Do not add marketing language. British spelling, sentence case.

Test: add or extend src/app/AboutPage.test.tsx: assert the text "road class and distance" is
absent and "Statens vegvesen" is present.

Done when: npm run lint && npm run test && npm run build pass. Add a row to docs/agent-log.md.
Report: the before and after sentences, tests run.
```

---

## TF-VIS-005

**Model:** Cline + small model · **Reviewer:** Fable 5.2 · **Start only after TF-VIS-006 is answered.**

```markdown
Task TF-VIS-005 — Bring the operating documents up to date. Docs only; no code, no ADR edits.
Branch docs/state-refresh from the current base (build/foundation, or main if PR #18 merged).
Draft PR against the base. Never push to main.

Source of truth for current state: docs/reports/terraform-project-report.md and
docs/plans/terraform-visual-upgrade/01-CODEBASE-AUDIT.md §10.1 (on the branch that contains them).

Edit:
1. AGENTS.md §3 repository map: add src/features/import/, the five workers in
   src/features/analysis/ (circleSunWorker, roofSolarWorker, flowWorker, runoffWorker,
   sweepWorker), scripts/site-assets/, docs/feasibility/, docs/plans/terraform-visual-upgrade/.
2. AGENTS.md §10 "Current state and next action": state that ADR-0028 to ADR-0039 exist and what
   they added (one line each, from their titles); next action = Gate 0 of
   docs/plans/terraform-visual-upgrade/05-MASTER-TODO.md. Record the owner's PR #18 decisions
   exactly as written in the PR description.
3. AGENTS.md §1.11 and §6 brief: add a note that live import (ADR-0006) and MapLibre on /new are
   in scope since ADR-0006; do not delete the original text, mark it superseded.
4. docs/milestones/M2…M5: set the status line to Done with the date and the review file that
   closed it (see docs/reviews/M*-code-review.md).
5. docs/status-report.md: replace with a short pointer to the project report and this plan.

Done when: every row in 01 §10.1 is resolved; markdown renders; no file outside docs/ and AGENTS.md
changed. Log in docs/agent-log.md.
```

---

## TF-VIS-007

**Model:** DeepSeek (runner) · **Reviewer:** Opus 5.5 (method)

```markdown
Task TF-VIS-007 — Compare Terraform's runoff screening with WhiteboxTools (feasibility test IT-7).
Repository Guslee93/terraform, branch test/runoff-reference from build/foundation. Draft PR against
build/foundation. Never push to main. Do not modify src/features/analysis/runoff.ts.

Read: docs/decisions/ADR-0038-runoff-screening.md; src/features/analysis/runoff.ts and its test;
src/features/analysis/terrainTools.ts (TerrainRaster); src/features/sites/terrain1m.ts;
docs/feasibility/06_RECOMMENDED_ROADMAP.md row IT-7.

Inputs: public/sites/compact-infill/terrain1m.{json,bin} and the building footprints the app uses
(src/features/sites/package.ts loader; buildings.json ENU footprints).

Steps:
1. Write scripts/reference/runoff-whitebox/export.ts: load the 1 m raster, burn every building
   footprint +10 m exactly as runoff.ts does, write a GeoTIFF or ASCII grid with the same cell size,
   origin and orientation. Use plain Node; no new runtime dependency in package.json (a dev script
   may write ESRI ASCII grid text, which needs no library).
2. Install WhiteboxTools outside the repository (binary from its GitHub releases, MIT). Record the
   exact version. Run: depression filling (FillDepressions), D8Pointer, D8FlowAccumulation (cells).
   Put the commands in scripts/reference/runoff-whitebox/README.md.
3. Write scripts/reference/runoff-whitebox/compare.ts: classify both outputs with the thresholds in
   runoff.ts (FLOW_PATH_M2, MAIN_FLOW_PATH_M2, DEPRESSION_MIN_M) and report per class: cell agreement,
   cells only in Terraform, cells only in Whitebox, and a PNG diff image.
4. Store a small cropped fixture (≤ 200 × 200 cells, an area with a main path) and the Whitebox
   accumulation for it under src/features/analysis/__fixtures__/runoff-reference/, and add a Vitest
   test that computeRunoff on the crop agrees with the stored reference within the tolerance you
   measured.

Do not use RichDEM code. If you also run RichDEM as a second reference, run it as a separate
program and store only its output numbers; note it is GPL-3.0.

Acceptance: ≥ 95 % agreement on main flow path cells, or each class of disagreement explained
(flats, tie-breaking, edge outlets, burn-in) with an example. Never tune runoff.ts to match.

Deliverable: docs/qa/runoff-reference.md (method, versions, numbers, diff image, conclusion).
Report: the agreement figures and the explanation of differences.
```

---

## TF-VIS-010

**Model:** Codex · **Reviewer:** DeepSeek (repeatability run)

```markdown
Task TF-VIS-010 — Reference capture script for the visual upgrade.
Repository Guslee93/terraform, branch test/capture-reference from the base branch (build/foundation,
or main once PR #18 is merged). Draft PR against the base. Never push to main.

Read: scripts/capture-build.mjs and scripts/capture.mjs (existing capture patterns);
src/scene/PassExporter.tsx and src/components/studio/ExportVisuals.tsx (how passes are exported);
docs/plans/terraform-visual-upgrade/03-VISUAL-DIRECTION.md §7 (the matrix).

Write scripts/capture-reference.mjs:
- Starts or reuses `vite preview` on the production build (npm run build first).
- Chromium via @playwright/test, headed, viewport 1440×900, deviceScaleFactor 2,
  reducedMotion: 'reduce', render quality forced to High via localStorage key
  'terraform.renderQuality' = 'high' before load.
- Sites: compact-infill, sloped-edge. Presets: isometric (3D), top (Plan), eyeLevel (Street) using
  the Camera presets buttons. Dates: 2026-06-21 15:00 and 2026-12-21 12:00 set through the Sun card's
  date and time inputs.
- States: neutral (no card open), Sun (sun hours), Wind (direction view, 2 m), Noise (Lden), Water,
  Slope on, one drawn mass. Use the UI the way e2e/studio-helpers.ts does; reuse its helpers.
- Wait for computations to finish: legend or caption no longer says "Computing".
- For the isometric preset of each state, also trigger Image passes and save still/depth/white/
  analysis by intercepting downloads.
- Output: docs/screenshots/vis/<label>/<site>-<preset>-<state>-<date>.png where <label> is a CLI
  argument (default "baseline").
- Print a manifest JSON beside the images: commit, browser version, GPU renderer string, timestamp.

Then run it twice into two labels and write scripts/compare-captures.mjs that compares two labels
with Playwright's comparator (no new dependency) and prints differing-pixel counts per image.

Acceptance: both scripts run on macOS; the two runs differ by 0 pixels on every image, or each
non-deterministic image is listed with its cause. Do not commit the 4K export PNGs if they exceed
2 MB each; commit the viewport captures and the manifest only, and note where the rest are.
Done when lint/test/build pass. Log in docs/agent-log.md.
```

---

## TF-VIS-011

**Model:** Codex · **Reviewer:** Opus 5.5

```markdown
Task TF-VIS-011 — Performance harness and baseline.
Repository Guslee93/terraform, branch test/perf-harness from the base branch. Draft PR against it.
Never push to main. No application code changes.

Read: feasibility/scratch/perf.mjs (on build/foundation; it measures orbit fps, frame p95, long
tasks and draw calls); scripts/measure-fps-headed.mjs; docs/reviews/build-foundation-report.md §4;
docs/plans/terraform-visual-upgrade/04-ARCHITECTURE-AND-EXPERIMENTS.md §7 (the metrics).

Write scripts/measure-perf.mjs (move and extend perf.mjs; keep the old file as is):
- Production build via vite preview; headed Chromium; 1440×900 @2; High tier forced.
- For each site and state (neutral, sun hours, wind, noise, water, slope on):
  frame times over a scripted 6 s orbit and 4 s idle → fps, p50, p95, p99 (from rAF deltas);
  long tasks > 50 ms (PerformanceObserver 'longtask'); draw calls and triangles from the renderer
  (expose read-only via the existing canvas: if no handle exists, read window.__r3f or add nothing
  and use a WebGL call counter injected by addInitScript — document which);
  time from navigation to first frame with the site drawn;
  time for Image passes to produce four downloads;
  pointer latency: time from pointerdown on a drawn mass's move handle to the next rAF where the mass
  moved (draw one mass first).
- Three runs per cell; report median and spread.
- Output: docs/perf/<label>.json and a table in docs/perf/README.md, with machine, OS, browser,
  GPU renderer string and commit.

Rules: never invent or estimate a number; if a metric cannot be measured, record null and why.
Acceptance: baseline recorded for both sites; spread across runs ≤ 10 % for p95 or flagged.
Done when lint passes (the script is linted). Log in docs/agent-log.md.
```

---

## TF-VIS-012

**Model:** DeepSeek · **Reviewer:** Codex · **Depends on:** TF-VIS-010 merged

```markdown
Task TF-VIS-012 — Opt-in visual regression spec.
Branch test/visual-reference from the base branch; draft PR against it. Never push to main.

Read: e2e/wind-perf.spec.ts (pattern for an opt-in spec: test.skip(process.env.X !== '1')),
e2e/studio-helpers.ts, scripts/capture-reference.mjs (from TF-VIS-010), playwright.config.ts.

Write e2e/visual-reference.spec.ts, skipped unless VISUAL=1:
- Same viewport, scale, reduced motion and High tier as capture-reference.mjs.
- The neutral, Sun, Wind, Noise and Water states at the isometric preset, Compact Infill, 21 June 15:00.
- expect(page.locator('canvas')).toHaveScreenshot(name, { maxDiffPixelRatio }) with a threshold you
  derive from two clean runs (report it).
- Snapshot directory committed; add a note in e2e/README or docs/perf/README.md that baselines are
  valid only on the reference machine (record its GPU string).

Acceptance: VISUAL=1 npx playwright test e2e/visual-reference.spec.ts passes twice in a row;
the normal suite and CI are unaffected (spec skipped).
```

---

## TF-VIS-013

**Model:** Codex · **Reviewer:** Opus 5.5 · **Depends on:** TF-VIS-010, TF-VIS-012 · **Exclusive lock on `src/scene/ViewportCanvas.tsx`**

```markdown
Role: engineering-senior-developer
Task TF-VIS-013 — Move scene style constants into one module. Zero visual change.
Branch refactor/scene-style from the base branch; draft PR against it. Never push to main.

Read: AGENTS.md §1, §7; docs/plans/terraform-visual-upgrade/04-ARCHITECTURE-AND-EXPERIMENTS.md §3.1
(the SceneStyle contract); src/scene/ViewportCanvas.tsx (constants at lines ~142–156, ~307, inline
colours in JSX: skirt #DCD8D1, contour opacities 0.14/0.32, grid #7C8E7D at 0.22);
src/scene/SceneComposer.tsx (AO_INTENSITY 1.6, radius 4, colour #2B3138);
src/scene/landCoverTexture.ts (WATER_COLOR); src/scene/palette.ts.

Do:
1. Create src/scene/style.ts exporting the SceneStyle type and NORDIC with today's exact values.
   Lines keep today's semantics (GL lines, opacity); add widthPx = 1 as a placeholder.
2. Replace the constants and inline colours with reads from a SceneStyle passed into
   ViewportCanvas (prop `style`, default NORDIC) and on to TerrainMesh, ContextBuildings, Streets,
   Water, FloorGrid and SceneComposer.
3. Do not change lighting.ts, any analysis colour, any material property other than where its value
   now comes from, or any component's behaviour.
4. src/scene/style.test.ts: NORDIC equals the old literal values (write them in the test).

Out of scope: new styles, line widths, analysis ramps, UI tokens, the Lab.

Acceptance:
- VISUAL=1 visual-reference spec: zero differing pixels on every snapshot.
- npm run lint && npm run test && npm run build pass.
- Diff touches only the files listed above plus the new module and test.
Rollback: revert the PR. Log in docs/agent-log.md.
```

---

## TF-VIS-014

**Model:** Codex · **Reviewer:** Opus 5.5 · Can run in parallel with TF-VIS-013 (no shared files).

```markdown
Role: engineering-senior-developer
Task TF-VIS-014 — Analysis graphics registry. Zero visual change.
Branch refactor/analysis-graphics from the base branch; draft PR against it. Never push to main.

Read: docs/plans/terraform-visual-upgrade/04-ARCHITECTURE-AND-EXPERIMENTS.md §4.1 (contract);
src/features/analysis/circleSunHours.ts (SUN_HOURS_RAMP ~line 217), climateView.ts (SPEED_BANDS,
WIND_RAMP, DELTA_BANDS, ACTIVITY_BANDS, DIRECTION_BANDS ~lines 95–170), terrainTools.ts
(SLOPE_BANDS ~139), runoff.ts (RUNOFF_LEGEND ~214), officialNoise.ts (bandColour),
src/scene/WindStreamlines.tsx (SLOW/FAST colours).

Do:
1. Create src/features/analysis/graphics.ts (renderer-free: no React, no three import) with
   OutputClass, Band, Ramp, AnalysisGraphic and GRAPHICS. Classes: noise mapped; sun-hours, slope
   calculated; roof-solar, vsc, wind-speed, wind-comfort, wind-delta, runoff screening.
2. Move each constant's values into GRAPHICS. Keep the original exported names in their modules as
   re-exports or derived values so no importer changes. Labels that embed thresholds stay generated
   from the domain constants in their modules.
3. graphics.test.ts: every id has a class; banded scales ≤ 7 bands; a function sharedColours()
   returns hex values used by more than one analysis, and the test snapshots today's list (it is
   expected to be non-empty; Gate 5 empties it).

Out of scope: changing any colour, any label text, any renderer.
Acceptance: visual-reference spec zero diff (if TF-VIS-012 is merged; otherwise state that it was
not available and rely on unchanged-value unit tests); lint/test/build pass; no `any`.
```

---

## TF-VIS-015

**Model:** Claude Opus 5.5 · **Reviewer:** Codex · **Depends on:** TF-VIS-013

```markdown
Role: gis-3d-scene-developer + engineering-software-architect
Task TF-VIS-015 — Visual Lab route and ADR-0040.
Branch feat/visual-lab from the base branch; draft PR against it. Never push to main.

Read: AGENTS.md; docs/plans/terraform-visual-upgrade/04-ARCHITECTURE-AND-EXPERIMENTS.md §2;
03-VISUAL-DIRECTION.md §7; src/app/App.tsx; src/app/StudioPage.tsx;
src/components/studio/StudioShell.tsx (how ViewportCanvas props and the analysis hooks are built);
src/features/sites/useSitePackage.ts; src/scene/style.ts.

Build:
1. src/app/LabPage.tsx, lazy, registered at /lab/:siteId only when
   import.meta.env.DEV || import.meta.env.VITE_LAB === '1'.
2. src/app/lab/states.ts: builders for the fixed states neutral, sun-hours, wind (2 m, direction
   view), noise (Lden), water, slope, one demo mass. Use the real hooks (useCircleSunHours,
   useWindFlow, useRunoff) and domain functions. Copy no computation. If a builder needs a helper
   that is private inside StudioShell, export it from a new small module and use it from both
   (no behaviour change in StudioShell).
3. src/app/lab/TweakPanel.tsx: plain HTML controls (src/components/ui/controls.ts) for: style id,
   state, preset, date/time, quality tier. No GUI library.
4. docs/decisions/ADR-0040-visual-lab.md: purpose, isolation, flag, what may and may not live in
   the Lab, removal plan.

Tests: unit test that AppRoutes has no /lab route when the flag is off (mock env); a build check
script or test asserting dist/ has no file containing "LabPage" after `npm run build`; one e2e that
opens /lab/compact-infill on the dev server and sees a canvas (opt-in, LAB=1).

Out of scope: any new style, line, light or camera behaviour; any production UI change.
Acceptance: production build size unchanged ±0.5 kB gzip per chunk; lint/test/build; ADR written.
Report: chunk sizes before and after, anything you had to export from StudioShell.
```

---

## Template for later work packages

```markdown
Role: <AGENTS.md roster role>
Task <TF-VIS-NNN> — <title from 05-MASTER-TODO.md>
Repository Guslee93/terraform. Branch <type>/<slug> from <base branch>; open a draft PR against it.
Never push to main, merge, mark ready or enable auto-merge.

Read first, in order:
1. AGENTS.md (§1 guardrails, §7 definition of done and claim policy)
2. docs/plans/terraform-visual-upgrade/<the section(s) the task cites>
3. <ADRs the task touches>
4. <exact source files, with line hints>

Goal: <one paragraph: the user-visible outcome>
In scope: <3–6 bullets with file paths>
Out of scope: <explicit list; always includes: new dependencies without an ADR, ENU contract,
worker contracts, history/interaction reducers, depth pass contents, claim wording not in an ADR>

Contracts to preserve: I1–I11 in 01-CODEBASE-AUDIT.md §11 that apply: <list>

Tests to add: <unit / component / e2e / visual / perf>
Tests to run: npm run lint && npm run test && npm run build; <specific e2e specs>; <perf harness
label if visual or render-path change>

Acceptance (measurable): <criteria from 05; budgets from 04 §7>
Risk and rollback: <what could break; revert the PR / flag>
ADR: <none | draft ADR-NNNN with decision, alternatives, evidence>

Report: files changed, tests run with results, measurements with machine and commit, known
limitations, open questions. Add a row to docs/agent-log.md and an entry in progress.md.
```
