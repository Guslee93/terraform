# Runoff ↔ WhiteboxTools reference (feasibility IT-7, task TF-VIS-007)

Independently checks `src/features/analysis/runoff.ts` (Priority-Flood+Epsilon fill + D8 routing,
buildings raised 10 m as blocks) against the WhiteboxTools reference tool on the **Compact Infill
1 m terrain tile** and its **520 context footprints**. This is verification only — no app code is
changed here.

The scripts are run through Vitest (like `scripts/site-assets`), purely so they can import the
app's own TypeScript without adding a dependency:

```bash
npx vitest run --config scripts/reference/runoff-whitebox/vitest.config.ts export
npx vitest run --config scripts/reference/runoff-whitebox/vitest.config.ts compare
npx vitest run --config scripts/reference/runoff-whitebox/vitest.config.ts crop
npx vitest run --config scripts/reference/runoff-whitebox/vitest.config.ts tolerance   # no WhiteboxTools needed
```

## Prerequisites

WhiteboxTools (**MIT licence**) is installed **outside** this repository and is never committed.
Download from the WhiteboxTools Linux binary page:

- File: `WhiteboxTools_linux_amd64.zip`
- URL:  `https://www.whiteboxgeo.com/WBT_Linux/WhiteboxTools_linux_amd64.zip` (≈ 23.4 MB)
- Version: record `whitebox_tools -v` here (see “Tool version” below).

Unpack it so the `whitebox_tools` executable sits at:

```
/home/node/whiteboxtools/WhiteboxTools_linux_amd64/WBT/whitebox_tools
```

(or set `WBT_BIN` to its path). RichDEM (GPL-3.0) was **not** used: it is only mentioned as a
possible second reference and, if it is ever run, it must be a separate program whose output
numbers are stored, not its code.

## Orientation contract

Everything is written and read **north row first**: the first data row in an `.asc` (and row 0 of
`TerrainRaster`) is the **north** edge, matching the app (ADR-0037: “row 0 is the north edge”) and
the ESRI ASCII convention. Column 0 is the west, `xllcorner`/`yllcorner` are the south-west corner
of the lower-left cell, and `minX`/`minY` in `terrain1m.json` are grid **edges** (a cell centre is
`minX + (col + 0.5) · dx`, `maxY − (row + 0.5) · dy`), so `xllcorner = minX`, `yllcorner = minY`.

## Input and provenance

| Item | Value |
|---|---|
| Site | `compact-infill` |
| Terrain header | `public/sites/compact-infill/terrain1m.json` — 624 × 734 cells, `minX −311.86`, `minY −367.12`, `maxX 311.86`, `maxY 367.12`, NN2000 |
| Terrain samples | `public/sites/compact-infill/terrain1m.bin` — Int16 little-endian centimetres above the origin |
| Footprints | `public/sites/compact-infill/buildings.json` — the **520** context footprints, exactly as `StudioShell` passes them to the runoff worker (`analysisBuildings.map(b => b.footprint)`, no drawn blocks) |
| Burned grid | `tmp/runoff-whitebox/burned.asc`, sha256 recorded in `export-metadata.json` |

## Step 1 — export the burned grid

`export.ts` loads the tile and the footprints, and burns them **exactly as `computeRunoff` does**.
Because `runoff.ts` does not export its burn loop, `common.ts` `burnFootprints` mirrors it
line-for-line, and `export.ts` cross-checks the mirrored building mask against `runoff.building`
cell-for-cell. It writes the burned DEM as an ESRI ASCII grid (`tmp/runoff-whitebox/burned.asc`)
plus `export-metadata.json` (origin, cell size, orientation, checksums).

Note: ESRI ASCII holds one square `cellsize`, but the tile is 1 m nominal with
`dx = 0.999551282…` and `dy = 1.000326975…` (a < 0.1 % anisotropy; the 624- and 734-cell extents
are not an exact number of whole metres). The `.asc` therefore stores `cellsize ≈ 0.99955`. This
only affects WhiteboxTools’ D8 slope weighting (distance), not its `cells` accumulation output,
and the classification thresholds in `compare.ts` use the app’s true `cellArea = dx · dy`.

## Step 2 — run WhiteboxTools

```bash
cd /workspace
WBT=/home/node/whiteboxtools/WhiteboxTools_linux_amd64/WBT/whitebox_tools
"$WBT" -r=FillDepressions   -v --wd=/workspace/tmp/runoff-whitebox -i=burned.asc -o=filled.tif --fix_flats --flat_increment=0.00001
"$WBT" -r=FillDepressions   -v --wd=/workspace/tmp/runoff-whitebox -i=burned.asc -o=filled.asc --fix_flats --flat_increment=0.00001
"$WBT" -r=D8Pointer         -v --wd=/workspace/tmp/runoff-whitebox -i=filled.tif -o=pointer.tif
"$WBT" -r=D8FlowAccumulation -v --wd=/workspace/tmp/runoff-whitebox -i=pointer.tif -o=accum.asc --pntr --out_type=cells
```

- Four commands because WhiteboxTools **v2.4.0’s own `.asc` writer emits a trailing space on the
  `NODATA_VALUE` line, which its own `.asc` reader then fails to re-parse** (`ParseFloatError`).
  Intermediates use GeoTIFF (`.tif`); the second `filled.asc` is only read by `compare.ts` (whose
  reader is tolerant), never by WhiteboxTools.
- `FillDepressions --fix_flats` applies a tiny gradient away from outlets on filled flats — the
  closest WhiteboxTools analogue of Terraform’s Priority-Flood+Epsilon. **`--flat_increment=0.00001`
  is set explicitly to equal the app’s `EPSILON_M = 1e-5`** and also to avoid a v2.4.0 bug where
  the *auto-determined* flat increment yields bogus ~10¹⁴ elevations.
- `D8Pointer` chooses the steepest downhill neighbour by **distance-weighted slope**
  (`(z − z_n)/length`, diagonal `√(dx²+dy²)`), the same convention as `runoff.ts` `drop/distance`.
- `D8FlowAccumulation --out_type=cells` reports `1 + number of inflowing cells`, i.e. the cell
  itself counts, exactly matching `computeRunoff`’s accumulation (which seeds every cell with 1).

## Step 3 — compare

`compare.ts` runs `computeRunoff` on the same input, classifies both results with the thresholds
from `runoff.ts` (depression `> 5 cm` hollow; flow path `≥ 500 m²`; main flow path `≥ 5000 m²`;
buildings masked), and writes:

- `tmp/runoff-whitebox/comparison.json` — per-class “in both / only Terraform / only Whitebox /
  agreement” plus the 4 × 4 confusion matrix;
- `tmp/runoff-whitebox/diff.png` — grey where the 4-class labels agree, red where Terraform’s
  label is higher, blue where WhiteboxTools’ is higher (no image library: node:zlib only).

## Control runs (bare and offset)

TF-VIS-007's control runs re-run the same comparison with `runoff.ts` **unchanged**, varying only
the input ground. Both run the identical `export` → WhiteboxTools → `compare` steps, with the
variant selected by `RUNOFF_VARIANT` (default `standard`):

| Variant | Ground fed to both sides |
|---|---|
| `standard` | footprints burned +10 m (the app's behaviour) |
| `bare` | no footprints — the raw 1 m terrain |
| `offset` | footprints burned +10 m plus `+0.001 m × building index` |

Each variant writes to `tmp/runoff-whitebox/<variant>/` (`standard` keeps the top-level
`tmp/runoff-whitebox/`). For the bare control:

```bash
RUNOFF_VARIANT=bare npx vitest run --config scripts/reference/runoff-whitebox/vitest.config.ts export
# the four WhiteboxTools commands from "Step 2", with --wd pointing at tmp/runoff-whitebox/bare
RUNOFF_VARIANT=bare npx vitest run --config scripts/reference/runoff-whitebox/vitest.config.ts compare
```

The agreement table and the verdict live in `docs/qa/runoff-reference.md`.

## Tool version

Record the exact line `whitebox_tools -v` prints after running:

```
WhiteboxTools v2.4.0 (c) Dr. John Lindsay 2017-2023
```

## Step 4 — regression fixture

`crop.ts` crops a ≤ 200 × 200 cell window centred on the main channel mouth, runs the same
WhiteboxTools pipeline on the cropped burned terrain, and commits the fixtures under
`src/features/analysis/__fixtures__/runoff-reference/` (`crop-header.json`, `crop-heights.bin`,
`crop-buildings.json`, `crop-reference-accumulation.asc`). `src/features/analysis/runoff.reference.test.ts`
asserts `computeRunoff` on the crop agrees with the stored reference on main-path cells within the
measured tolerance — the fast, committed guard that runs in `npm run test`.

## Differences to expect (and explain, not tune away)

1. **Epsilon vs fixed-flat fill** (`EPSILON_M = 1e-5` vs `FillDepressions --fix_flats`
   auto-increment): the two fills leave a slightly different tiny gradient on flats, so flat cells
   near a spill can flip between “depression” and “path”.
2. **Flat/tie-breaking in D8**: identical strict-greater-than, distance-weighted rule, but the
   two implementations iterate neighbours in a different order, so exact ties on flats land on
   different neighbours.
3. **Edge outlets**: Terraform treats “off the tile” as always downhill, so every edge cell drains
   off-tile; WhiteboxTools only routes to in-grid neighbours, so edge cells route along the edge
   to the lowest edge cell.
4. **Burn-in**: both sides burn the same footprints onto the same ground (the `.asc` is the burned
   grid), so a difference here is confined to cells exactly at a polygon or threshold boundary.

None of these is tuned away; they are reported and, where a class falls below the IT-7 bar of
95 % agreement on main flow paths, each class of difference is given a concrete example.

