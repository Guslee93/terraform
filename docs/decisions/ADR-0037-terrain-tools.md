# ADR-0037 — 1 m terrain tools: section and slope

- **Status:** Accepted (2026-11-16, build/foundation WP-7; plan `docs/plans/fable-build-plan.md`)
- **Relates to:** ADR-0002 (local ENU), ADR-0032 (layer provenance), ADR-0033 §3 (WGS84 rasters are
  exact in ENU), ADR-0034 (draped texture), feasibility 04 §1, 08 §1
- **Dependencies:** none added.

## Context

The curated packages draw their ground from a 16 m grid (40 × 47 samples). That is enough to
drape a model on, and too coarse to read a kerb, a river bank or a section. Feasibility tested
Kartverket DTM1 (1 m, open, CC BY 4.0) at the site: slope and profile sampling are exact on
analytic surfaces, and the terrain registers with the package to 0.04 m RMSE.

## Decision

1. **Data.** One DTM1 tile per curated site from the open NHM terrain WCS
   (`wcs.hoyde-dtm-nhm-25833`, coverage `nhm_dtm_topo_25833`; not "DTM Sømløs", which is
   restricted), over the terrain extent at about 1 m, asked for in WGS84 so the raster is exact in
   the app's frame. Cached raw in `data/raw/` with checksum and request
   (`scripts/site-assets/terrain1m.build.ts`).
2. **Format.** `terrain1m.bin`: Int16 little-endian **centimetres above the package origin**, north
   row first, −32768 = no data. `terrain1m.json`: `{ cols, rows, minX, minY, maxX, maxY,
   originElevation, verticalDatum }`. The manifest lists the header (`assetPaths.terrain1m`) and a
   `terrain1m` provenance entry (© Kartverket, CC BY 4.0, "not a survey").

| Site | Cells | File | Gzipped |
|---|---|---|---|
| Compact Infill | 624 × 734 | 916 kB | 484 kB |
| Sloped Edge | 652 × 790 | 1 030 kB | 586 kB |

3. **Loaded on demand.** The tile is not part of the package load. `loadTerrainRaster` fetches it
   the first time the slope overlay is switched on or a section is started. A visit that never opens
   a terrain tool does not pay for it.
4. **Domain** (`src/features/analysis/terrainTools.ts`, renderer-free): bilinear `elevationAt`,
   Horn (1981) slope with the cell size in each direction, `terrainProfile` along a polyline at 1 m
   steps, slope bands (< 5°, 5–15°, 15–30°, > 30°) and their shares.
5. **UI** (Layers → "Terrain tools · 1 m terrain", shown for packages that ship the tile):
   - **Slope:** a switch; four bands draped on the terrain by the same texture path as the noise
     bands (`DrapedTexture`), one pixel per raster cell. Ground under 5° is left clear, so the
     overlay shows where the ground is not flat. A legend gives each band's share of the tile.
   - **Section:** "Draw a section", two clicks on the ground (Esc cancels), then the line in the
     scene and a profile chart in the panel: elevation against distance, with the length and the
     lowest and highest elevation in metres above sea level (NN2000). The chart's height is
     exaggerated to fit, and says so.
   - With a tool on screen, Data attribution and exports credit the terrain tile.
6. **Claims.** "Kartverket DTM1 (1 m bare-earth terrain from lidar) — not a survey". The slope note
   says what a bare-earth model does: kerbs, walls and embankments read as steep, and buildings are
   not in it.

## Deviations from the plan

- **Imports have no terrain tools.** The plan allowed reusing the import's terrain at 1 m "when
  available; otherwise keep the existing grid". The import path samples a 13 × 13 grid from the
  height API; fetching a 1 m raster on import is a second terrain pipeline and is left for a later
  step. The tools are shown only where the package ships the tile.
- **No contours from the 1 m raster.** The plan listed them in the domain; no UI in this package
  uses them, so they are not written (the 16 m contour lines of ADR-0005 are unchanged).
- The drawn ground is still the package's 16 m grid. The overlay and the section read the 1 m tile;
  the mesh they are draped on is coarser.

## Verification (2026-11-16)

- **Done-when:** the feasibility W–E section across Compact Infill (EPSG:25833 262663,6650490 →
  263242,6650490) reads **8.97–21.45 m** NN2000 over 578.8 m, against `terrain_bench.py`'s
  8.98–21.44 m over 579 m: within 0.014 m (limit 0.05 m). The section's end points were converted to
  WGS84 with a Krüger-series inverse checked against the site origin to 1e-7°.
- Fixtures (04 §1): Horn slope on a plane (error under the Float32 resolution of the slope array,
  1e-5°) and on a quadratic bowl; unequal cell sizes; bilinear elevation and profile on a plane to
  1e-9 m; off-raster and no-data cells; the file reader. The plan's 1e-9° for slope holds for the
  Float64 computation; the stored slope array is Float32.
- Shipped tiles: extent equals the package terrain, 0 cells without data, origin within 0.5 m of
  the package's (20.38 m against 20.28 m: the 16 m grid's origin sample, as feasibility noted).
- UI tests: legend and shares, section flow, chart name and path, loading and error states, the
  overlay's pixels, the lazy loader.
