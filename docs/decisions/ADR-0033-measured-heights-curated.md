# ADR-0033 — Measured heights for the curated packages

- **Status:** Accepted (2026-11-15, build/foundation WP-3; plan `docs/plans/fable-build-plan.md`)
- **Amends:** ADR-0022 (measured roofs: import path only until now), ADR-0021/0031 (the sun-hours claim)
- **Relates to:** ADR-0032 (layer provenance), feasibility 09 §3, 04 §2.2, 08 R4
- **Dependencies:** none added. The build step runs through the existing Vitest.

## Context

Every context height in the two curated packages was an estimate: OSM `building:levels` × 3.2 + 0.4 m,
or a typology fallback. Feasibility measured the estimates against Kartverket's surface model: 1.2 m
low at the median, only 56 % within 3 m, and 14.6 % of midsummer ground cells in the default circle
move by an hour or more when measured heights replace them. The import path has measured its roofs
from the same surface model since ADR-0022; the curated demo sites, the ones every visitor sees, had not.

## Decision

1. **Method: the app's own roof fit**, unchanged (`src/features/import/roofFit.ts`, ADR-0022), over
   one 1 m raster of Kartverket's surface model per site. `measureHeights` (`src/features/sites/heights.ts`)
   places each building's base exactly as the import path does: package origin elevation + the
   building's `baseElevation`. For the curated packages that base already is "lowest terrain under the
   outline and centroid − 0.3 m" (`build_site_packages.py`), the rule the plan names.
2. **Data: the open NHM surface-model WCS** (`wcs.hoyde-dom-nhm-25833`, coverage
   `nhm_dom_topo_25833`; dataset Høyde DOM1, CC BY 4.0). Not "DTM Sømløs", which is restricted.
   The raw GeoTIFF is cached in `data/raw/<site>-dom.tif` with its request, retrieval date and
   checksum in `SHA256SUMS`.
3. **Registration.** The raster is requested in EPSG:4326 over the package's own WGS84 box, one
   pixel per metre. The app's local frame is linear in latitude and longitude (`projection.ts`), so
   that raster is exact in ENU: column = east, row = north, no rotation. This is the same request
   the import path makes, and it avoids the 27 m error of treating UTM offsets as ENU
   (feasibility 09 §1) without a reprojection library.
4. **A separate asset.** `public/sites/<id>/heights.json`: `{ id, kind: flat | gabled | complex |
   unmeasured, height?, roof? }` keyed by OpenStreetMap building id, with its own `layers` entry
   (`heights`, © Kartverket, CC BY 4.0). `buildings.json` is not touched and still holds the storey
   estimates: CC BY 4.0 heights and ODbL footprints stay apart (09 §3; a legal reading, not advice).
5. **Loader.** `loadSitePackage` fetches `assetPaths.heights` when the manifest lists it and merges
   (`mergeHeights`): the measured height and gable replace the estimate; an unmeasured or unlisted
   building keeps it. Each building then says `heightSource: 'measured' | 'estimated'`.
6. **What the product says.**
   - The sun-hours claim names the height source of the package on screen: "(heights from Kartverket
     surface model)" when the package has a heights layer, "(heights estimated from storeys)"
     otherwise. This also corrects the WP-1 wording for imported sites, whose roofs were already measured.
   - Layers → Context buildings: "520 of 520 heights from Kartverket surface model".
   - Site → Data attribution lists the heights layer and its limitation: measured from a lidar
     surface model, not surveyed; lidar and map epochs differ.
7. **Build step:** `scripts/site-assets/heights.build.ts`, run with
   `npx vitest run --config scripts/site-assets/vitest.config.ts heights`. It is outside
   `npm run test`. `build_site_packages.py` now keeps the assets and layers that later steps
   registered when it rebuilds a manifest; rerun the heights step after it, as building ids can change.

## Results (2026-11-15)

| Site | Buildings | Gabled | Flat | Other (flat at measured height) | Unmeasured | Measured |
|---|---|---|---|---|---|---|
| Compact Infill | 520 | 282 | 161 | 77 | 0 | 100 % |
| Sloped Edge | 230 | 177 | 26 | 17 | 10 | 95.7 % |

- Measured − estimated: Compact Infill median +1.3 m (p10 −3.3, p90 +4.8; 55 % within 3 m);
  Sloped Edge median +0.4 m (p10 −5.8, p90 +3.0; 65 % within 3 m).
- Registration check, share of roof sample points standing more than 2.5 m above the building base:
  Compact Infill 0.9995 at zero shift against 0.964–0.970 at ±3 m; Sloped Edge 0.986 against
  0.909–0.953. The peak is at zero in both.
- Sun hours in the default 100 m circle, measured against estimated heights:

| Site | Date | Ground cells moved ≥ 1 h | Mean \|Δ\| | Median ground / roofs / façades, estimated → measured |
|---|---|---|---|---|
| Compact Infill | 20 March | 6.1 % | 0.31 h | 5.25 / 10.75 / 0 → 5.0 / 10.75 / 0 |
| Compact Infill | 21 June | 14.6 % | 0.46 h | 8.75 / 16.75 / 3.75 → 8.5 / 17.25 / 3.0 |
| Sloped Edge | 20 March | 9.5 % | 0.35 h | 11.25 / 12.0 / 5.25 → 11.5 / 11.75 / 5.25 |
| Sloped Edge | 21 June | 9.5 % | 0.34 h | 17.0 / 18.0 / 7.5 → 17.25 / 18.25 / 7.75 |

  The Compact Infill figures reproduce the feasibility benchmark (14.6 %, 0.46 h).

## Changed expectations

- `StudioShell.test.tsx`, `e2e/sun-hours.spec.ts`, `e2e/m3-disclaimers.spec.ts`: the sun-hours
  claim on Compact Infill now reads "(heights from Kartverket surface model)".
- `fetchJson.test.ts`: the loader requests `heights.json`.
- **No numeric analysis expectation changed.** The unit tests that use curated geometry (wind sweep,
  flow runner, roof solar, building index, microclimate) read `buildings.json` directly: they are
  solver tests over the footprint file, which still holds the storey estimates. What the visitor sees
  changes, as in the table above: Compact Infill's Sun card reads 8.5 h on 21 June (was 9.0 h).

## Deviations from the plan

- **Sloped Edge is 95.7 % measured, not ≥ 99 %.** The plan's figure came from Compact Infill alone.
  The ten unmeasured buildings are small (12–104 m²). The shipped-package test asserts ≥ 99 % for
  Compact Infill and ≥ 95 % for Sloped Edge, and the legend states the count.
- **No DTM tile was fetched here.** The fit needs the building base, which the package already has.
  The 1 m terrain tile belongs to WP-7, where it is used.

## Limits

- Lidar epoch ≠ map epoch: a new or demolished building falls out as unmeasured or mismeasured.
- Trees over roofs can bias a fit. Hipped, mansard and stepped roofs are drawn as gables or flat.
- The analyses still use one height per building, plus the gable where there is one (ADR-0022).
- No independent open ground truth exists for Oslo (FKB-Bygning is restricted): agreement with the
  surface model is measurement, not survey.
