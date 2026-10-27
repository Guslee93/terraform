# M1 geometry QA

- **Date:** 2026-10-27
- **Reviewer:** `agency-gis-qa-engineer`
- **Scope:** both site packages, preprocessing pipeline, provenance
- **Evidence:** `public/sites/*`, `data/raw/*`, `scripts/build_site_packages.py`, `docs/data/site-package-spec.md`
- **Gate decision:** **PASS with follow-ups**

## Checks and results

| Check | Compact Infill | Sloped Edge |
|---|---|---|
| Manifest schema / unit | v1 / metres | v1 / metres |
| Horizontal datum | WGS84, local tangent plane | WGS84, local tangent plane |
| Vertical datum | NN2000 (Kartverket DTM1) | NN2000 (Kartverket DTM1) |
| Origin elevation | 20.42 m | 137.20 m |
| Study boundary closed | yes | yes |
| Study boundary self-intersection | none | none |
| Study boundary area | 45 600 m² | 71 300 m² |
| Boundary claim | “not a cadastral parcel” | “not a cadastral parcel” |
| Terrain grid | 13 × 13 | 13 × 13 |
| Terrain finite values | yes | yes |
| Terrain relief (relative) | −4.38 … +5.98 m | −26.98 … +4.01 m |
| Buildings | 137 | 33 |
| Footprint IDs unique | yes | yes |
| Footprints simple / finite / positive area | 137 / 137 | 33 / 33 |
| Buildings inside study area | 65 | 20 |
| Camera presets | 5 perspective presets | 5 perspective presets |
| North convention | +north = local +Y; north arrow derived from camera basis | same |
| Runtime GIS calls | none; local `/sites/*` assets | none |
| Attribution | OSM ODbL + Kartverket CC BY 4.0 | same |

Performance spot check at 1440×900 on Apple M1 Pro via ANGLE Metal: **60.1 fps**, no page errors. Headless SwiftShader measured 39.6 fps; that is a software-renderer limitation, not the target hardware result.

## Findings

| # | Severity | Area | Finding | Recommendation | Status |
|---|---|---|---|---|---|
| 1 | **Major** | Preprocessing | RDP simplification produced 11 self-intersecting footprints in Compact Infill and 1 in Sloped Edge. | Added a repair/validation pass (`repair_ring`, `is_simple_ring`) that retries finer tolerances and skips invalid ways; parser now rejects non-simple rings. Re-check reports 0 invalid footprints. | **Fixed** |
| 2 | Major | Attribution text | “not a cadastral” was split across a line break, making automated provenance checks fail. | Reflowed the sentence; both attribution files now contain the exact claim. | **Fixed** |
| 3 | Minor | Buildings | One base elevation is sampled at the footprint minimum; buildings on steep ground embed rather than conform. | Documented simplification; acceptable for context at M1. Revisit with terrain-conforming bases only if M2 needs it. | Accepted |
| 4 | Minor | Terrain | 13 × 13 grid (25–32 m spacing) is coarse for local grade. | Documented; the visual mesh grid exposes resolution. Increase to 17 × 17 if M2 massing needs finer clearance checks. | Follow-up |
| 5 | Minor | Buildings | Multipolygon building relations are omitted; only OSM ways are used. | Documented in each `attribution.md` and `simplified`. No impact on the conceptual demo. | Accepted |
| 6 | Minor | Scale | Scale bar is derived from camera–target distance at the target plane; it is not a survey-grade scale. | UI labels it as a scale bar, not a measurement. Revisit in M5 if measurements are added. | Accepted |
| 7 | Minor | Provenance | `sourceChecksum` covers the raw OSM XML only; the Kartverket response checksum is not stored. | Add a terrain checksum in a later pipeline revision. Raw elevation cache is committed. | Follow-up |
| 8 | Minor | Camera presets | Orthographic presets are rejected by the manifest validator; v1 uses perspective only. | Documented in the schema error message and M1 notes. | Accepted |

## Verdict

Geometry, CRS, units, topology, north orientation, package statistics and attribution meet the M1 gate. The self-intersection issue was found and fixed before sign-off. Follow-ups 4 and 7 are non-blocking.
