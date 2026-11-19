# ADR-0034 — The official road-noise map replaces the heuristic

- **Status:** Accepted (2026-11-15, build/foundation WP-4; plan `docs/plans/fable-build-plan.md`)
- **Supersedes:** the road-noise part of ADR-0013 (the highway-class heuristic, `noise.ts`)
- **Relates to:** ADR-0026 (analysis cards), ADR-0032 (layer provenance), ADR-0019 (exports),
  feasibility 09 §1, §2, §2a (binding), 04 §2.3, 08 R2/R8/R15
- **Dependencies:** none added.

## Context

The Noise card showed "61 dB · peak · secondary road": a constant per OSM highway class, spread by
distance and screened by buildings. Feasibility compared it with Statens vegvesen's strategic noise
map at 32 points: the same 5 dB band at 47 %, and 5.7 dB low on average where mapped. It also moved
when a block was drawn, which implied a propagation model the studio does not have.

The official map is open (NLOD 1.0), vector, and covers the urban test places. Its publisher forbids
one use: «Datasettet skal ikke brukes til å vurdere behov for tiltak på enkeltbygg. Det må utføres
egne beregninger for dette.»

## Decision

1. **Data.** Statens vegvesen WFS `norstoy_1_0:Strategiskstoykart_lden` and `…_lnight`, GeoJSON.
   - **Curated sites:** fetched at build time over the terrain extent, cached raw in `data/raw/`
     with checksum and request (`scripts/site-assets/noise.build.ts`), written as `noise.json`
     `{ dataYear, polygons: { metric, bandLow, rings }[] }` and registered in the manifest with its
     provenance: NLOD attribution, `dataYear` from the features' `BEREGNETÅR`, the use limitation verbatim.
   - **Imports:** the same converter, live at import time (`statensVegvesenNoise`), stored with the
     package. A frame the service maps nothing in gets no layer. A failed request also gets no
     layer, and the package notes say why.
2. **Registration.** The WFS is asked for **WGS84** (`srsName=EPSG:4326`), and every vertex goes
   through the app's own projection (`toLocal` → `project`). No UTM offset is used as ENU, so the
   27 m error of feasibility 09 §1 cannot occur, and no reprojection library is needed. Features run
   for kilometres past a site, so each ring is clipped to the extent; holes (the buildings) are kept
   as rings and filled even-odd. Rings are simplified at 0.4 m.
3. **Domain** (`src/features/analysis/officialNoise.ts`, renderer-free): band lookup at a point
   (even-odd over rings, highest band where bands are nested), band shares over the open ground of
   the study area, and a "not mapped" result. The studio looks bands up; it computes no level.
4. **Scene** (`src/scene/NoiseBands.tsx`): the polygons are filled into one 2048 px plan texture
   with the 2D canvas and draped on a copy of the terrain mesh by its planar ENU UVs. One mesh, one
   texture, no mesh per feature. It is in the analysis overlay group, so the analysis export pass
   carries it. No worker: the fill is a few milliseconds and adds no long task (see Verification).
5. **Card.**
   - Lden / Lnight switch.
   - Legend: each mapped band with its share of the open ground in the study area, and a
     "No mapped band" row with the note that it is below the map's lowest band or not mapped,
     "not a statement that it is quiet".
   - Source line: "Road noise, Lden 2021 (Statens vegvesen strategic noise map, CNOSSOS-EU). 5 dB
     bands. Not for assessing individual buildings." The same line stays on the map with the layer.
   - **Headline:** the band with the largest share ("55–60 dB"), or "No strategic noise map here".
     The "61 dB" peak is gone.
   - **Drawn blocks:** when a block touches a mapped Lden band of 55 dB or more, the card shows the
     publisher's own requirement and nothing else: "Noise-sensitive development here requires a
     detailed noise calculation (Statens vegvesen; T-1442)." Never a value for the block.
   - The shares are over the ground between the *existing* buildings, so nothing on the card moves
     when a block is drawn: the map is static context.
6. **Exports.** With the layer on screen, exports carry its NLOD credit (ADR-0032) and
   "Road noise: Not for assessing individual buildings."
7. **The heuristic is retired.** `noise.ts`, its tests, its legend, its card figure and its ground
   layer are deleted. It is not kept as a fallback: where there is no map, the card says so.

## What the studio must never do (from feasibility 09 §2a)

- No noise number for a building, a façade or a drawn block; no click-a-building readout.
- No statement that a block is acceptable or not. No "støysone": this is the EU-directive strategic
  map, not the T-1442 planning zones.
- No animation or recomputation that suggests the map responds to the design.
- The year shown is the features' own (2021), never the catalogue prose (which says 2016/2017).

## Consequences

- The Noise card is now class "measured / authoritative data" (feasibility 08 §1), no longer a heuristic.
- `buildClimateView` keeps its unused `roads` and `buildings` parameters so its many call sites and
  tests keep their shape (marked in the code). Its `'noise'` mode returns an empty view.
- `feasibility/scratch/noise-points.test.ts` imported the deleted module and no longer runs; its
  result is kept in `feasibility/scratch/evidence/noise-app-points.json` and in 04 §2.3.
- Bundle: studio chunk 73.8 → 74.3 kB gzip. `noise.json`: 133 kB (Compact Infill), 39 kB (Sloped Edge).
- The band colours reuse the studio's existing noise swatches; to be revisited in the design phase.

## Verification (2026-11-15)

- **Registration gate** (`officialNoise.test.ts`, Compact Infill): 100 % of 142 major-road samples
  lie in the ≥ 65 dB band at zero shift (gate: ≥ 90 %); 99–100 % at ±8 m; 9–22 % at ±20 m diagonal shifts.
- **Perf gate** (`feasibility/scratch/perf.mjs`, headed Chromium, noise is the default open card;
  `evidence/perf-build-wp4-noise.json` against `perf-build-baseline.json`):

| Site | Orbit p95, baseline | Orbit p95, with the layer | Limit (baseline + 10 %) | Long tasks, idle and orbit |
|---|---|---|---|---|
| Compact Infill | 25.1 ms | 25.1–27.0 ms | 27.6 ms | 0 |
| Sloped Edge | 24.9–26.8 ms | 26.8 ms | 27.4–29.5 ms | 0 |

  Draw calls per frame are unchanged at 90 (the heuristic's ground layer went, the band mesh came).
  The long tasks in the first 6 s after load (93–164 ms) are the same class as the baseline's
  (98–157 ms). The p95 moves in display-refresh steps (25.1 → 26.8 ms), so the margin is one step.
- Fixtures: a square with a hole, nested bands, an empty tile; converter placement, clipping, mixed
  years refused; parser; shipped layers' year and provenance.
- Captures: `docs/screenshots/build-noise-noise.png`, `build-noise-noise-sloped-edge.png`.
