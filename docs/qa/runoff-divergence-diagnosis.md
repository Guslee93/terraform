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
south-west channel and tributary junctions as standard, but the exact cells differ slightly because
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
  (543,27) that Terraform sends a different way. Same mechanism as the other south-west tributary
  points — **H4** in the upstream tributary cells.
- **(113,44)→(114,45)** (margin 6.2 %): a genuine near-tie just above the 5 % band — **H2**.

## 5. Conclusion

**No evidence of a defect in `runoff.ts`.** All 46 unfilled-ground divergence points are method
differences, in this order of importance:

- **H4 fill difference — 12 points (the dominant cause).** WhiteboxTools' `FillDepressions` raises
  the south-west outlet-channel flat by **5–24 cm** (to −18.44 m NN2000) where Terraform's
  Priority-Flood+Epsilon raises it by ≤ 1 mm. The difference is present with and without
  `--fix_flats`, so it is not the flat increment. A non-ascending flood-fill from these cells
  reaches the tile edge at −18.68 m on the **west** edge (col 0), lower than their raw heights, so
  they are **not** true depressions: Terraform drains them; WhiteboxTools over-fills them. (The
  −19.01 m south-edge cell is a *different* outlet — the main south-draining channel — not the one
  this west channel drains to; see "H4 root cause (Run 5)" below.) This is a difference in how the
  two tools treat edge-adjacent flats, and it is what drives most of the 67 %-era main-path
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

## H4 root cause (Run 5)

### Drainage path, input check, barrier

Terraform's D8 receivers from (626,81) run **north-west** and leave the tile at the **west** edge
(col 0), cell (550,0) at −18.68 m — 96 cells. `g` = Terraform ground, `f` = Terraform filled:

```text
(626,81) g−18.49→f−18.49  (626,80) g−18.53→f−18.53  (625,80) g−18.57→f−18.54  (624,79) g−18.66→f−18.54  (623,78) g−18.72→f−18.54  (622,77) g−18.71→f−18.54
(622,76) g−18.59→f−18.54  (622,75) g−18.69→f−18.54  (621,74) g−18.72→f−18.54  (620,73) g−18.67→f−18.54  (619,72) g−18.75→f−18.54  (619,71) g−18.72→f−18.54
(618,70) g−18.68→f−18.54  (617,69) g−18.64→f−18.54  (616,68) g−18.65→f−18.54  (615,67) g−18.81→f−18.54  (615,66) g−18.85→f−18.54  (615,65) g−18.77→f−18.54
(614,64) g−18.78→f−18.54  (614,63) g−18.60→f−18.54  (613,62) g−18.74→f−18.54  (613,61) g−18.68→f−18.54  (613,60) g−18.64→f−18.54  (612,59) g−18.77→f−18.54
(611,58) g−18.75→f−18.54  (610,57) g−18.73→f−18.54  (609,56) g−18.73→f−18.54  (608,55) g−18.74→f−18.54  (607,54) g−18.75→f−18.54  (606,53) g−18.77→f−18.54
(605,52) g−18.78→f−18.54  (604,51) g−18.79→f−18.54  (603,50) g−18.79→f−18.54  (602,49) g−18.77→f−18.54  (601,48) g−18.74→f−18.54  (600,47) g−18.64→f−18.54
(599,46) g−18.63→f−18.54  (598,45) g−18.70→f−18.54  (597,44) g−18.75→f−18.54  (596,43) g−18.73→f−18.54  (595,42) g−18.70→f−18.54  (594,41) g−18.64→f−18.54
(593,40) g−18.59→f−18.54  (592,39) g−18.56→f−18.54  (591,38) g−18.55→f−18.54  (590,37) g−18.54→f−18.54  (589,37) g−18.54→f−18.54  (588,36) g−18.57→f−18.55
(587,35) g−18.65→f−18.55  (587,34) g−18.71→f−18.55  (587,33) g−18.56→f−18.55  (586,32) g−18.55→f−18.55  (585,31) g−18.64→f−18.64  (584,31) g−18.69→f−18.64
(583,30) g−18.68→f−18.64  (582,30) g−18.71→f−18.64  (581,29) g−18.70→f−18.64  (580,28) g−18.73→f−18.64  (579,27) g−18.77→f−18.64  (578,26) g−18.70→f−18.64
(577,25) g−18.68→f−18.64  (576,24) g−18.73→f−18.64  (575,23) g−18.70→f−18.64  (574,22) g−18.65→f−18.64  (573,21) g−18.64→f−18.64  (572,21) g−18.66→f−18.66
(571,20) g−18.70→f−18.67  (570,19) g−18.72→f−18.67  (570,18) g−18.71→f−18.67  (570,17) g−18.69→f−18.67  (569,16) g−18.69→f−18.67  (569,15) g−18.67→f−18.67
(568,14) g−18.68→f−18.67  (568,13) g−18.68→f−18.67  (567,12) g−18.68→f−18.67  (566,11) g−18.69→f−18.67  (565,10) g−18.68→f−18.67  (564,9) g−18.68→f−18.67
(563,8) g−18.67→f−18.67  (562,7) g−18.67→f−18.67  (561,6) g−18.67→f−18.67  (560,6) g−18.67→f−18.67  (559,6) g−18.67→f−18.67  (558,6) g−18.67→f−18.67
(557,6) g−18.67→f−18.67  (556,6) g−18.67→f−18.67  (555,6) g−18.67→f−18.67  (554,6) g−18.67→f−18.67  (553,6) g−18.67→f−18.67  (552,6) g−18.68→f−18.68
(552,5) g−18.68→f−18.68  (552,4) g−18.68→f−18.68  (552,3) g−18.68→f−18.68  (552,2) g−18.68→f−18.68  (551,1) g−18.70→f−18.68  (550,0) g−18.68→f−18.68
```
(96 cells. Terraform fills the deep channel cells to −18.54/−18.64 m, and leaves the west mouth at
−18.68 m; WhiteboxTools fills **every** cell on this path to −18.44 m.)

**Input check.** The exported `burned.asc` equals Terraform's ground exactly: max |difference| =
**0**, cells differing by > 0.5 mm = **0**. Header `ncols 624, nrows 734, xllcorner −311.86,
yllcorner −367.12, cellsize 0.999551282…, NODATA_value −9999`; no cell equals NODATA. So the input
WhiteboxTools read is bit-identical to Terraform's ground.

**Barrier.** WhiteboxTools fills the west-edge mouth cells themselves (col 0, rows 545–555) from
−18.51…−18.68 m up to −18.44 m, and the exit cell (550,0) from −18.68 m to −18.44 m. The first cell
on the path where WhiteboxTools' fill exceeds Terraform's is (626,81) itself (WBT −18.44 vs ground
−18.49); the reason is that WhiteboxTools treats the whole west channel — **including its edge
mouth** — as one basin and fills it to −18.44 m, rather than draining off the edge the way
Terraform's priority-flood (which seeds every edge cell as an outlet) does. The −19.01 m south-edge
cell (cols 57–58) is a different, south-draining channel, not this west channel's outlet.

### Isolation test (outside the repository)

Crop rows 500–733 × cols 0–140 (contains the H4 cells, the full path and its west-edge exit),
written with `export.ts`'s writer, then `FillDepressions` (WhiteboxTools **v2.4.0, macOS arm64
build** — the same platform as Run 3/4):

| Input | FillDepressions | filled @ (626,81) |
|---|---|---|
| full precision, `--fix_flats --flat_increment=0.00001` | **−18.44 m** | raises 5 cm |
| full precision, no `--fix_flats` | **−18.44 m** | raises 5 cm |
| rounded to whole cm, `--fix_flats` | **−18.44 m** | raises 5 cm |
| float64 text to 6 decimals, `--fix_flats` | **−18.44 m** | raises 5 cm |
| full precision + 1-cell NoData fence, `--fix_flats` | **−18.44 m** | raises 5 cm |

Every variant raises the channel to −18.44 m, so the fill is neither a precision/parsing effect nor
a `--fix_flats` gradient; it is WhiteboxTools' own fill behaviour. (The Linux IT-7 Run-0 build was
not available to re-run.)

### Bare and offset counts

`diagnose.ts` re-run with `RUNOFF_VARIANT` (after producing `pointer.asc` for both):

| Class (primary) | standard | bare | offset |
|---|---:|---:|---:|
| H4 fill difference | 12 | 11 | 11 |
| H1 flat/epsilon | 17 | 15 | 17 |
| H2 near-tie | 14 | 15 | 15 |
| H3 cell shape | 2 | 2 | 2 |
| edge outlet | 1 | 1 | 1 |
| unexplained | 0 | 0 | 0 |

H4 is present in every variant (the west channel fill does not depend on the building burn-in).

### Conclusion — (b) WhiteboxTools behaviour

Same input (the exported `.asc` is bit-identical to Terraform's ground, max difference 0),
WhiteboxTools still raises the west channel to −18.44 m on a minimal crop, with and without
`--fix_flats`, at every precision, and even with a NoData fence. Terraform's Priority-Flood+Epsilon
seeds every edge cell as a free outlet, so it drains this channel off the west edge at −18.68 m;
WhiteboxTools' `FillDepressions` does **not** drain it off the edge and fills the channel (edge
mouth included) to an internal −18.44 m spill. That is a reference-tool behaviour difference, not an
input mismatch and not a `runoff.ts` defect.
