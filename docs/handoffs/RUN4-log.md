# Run 4 — progress ledger

Run book: the Run 4 brief (one task — diagnose the full-tile "unfilled ground" divergence points,
TF-VIS-007). Statuses: `todo`, `in progress`, `done`, `partial`, `blocked`.

## Run summary

**T1 done. No evidence of a defect in `runoff.ts`.** All 46 standard-variant unfilled-ground
divergence points are method differences:

- **H4 fill difference — 12 points (dominant).** WhiteboxTools' `FillDepressions` (with **and**
  without `--fix_flats`) raises the south-east outlet-channel flat by 5–24 cm to −18.44 m where
  Terraform's Priority-Flood+Epsilon raises it by ≤ 1 mm. A non-ascending flood-fill reaches the
  tile edge at −18.68 m, so Terraform drains these cells and WhiteboxTools over-fills them.
- **H1 flat/epsilon — 17 points.** Routed by the 1e-5 epsilon gradient (below the 1 mm cut-off).
- **H2 near-tie — 14 points.** Equal (or < 5 % margin) D8 drops; tie-break order decides.
- **H3 cell shape — 2 points.** `dx ≠ dy` (0.08 %); fixing it removes 2 points and leaves rule 1 at
  **92.8 %**.
- **Edge outlet — 1 point.**
- **Unexplained — 0.** (Three near-misses resolved as H4 neighbour-fill and H2.)

Commit `d751278`'s successor: this branch. Diagnostic script `diagnose.ts` committed; no rasters or
WhiteboxTools outputs committed.

**Questions for the owner:** none beyond Run 3's — keep/widen/replace rule 1 is still the owner's
call. The H4 over-fill (WhiteboxTools raising the outlet channel by 5–24 cm) is the single biggest
contributor to the 92.3–93.3 % shortfall.

## Environment

- macOS arm64 (Node v22). WhiteboxTools v2.4.0 (macOS build) at `/tmp/wbt`.

## Tasks

| # | Task | Status | Commit(s) | Checks run (last lines) | Open items |
|---|---|---|---|---|---|
| T1 | TF-VIS-007 diagnose the unfilled-ground divergence points | done | _(this branch)_ | diagnose.ts mirror cross-check 0/458016 mismatches; 46 points → H4 12 / H1 17 / H2 14 / H3 2 / edge 1 / unexplained 0 | none |

## Questions for the owner

- See Run summary.

## Session notes

- 2026-11-18 — T1 **done**. `diagnose.ts` + `docs/qa/runoff-divergence-diagnosis.md`: all 46 points
  explained (H4 fill 12, H1 epsilon 17, H2 near-tie 14, H3 cell shape 2, edge 1); the H4 over-fill
  is the dominant cause. Run 4 complete.
