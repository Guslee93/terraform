# C3 — Site import spike: one live Oslo frame → SitePackage (Codex work order)

Role: implementer (spatial data). Project: Terraform v1. Read `AGENTS.md`, `docs/plans/site-import-plan.md` (§3, §5), `docs/decisions/ADR-0006-site-import.md`, then `scripts/build_site_packages.py` (projection `project()`, `fetch_elevations()`, road width table, package writing) and `src/features/sites/{manifest,package}.ts` (the parsers your output must pass).

## Goal

Prove that a **live, keyless** fetch can produce a valid Terraform site package for an arbitrary frame. A throwaway Node script, not app code. It answers: does it work, how long does it take, how big is it, and what breaks?

## You own

- `scripts/spike-import.mjs` (new). Output goes to `tmp/spike/<siteId>/` (gitignored if `tmp/` is not, add `tmp/` to `.gitignore`).
- `docs/plans/spike-findings.md` (new): your measured findings.

## Do not touch

Anything under `src/`, `public/`, `e2e/`, existing scripts, `package.json` (the decoders `@mapbox/vector-tile@3.0.0` and `pbf@5.1.2` are already installed as devDependencies). Do not commit.

## Spec

- CLI: `node scripts/spike-import.mjs --lat 59.9225 --lon 10.7595 --size 400 --id spike-grunerlokka [--title "Grünerløkka, Oslo"]`. Square frame of `size` metres centred on the point.
- **Projection:** port `metres_per_degree` / `project` exactly from the Python builder; origin = frame centre. All output coordinates are local ENU metres `[east, north]`.
- **Tiles:** read `https://tiles.openfreemap.org/planet` (TileJSON) for the current tile URL; compute the z14 tiles covering the frame; fetch them (send a descriptive `User-Agent`); decode with `@mapbox/vector-tile` + `pbf`; convert geometry to lon/lat with `feature.toGeoJSON(x, y, z)`.
- **Buildings** (`building` layer): skip `hide_3d`; height = `render_height − render_min_height` (min 2.5 m); polygons and multipolygon parts → outer rings only; clip to the frame (Sutherland–Hodgman, port `clip_ring` from the Python builder); **merge fragments of the same building split across tile edges** (same `feature.id` → union with `@turf/turf`, already a dependency); simplify 0.3 m; drop < 12 m². `kind: 'other'` unless an obvious mapping exists. `baseElevation` = min terrain height under the footprint − 0.3 (like the builder). `withinStudyArea` = centroid inside the study area.
- **Roads** (`transportation`, line geometries): `class` → width via the builder's `ROAD_WIDTHS` (map OpenMapTiles classes: motorway/trunk/primary/secondary/tertiary/minor→residential/service/path→footway/track); skip `brunnel=tunnel`; clip to frame (port `clip_polyline`).
- **Land cover**: `park` → park; `landcover` class grass → grass, wood → wood; `water` polygons → water. Same schema as `landcover.json`.
- **Trees**: none (the tiles carry no tree points). Write `trees.json` with an empty list.
- **Terrain**: 13 × 13 grid over the frame from Kartverket høydedata (`https://ws.geonorge.no/hoydedata/v1/punkt?koordsys=4326&punkter=…`, batches of 49, as in the builder). Recentre to the origin elevation like the builder.
- **Study area**: frame inset 15 %, closed ring. **Manifest**: mirror an existing manifest's shape (copy `cameraPresets` logic from the builder's `camera_presets`), `dataStatus: 'curated-demo'` for now (the parser does not know `user-import` yet; note this in findings), sources = OpenFreeMap/OpenMapTiles/OSM (ODbL) and Kartverket (CC BY 4.0), statistics matching the files, `simplified` lines that say heights come from OpenMapTiles `render_height` (partly estimated).
- **Robustness**: timeouts, one retry with backoff per request; print a clear error naming the failed source.
- Print a summary: per-step timings (tiles, decode, merge, terrain, write), counts (buildings, merged fragments, roads, land cover by kind), output size in kB, and the share of buildings whose height equals a suspicious default (report the most common `render_height` values).

## Findings doc (`docs/plans/spike-findings.md`)

Run it for **three frames**: Grünerløkka Oslo (59.9225, 10.7595, 400 m), Bjørvika Oslo (59.9075, 10.7530, 400 m), and Södermalm Stockholm (59.3160, 18.0710, 400 m; terrain: note that Kartverket only covers Norway; use a flat grid and say so). Table: timings, counts, sizes, height-default share, failures. Then: what surprised you, what must change for P2, open questions.

## Done when

- The three frames produce packages in `tmp/spike/`; the findings doc is written.
- `npm run lint` passes (the script must lint clean).
- Report: commands run, findings summary, anything you could not do (e.g. network blocked).

## Addendum — terrain policy decision (Claude, 2026-10-28)

Decision on the open question in `docs/plans/spike-findings.md`:

1. **Sea cells → water surface.** A grid node whose Kartverket response has `terreng: "Havflate"` or `datakilde: "dybdekurver"` is set to **0 m (NN2000 mean sea level)** before recentring, flagged `water-surface`. Sea-floor depth is not modelled; say so in the manifest `simplified` list and attribution.
2. **Missing nodes → nearest valid neighbour, capped.** A null node takes the value of the nearest valid node in grid distance (ties: lowest row, then column), flagged `estimated`. If more than **5 %** of nodes are estimated, the import fails with a source-naming error.
3. Record per-node flags in the spike summary (counts by `measured` / `water-surface` / `estimated`) and add one `simplified` line, e.g. "2 of 169 terrain samples estimated from neighbours; 54 sea samples set to mean sea level".
4. Rerun Bjørvika (and Grünerløkka, to confirm no change) and update the findings doc: the Bjørvika row, the new policy, and C3 acceptance.
