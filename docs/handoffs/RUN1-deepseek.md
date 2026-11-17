# Run 1 — DeepSeek run book (Gate 0 tail + Gate 1 + safe Gate 3/4/5 groundwork)

**Builder:** DeepSeek V4 Pro in Cline. **Coordinator and reviewer:** Claude (Opus 5.5) with the owner.
**Branch:** `run1/foundations` (cut from `build/foundation` @ `99555f3`). **One draft PR for the whole run**, against `build/foundation`.
**Budget:** about USD 10 of DeepSeek API credit, plus ClinePass. Spend it on building, not on re-reading.
**Progress ledger:** `docs/handoffs/RUN1-log.md`. It is the only memory between sessions.

This file is the brief. The owner pastes a short prompt that points here at the start of every session.
Read this file once per session, then work. Do not re-read it mid-task.

---

## 1. Session protocol (do this every session, in this order)

1. `git status` and `git log --oneline -5`. You must be on `run1/foundations` (or on
   `test/runoff-reference` for task T0 only). If the tree is dirty from a previous session, read the
   ledger before touching anything.
2. Read `docs/handoffs/RUN1-log.md`. The first task whose status is not `done` or `blocked` is your
   task. **Do exactly one task per session.**
3. In the ledger, set that task to `in progress` with today's date. Commit:
   `chore(run1): start TF-VIS-NNN`.
4. Read only the files the task lists, plus what the code itself points you to. Follow the budget
   rules in §3.
5. Build. Test. Commit (message format in §4). Push: `git push origin run1/foundations`.
6. In the ledger, set the task to `done`, `blocked` or `partial`, with the commit SHA, the commands you
   ran with their last result lines, and anything left open. Commit and push.
7. **Stop.** Report in five lines or fewer: the task, the result, the PR link, what is open, and the
   next task. The owner starts a fresh session for the next one. A fresh session costs far fewer
   tokens than a long one.

On the very first task of the run, open the draft PR after the first push:

```bash
gh pr create --draft --base build/foundation --head run1/foundations --title "Run 1: Gate 1 foundations (DeepSeek)" --body "Run book: docs/handoffs/RUN1-deepseek.md. Progress: docs/handoffs/RUN1-log.md. One commit series per task, prefixed TF-VIS-NNN."
```

## 2. Hard rules (never break these)

- **Never push to `main` or `build/foundation`.** Never merge, never mark the PR ready, never enable
  auto-merge. Push only `run1/foundations` (and `test/runoff-reference` for T0). `main` deploys to
  production.
- **Never change these contracts** (`docs/plans/terraform-visual-upgrade/01-CODEBASE-AUDIT.md` §11):
  - I1 — local ENU metres via `enuToThreeXyz`; never latitude/longitude as mesh vertices.
  - I2 — no React or three.js import in `src/features/**` domain modules.
  - I3 / I4 — worker request and response types, and the hooks' "computing" behaviour.
  - I5 — `features/editor/history.ts` and `interaction.ts` semantics: one drag is one undo entry,
    Escape cancels.
  - I6 / I7 — the depth export pass never gets credits; still, white, analysis and clip always do.
  - I8 / I9 — provenance and claim wording. Never "safe", "verified", "compliant", "accurate", or any
    flood depth, snow load or comfort/safety class.
- **No new dependency** in `package.json`. No `any`, no unchecked `as`.
- **No ADR edits**, except creating `ADR-0040` in task T10.
- **No visual change** unless the task says so. T1–T9 are invisible refactors, tests or docs.
- **Secrets:** never print, paste or commit `.env` contents, tokens or keys.
- **Two-strike rule:** if the same check fails twice after a fix attempt, stop. Commit what you have
  as `wip(TF-VIS-NNN): …`, mark the task `blocked` in the ledger with the exact error, push, and report.
  Never loosen a test or an assertion to make it pass.
- **Owner decisions are not yours to make.** If a task needs a choice the brief does not settle
  (a colour, a label, a claim, an ADR change), stop and list the question in the ledger.

## 3. Budget rules (the money is the limit)

- **Never read** `public/sites/**`, `data/raw/**`, `docs/screenshots/**`, `dist/**`,
  `node_modules/**`, `package-lock.json`, `feasibility/scratch/evidence/**`, or any `*.json`/`*.bin`
  over 50 kB. Use `ls -la` or `wc -c` if you need a size.
- Find code with `grep -n` / `rg -n`, then read only the line range you need. `ViewportCanvas.tsx` is
  785 lines and `StudioShell.tsx` 738: read ranges, not whole files, after the first look.
- Pipe long command output through `| tail -25`. Never paste a full test log into the conversation.
- Tests: run the files you touched (`npx vitest run path/to/file.test.ts`). Run the full unit suite
  (`npm run test 2>&1 | tail -8`) **once**, at the end of a task. Run Playwright specs only when the
  task says so, one spec at a time.
- Don't rewrite a file to change a few lines; edit in place.
- Prefer DeepSeek's off-peak hours for long tasks (check the window on DeepSeek's pricing page).

## 4. Commits

Format: `<type>(TF-VIS-NNN): <what changed, in plain words>` where `<type>` is `feat`, `fix`,
`refactor`, `test` or `docs`. End every commit message with:

```
Co-Authored-By: DeepSeek V4 Pro (Cline) <noreply@deepseek.com>
```

Each task also adds **one row** to `docs/agent-log.md` (same columns as the existing rows; agent =
`DeepSeek V4 Pro (Cline), Run 1`) and **one dated entry** to `progress.md`.

## 5. Environment check (first session only, record the answer in the ledger)

Find out whether this machine has a real GPU, because pixel checks only mean something on one:

```bash
node -e "const {chromium}=require('@playwright/test');(async()=>{const b=await chromium.launch();const p=await b.newPage();console.log(await p.evaluate(()=>{const g=document.createElement('canvas').getContext('webgl2');const e=g&&g.getExtension('WEBGL_debug_renderer_info');return e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):'unknown'}));await b.close()})()"
```

If the answer contains `SwiftShader`, `llvmpipe` or `software`, or is `unknown`, write
`GPU: none` in the ledger. Pixel comparisons (T5, T6) are then **written and committed but not
judged here**; the owner runs them on the Apple M1 Pro with one command, which you write into the
ledger.

## 6. Facts that correct the plan documents (trust these over the plan)

- The studio **hard-codes `renderPreference="auto"`** (`src/components/studio/StudioShell.tsx`, about
  line 623). Setting `localStorage['terraform.renderQuality']` does **not** force High.
- The default open analysis card is **Noise**. Cards have `data-testid="analysis-card-<id>"` for
  `sun`, `wind`, `noise`, `water`, `snow`.
- The Sun card shows `Computing…` while busy; the Water card shows `Tracing where the water runs…`.
- Drawing a block needs **"Add a block"** switched on first; then "Draw building" appears
  (`e2e/studio-helpers.ts` `openStudio`, `drawMass`).
- "Image passes" lives in the inspector's **Export** group; click the button named `Export` first.
- Camera preset buttons are labelled `3D`, `Plan`, `North`, `South`, `Street`.
- `e2e/studio-helpers.ts` `openAnalysis` accepts only `'Sun' | 'Wind' | 'Noise'`; widen the type if
  you need Water or Snow.
- Wind progress is exposed on `<html>` as `data-flow-request`, `data-flow-result`,
  `data-flow-buildings` and `data-flow-solid` (see `e2e/simplified-studio.spec.ts`).
- Claim tests already live in `src/components/studio/claims.test.tsx` and `src/app/AboutPage.test.tsx`.
- A performance harness exists: `scripts/measure-perf.mjs`, with its baseline in
  `docs/perf/baseline-build-foundation.json` and notes in `docs/perf/README.md`.
- The next free ADR number is **ADR-0040**.
- Opt-in Playwright specs skip themselves with
  `test.skip(process.env.X !== '1', 'Opt-in: X=1')`, as in `e2e/wind-perf.spec.ts`.

## 7. The tasks, in order

Each task gives its goal, the files to read, what to change, how to test, and when it is done.
`06` means `docs/plans/terraform-visual-upgrade/06-AGENT-HANDOFF-PROMPTS.md`; where a task says
"follow 06", that prompt is the detailed spec, **except** for its branch and PR instructions (use
§1 and §4 here) and anything §6 above corrects.

### T0 — TF-VIS-007 follow-up: the runoff control runs (branch `test/runoff-reference`, PR #23)

This is the only task that is not on `run1/foundations`. Run `git fetch origin && git checkout
test/runoff-reference && git pull`, because the coordinator added a merge commit to that branch.

Re-run the identical WhiteboxTools comparison twice more, changing nothing in `runoff.ts`:

1. **No buildings burned in** (bare 1 m terrain). Same tools, same thresholds.
2. **Buildings burned in, but each block's top raised by a tiny per-building offset**
   (`+0.001 m × building index`) in **both** inputs, so building tops never tie.

Add both runs to the agreement table in `docs/qa/runoff-reference.md`.

- **If run 1 reaches ≥ 95 %** on main paths: the method is validated on bare terrain and the gap comes
  from the building blocks. Say so.
- **If run 1 is far below 95 %:** say that plainly, and do **not** conclude "no bug".

Rewrite the verdict line to match the evidence. Commit, push, and update PR #23's body with the new
table. Then mark T0 in the ledger (the ledger lives on `run1/foundations`; switch back to that branch
to update it).

**Done when:** both runs are in the table, the verdict follows from them, and PR #23 is updated.

### T1 — TF-VIS-014: the analysis graphics registry (no pixel change)

Follow `06` § TF-VIS-014. In short: create `src/features/analysis/graphics.ts` (renderer-free) with
`OutputClass`, `Band`, `Ramp`, `AnalysisGraphic` and `GRAPHICS`, holding the existing colour
constants from `circleSunHours.ts`, `climateView.ts`, `terrainTools.ts`, `runoff.ts`,
`officialNoise.ts` and `src/scene/WindStreamlines.tsx`.

- Keep every old exported name working (re-export or derive), so no importer changes.
- Labels that embed thresholds stay generated in their own modules.
- `graphics.test.ts`: every graphic has a class; banded scales have at most 7 bands;
  `sharedColours()` returns hex values used by more than one analysis, and the test **snapshots
  today's list**. That list is expected to be non-empty; Gate 5 empties it.

**Done when:** no colour or label value changed (prove it with a unit test that compares the old
exported constants to their new source), targeted tests pass, lint passes, the full suite passes once,
and the build passes.

### T2 — TF-VIS-054: claim guardrail tests

Goal: a test that fails if any user-facing analysis text makes a forbidden claim.

- Read `src/components/studio/claims.test.tsx`, `src/app/AboutPage.test.tsx` (its banned-words test),
  `AGENTS.md` §7 (claim policy), and the caption and disclaimer functions: `windCaption`
  (`climateView.ts`), `sunHoursDisclaimer` (`sunHours.ts`), `RUNOFF_NOTE` and `RUNOFF_LEGEND`
  (`runoff.ts`), the snow and noise notes (`snowClimate.ts`, `officialNoise.ts`), and the hazard
  facts (`hazards.ts`).
- Add `src/features/analysis/claims.test.ts` (renderer-free) that collects every exported caption,
  note, disclaimer and legend label the analyses produce. Call the functions with representative
  inputs, including each wind display and height, each sun analysis, and runoff computing and not
  computing.
- Assert that none contains, case-insensitively:
  - `safe` as a whole word
  - `verified`, `compliant`, `compliance`, `accurate`, `certified`
  - `flood depth`, `snow load`, `water depth`, `return period`
  - `comfortable` or `uncomfortable` unless the same string also contains `screening`
- **If the existing wind activity legend (`ACTIVITY_BANDS`, labels "Uncomfortable…") fails the rule,
  do not change the labels** — that is an open owner decision (whether to keep the Lawson names).
  Mark that case with `it.todo` plus a comment naming the decision, and list it in the ledger.

**Done when:** the new test passes (apart from the documented `todo`), lint and the full suite pass.

### T3 — TF-VIS-040 part A: the legend model (pure, no UI)

Goal: one renderer-free function that describes the legend of whichever analysis is on the map. Do
**not** wire it into any component in this task.

- Read `docs/plans/terraform-visual-upgrade/04-ARCHITECTURE-AND-EXPERIMENTS.md` §4.2, the four caption
  blocks in `src/scene/ViewportCanvas.tsx` (about lines 636–661), `src/scene/WindRampBar.tsx`, and
  `SunHoursRampBar` in `src/scene/SunHoursLayer.tsx`.
- In `src/features/analysis/graphics.ts`, add
  `legendFor(id, context): LegendModel` returning `{ title, outputClass, classLabel, scale, claim,
  sources, state }`.
  - `state` is `'ready' | 'computing' | 'not-mapped' | 'unavailable-on-import'`.
  - `claim` **must come from the existing caption functions**. Never write new claim text.
  - `classLabel` uses plain words: `Mapped data`, `Calculated`, `Screening`, `Illustrative`.
- Tests: one per analysis id and per state, plus a test that each `claim` equals the string the
  viewport shows today for the same inputs.

**Done when:** tests, lint, the full suite and the build pass, and no component file changed.

### T4 — TF-VIS-010: the reference capture script

Follow `06` § TF-VIS-010, with these corrections from §6:

- Render quality cannot be forced. Record `renderPreference: 'auto'` in the manifest; don't set
  localStorage.
- Wait for both `Computing` and `Tracing where the water runs` to disappear.
- Open the Export group before "Image passes".

Reuse `scripts/measure-perf.mjs`'s server start, GPU check and helpers where you can (copy small
pieces; don't import a script from a script). Add `scripts/compare-captures.mjs`, which uses
Playwright's comparator (no new dependency).

- **With a GPU:** run it twice and report the differing pixels per image.
- **Without a GPU:** run it once to prove it works end to end, mark the run `softwareRenderer`, do
  not commit those images, and write the owner's command into the ledger.

**Done when:** `node --check` passes, lint passes, and one end-to-end run completes.

### T5 — TF-VIS-012: the opt-in visual regression spec

Follow `06` § TF-VIS-012. Gate it with `VISUAL=1`. Same viewport, scale and reduced motion as T4.

- **Without a GPU:** write the spec, make sure it is skipped in the normal suite, and **do not commit
  snapshots**. Write the owner's two commands into the ledger (`--update-snapshots` once, then a
  plain run).

**Done when:** `npx playwright test e2e/visual-reference.spec.ts` reports it skipped without
`VISUAL=1`, and lint passes.

### T6 — TF-VIS-013: the scene style module (no pixel change)

Touches `src/scene/ViewportCanvas.tsx`. Follow `06` § TF-VIS-013 and the contract in `04` §3.1.

- Create `src/scene/style.ts` with `SceneStyle` and `NORDIC` holding **today's exact values**.
- Replace the constants and inline colours in `ViewportCanvas.tsx` (about lines 142–156 and 307, plus
  the inline skirt, contour and grid colours in the JSX) and the AO values in `SceneComposer.tsx`.
- `style.test.ts` pins every old literal value.
- Change nothing in `lighting.ts`, in any analysis colour, or in behaviour.

**Done when:** the unit test pins all values, lint, the full suite and the build pass, and the diff
touches only the files listed. With a GPU, the T5 spec shows zero differing pixels. Without one, write
"pixel check pending: owner runs VISUAL=1" in the ledger.

### T7 — TF-VIS-030: camera and input characterisation tests

Goal: lock today's camera and editing behaviour with tests **before** anyone changes the controller.
No source change.

Add `e2e/camera-input.spec.ts` (not opt-in; it must pass in CI with the budgets from `e2e/budget.ts`)
covering:

1. Each preset button (`3D`, `Plan`, `North`, `South`, `Street`) changes the canvas (use
   `canvasSignature` / `expectCanvasChanged` from `e2e/studio-helpers.ts`).
2. Dragging a drawn block does not orbit the camera, and one drag adds exactly one undo step (undo
   once returns the block to its start).
3. Escape during a drag cancels it (the block stays where it was, no undo entry added).
4. A short click on the ground (under 4 px of travel) deselects; a long drag on the ground orbits and
   does not deselect.
5. Under `reducedMotion: 'reduce'`, a preset change is complete within one frame.

Read `e2e/massing.spec.ts` and `e2e/keyboard.spec.ts` first and reuse their patterns.

**Done when:** the spec passes locally twice in a row (`npx playwright test e2e/camera-input.spec.ts`)
and lint passes. If a behaviour turns out to differ from the list above, **test what the app does
today** and record the difference in the ledger. Do not change the app.

### T8 — TF-VIS-034: ground-click arbitration as a pure function

Touches `src/scene/ViewportCanvas.tsx`. No behaviour change.

- Move the decision in `onGroundClick` (about line 621) into
  `src/features/editor/groundClick.ts`:
  `groundClickIntent({ picking, parcelLayerOn, drawing, editable }) → 'pick-point' | 'select-parcel-and-deselect' | 'select-parcel' | 'draw-vertex' | 'deselect' | 'none'`.
  Derive the exact cases from today's code, including the case where a parcel is picked **and** the
  editor deselects.
- `groundClick.test.ts` holds a table with every combination of the four booleans.
- `ViewportCanvas.tsx` calls the function and dispatches as before.

**Done when:** the table test passes, T7's spec and `e2e/massing.spec.ts` still pass, and lint, the
full suite and the build pass.

### T9 — TF-VIS-016: design inventory (docs only)

Create `docs/design/visual-inventory.md`: every scene colour, line, opacity and material value, every
analysis ramp and band, every legend and caption location, and every floating surface over the canvas,
each with `file:line`. Generate it from `src/scene/style.ts` (T6), `graphics.ts` (T1/T3) and a grep of
the remaining hex values in `src/scene` and `src/components/studio`. End with a list of every hex
value used for two different meanings.

**Done when:** the file exists, every entry has a `file:line`, and lint passes.

### T10 (stretch) — TF-VIS-015: the Visual Lab route and ADR-0040

Only start this if T1–T9 are `done` and budget remains. Follow `06` § TF-VIS-015 and `04` §2.

The coordinator reviews it in full before the owner sees it. Keep it small:

- The route `/lab/:siteId`, present only when `import.meta.env.DEV || import.meta.env.VITE_LAB === '1'`.
- The fixed states (neutral, sun hours, wind, noise, water, slope, one demo mass) built with the real
  hooks. Copy no computation.
- A plain-HTML tweak panel.
- `docs/decisions/ADR-0040-visual-lab.md`.

**Done when:** a unit test proves the route is absent with the flag off; after `npm run build`,
`grep -rl LabPage dist/` finds nothing; studio and landing chunk sizes are unchanged (±0.5 kB gzip);
and lint, the full suite and the build pass.

## 8. When the run ends

When every task is `done` or `blocked` (or the budget runs out):

1. Write a summary at the top of the ledger: tasks done, tasks blocked and why, the questions for the
   owner, and the commands the owner must run on the GPU machine.
2. Push.
3. Update the PR body with the same summary.

Do not mark the PR ready.
