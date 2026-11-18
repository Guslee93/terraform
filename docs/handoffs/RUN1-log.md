# Run 1 — progress ledger

The run book is `docs/handoffs/RUN1-deepseek.md`. One task per session. Update this file at the start
and end of every task, and push it. Statuses: `todo`, `in progress`, `done`, `partial`, `blocked`.

## Run summary

**All 11 tasks done (T0–T10); none blocked or partial.** Draft PR #25 (against `build/foundation`) carries the whole run.

- **T0** TF-VIS-007 runoff control runs — `ab1df95` (ledger) + `0f17a24` on `test/runoff-reference` (PR #23). Bare 69.8 % / offset 66.0 % main-path agreement: the "no bug" verdict is withdrawn.
- **T1** TF-VIS-014 graphics registry — `61d49f3`. **T2** TF-VIS-054 claim guardrails — `b1a8dd4`. **T3** TF-VIS-040 legend model — `48b1b6c`.
- **T4** TF-VIS-010 capture script — `bef462d` (`scripts/capture-reference.mjs`, `compare-captures.mjs`; smoke run 24 captures / 0 failures).
- **T5** TF-VIS-012 visual regression spec — `af6a258` (`e2e/visual-reference.spec.ts`, VISUAL=1 gate; passes 5/5 `--headed`).
- **T6** TF-VIS-013 scene style module — `6f2a74e` (`src/scene/style.ts` + `NORDIC`; zero differing pixels vs pre-refactor baselines).
- **T7** TF-VIS-030 camera/input characterisation — `ded94a5` (`e2e/camera-input.spec.ts`, 6 passed ×2).
- **T8** TF-VIS-034 ground-click arbitration — `517e3b4` (`src/features/editor/groundClick.ts`; table test over 16 combinations).
- **T9** TF-VIS-016 design inventory — `57e5436` (`docs/design/visual-inventory.md`).
- **T10** TF-VIS-015 Visual Lab + ADR-0040 — `d2ca2ea` (`src/app/LabPage.tsx`, `lab/{states,TweakPanel}.ts`, `ADR-0040-visual-lab.md`, gate tests).

**Checks:** unit suite grew 1212 → 1234 (T0 → T8; 0 failures, 4 skipped, 1 `it.todo`); typecheck, lint and build green after every task; the `wind-validation.test.ts` "case 4" timeout seen in T0 did not recur.

**T10 chunk sizes (gzip, before → after):** index.js `89529 → 89538` (+9), index.css `11188 → 11202` (+14), three.js `244054 → 244053` (−1), SceneComposer.js `96110 → 96107` (−3), StudioPage.js `80606 → 80605` (−1); all other chunks unchanged. The `LabPage` chunk is fully tree-shaken (`scripts/check-no-lab-chunk.mjs`: no reference in 70 shipped files).

**Exported from StudioShell:** nothing. The Lab builds its states from the real hooks (`useCircleSunHours`, `useWindFlow`, `useRunoff`) and the massing factories directly; no private helper had to be moved out.

**Deviations from the handoffs:**
- T5/T6 pixel checks use `--headed` (Metal); headless SwiftShader stalls the canvas screenshot, so baselines/captures are the owner's to commit.
- T6 `SceneStyle` gains a `grid` field (04 §3.1 omits it) and defers `analysisFocus`; `parcel`/`section` values are recorded in `NORDIC` but not wired (`ParcelLines.tsx` out of scope).
- T7 "complete within one frame" is not literal: `CameraRig` snaps with no 0.75 s ease but the view lands a few frames after the click (React re-render).
- T10 Lab analysis runs over the context buildings only (the demo mass is its own state), and the route gate had to use the direct `import.meta.env.DEV || import.meta.env.VITE_LAB === '1'` expression (a call is not constant-folded, so it would not tree-shake).
- T0 was executed under Claude (Cline), not DeepSeek V4 Pro (see Questions).

**Questions for the owner:**
1. T0 attribution is "Claude (Cline)"; keep that, or restate Run 1 as "DeepSeek V4 Pro (Cline)"?
2. The Lawson wind-activity "Uncomfortable" labels are held as `it.todo` (owner decision to keep the Lawson names or not).
3. Confirm the T10 Lab is local-only (no Vercel preview, decision D19) until the orthophoto licence (D13) clears.

**Commands the owner must run on the Apple M1 Pro** — see the section below (T4 capture/compare, T5 visual-regression baselines; both `--headed`).

## Environment

- GPU: none — headless x86_64 container (no `/dev/dri`, no `nvidia-smi`, no `glxinfo`). Pixel checks (T5, T6) will be written but not judged here.
- Machine / OS: Linux, Node v24.15.0, npm 11.12.1. WhiteboxTools v2.4.0 at `/home/node/whiteboxtools/WhiteboxTools_linux_amd64/WBT/whitebox_tools` (zip sha256 matches the README).
- T4 session ran elsewhere: macOS arm64 (Node v22.23.1). Headed Chromium reports `ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro)`, headless reports SwiftShader — so captures made in this harness are not committed and pixel checks stay with the owner (commands below).

## Tasks

| # | Task | Status | Commit(s) | Checks run (last lines) | Open items |
|---|---|---|---|---|---|
| T0 | TF-VIS-007 runoff control runs (PR #23) | done | 0f17a24 (test/runoff-reference); ab1df95 + ledger (run1/foundations) | eslint(scripts) 0 · unit 1212 passed / 1 failed (wind-validation "case 4" time-out, untouched) · WhiteboxTools pipeline clean | Bare 69.8 % / offset 66.0 % main-path (far below 95 %), so "no bug" verdict withdrawn; PR #23 updated |
| T1 | TF-VIS-014 analysis graphics registry | done | 61d49f3 | typecheck 0 · lint 0 · unit 1220 passed / 4 skipped / 0 failed · build OK | 11 shared hexes snapshotted (Gate 5 empties); Band omits label (labels stay in modules); WIND_RAMP widened → two `!` in climateView.test.ts |
| T2 | TF-VIS-054 claim guardrail tests | done | b1a8dd4 | typecheck 0 · lint 0 · unit 1223 passed / 4 skipped / 1 todo (0 failed) · build OK | Lawson "Uncomfortable" labels held as `it.todo` (owner decision); required negations ("not … safe/snow load") allowed |
| T3 | TF-VIS-040 part A legend model | done | 48b1b6c | typecheck 0 · lint 0 · unit 1227 passed / 4 skipped / 1 todo (0 failed) · build OK · no component changed | claim passed via context (caption modules import graphics → cycle); scale carries colours/boundaries, labels attach in MapLegend wiring |
| T4 | TF-VIS-010 reference capture script | done | bef462d | node --check OK · eslint(scripts) 0 · build OK · unit 1227 passed / 0 failed · smoke run 24 captures / 0 failures (7 states × 3 presets + 3 passes for neutral) | Full matrix + pixel-diff run by owner (commands below); `analysis` pass fires only with an analysis layer visible (neutral/mass → still+white+depth); `--smoke` bounds the proof run |
| T5 | TF-VIS-012 opt-in visual regression spec | done | af6a258 | typecheck 0 · eslint 0 · playwright skipped (5 skipped without VISUAL=1) · VISUAL=1 --headed 5/5 passed twice | Snapshots NOT committed (owner writes them on the M1 Pro); `MAX_DIFF_PIXEL_RATIO` 0.02 is a starting point to tighten; must run `--headed` (headless SwiftShader stalls the canvas shot); `openAnalysis` widened to Water/Snow |
| T6 | TF-VIS-013 scene style module | done | 6f2a74e | typecheck 0 · eslint 0 · unit 1231 passed / 0 failed · build OK · VISUAL=1 --headed 5/5 passed (zero differing pixels vs pre-refactor baselines) | `parcel`/`section` values recorded in NORDIC but not wired (ParcelLines.tsx out of scope); `grid` field added (04 §3.1 type omits it); `analysisFocus` deferred (no today's value) |
| T7 | TF-VIS-030 camera and input characterisation tests | done | ded94a5 | typecheck 0 · lint 0 · playwright camera-input.spec.ts 6 passed ×2 in a row | Deviation: reducedMotion "one frame" is not literal — CameraRig snaps with no 0.75 s ease but the view lands a few frames after the click (React re-render); tested the snap, no-animation behaviour. Light preset tests run before the drag tests (software-GL degradation) |
| T8 | TF-VIS-034 ground-click arbitration | done | 517e3b4 | typecheck 0 · lint 0 · unit 1234 passed / 0 failed · build OK · camera-input e2e 6 passed | None — zero behaviour change; table test pins all 16 input combinations |
| T9 | TF-VIS-016 design inventory | done | 57e5436 | lint 0 (docs only) | None — every entry has file:line and a kept/changes/replaced mark citing 09 §4 R1–R12 |
| T10 | TF-VIS-015 Visual Lab + ADR-0040 (stretch) | done | d2ca2ea | typecheck 0 · lint 0 · unit 1233 passed / 0 failed · build OK · build check (no LabPage in dist) 0 · LAB=1 e2e 1 passed · chunks within ±14 bytes gzip | Reviewer must not be the implementing model (05 roster update); `IDENTITY` style added in TF-VIS-020 (picker leaves room); Lab local-only (D19, no Vercel preview) |

## Questions for the owner

- T0 ran under **Claude (Cline)**, not DeepSeek V4 Pro — the commit trailers, the `docs/agent-log.md` row and this ledger use "Claude (Cline)". Keep that, or should Run 1 keep the run book's "DeepSeek V4 Pro (Cline)" attribution?
- Full unit suite: 1212 passed / 1 failed — `wind-validation.test.ts` "case 4" (12 m gap) times out at 5 s. Unrelated to T0 and untouched; flagging for awareness.

## Commands the owner must run on the Apple M1 Pro

_(Add the exact commands for any check that needs a real GPU.)_
- **T4 (TF-VIS-010) reference capture set** — on the M1 Pro, on mains power, headed Chromium:
  ```bash
  cd <repo>
  npm ci && npm run build
  node scripts/capture-reference.mjs run1
  node scripts/capture-reference.mjs run2
  node scripts/compare-captures.mjs run1 run2
  ```
  The two runs must differ by 0 pixels on every image, or each non-deterministic image is listed
  with its cause. The viewport captures and `manifest.json` go to `docs/screenshots/vis/<label>/`;
  commit the 4K export PNGs only if each is ≤ 2 MB, otherwise note where the rest are.
- **T5 (TF-VIS-012) visual regression baselines** — on the M1 Pro, headed (Metal); the snapshots are
  only valid there:
  ```bash
  VISUAL=1 npx playwright test e2e/visual-reference.spec.ts --headed --update-snapshots
  VISUAL=1 npx playwright test e2e/visual-reference.spec.ts --headed
  ```
  The second command must pass twice. Tighten `MAX_DIFF_PIXEL_RATIO` (currently 0.02) from two clean
  runs, then commit the snapshots only after verifying them on the reference machine.

## Session notes

- 2026-11-18 — T9 **done**. `docs/design/visual-inventory.md` quotes every scene colour, line, ramp/band, legend, floating UI surface and token with file:line, marked kept/changes/replaced against 09 §4 R1–R12. Run 1 complete.
- 2026-11-18 — T9 in progress: design inventory (`docs/design/visual-inventory.md`), docs only.
- 2026-11-18 — T8 **done**. `src/features/editor/groundClick.ts` (`groundClickIntent`, renderer-free) replaces the inline onGroundClick branching in ViewportCanvas; table test covers all 16 combinations; camera-input e2e unchanged. Next: T9.
- 2026-11-18 — T8 in progress: ground-click arbitration (`src/features/editor/groundClick.ts`), zero behaviour change.
- 2026-11-18 — T10 **done**. Visual Lab route `/lab/:siteId` (lazy, DEV/VITE_LAB-gated, tree-shaken from production) + ADR-0040 + gate tests; chunk sizes within ±14 bytes gzip of before. Next: T8.
- 2026-11-18 — T10 in progress: Visual Lab route + ADR-0040 (TF-VIS-015), merged origin/build/foundation (docs only).
- 2026-11-18 — T7 **done**. `e2e/camera-input.spec.ts` (6 tests, not opt-in) locks presets/drag/Escape/click/deslect/orbit/reducedMotion; passes twice in a row. Next: T8.
- 2026-11-18 — T7 in progress: camera and input characterisation tests (`e2e/camera-input.spec.ts`), no source change.
- 2026-11-18 — T6 **done**. `src/scene/style.ts` (`SceneStyle` + `NORDIC`) holds today's exact values; `ViewportCanvas` reads them via a `style` prop (default `NORDIC`), threaded to TerrainMesh/ContextBuildings/Streets/Water/FloorGrid/SceneComposer. Pixel identity proven: VISUAL=1 --headed 5/5, zero differing pixels vs pre-refactor baselines. Next: T7.
- 2026-11-18 — T6 in progress: scene style module (`src/scene/style.ts` + `NORDIC`), zero-pixel move of today's constants.
- 2026-11-18 — T5 **done**. `e2e/visual-reference.spec.ts` (gated `VISUAL=1`) pins neutral/Sun/Wind/Noise/Water at the isometric preset with `toHaveScreenshot`; skipped in the normal suite; passes 5/5 twice `--headed`. Next: T6.
- 2026-11-18 — T5 in progress: opt-in visual regression spec (`e2e/visual-reference.spec.ts`, `VISUAL=1`), same frame as capture-reference.mjs.
- 2026-11-18 — T4 **done**. `scripts/capture-reference.mjs` (server start + GPU check reused from `measure-perf.mjs`; renderPreference recorded as the app's fixed `auto`, never forced) and `scripts/compare-captures.mjs` (Playwright's `getComparator('image/png')`, no new dependency). Smoke run (`--smoke`): 7 states × 3 presets + export passes, 0 failures, manifest written. Next: T5.
- 2026-11-18 — T4 in progress: reference capture script (`scripts/capture-reference.mjs` + `scripts/compare-captures.mjs`). This session runs on macOS arm64 (not the earlier Linux container); GPU treated as none per owner instruction, so the run is marked softwareRenderer and images are not committed.
- 2026-11-17 — T3 **done**. Pure `legendFor(id, context)` in `graphics.ts` returns title/class/scale/claim/sources/state; claim supplied from the existing caption functions (never authored in the model). Commit 48b1b6c. Next: T4.
- 2026-11-17 — T3 in progress: `legendFor(id, context)` added to `graphics.ts` (pure model; claim supplied from existing caption functions to avoid the graphics→module cycle).
- 2026-11-17 — T2 **done**. Renderer-free guardrail collects every analysis caption/note/disclaimer/label and fails on forbidden terms; required negations ("not … safe", "not a snow load") pass; the Lawson "Uncomfortable" labels are an `it.todo` (owner decision). Commit b1a8dd4. Next: T3.
- 2026-11-17 — T2 in progress: renderer-free claim guardrail (`src/features/analysis/claims.test.ts`) collecting every analysis caption/note/disclaimer/label and asserting no forbidden term.
- 2026-11-17 — T1 **done**. One renderer-free source (`graphics.ts`) for every analysis colour + band boundary; legacy constants now derive from it; 11 shared hexes snapshotted. Commit 61d49f3. Next: T2.
- 2026-11-17 — T1 in progress: analysis graphics registry (`src/features/analysis/graphics.ts`) being built; the 9 analyses map to 2 calculated, 1 mapped, 6 screening.
- 2026-11-17 — T0 **done**. Bare terrain main-path agreement 69.8 % and offset 66.0 % (standard 67.0 %) — both far below the IT-7 95 % bar, so the building-block explanation is refuted and the earlier "no bug" verdict is withdrawn. `docs/qa/runoff-reference.md` and PR #23 updated; run1 draft PR #25 opened. Next task: T1.
- 2026-11-17 — T0 in progress: environment checked (GPU none; WhiteboxTools v2.4.0 installed and verified), standard export reproduced the recorded burned `.asc` checksum `997e54f1…`. The control runs (bare, offset) are on `test/runoff-reference`.
