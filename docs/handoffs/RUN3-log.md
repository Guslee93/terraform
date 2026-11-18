# Run 3 — progress ledger

Run book: the Run 3 brief (T1 TF-VIS-007 full-tile confirmation; T2 TF-VIS-002 comment follow-ups).
Statuses: `todo`, `in progress`, `done`, `partial`, `blocked`.

## Run summary

_(Written at the end of the run.)_

## Environment

- macOS arm64 (Node v22). WhiteboxTools v2.4.0 (macOS build) downloaded to `/tmp/wbt` for T1 — the
  burned-input sha256 match the recorded Linux-build ones, so the inputs are trusted.

## Tasks

| # | Task | Status | Commit(s) | Checks run (last lines) | Open items |
|---|---|---|---|---|---|
| T1 | TF-VIS-007 confirm the IT-7 rule on the full tile | done | _(this branch)_ | tolerance tile: main k=2 → 92.8/93.3/92.3 % (standard/bare/offset) | Rule 1 **not met** on the full tile; 44–46 unfilled-ground divergences per variant; owner decides |
| T2 | TF-VIS-002 PR #26 comment follow-ups | todo | | | |

## Questions for the owner

- **T1:** Rule 1 (≥ 95 % of Terraform main-path cells within 2 cells) is **not met** on the full
  tile — 92.8 % standard, 93.3 % bare, 92.3 % offset (95 % only at 3 cells). Keep the 2-cell rule,
  widen to 3, or drop it? 44–46 divergence points per variant are on unfilled ground (not the
  epsilon/fill difference) — worth a separate defect task?

## Session notes

- 2026-11-18 — T1 **done**. `tolerance.ts` gained `RUNOFF_TOLERANCE_SCOPE=tile`; full-tile run on
  WhiteboxTools v2.4.0 (macOS). Rule 1 not met (92.3–93.3 % at 2 cells); 44–46 unfilled-ground
  divergences listed in `docs/qa/runoff-reference.md`. Next: T2.
