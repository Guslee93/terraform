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

## Regression guard

`src/features/analysis/runoff.reference.test.ts` crops a 200 × 200 cell window on the main channel
fixtures under `src/features/analysis/__fixtures__/runoff-reference/` (generated by
`scripts/reference/runoff-whitebox/crop.ts`) and asserts `computeRunoff` agrees with the stored
WhiteboxTools accumulation on main-path cells above a 0.6 floor (measured ≈ 64 % on the crop). It
runs in `npm run test`.

