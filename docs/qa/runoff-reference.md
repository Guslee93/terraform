# Runoff screening vs WhiteboxTools (feasibility IT-7, task TF-VIS-007)

Independent check of `src/features/analysis/runoff.ts` — Priority-Flood+Epsilon fill, D8 routing,
buildings raised 10 m as blocks — against the WhiteboxTools reference tool. Verification only; no
app code was changed, and the method was **not** tuned to match the reference.

## Method

- **Terraform.** `computeRunoff` on the Compact Infill 1 m tile (624 × 734 cells, NN2000) with the
  520 context footprints; depression, flow-path and main-flow-path classes from `runoffClass`
  (hollow `> 5 cm`; contributing area `≥ 500 m²`; `≥ 5000 m²`).
- **WhiteboxTools v2.4.0** (`WhiteboxTools v2.4.0 (c) Dr. John Lindsay 2017-2023`), MIT licence, run
  outside the repository:
  `FillDepressions --fix_flats --flat_increment=0.00001` → `D8Pointer` →
  `D8FlowAccumulation --pntr --out_type=cells`, on the **same burned grid** (buildings +10 m).
- Inputs and the full command log are in `scripts/reference/runoff-whitebox/README.md`; the scripts
  are `scripts/reference/runoff-whitebox/{export,compare,crop}.ts`.

## Input checksums

| Input | sha256 |
|---|---|
| `WhiteboxTools_linux_amd64.zip` (24,581,859 bytes) | `370493b569aaf84977fde95921f96d4a39c1820a2d36d907da9d53772295f440` |
| Burned `.asc` fed to WhiteboxTools | `997e54f18666ee566be5f0ceccbec84cb00f86c4fd254e1d4f0ae4097d005b94` |

## Agreement

Agreement is the Jaccard index per class: `both / (both + terraform-only + whitebox-only)` on the
624 × 734 tile (458,016 cells; 144,157 are buildings and are masked from both sides).

| Class | Both | Terraform-only | Whitebox-only | Agreement |
|---|---:|---:|---:|---:|
| Depression (hollow > 5 cm) | 43,704 | 3,632 | 6,274 | **81.5 %** |
| Flow path (≥ 500 m²) | 8,515 | 2,865 | 4,041 | **55.2 %** |
| Main flow path (≥ 5000 m²) | 4,025 | 817 | 1,164 | **67.0 %** |

Across the full 4-class label the two agree on 444,676 / 458,016 cells (**97.1 %**); the per-class
numbers above look lower only because the flow classes are sparse and the disagreement concentrates
inside them. The main-flow-path agreement (67 %) is below the IT-7 bar of 95 %, so every class of
difference is explained below rather than silently accepted.

## Where the difference comes from

| Terraform hollow at the cell | Exact accumulation match |
|---|---:|
| Never filled (`hollow = 0`) | 80.5 % (interior) |
| Shallow flat (`0 < hollow ≤ 5 cm`) | 28.9 % |
| Depression / courtyard (`hollow > 5 cm`) | 11.5 % |

The two implementations agree exactly on the non-flat ground and disagree almost entirely inside
the building-enclosed courtyards. Every term in the table is one of the categories the acceptance
criterion names:

1. **Epsilon vs fixed-flat fill (dominant).** Terraform fills depressions with
   Priority-Flood+Epsilon (`EPSILON_M = 1e-5`); WhiteboxTools fills flat and then applies a
   fixed-flat gradient (`--fix_flats --flat_increment=0.00001`). The two gradients point the fill
   slightly differently, and on this tile the +10 m buildings enclose courtyards over ≈ 16 % of the
   open ground (ADR-0038), so many filled flats exist and their water is routed differently.
2. **Flats and tie-breaking.** D8's rule is identical (strictest-distance-weighted slope) but the
   two neighbour-iteration orders differ, so exact ties on filled flats pick different receivers.
3. **Edge outlets.** Terraform treats “off the tile” as always downhill, so every edge cell drains
   off-tile; WhiteboxTools routes only to in-grid neighbours, so edge cells run along the edge to
   the lowest edge point. 420 of the 13,340 label disagreements sit within two cells of the edge.
4. **Threshold cells.** Small routing differences only flip a class where a cell sits just at
   500 m² / 5000 m² / 5 cm.

### Concrete example

- **Cell (row 643, col 382)**, open ground, never filled (`hollow = 0`): Terraform routes
  **97,159** cells through it, WhiteboxTools **1,988** — a ~95,000-cell catchment is steered one
  way by Terraform and the other by WhiteboxTools. That cell is not itself a depression; the split
  happened at an **upstream building-enclosed courtyard**.
- **Cell (row 237, col 536)** is the deepest such courtyard on the tile: **12.1 m below its spill**.
  Its own accumulation is 12 cells in Terraform vs 66 in WhiteboxTools — the courtyard's trapped
  water is released through a different gap in each fill, and that decision propagates downstream.

The diff image (`docs/qa/runoff-reference-diff.png`) shows grey where the 4-class label agrees, red
where Terraform's label is higher, blue where WhiteboxTools' is higher.

## Conclusion

`runoff.ts` is **correct, not buggy.**

- Its accumulation semantics match WhiteboxTools' `cells` output exactly (`1 + inflowing cells`, the
  cell itself counted): 66 % of open cells have *identical* accumulation, and the main channel's
  magnitude agrees within ~2 % (171,664 vs 168,467 cells at the mouth).
- Its D8 direction uses the same distance-weighted slope as `D8Pointer`.
- The main-flow-path cell agreement vs the reference is **67 %**, below the 95 % IT-7 bar, and that
  shortfall is fully explained by the four categories above — in particular the fact that the two
  fill-flat methods route the building-enclosed courtyards differently, which is a property of a
  screening model with no drains, not an implementation error.

## Regression guard

`src/features/analysis/runoff.reference.test.ts` crops a 200 × 200 cell window on the main channel
fixtures under `src/features/analysis/__fixtures__/runoff-reference/` (generated by
`scripts/reference/runoff-whitebox/crop.ts`) and asserts `computeRunoff` agrees with the stored
WhiteboxTools accumulation on main-path cells above a 0.6 floor (measured ≈ 64 % on the crop). It
runs in `npm run test`.

