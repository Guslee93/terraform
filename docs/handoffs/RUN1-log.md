# Run 1 — progress ledger

The run book is `docs/handoffs/RUN1-deepseek.md`. One task per session. Update this file at the start
and end of every task, and push it. Statuses: `todo`, `in progress`, `done`, `partial`, `blocked`.

## Run summary

_(Written at the end of the run: tasks done, tasks blocked and why, questions for the owner, and
commands the owner must run on the GPU machine.)_

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
| T5 | TF-VIS-012 opt-in visual regression spec | in progress | | | |
| T6 | TF-VIS-013 scene style module | todo | | | |
| T7 | TF-VIS-030 camera and input characterisation tests | todo | | | |
| T8 | TF-VIS-034 ground-click arbitration | todo | | | |
| T9 | TF-VIS-016 design inventory | todo | | | |
| T10 | TF-VIS-015 Visual Lab + ADR-0040 (stretch) | todo | | | |

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

## Session notes

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
