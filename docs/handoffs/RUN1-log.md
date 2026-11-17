# Run 1 — progress ledger

The run book is `docs/handoffs/RUN1-deepseek.md`. One task per session. Update this file at the start
and end of every task, and push it. Statuses: `todo`, `in progress`, `done`, `partial`, `blocked`.

## Run summary

_(Written at the end of the run: tasks done, tasks blocked and why, questions for the owner, and
commands the owner must run on the GPU machine.)_

## Environment

- GPU: none — headless x86_64 container (no `/dev/dri`, no `nvidia-smi`, no `glxinfo`). Pixel checks (T5, T6) will be written but not judged here.
- Machine / OS: Linux, Node v24.15.0, npm 11.12.1. WhiteboxTools v2.4.0 at `/home/node/whiteboxtools/WhiteboxTools_linux_amd64/WBT/whitebox_tools` (zip sha256 matches the README).

## Tasks

| # | Task | Status | Commit(s) | Checks run (last lines) | Open items |
|---|---|---|---|---|---|
| T0 | TF-VIS-007 runoff control runs (PR #23) | done | 0f17a24 (test/runoff-reference); ab1df95 + ledger (run1/foundations) | eslint(scripts) 0 · unit 1212 passed / 1 failed (wind-validation "case 4" time-out, untouched) · WhiteboxTools pipeline clean | Bare 69.8 % / offset 66.0 % main-path (far below 95 %), so "no bug" verdict withdrawn; PR #23 updated |
| T1 | TF-VIS-014 analysis graphics registry | todo | | | |
| T2 | TF-VIS-054 claim guardrail tests | todo | | | |
| T3 | TF-VIS-040 part A legend model | todo | | | |
| T4 | TF-VIS-010 reference capture script | todo | | | |
| T5 | TF-VIS-012 opt-in visual regression spec | todo | | | |
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

## Session notes

- 2026-11-17 — T0 **done**. Bare terrain main-path agreement 69.8 % and offset 66.0 % (standard 67.0 %) — both far below the IT-7 95 % bar, so the building-block explanation is refuted and the earlier "no bug" verdict is withdrawn. `docs/qa/runoff-reference.md` and PR #23 updated; run1 draft PR #25 opened. Next task: T1.
- 2026-11-17 — T0 in progress: environment checked (GPU none; WhiteboxTools v2.4.0 installed and verified), standard export reproduced the recorded burned `.asc` checksum `997e54f1…`. The control runs (bare, offset) are on `test/runoff-reference`.
