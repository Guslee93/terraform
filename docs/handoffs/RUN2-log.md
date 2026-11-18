# Run 2 — progress ledger

Run book: the Run 2 brief (Gate 0: TF-VIS-002 water/snow review, TF-VIS-003 foundation RV-1). One
task per branch, each a draft PR against `build/foundation`. Statuses: `todo`, `in progress`,
`done`, `partial`, `blocked`.

## Run summary

**Both tasks done; none blocked or partial.**

- **T1 — TF-VIS-002 water/snow review** → draft PR #26 (`review/water-snow`). Verdict: **pass with
  follow-ups, no correctness bug.** Findings: 0 correctness, 0 blocker/major, 4 minor (1 claim
  nuance, 3 convention/performance). The three most serious in one line each:
  1. D8 tie-break is NW-first (runoff.ts:143–160) — deterministic but undocumented; it is a
     documented divergence from WhiteboxTools' tie order.
  2. `RUNOFF_LIMITS` says only the tile edge is an outlet, but no-data (NaN) cells are also sinks
     (runoff.ts:95,121,154) — invisible today (the shipped tile has no NaN), a claim nuance.
  3. `winterStatistics` monthly means use all days while `winters` drop partial winters
     (snowClimate.ts:57–68 vs 71) — not exercised by the clean 1990→2020 build dates.
  **Bearing on the 67 % runoff disagreement:** no correctness bug explains it. The disagreement is
  the documented method difference (epsilon vs `--fix_flats` fill, NW-first tie-break, edge
  outlets) — a modelling choice, not a defect.
- **T2 — TF-VIS-003 foundation RV-1 re-run** → draft PR #27 (`review/foundation-rv1`). Verdict:
  **pass.** Every acceptance number reproduced: parcel 0301-228/255 464.4 m²; measured heights
  520/520 (Compact) and 220/230 (Sloped Edge); W–E section 8.97–21.45 m NN2000 over 578.8 m; noise
  registration 100.0 % (142 samples, gate 90 %); source-health 20/20/0.

**Not verified / read-only:** the run changed no source, script, config or fixture; the two review
documents are the only deliverables. The production 404 (TF-VIS-001, owner's Vercel) and the M1 Pro
screenshot runs for PR #25 remain the owner's.

**Questions for the owner:** none new — Run 1's three stand (T0 attribution, Lawson labels, Lab
local-only).

## Environment

- macOS arm64 (Node v22). Read-only run; no GPU-dependent checks.

## Tasks

| # | Task | Status | Commit(s) | Checks run (last lines) | Open items |
|---|---|---|---|---|---|
| T1 | TF-VIS-002 independent water/snow review (PR #26) | done | _(review/water-snow)_ | adversarial grids: flat/pit/NaN/building all conserved, 0 pits | 4 minor follow-ups; 67 % disagreement is the documented method difference, not a defect |
| T2 | TF-VIS-003 foundation RV-1 re-run (PR #27) | done | _(review/foundation-rv1)_ | parcel 464.4 m² · heights 520/520 + 220/230 · section 8.97–21.45 m · noise 100 % · sources 20/20/0 | none — every row within tolerance |

## Questions for the owner

- None new (see Run summary).

## Session notes

- 2026-11-18 — T2 **done**. `docs/reviews/foundation-rv1.md`: every §3 acceptance number reproduced within tolerance (section needs the app's `project()` — a plain UTM33 offset lands ~0.85 m high). Run 2 complete.
- 2026-11-18 — T1 **done**. `docs/reviews/water-snow-code-review.md`: Priority-Flood+Epsilon and D8 correct; 67 % disagreement is the documented method difference. Pass with follow-ups.
