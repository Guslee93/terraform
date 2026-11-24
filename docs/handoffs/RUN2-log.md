# Run 2 — progress ledger

Run book: the Run 2 brief (Gate 0: TF-VIS-002 water/snow review, TF-VIS-003 foundation RV-1). One
task per branch, each a draft PR against `build/foundation`. Statuses: `todo`, `in progress`,
`done`, `partial`, `blocked`.

## Run summary

_(Written at the end of the run: tasks done, findings, what bears on the 67 % runoff disagreement,
questions for the owner.)_

## Environment

- Same as Run 1's later sessions: macOS arm64 (Node v22). This run is read-only — no GPU-dependent
  checks, so the M1 Pro commands from Run 1 still stand (capture/compare + VISUAL=1 baselines).

## Tasks

| # | Task | Status | Commit(s) | Checks run (last lines) | Open items |
|---|---|---|---|---|---|
| T1 | TF-VIS-002 independent water/snow review (PR) | done | _(this branch)_ | adversarial grids: flat/pit/NaN/building all conserved, 0 pits | 4 minor follow-ups (see review); no correctness bug; 67 % disagreement is the documented epsilon/tie-break/edge method difference |
| T2 | TF-VIS-003 foundation RV-1 re-run (PR) | todo | | | |

## Questions for the owner

- None raised by T1. (Run 1's three questions — attribution, Lawson labels, Lab local-only — stand.)

## Session notes

- 2026-11-18 — T1 **done**. `docs/reviews/water-snow-code-review.md`: Priority-Flood+Epsilon and D8 are correct (5 adversarial grids conserved, 0 pits); the 67 % disagreement is the documented method difference, not a defect. Pass with follow-ups. Next: T2.
