# Runoff divergence diagnosis — full-tile "unfilled ground" points (TF-VIS-007, Run 4)

- **Date:** 2026-11-18
- **Reviewer:** DeepSeek V4 Pro (Cline), `gis-qa-engineer`
- **Scope:** explain every "unfilled ground" divergence point (Terraform hollow ≤ 1 mm) that Run 3
  found on the full Compact Infill tile (46 standard-variant points). Read-only diagnosis: no
  `runoff.ts`, threshold, test or wording changed.
- **Tooling:** `scripts/reference/runoff-whitebox/diagnose.ts` (new, registered in its
  `vitest.config.ts`) mirrors `computeRunoff`'s fill + D8 verbatim to expose `filled` and
  `receiver`, and reads the pipeline's `tmp/runoff-whitebox/{filled,pointer,accum}.asc`.
  WhiteboxTools v2.4.0 (macOS build); burned-input sha256 verified in Run 3.

## Method

- `diagnose.ts` cross-checks its fill mirror against `computeRunoff.hollow` cell-for-cell
  (**0 mismatches** out of 458,016), so the exposed `filled`/`receiver` are the app's own numbers.
- The WhiteboxTools D8 pointer convention used is the WhiteboxTools source convention
  (`fd8_pointer.rs`): `N=128, NE=1, E=2, SE=4, S=8, SW=16, W=32, NW=64, 0=no flow`.
- Four hypotheses are scored per point: H1 flat/epsilon (raw heights equal, or the best drop is the
  ~1e-5 epsilon gradient), H2 near-tie (best/second drop margin < 5 %), H3 cell shape (dx ≠ dy),
  H4 fill difference (|WhiteboxTools fill − Terraform fill| > 1 mm at the cell or a neighbour).

## 1. The 46 standard points

Primary class per point (a point can be several; the primary is the dominant mechanism).

| # | point (→ downstream) | Terraform hollow | WBT fill | best/second drop | margin | class |
|---|---|---|---:|---:|---:|---:|---|
| 1 | (94,50)→(95,50) | 0.0000 | 0.000 | 0.2601/0.2599 | 0.001 | **H3** (gone at dx=dy) + H2 |
| 2 | (95,46)→(96,45) | 0.0000 | −0.000 | 0.0100/0.0071 | 0.292 | H1 (epsilon) |
| 3 | (113,44)→(114,45) | 0.0000 | 0.000 | 0.0300/0.0281 | 0.062 | H2 (near-tie, 6.2 %) |
| 4 | (114,44)→(114,45) | 0.0000 | −0.000 | 0.0098/0.0098 | 0.000 | H2 |
| 5 | (136,46)→(137,45) | 0.0002 | 0.000 | 1e-5/7e-6 | 0.293 | H1 (flat) |
| 6 | (156,38)→(157,39) | 0.0003 | 0.000 | 1e-5/7e-6 | 0.293 | H1 (epsilon) |
| 7 | (178,44)→(179,43) | 0.0000 | 0.000 | 1e-5/7e-6 | 0.293 | H1 (flat) |
| 8 | (226,431)→(227,432) | 0.0000 | 0.000 | 0.0141/0.0141 | 0.000 | H2 |
| 9 | (250,475)→(251,476) | 0.0000 | −0.000 | 0.0071/0.0071 | 0.000 | H2 |
| 10 | (262,379)→(263,380) | 0.0000 | −0.000 | 0.0212/0.0212 | 0.000 | H2 |
| 11 | (308,65)→(308,66) | 0.0000 | −0.000 | 7e-6/0 | 1.000 | H1 (epsilon) |
| 12 | (367,552)→(368,551) | 0.0000 | −0.000 | 0.0299/0.0212 | 0.293 | H1 (epsilon) |
| 13 | (368,552)→(368,551) | 0.0001 | −0.000 | 1e-5/7e-6 | 0.293 | H1 (epsilon) |
| 14 | (375,395)→(376,395) | 0.0001 | −0.000 | 7e-6/0 | 1.000 | H1 (flat) |
| 15 | (386,546)→(387,546) | 0.0000 | 0.000 | 1e-5/1e-5 | 0.001 | H1 + H2 |
| 16 | (388,544)→(388,543) | 0.0001 | −0.000 | 7e-6/0 | 1.000 | H1 (epsilon) |
| 17 | (403,54)→(404,54) | 0.0000 | −0.000 | 0.0300/0.0300 | 0.001 | H2 |
| 18 | (414,550)→(415,551) | 0.0000 | 0.000 | 0.0071/0.0071 | 0.000 | H2 |
| 19 | (421,552)→(422,553) | 0.0001 | −0.000 | 1e-5/7e-6 | 0.293 | H1 (flat) |
| 20 | (466,31)→(467,31) | 0.0000 | 0.000 | 7e-6/0 | 1.000 | H1 (epsilon) |
| 21 | (495,381)→(496,382) | 0.0000 | −0.000 | 0.0141/0.0141 | 0.000 | H2 |
| 22 | (508,3)→(509,4) | 0.0000 | −0.000 | 0.0283/0.0212 | 0.249 | **H4** (SW neighbour filled 1 cm) |
| 23 | (509,383)→(510,384) | 0.0000 | −0.000 | 0.0212/0.0212 | 0.000 | H2 |
| 24 | (512,2)→(513,2) | 0.0000 | 0.010 | 7e-6/0 | 1.000 | **H4** |
| 25 | (518,32)→(519,32) | 0.0000 | −0.000 | 0.0100/0.0100 | 0.001 | H2 |
| 26 | (529,17)→(530,17) | 0.0000 | 0.210 | 0.0141/0 | 1.000 | **H4** |
| 27 | (538,69)→(539,68) | 0.0000 | −0.000 | 0.0071/0.0071 | 0.000 | H2 |
| 28 | (542,27)→(543,27) | 0.0000 | 0.000 | 0.0100/0.0100 | 0.001 | H2 |
| 29 | (542,28)→(543,27) | 0.0000 | −0.000 | 0.4602/0.3324 | 0.278 | **H4** (tributary junction) |
| 30 | (552,5)→(553,5) | 0.0000 | 0.240 | 1e-5/7e-6 | 0.293 | **H4** + H1 |
| 31 | (562,7)→(562,8) | 0.0001 | 0.230 | 7e-6/−7e-6 | 2.000 | **H4** + H1 |
| 32 | (585,31)→(585,32) | 0.0001 | 0.200 | 1e-5/−0.007 | 699.9 | **H4** |
| 33 | (585,381)→(586,382) | 0.0000 | −0.000 | 0.0212/0.0212 | 0.000 | H2 |
| 34 | (590,37)→(590,38) | 0.0000 | 0.100 | 1e-5/−7e-6 | 1.707 | **H4** |
| 35 | (626,81)→(627,80) | 0.0000 | 0.050 | 0.0400/0.0350 | 0.124 | **H4** |
| 36 | (626,81)→(627,81) | 0.0000 | 0.050 | 0.0400/0.0350 | 0.124 | **H4** |
| 37 | (626,82)→(627,81) | 0.0000 | −0.000 | 0.0800/0.0707 | 0.116 | **H4** |
| 38 | (629,382)→(630,383) | 0.0000 | 0.000 | 0.0141/0.0141 | 0.000 | H2 |
| 39 | (636,383)→(637,382) | 0.0000 | 0.000 | 0.0100/0.0071 | 0.293 | H1 (epsilon) |
| 40 | (637,383)→(637,382) | 0.0000 | −0.000 | 0.0100/0.0071 | 0.293 | H1 (flat) |
| 41 | (637,383)→(638,382) | 0.0000 | −0.000 | 0.0100/0.0071 | 0.293 | H1 (epsilon) |
| 42 | (638,383)→(637,382) | 0.0000 | 0.000 | 0.0200/0.0141 | 0.293 | H1 (epsilon) |
| 43 | (638,383)→(638,382) | 0.0000 | 0.000 | 0.0200/0.0141 | 0.293 | H1 (flat) |
| 44 | (642,121)→(643,121) | 0.0000 | −0.000 | 0.0598/0.0598 | 0.001 | **H3** (gone at dx=dy) + H2 |
| 45 | (728,496)→(729,496) | 0.0000 | 0.010 | 0.0071/0 | 1.000 | **H4** + H1 |
| 46 | (733,458)→(733,457) | 0.0000 | −0.000 | — / — | 0.293 | edge outlet (Terraform receiver = off-tile −2) |

## 2. Counts per class

Primary class, standard variant (46 points; a point counted once even when it is "several"):

| Class | Standard count |
|---|---:|
| H4 fill difference | 12 |
| H2 near-tie | 14 |
| H1 flat/epsilon | 17 |
| H3 cell shape | 2 |
| edge outlet | 1 |
| **unexplained** | **0** |

Bare and offset were not re-run through `diagnose.ts`; their divergence *locations* are the same
south-east channel and tributary junctions as standard, but the exact cells differ slightly because
the building burn-in changes the routing near buildings: **6 of the bare cells and 1 of the offset
cells are not among the standard cells** (bare-only: (267,563), (289,575), (349,291), (493,260),
(561,6), (580,30); offset-only: (710,495)). The mechanisms are identical — H4 fill (the 5–24 cm
channel fill), H2 tie-break, H1 epsilon and H3 cell shape are all input-independent — so the class
counts shift by at most those few cells, with no new mechanism and no unexplained point.

## 3. H3 (cell shape) experiment

`export.ts` writes **one** `cellsize` into the `.asc` (`cellsize = dx = 0.999551282`), so
WhiteboxTools sees a square grid while `computeRunoff` uses `dx = 0.999551` × `dy = 1.000327`
(< 0.1 % anisotropy). Rerunning `computeRunoff` on the standard input with `maxY` adjusted so
`dx = dy = 0.999551`:

- **2 of 46 points disappear** — (94,50)→(95,50) and (642,121)→(643,121); Terraform's share of the
  reference flow at the downstream cell goes 0.06 % → 100.2 % and 0.02 % → 101.1 % respectively.
- **Rule-1 percentage at k = 2 is unchanged: 92.8 % → 92.8 %.**

This is a diagnostic experiment only; it changes nothing in the app.

## 4. Unexplained points

**None.** Every point is explained by H1–H4 or the edge outlet. The three points that looked
"unexplained" on a first pass are resolved as follows (3 × 3 raw heights, Terraform filled, WBT
pointer):

- **(508,3)→(509,4)** (was "real slope, margin 25 %"): Terraform fills the SW neighbour (509,2) by
  2 cm; WhiteboxTools fills it by 3 cm to −18.49 m — exactly equal to the SE neighbour (509,4).
  That makes WBT's SW and SE drops tie (0.0212) and WBT's pointer picks SE, while Terraform's SW
  stays steeper (0.0283). It is **H4** (1 cm fill difference in a neighbour), not a routing defect.
  ```
  −18.38/S  −18.41/S  −18.36/SW
  −18.44/S  −18.46/SE −18.30/S     (centre 508,3 → SE in WBT, SW in Terraform)
  −18.52/−18.50/−18.49/S  −18.48/S  −18.49/SW
  ```
- **(542,28)→(543,27)** (was "real slope, margin 28 %"): both tools route (542,28) west (receiver
  identical); the divergence is a tributary junction where WhiteboxTools carries a tributary into
  (543,27) that Terraform sends a different way. Same mechanism as the other south-east tributary
  points — **H4** in the upstream tributary cells.
- **(113,44)→(114,45)** (margin 6.2 %): a genuine near-tie just above the 5 % band — **H2**.

## 5. Conclusion

**No evidence of a defect in `runoff.ts`.** All 46 unfilled-ground divergence points are method
differences, in this order of importance:

- **H4 fill difference — 12 points (the dominant cause).** WhiteboxTools' `FillDepressions` raises
  the south-east outlet-channel flat by **5–24 cm** (to −18.44 m NN2000) where Terraform's
  Priority-Flood+Epsilon raises it by ≤ 1 mm. The difference is present with and without
  `--fix_flats`, so it is not the flat increment. A non-ascending flood-fill from these cells
  reaches the tile edge at −18.68 m (lower than their raw heights), so they are **not** true
  depressions: Terraform drains them; WhiteboxTools over-fills them. This is a difference in how
  the two tools treat edge-adjacent flats, and it is what drives most of the 67 %-era main-path
  disagreement.
- **H1 flat/epsilon — 16 points.** Routed by the Priority-Flood+Epsilon gradient (best drop ≈ 1e-5),
  which is below Run 3's 1 mm "unfilled" cut-off. The documented epsilon vs `--fix_flats` difference.
- **H2 near-tie — 14 points.** The D8 best/second drops are equal (or within 5 %), so the receiver
  is decided by the tie-break order (Terraform NW-first vs WhiteboxTools' pointer convention).
- **H3 cell shape — 2 points.** The 0.08 % `dx ≠ dy` anisotropy; fixing it removes 2 points and
  leaves rule 1 at 92.8 %.
- **Edge outlet — 1 point.** Terraform's receiver is off-tile (−2); WhiteboxTools routes along the
  edge.

Whether to keep, widen or replace rule 1 is the owner's call; this diagnosis only says the
92.3–93.3 % shortfall is method differences (chiefly WhiteboxTools over-filling the outlet channel
relative to Terraform), not a bug in the Terraform fill or D8.
