# Runoff screening vs WhiteboxTools (feasibility IT-7, task TF-VIS-007)

Independent check of `src/features/analysis/runoff.ts` — Priority-Flood+Epsilon fill, D8 routing,
buildings raised 10 m as blocks — against the WhiteboxTools reference tool, across the app's
standard burn-in and two control runs (bare terrain and per-building offsets). Verification only;
no app code was changed, and the method was **not** tuned to match the reference.

## Method

- **Terraform.** `computeRunoff` on the Compact Infill 1 m tile (624 × 734 cells, NN2000); depression,
  flow-path and main-flow-path classes from `runoffClass` (hollow `> 5 cm`; contributing area
  `≥ 500 m²`; `≥ 5000 m²`).
- **WhiteboxTools v2.4.0** (`WhiteboxTools v2.4.0 (c) Dr. John Lindsay 2017-2023`), MIT licence, run
  outside the repository:
  `FillDepressions --fix_flats --flat_increment=0.00001` → `D8Pointer` →
  `D8FlowAccumulation --pntr --out_type=cells`.
- **Three input configurations** — identical tools, thresholds and commands, only the building
  burn-in differs:
  - **Standard** — the 520 context footprints burned +10 m, exactly as the app does.
  - **Bare** (control) — no footprints; the raw 1 m terrain.
  - **Offset** (control) — footprints burned +10 m plus a per-building offset (`+0.001 m × index`),
    so no two building tops tie.
- Inputs and the full command log are in `scripts/reference/runoff-whitebox/README.md`; the scripts
  are `scripts/reference/runoff-whitebox/{export,compare,crop}.ts`.

## Input checksums

| Input | sha256 |
|---|---|
| `WhiteboxTools_linux_amd64.zip` (24,581,859 bytes) | `370493b569aaf84977fde95921f96d4a39c1820a2d36d907da9d53772295f440` |
| Standard burned `.asc` (buildings +10 m) | `997e54f18666ee566be5f0ceccbec84cb00f86c4fd254e1d4f0ae4097d005b94` |
| Bare `.asc` (no buildings) | `ff94621ccec8c50b656fd5ab2704bf9639243fdfe79fb098748427965ee73025` |
| Offset burned `.asc` (buildings +10 m + 0.001 m × index) | `91a01a60c5b10689dfe3de6db82b2786551bb7cdc6cace2972a249de63ad0eb1` |

## Agreement

Agreement is the Jaccard index per class: `both / (both + terraform-only + whitebox-only)` on the
624 × 734 tile (458,016 cells). Building cells (144,157 in the standard and offset inputs) are
masked from both sides.

| Input | Class | Both | Terraform-only | Whitebox-only | Agreement |
|---|---|---:|---:|---:|---:|
| Standard (buildings +10 m) | Depression (> 5 cm) | 43,704 | 3,632 | 6,274 | **81.5 %** |
| | Flow path (≥ 500 m²) | 8,515 | 2,865 | 4,041 | **55.2 %** |
| | Main flow path (≥ 5000 m²) | 4,025 | 817 | 1,164 | **67.0 %** |
| Bare (no buildings) | Depression (> 5 cm) | 12,628 | 2,013 | 4,060 | **67.5 %** |
| | Flow path (≥ 500 m²) | 10,188 | 2,234 | 2,710 | **67.3 %** |
| | Main flow path (≥ 5000 m²) | 3,922 | 758 | 938 | **69.8 %** |
| Offset (buildings +10 m + 0.001 m × index) | Depression (> 5 cm) | 43,737 | 3,579 | 6,257 | **81.6 %** |
| | Flow path (≥ 500 m²) | 8,515 | 2,935 | 3,943 | **55.3 %** |
| | Main flow path (≥ 5000 m²) | 4,002 | 826 | 1,236 | **66.0 %** |

Across the full 4-class label the two agree on 444,676 / 458,016 cells (**97.1 %**) for standard,
447,756 (**97.8 %**) for bare and 444,680 (**97.1 %**) for offset; the per-class numbers look lower
only because the flow classes are sparse and the disagreement concentrates inside them.

**The control runs do not reach the IT-7 95 % bar.** On bare terrain — with no buildings at all —
the main-flow-path agreement is **69.8 %**, only two points above the standard run's 67.0 %.
Breaking the building-top ties (offset) moves it by a single point (66.0 % versus 67.0 %).
Buildings are therefore **not** the dominant source of the divergence.

## Where the difference comes from

The earlier "building-enclosed courtyards" explanation does **not** survive the control runs. With
every building removed (bare), the main-flow-path agreement is still only 69.8 %, and the offset
run (66.0 %) is barely different from the standard run (67.0 %). The disagreement therefore sits in
the fill and routing method itself, on the bare ground, not in the building blocks. The remaining,
building-independent differences are:

1. **Epsilon vs fixed-flat fill.** Terraform fills depressions with Priority-Flood+Epsilon
   (`EPSILON_M = 1e-5`); WhiteboxTools fills flats and then applies a fixed-flat gradient
   (`--fix_flats --flat_increment=0.00001`). The two gradients point filled flats slightly
   differently. Because the mismatch persists on bare terrain, this is now the leading suspect for
   the divergence, but it has not been isolated yet.
2. **Flats and tie-breaking.** D8's rule is identical (strictest-distance-weighted slope) but the
   two neighbour-iteration orders differ, so exact ties on filled flats pick different receivers.
3. **Edge outlets.** Terraform treats “off the tile” as always downhill, so every edge cell drains
   off-tile; WhiteboxTools routes only to in-grid neighbours, so edge cells run along the edge to
   the lowest edge point. 441 of the bare run's 10,260 label disagreements sit within two cells of
   the edge (4 %), so this is a minor contributor.
4. **Threshold cells.** Small routing differences only flip a class where a cell sits just at
   500 m² / 5000 m² / 5 cm.

The diff image (`docs/qa/runoff-reference-diff.png`) shows the **standard** run: grey where the
4-class label agrees, red where Terraform's label is higher, blue where WhiteboxTools' is higher.

## Conclusion

The control runs **do not support** the earlier "`runoff.ts` is correct, not buggy" verdict.

- Its accumulation semantics still match WhiteboxTools' `cells` output (`1 + inflowing cells`, the
  cell itself counted), and its D8 direction uses the same distance-weighted slope as `D8Pointer`.
- But on **bare terrain** — with no buildings at all — main-flow-path agreement is 69.8 %, far below
  the IT-7 95 % bar, and the offset run is 66.0 %. The building-enclosed-courtyard explanation is
  therefore refuted: the divergence is in the fill/routing method itself.
- `runoff.ts` is **not yet validated** against WhiteboxTools, and the claim that the shortfall was
  "fully explained" is withdrawn. Water remains a Tier 2 screening; the next step is to isolate the
  fill/flat-routing difference directly (for example on a bare flat-and-basin fixture), not to tune
  the method to match the reference.

## Tolerance analysis (second review, 2026-11-18)

Exact cell-by-cell Jaccard scores a path that runs one cell to the side as a complete miss, so it
cannot separate "a slightly different line" from "water going somewhere else". On the committed
200 × 200 crop (standard burn-in), `scripts/reference/runoff-whitebox/tolerance.ts` measures how
many of each tool's path cells lie within *k* cells of the other's:

| Class | Direction | exact | ≤ 1 cell | ≤ 2 cells | ≤ 3 cells |
|---|---|---:|---:|---:|---:|
| Main flow path (≥ 5000 m²) | Terraform near WhiteboxTools (234 cells) | 91.9 % | 95.3 % | 97.0 % | 97.0 % |
| | WhiteboxTools near Terraform (317 cells) | 67.8 % | 70.7 % | 72.6 % | 72.6 % |
| Flow path (≥ 500 m²) | Terraform near WhiteboxTools (1,104 cells) | 67.2 % | 79.7 % | 85.1 % | 86.6 % |
| | WhiteboxTools near Terraform (1,309 cells) | 56.7 % | 67.4 % | 73.3 % | 79.1 % |

What it shows:

- **Terraform draws almost no main path the reference lacks** (97 % within two cells).
- **It misses about 27 % of the reference's main-path cells, and not by a shifted cell.** At the 87
  reference cells missed by more than three cells, Terraform carries a median 0.3 % of the
  reference flow (max 28 %). 66 of them lie more than three cells from the crop edge, so this is not
  the edge-outlet difference.
- **The one clean divergence point found is a flat cell in a filled hollow:** at (99, 90) → (99, 91)
  both cells are filled 6 cm with dz = 0; the reference carries 7,951 → 7,960 cells on, Terraform
  7,831 → 9. The two tools leave the same flat by different exits. This is the epsilon vs
  fixed-flat difference (item 1 above) observed directly, at one point. It does not show that every
  missed segment has the same cause.
- At the flow-path threshold the agreement is weaker in both directions (85 % / 73 % within two cells).

Limits: crop only (40,000 cells, one main channel), standard burn-in only. The full-tile and bare
runs were not re-measured with a tolerance; they need the WhiteboxTools outputs, which are not
committed.

### Acceptance for IT-7 — adopted by the owner, 2026-11-18

**Status:** superseded by "Closure" below (2026-11-19). Originally adopted. Rule 1 is enforced on the crop by `runoff.reference.test.ts` ("draws no main
flow path the reference lacks"); rule 2's sentence is in `RUNOFF_LIMITS` and shown on the Water
card. **Full-tile confirmation:** rule 1 is **not met** on the full tile (see "Full-tile
confirmation (Run 3)" below) — the owner decides whether to keep the 2-cell rule.


The 95 % exact-Jaccard bar asks two independent D8 implementations to agree on one-cell-wide lines
cell by cell; no change to `runoff.ts` short of copying WhiteboxTools' flat handling would reach it,
and tuning to the reference is out of bounds. Proposed instead, **for main flow paths**:

1. **No invented paths:** ≥ 95 % of Terraform's main-path cells within 2 cells of a reference main
   path. *Crop: 97.0 % — met.* To be confirmed on the full tile (standard and bare).
2. **Missed paths are disclosed, not hidden:** the share of reference main-path cells farther than
   2 cells from a Terraform main path is reported (crop: 27.4 %) and the Water card's limitations
   say so, e.g. "Where the ground is flat, water may take a different route than shown; some flow
   paths may not appear." Wording goes through the claim tests (TF-VIS-054) and is the owner's.
3. Flow paths (≥ 500 m²) stay a visual aid with no acceptance number.

Water stays a Tier 2 screening. The exact-agreement guard below keeps its 0.6 floor as a
regression check, and `runoff.ts`'s method is not tuned to the reference.

### Full-tile confirmation (Run 3, 2026-11-18)

`scripts/reference/runoff-whitebox/tolerance.ts` gained `RUNOFF_TOLERANCE_SCOPE=tile`
(`RUNOFF_VARIANT`), reading the pipeline's WhiteboxTools output from `compare.ts`'s directory and
masking buildings exactly as `compare.ts` does. WhiteboxTools v2.4.0 (macOS build); the three
burned-input sha256 match the recorded ones. Terraform main-path cells within *k* cells of a
reference main path:

| Variant | exact | ≤ 1 cell | ≤ 2 cells | ≤ 3 cells | Rule 1 (≥ 95 % at ≤ 2 cells) |
|---|---:|---:|---:|---:|---|
| standard (4,842 cells) | 83.4 % | 89.1 % | **92.8 %** | 95.0 % | **not met** |
| bare (4,680 cells) | 84.6 % | 90.1 % | **93.3 %** | 94.9 % | **not met** |
| offset (4,828 cells) | 83.0 % | 88.6 % | **92.3 %** | 94.6 % | **not met** |

The reverse direction (WhiteboxTools near Terraform) is lower still — standard 72.6 % → 87.9 %
(k 0 → 2), bare 80.5 % → 90.0 %, offset 76.6 % → 86.3 % — so Terraform misses part of the
reference network, as the crop already showed. Flow paths (≥ 500 m²) sit at 92.5 % / 85.3 %
(standard, k = 2) and are unchanged as a visual aid.

**Rule 1 is not met on the full tile for any variant** — the crop's 97.0 % does not generalise; the
full tile reaches 95 % only at 3 cells (standard). No threshold, test, wording or `runoff.ts` was
changed; the owner decides whether to keep the 2-cell rule.

Divergence points (a reference main-path cell where Terraform still carries > 50 % of the reference
flow, next to a downstream reference cell where it carries < 5 %), classified by Terraform's hollow
at the point:

| Variant | in a filled hollow (hollow > 1 mm) | on unfilled ground |
|---|---:|---:|
| standard | 56 | **46** |
| bare | 46 | **44** |
| offset | 56 | **46** |

The **unfilled-ground** divergences are the important ones — they are *not* the epsilon/flat-fill
difference (hollow is 0 there): Terraform loses the flow at a downstream junction and sends it
another way. They cluster at the tile's south-east tributary junctions (rows ≈ 585–640, cols ≈ 80,
380–390). The full list for the standard variant follows; bare and offset differ only in the flow
values, not the locations (44 and 46 points):

```text
(94,50)→(95,50) dz −0.260 m ref 5442→5445 tf 5444→3
(95,46)→(96,45) dz −0.020 m ref 7954→7957 tf 5786→2
(113,44)→(114,45) dz −0.060 m ref 8875→8882 tf 8796→3
(114,44)→(114,45) dz −0.030 m ref 8879→8882 tf 8800→3
(136,46)→(137,45) dz 0.000 m ref 12530→12763 tf 12457→227
(156,38)→(157,39) dz −0.010 m ref 13174→13177 tf 13106→3
(178,44)→(179,43) dz 0.000 m ref 14820→14827 tf 14735→7
(226,431)→(227,432) dz −0.020 m ref 5415→5416 tf 6033→1
(250,475)→(251,476) dz −0.010 m ref 10665→10669 tf 9959→4
(262,379)→(263,380) dz −0.030 m ref 26123→26156 tf 26032→33
(308,65)→(308,66) dz −0.010 m ref 66888→66906 tf 63759→1
(367,552)→(368,551) dz −0.050 m ref 42369→42376 tf 42026→3
(368,552)→(368,551) dz −0.020 m ref 42375→42376 tf 42032→3
(375,395)→(376,395) dz 0.000 m ref 10963→10964 tf 10993→3
(386,546)→(387,546) dz 0.000 m ref 46603→46675 tf 46256→76
(388,544)→(388,543) dz −0.020 m ref 46685→46686 tf 46347→7
(403,54)→(404,54) dz −0.030 m ref 78916→78917 tf 75727→1
(414,550)→(415,551) dz −0.010 m ref 49052→49097 tf 48711→40
(421,552)→(422,553) dz 0.000 m ref 49395→49404 tf 49078→1
(466,31)→(467,31) dz −0.010 m ref 85171→85174 tf 80025→3
(495,381)→(496,382) dz −0.020 m ref 48118→48120 tf 48015→2
(508,3)→(509,4) dz −0.030 m ref 87522→87530 tf 82277→8
(509,383)→(510,384) dz −0.030 m ref 20793→20800 tf 20764→7
(512,2)→(513,2) dz 0.010 m ref 87554→87558 tf 82307→4
(518,32)→(519,32) dz −0.010 m ref 8111→8127 tf 8190→13
(529,17)→(530,17) dz 0.200 m ref 9627→9630 tf 10053→3
(538,69)→(539,68) dz −0.010 m ref 9530→9540 tf 9513→10
(542,27)→(543,27) dz −0.010 m ref 9846→9849 tf 10024→22
(542,28)→(543,27) dz −0.470 m ref 9845→9849 tf 10023→22
(552,5)→(553,5) dz 0.010 m ref 20576→20577 tf 25486→10
(562,7)→(562,8) dz 0.000 m ref 20715→20722 tf 25407→337
(585,31)→(585,32) dz 0.090 m ref 27851→27891 tf 17946→98
(585,381)→(586,382) dz −0.030 m ref 49796→71938 tf 70635→1310
(590,37)→(590,38) dz 0.010 m ref 28289→28304 tf 17512→5
(626,81)→(627,80) dz 0.010 m ref 10712→40702 tf 10677→66
(626,81)→(627,81) dz 0.020 m ref 10712→10733 tf 10677→21
(626,82)→(627,81) dz −0.060 m ref 10662→10733 tf 10676→21
(629,382)→(630,383) dz −0.020 m ref 72479→72501 tf 72605→16
(636,383)→(637,382) dz −0.010 m ref 72551→93164 tf 72673→28
(637,383)→(637,382) dz 0.000 m ref 72553→93164 tf 72675→28
(637,383)→(638,382) dz −0.010 m ref 72553→93171 tf 72675→35
(638,383)→(637,382) dz 0.010 m ref 72555→93164 tf 73419→28
(638,383)→(638,382) dz 0.000 m ref 72555→93171 tf 73419→35
(642,121)→(643,121) dz −0.090 m ref 6321→6322 tf 6395→1
(728,496)→(729,496) dz 0.000 m ref 87446→87449 tf 86718→5
(733,458)→(733,457) dz −0.010 m ref 7847→7872 tf 7863→2
```

None of these is tuned or "fixed": they are a possible defect for a separate task, reviewed by a
different model. The bare and offset lists are the same locations with their own flow values.

## Closure — TF-VIS-007 closed by the owner, 2026-11-19

**Verdict: no defect in `runoff.ts`.** IT-7 is closed on the evidence of Runs 0–6; no further
reference run is planned.

- **Full-tile result, kept as a documented measurement, not a pass/fail number:** Terraform main-path
  cells within 2 cells of a WhiteboxTools main path — standard 92.8 %, bare 93.3 %, offset 92.3 %;
  within 3 cells — 95.0 %, 94.9 %, 94.6 % (Run 3). Crop: 97.0 % within 2 cells.
- **Every divergence point is explained** (`docs/qa/runoff-divergence-diagnosis.md`, Runs 4–5):
  46 / 44 / 46 points per variant, 0 unexplained — flat routing (H1), D8 near-ties (H2), the
  0.08 % non-square cell (H3), one edge outlet, and a WhiteboxTools fill artefact (H4, 11–12 points).
- **H4 is on the reference side:** the exported input is identical to Terraform's ground, yet
  WhiteboxTools v2.4.0 (macOS) raises the south-west outlet channel and its west-edge mouth to
  −18.44 m. A textbook Priority-Flood (Barnes et al. 2014, Alg. 1), run independently by the reviewer
  and again in Run 6, raises none of those cells — it agrees with Terraform.
- **No independent reference reproduces Terraform cell for cell**, because every D8 router needs a
  flat-resolution step and that step is exactly where methods legitimately differ (Run 6: without
  one, the textbook-filled reference has no main path at all).
- **Disclosure stays:** the Water card says "Where the ground is flat, water may take a different
  route than shown, and some flow paths may not appear." Water remains a Tier 2 screening.
- **Regression guards stay as they are:** `runoff.reference.test.ts` keeps the crop's exact-agreement
  floor (0.6) and the 2-cell check (≥ 95 %, measured 97.0 %) as guards against a change in
  behaviour; they are no longer described as the acceptance rule.

Not done, by decision: a reference built on a published flat-resolution method (Barnes, Lehman &
Mulla 2014); the Linux WhiteboxTools build for the H4 isolation.

## Regression guard

`src/features/analysis/runoff.reference.test.ts` crops a 200 × 200 cell window on the main channel
fixtures under `src/features/analysis/__fixtures__/runoff-reference/` (generated by
`scripts/reference/runoff-whitebox/crop.ts`) and asserts `computeRunoff` agrees with the stored
WhiteboxTools accumulation on main-path cells above a 0.6 floor (measured ≈ 64 % on the crop). It
runs in `npm run test`.


## Reference without the WhiteboxTools fill (Run 6)

The reviewer independently checked a textbook Priority-Flood fill (Barnes et al. 2014, Algorithm 1:
every grid-edge cell seeded at its own height, no epsilon) over the raw 1 m tile and found it
"raises NONE of (626,81), (585,31), (508,3), (550,0), and no west-edge cell. So WhiteboxTools
v2.4.0 FillDepressions (macOS) is the outlier in the south-west channel; Terraform and the textbook
fill agree." Re-checked here: the committed `scripts/reference/runoff-whitebox/textbookFill.ts`
fills each variant and writes `tmp/runoff-whitebox[/<variant>]/textbook.asc`; at those four cells the
textbook fill equals the raw ground (raised = false in every case).

Commands (WhiteboxTools **v2.4.0 (c) Dr. John Lindsay 2017-2023**, macOS arm64, the same platform as
Run 3–5), routing only, no fill:

```bash
WBT=/tmp/wbt/WhiteboxTools_darwin_m_series/WBT/whitebox_tools
"$WBT" -r=D8Pointer          --wd=tmp/runoff-whitebox -i=textbook.asc -o=textbook-pointer.tif
"$WBT" -r=D8Pointer          --wd=tmp/runoff-whitebox -i=textbook.asc -o=textbook-pointer.asc
"$WBT" -r=D8FlowAccumulation --wd=tmp/runoff-whitebox -i=textbook-pointer.tif -o=textbook-accum.asc --pntr --out_type=cells
# repeated for bare and offset under tmp/runoff-whitebox/{bare,offset}
```

**The textbook fill leaves flats flat, so D8 routing stalls.** Filled (raised) cells per variant:
standard **62,035**, bare **31,946**, offset **62,099**. D8Pointer assigns "no flow" (pointer 0) to
**71,523 (15.6 %)** of the standard tile (bare 43,669 / 9.5 %, offset 71,679 / 15.6 %), and the
resulting accumulation peaks at **3,845 cells** (bare 4,039, offset 3,750) — all below the 5,002-cell
main-path threshold. The textbook reference therefore has **no main-path cells** and cannot be used
to re-measure rule 1:

| Variant | Terraform main cells | reference main cells | rule 1 at k = 2 (Terraform near reference) |
|---|---:|---:|---|
| standard | 4,842 | **0** | 0.0 % — **not measurable** (reference has no main path) |
| bare | 4,680 | **0** | 0.0 % — **not measurable** |
| offset | 4,828 | **0** | 0.0 % — **not measurable** |

Flow-path agreement (≥ 500 m²) is likewise weak (standard: Terraform near reference 9.6 % at k = 0 →
13.1 % at k = 3; reference near Terraform 88.8 % → 96.2 %), because the flat plateaus stop the flow.
Class counts (diagnose.ts, all three variants): **0 divergence points** — H1 0, H2 0, H3 0, H4 0,
edge 0, unexplained 0.

Reading: removing WhiteboxTools' fill does remove the H4 channel-fill difference (H4 = 0), but at the
cost of a reference whose D8 routing stalls on flats and produces no main path. That is because a
flat-resolution step — Terraform's epsilon or WhiteboxTools' `--fix_flats` — is a prerequisite for D8
routing, and that same step is what produces the Run 3 channel-fill difference. The Run 3
WhiteboxTools-fill numbers remain the record; rule 1's disposition is the owner's call.
