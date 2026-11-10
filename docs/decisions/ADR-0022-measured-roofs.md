# ADR-0022 — Measured roof shapes for imported sites

- **Status:** Accepted (owner request, 2026-11-10)
- **Supersedes in part:** the `roofs-flat` simplification of the site import (all roofs as flat extrusions)

## Context

Imported buildings came from OpenMapTiles with one `render_height` each, so every building was a box
and many heights were estimates. OpenStreetMap `roof:shape` tags cover about 6 % of buildings in
Grünerløkka (62 of 964), too few to use. Kartverket's national surface model (DOM, 1 m lidar,
CC BY 4.0, NN2000) records the real top surface everywhere in Norway.

## Decision

1. **One raster per import.** `features/import/surface.ts` downloads the frame from Kartverket's
   WCS (`wcs.hoyde-dom-nhm-25833`, coverage `nhm_dom_topo_25833`, EPSG:4326 bbox, ≤ 800 × 800 px,
   about 1 m). The service sends CORS headers and an uncompressed float32 GeoTIFF, which a ~60-line
   reader decodes. **No new dependency.**
2. **Only on matching terrain.** Roofs are fitted only when the terrain provider reports the same
   vertical datum (NN2000, i.e. Kartverket terrain). Outside Norway, or if the download fails, the
   import behaves exactly as before and keeps the `roofs-flat` wording.
3. **Fit per building** (`features/import/roofFit.ts`, pure, tested). Up to ~250 sample points
   inside the footprint, 1.5 m from the outline; heights above the building's base. Outcomes:
   - **gabled** — least-squares `z = ridge − tan(pitch) × |distance from ridge|` over both axes of
     the footprint's minimum bounding rectangle and 17 ridge offsets wall to wall (so a single-slope
     roof fits with its ridge on one wall); one trimming pass for chimneys and dormers. Accepted when
     pitch is 10–60°, RMSE ≤ 1 m and ≤ 0.7 × the height deviation, and the eave stays ≥ 2 m.
   - **flat** — height spread (p90 − p10) ≤ 1.5 m, or a pitch under 10° with spread ≤ 3 m.
   - **complex** — measured but neither; drawn flat at the measured median.
   - **not measured** — under 8 roof samples, over 40 % ground hits, or median under 2.5 m (the
     footprint and the lidar disagree); the OpenMapTiles height is kept.
4. **Schema.** `ContextBuilding.roof?: { shape: 'gabled', ridge, ridgeHeight, pitchDeg }`
   (`features/sites/roof.ts`), validated in `parseBuildings`. Optional, so existing packages and
   stored imports stay valid and render flat. `schemaVersion` is unchanged.
5. **Heights become measured.** For every measured building `height` is the measured value: the
   median for flat/complex, the mean roof height for gables. The import notes say how many heights
   are measured and how many roofs are pitched, flat, other and unmeasured.
6. **Drawing.** `createContextGeometry` splits the footprint along the ridge and lifts walls and
   roof to the gable surface; the roof-solar and roof-wind overlays use the same surface
   (`scene/roofGeometry.ts`).

## Claims and limitations

- Wording: "Roofs from Kartverket surface model (DOM) (1 m lidar): N pitched (drawn as simple
  gables), …". Never "surveyed", "as built" or "official".
- **Analyses still treat each building as a flat block** at its (now measured) mean roof height:
  sun hours, shadows in the ray test, roof solar, VSC, wind and noise. Rendered sun shadows do
  follow the pitched geometry.
- Hipped, mansard, stepped and multi-wing roofs are either approximated by one gable or drawn flat.
- Lidar age differs from the map: new or demolished buildings fall out as "not measured".
- The two curated demo sites (`compact-infill`, `sloped-edge`) are unchanged: their packages are
  immutable (AGENTS §10) and built by a separate Python pipeline.
- Existing stored imports keep flat roofs until the site is imported again.
- A concave footprint that crosses its ridge more than twice can show a short extra edge line on the
  ridge.

## Evidence

Real imports, 400 m frames (`scripts/capture-roofs.mjs`, screenshots `docs/screenshots/roofs-*`):

| Frame | Buildings | Pitched | Flat | Other | Not measured |
|---|---|---|---|---|---|
| Grünerløkka | 202 | 105 | 53 | 42 | 2 |
| Kampen | 208 | 105 | 57 | 46 | 0 |

Raster download: 800 × 800 px is 3.2 MB in about 0.5 s.
