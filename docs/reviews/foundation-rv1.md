# Review — Foundation RV-1: independent re-run of the acceptance numbers (TF-VIS-003)

- **Date:** 2026-11-18
- **Reviewer:** DeepSeek V4 Pro (Cline), `gis-qa-engineer` — Run 2 T2
- **Scope:** `docs/reviews/build-foundation-report.md` §3 acceptance table, reproduced from the
  committed package files under `public/sites/` and the domain functions in `src/`, independently
  of the report. Read-only.
- **Method:** throw-away scripts under `/tmp` (not committed), run with `npx tsx`, importing the
  repo's own functions (`parcelArea`, `decodeTerrainRaster`/`terrainProfile`/`profileRange`,
  `parseOfficialNoise`/`bandLookup`, `parseRoads`, `toUtm33`/`project`).

## One row per acceptance item

| Item | Report value | Re-run value | Difference | Within tolerance | Notes |
|---|---|---|---|---|---|
| Parcel area 0301-228/255 | 464.4 m² (register 464.6, feasibility 465.1) | **464.4 m²** | 0.0 m² | yes | `parcelArea()` over `parcels.json` outline−holes |
| Measured heights — Compact Infill | 520 of 520 measured | **520 of 520** | 0 | yes | `heights.json` non-`unmeasured` entries vs `buildings.json` count |
| Measured heights — Sloped Edge | 220 of 230 measured | **220 of 230** (10 unmeasured) | 0 | yes | same |
| W–E section (Compact Infill) | 8.97–21.45 m NN2000 over 578.8 m (reference 8.98–21.44 m) | **8.97–21.45 m over 578.8 m** | 0.00 m | yes | endpoints EPSG:25833 (262663,6650490)→(263242,6650490), inverse UTM33 → WGS84 → `project()` to local ENU, `terrainProfile` + `profileRange` + origin elevation 20.28 |
| Noise registration (Compact Infill) | 100 % (gate 90 %) | **100.0 % of 142 samples @ zero shift** (9.9/21.8/9.2/16.2 % at ±20 m diagonals) | 0 | yes | `officialNoise.test.ts` logic re-run |
| Source-health check | 20 sources, 20 unchanged, 0 failed | **20 sources, 20 unchanged, 0 failed** | 0 | yes | `node scripts/check-sources.mjs` (network reachable) |

## Explanation of every "no"

None. Every row reproduced within tolerance (the section reproduces the app's figure exactly;
the reference `terrain_bench.py` figure is 8.98–21.44 m, which is the 0.014 m difference the report
already records, within the 0.05 m limit).

## Notes

- The section's endpoints only reproduce when the UTM33 grid convergence is honoured: the tangent
  plane (`project()`, WGS84 metres-per-degree) is rotated from UTM33 grid north, so the section is
  a diagonal in the app's ENU — a naive easting/northing offset lands ~0.85 m high on the minimum.
  The report's figure is reproducible only through the app's own `project()` (deviation 6 in the
  report makes this exact).
- The noise registration is the `officialNoise.test.ts` gate re-run; the 142-sample count and the
  diagonal-shift spread match the test's comment.

## Verdict

- [x] Pass — every acceptance number reproduced.

## Follow-ups

1. None.
