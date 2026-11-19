# Run 6 — progress ledger

Run book: the Run 6 brief (one task — re-measure rule 1 against a textbook-fill reference,
TF-VIS-007). Statuses: `todo`, `in progress`, `done`, `partial`, `blocked`.

## Run summary

**T1 done. The textbook-fill reference removes the H4 fill difference but is not usable to
re-measure rule 1, because D8 routing stalls on its flat plateaus.**

- **Rule 1 per variant at k = 2 (old WhiteboxTools-fill → new textbook-fill):** standard 92.8 % →
  **0.0 % (not measurable)**, bare 93.3 % → **0.0 % (not measurable)**, offset 92.3 % → **0.0 % (not
  measurable)**. The textbook reference has **0 main-path cells** in every variant.
- **Standard k-table (textbook, Terraform near reference):** main k=0..3 all **0.0 % of 4,842**
  (reference has 0 main cells; reverse direction NaN). Flow (≥ 500 m²): 9.6 % → 13.1 % (k 0 → 3);
  reverse 88.8 % → 96.2 %.
- **Class counts per variant: 0 divergence points** — H1 0, H2 0, H3 0, **H4 0**, edge 0, unexplained 0.
- **H4 count: 0** (expected near 0 — the channel fill is gone).
- **Filled-flat cell count:** standard 62,035, bare 31,946, offset 62,099; D8Pointer "no flow"
  (pointer 0) on 71,523 (15.6 %) / 43,669 (9.5 %) / 71,679 (15.6 %); accumulation peaks 3,845 / 4,039
  / 3,750 cells — all < 5,002, hence no main path.
- **Why:** a flat-resolution step (Terraform's epsilon or WhiteboxTools' `--fix_flats`) is a
  prerequisite for D8 routing; removing it (textbook fill) removes the H4 channel-fill difference but
  also stops D8 flow on flats. The Run 3 WhiteboxTools-fill numbers remain on record.

**Not verified:** none material — the textbook fill raises none of the four H4 cells (verified), and
the stall is demonstrated by the pointer=0 counts and accumulation maxima.

**Questions for the owner:** rule 1's disposition remains the owner's call (unchanged).

## Environment

- macOS arm64 (Node v22). WhiteboxTools v2.4.0 (macOS build) at `/tmp/wbt`.

## Tasks

| # | Task | Status | Commit(s) | Checks run (last lines) | Open items |
|---|---|---|---|---|---|
| T1 | TF-VIS-007 re-measure rule 1 vs textbook-fill reference | done | _(this branch)_ | textbookFill 3/3 pass; tolerance+diagnose vs textbook → 0 main cells, 0 divergences | none |

## Questions for the owner

- See Run summary.

## Session notes

- 2026-11-19 — T1 **done**. `textbookFill.ts` (Barnes 2014 Alg 1, no epsilon) added; tolerance.ts and
  diagnose.ts gained `RUNOFF_REFERENCE=textbook`. The textbook reference has no main path (flats stall
  D8), so rule 1 is not measurable with it; H4 = 0 confirms the channel fill is WhiteboxTools' own.
  Run 6 complete.
