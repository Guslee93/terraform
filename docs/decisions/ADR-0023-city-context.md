# ADR-0023 — City context: halo, vegetation taxonomy and site-scoped sun analysis

- **Status:** Accepted (2026-11-11)
- **Relates to:** ADR-0005 (scene look), ADR-0006 (site import), ADR-0021 (sun analyses), ADR-0022 (measured roofs)

## Context

Two reference screenshots framed the problem. Hektar's scene reads as a place: individual buildings
with real roof parts, a believable tree canopy, greenery, and a horizon of context beyond the
site. Our studio read as a model on a table: 137 context buildings, 128 trees inside a 190 × 210 m
extract, four land-cover kinds, and a hard edge where the terrain stopped.

Measured on the curated packages before this change:

| | Compact Infill | Sloped Edge |
|---|---|---|
| OSM extract | 190 × 210 m | 213 × 389 m |
| Context buildings | 137 | 33 |
| Trees | 128 | 122 |
| Land-cover areas | 10 | 2 |
| Terrain grid | 13 × 13 | 13 × 13 |

Hektar cannot be copied literally. Their underlay is Mapbox composite tiles, which may not be baked
into a shipped bundle, and the PRD forbids live GIS in v1. The only way to reach their result is to
bake better open data into the static packages — so this ADR is about data extent and scope, not
about the renderer.

Three specific losses were found and fixed:

1. `buildings[:220]` in the builder silently dropped 296 of 516 real context footprints once the
   extract grew, keeping only the largest by area.
2. The land-cover taxonomy had four kinds, so gardens, allotments, scrub, pitches, cemeteries and
   bare rock were either dropped or painted as generic grass.
3. The OpenMapTiles import path received far more greenery than it drew: gardens, scrub, pitches,
   playgrounds, cemeteries, beaches and bare rock all arrived in the tiles and were discarded.

## Decision

1. **A context halo.** The data bbox is the study bbox plus 200 m (`CONTEXT_HALO_M`). The OSM
   extract, the terrain extent and the clipping extent all grow with it, so the site sits inside a
   neighbourhood instead of on a table. The study area itself is unchanged: it is still an authored
   rectangle and still not a cadastral parcel.
2. **The terrain grid grows with the extent**, keeping the sample spacing near 16 m
   (`TERRAIN_SPACING_M`) instead of a fixed 13 × 13 grid. A wider extent at 13 × 13 would have made
   the relief coarser, not finer.
3. **Trees keep their mapped positions.** `natural=tree` nodes are used as they always were, and
   `natural=tree_row` ways now become a tree every 8 m along the row — the same rule the import
   path already used. Where OSM has no tree, none is drawn: the ground is left as it is mapped. The
   municipal tree inventory (Oslo Bymiljøetaten) is **not** used: its licence is unconfirmed, and
   OSM in this area already carries 598 of the city's own tree references (`ref:oslo:tree`), so
   the positions are available under ODbL without a second source.
4. **A wider land-cover taxonomy**, shared by both data paths: `water`, `park`, `grass`, `wood`,
   `scrub`, `wetland`, `field`, `pitch`, `cemetery`, `bare`, `plaza`, `nature`. Every kind is an
   illustrative tint over the terrain, never a surveyed surface.
5. **Buildings are kept whole.** The context ceiling rose to 900, the smallest drawn building fell
   from 25 m² to 12 m², and an outline with more than 200 vertices is coarsened rather than
   rejected by the package parser.
6. **Roof solar is scoped to the site.** The analysis measures the roofs inside the study area and
   the masses drawn on it. The surrounding blocks still cast shadows into the site — they are in
   the shadow scene — but their own roofs carry no figure, are not painted a band, and do not
   enter the median, the legend or the kWh total. A neighbourhood's roofs are not the site's
   yield, and measuring 520 of them cost 8 s of worker time.
7. **The Low render tier draws one lump per tree.** The full canopy is 18–28 clumps — a few
   hundred triangles each, so a thousand mapped trees are hundreds of thousands of triangles. On
   the Low tier (software rasterisers, and any machine that trips the frame budget) each tree is
   one icosahedron and the branch mesh is dropped. The tier system (ADR-0018) already exists for
   exactly this; the trees simply had to join it. The positions, sizes and tints are unchanged.
8. **The noise screening uses a building index.** The road-noise model tests, for every study-area
   cell and every mapped street, whether a building stands between the receiver and the road. That
   test was a linear scan over all buildings: with 520 context buildings it cost ~1.0 s per pass and
   the studio recomputes it on the main thread whenever a mass changes. The screening now asks a
   uniform-grid index (`indexBuildings` in `src/features/analysis/grid.ts`) for the buildings whose
   box meets the line — the same set a scan would have found, so the numbers are unchanged — and the
   pass takes ~145 ms. Same pattern as the shadow-ray index in ADR-0021.

## Consequences

- Compact Infill: 520 context buildings, 935 trees, 58 land-cover areas, a 40 × 47 terrain grid.
  Sloped Edge: 230 buildings, 251 trees, 24 land-cover areas, 42 × 50.
- GPU frame rate at 1440 × 900, headed Chromium on an M1 Pro: 112.5 → 90.2 fps for Compact Infill
  (49.5 fps at 2× DPR). Headless SwiftShader fell to ~3 fps, which is why the Low tier now draws a
  single-lump canopy: the same build measures 8.6 fps headless, and the GPU number is unchanged.
- The roof-solar figure now describes the site. Any published number that included neighbouring
  roofs changes; none was published in the case study.
- The extract is larger, so `data/raw/<site>.osm` grows (3.6 MB for Compact Infill) and the cache
  now records the bbox it was downloaded for, so a changed extent is fetched again rather than
  silently reused.
- Density has a cost: an edit in the studio re-runs the noise screening. With the index the Undo
  click in the end-to-end suite fell from ~5 s to ~1.8 s (headless software rendering), and the
  screening itself from 1021 ms to 145 ms — measured, not estimated.

## Alternatives rejected

- **Mapbox tiles in the bundle** — terms forbid it; the PRD forbids live GIS.
- **Kartverket FKB-Bygning** — authoritative building parts, but "Norge digitalt" is a licensing
  and procurement project, not a sprint.
- **A municipal tree inventory as a source** — better sizes, but the licence is unconfirmed and the
  OSM data already carries the same positions.
- **Analysing every roof in the scene** — it mixes the neighbourhood into the site's yield and
  costs seconds of worker time for a figure nobody asked for.
- **Procedurally generated trees** — invented positions, and the lattice was visible on screen.
