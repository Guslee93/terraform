# Run 3 — progress ledger

Run book: the Run 3 brief (T1 TF-VIS-007 full-tile confirmation; T2 TF-VIS-002 comment follow-ups).
Statuses: `todo`, `in progress`, `done`, `partial`, `blocked`.

## Run summary

**Both tasks done; none blocked or partial.**

- **T1 — TF-VIS-007 full-tile confirmation** (PR #23, `test/runoff-reference`, commit `d751278`).
  **Rule 1 is not met on the full tile for any variant:** Terraform main-path cells within 2 cells
  of a reference main path — standard **92.8 %**, bare **93.3 %**, offset **92.3 %** (95 % only at
  3 cells). Main-path k-table (standard, Terraform near WhiteboxTools): k=0 83.4 %, k=1 89.1 %,
  k=2 92.8 %, k=3 95.0 % (of 4,842 cells). Divergence points: standard 56 filled-hollow + **46
  unfilled-ground**, bare 46 + **44**, offset 56 + **46**; the unfilled-ground list is in
  `docs/qa/runoff-reference.md`. Burned-input sha256 verified: yes (all three match the recorded
  values). No threshold, test, wording or `runoff.ts` changed.
- **T2 — TF-VIS-002 comment follow-ups** (PR #28, `fix/water-snow-followups`). Three comment-only
  additions (D8 tie-break in `runoff.ts`, `footprints` memoisation in `useRunoff.ts`, monthly-means
  semantics in `snowClimate.ts`). Diff is comment-only (`git diff -U0` has no non-comment code
  line). Full suite 1,211 passed / 4 skipped / 0 failed; typecheck, lint, build green.

**Not verified:** none. (WhiteboxTools v2.4.0 macOS build produced the full-tile runs; the macOS
build's sha256 differ from the recorded Linux-build ones, but the three burned-input `.asc` sha256
match exactly, so the inputs are trusted.)

**Questions for the owner:**
1. **T1:** Rule 1 (≥ 95 % within 2 cells) is not met on the full tile. Keep 2 cells, widen to 3,
   or drop the number? The 44–46 unfilled-ground divergences per variant are a candidate for a
   separate defect task (reviewed by a different model).

## Environment

- macOS arm64 (Node v22). WhiteboxTools v2.4.0 (macOS build) at `/tmp/wbt`.

## Tasks

| # | Task | Status | Commit(s) | Checks run (last lines) | Open items |
|---|---|---|---|---|---|
| T1 | TF-VIS-007 confirm the IT-7 rule on the full tile | done | d751278 (PR #23) | tolerance tile: main k=2 → 92.8/93.3/92.3 % | Rule 1 not met; 44–46 unfilled-ground divergences; owner decides |
| T2 | TF-VIS-002 PR #26 comment follow-ups | done | _(PR #28)_ | typecheck 0 · lint 0 · unit 1211 passed / 4 skipped / 0 failed · build OK | none — comment-only |

## Questions for the owner

- See Run summary.

## Session notes

- 2026-11-18 — T2 **done**. Three comment-only follow-ups (runoff D8 tie-break, useRunoff memoisation, snowClimate monthly-means). Diff verified comment-only; full suite 1211/0. Run 3 complete.
- 2026-11-18 — T1 **done**. `tolerance.ts` gained `RUNOFF_TOLERANCE_SCOPE=tile`; full-tile run on WhiteboxTools v2.4.0 (macOS). Rule 1 not met (92.3–93.3 % at 2 cells); unfilled-ground divergences listed in `docs/qa/runoff-reference.md`. Next: T2.
