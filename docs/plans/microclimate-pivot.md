# Plan — Microclimate pivot (address → area → analysis)

**Status:** proposed, awaiting owner go-ahead · **Date:** 2026-11-04
**Supersedes for the main path:** the M2–M4 "design a building" flow. Code stays, route is demoted.

## Target flow

1. `/` — what the tool does, one "Try it" button → `/new`.
2. `/new` — enter an address (geocode already exists), see the map, **draw/adjust the study area**.
3. Import builds the site package (terrain, buildings, roads, trees — already done).
4. `/studio/import/:id` opens on an **Analysis dashboard**, not the massing editor.

## Analysis dashboard (four panels, all from the site package)

| Panel | Source | Status |
|---|---|---|
| Area & coverage | study area, building footprints | exists (`massSummary`), re-point at *existing* context buildings |
| Sun & shadow | geometric sun, 3D scene | exists (`sun.ts`, `SunPanel`) |
| **Wind exposure** | prevailing direction + building heights/footprints | **new** |
| **Noise screening** | road/rail class + distance (+ building screening) | **new** |

### Wind (screening, not CFD)
- Domain module `src/features/analysis/wind.ts`, renderer-free.
- Input: a prevailing-direction rose chosen from a small hand-written table by latitude band/region (labelled "typical, not measured"), or user-picked direction.
- Method: sample a grid over the study area; per cell cast upwind rays through building footprints/heights; exposure = f(obstruction angle, upwind fetch). Output 0–1 index → 4 classes (Sheltered … Exposed).
- Render as a coloured ground overlay + legend. Claim label: `Screening estimate — not a wind simulation`.

### Noise (screening, not acoustics)
- Domain module `src/features/analysis/noise.ts`, renderer-free.
- Input: `roads` already in the package (`highway` class, width). Rail: add to the Overpass query only if cheap; otherwise road-only in v1.
- Method: per road class a nominal source level (named constants in one table, cited as indicative); per grid cell sum energy over road segments with distance attenuation (line source, ~3 dB per doubling) and a fixed screening bonus when a building lies on the line to the source. Output dB(A) band.
- Render as ground overlay + legend. Claim label: `Indicative road-noise screening — not a noise survey`.

## Steps

| # | Step | Size | Done when |
|---|---|---|---|
| 1 | ADR-0013: scope change (wind/noise screening in, CFD/acoustics stay out; PRD line 55 amended). Update AGENTS.md claim policy and status. | S | ADR merged |
| 2 | `noise.ts` + fixtures: hand-computed 3–4 cells (single road, two roads, building screen). | M | unit tests pass, numbers hand-verified |
| 3 | `wind.ts` + fixtures: open cell vs. cell behind a known block. | M | unit tests pass |
| 4 | Overlay layer in scene + legend + panels (`WindPanel`, `NoisePanel`) reusing the Sun/Metrics panel pattern. | M | works on both curated sites and an imported one |
| 5 | Studio default = Analysis dashboard; massing tools/scenarios behind a "Test a building" toggle. Landing copy + About rewritten to the new pitch. | M | `/new` → analysis in one pass, no dead controls |
| 6 | Draw-your-own study area on `/new` (polygon on the MapLibre map) if the current frame step is not enough. | M | area drives import bounds |
| 7 | Gate: lint, test, build, e2e of the full flow, screenshots, review note. | S | all green; `progress.md` + `agent-log.md` updated |

Order: 1 → (2, 3 in parallel; independent files) → 4 → 5 → 6 → 7.

## Decisions I'm defaulting (change if you disagree)
- **Massing editor:** kept, demoted behind a "Test a building" toggle. Not deleted, so M2–M4 tests and work stay valid. Say "remove" if you want it gone.
- **Wind direction:** a small built-in table plus user override. No live weather API (out of scope: live GIS/backend).
- **Rail noise:** deferred unless the Overpass query adds it trivially.
- **No new runtime dependencies** (grid maths in plain TS).

## Known limits to state in the UI
- Wind and noise are screening indices from OSM footprints/heights, which are incomplete in places.
- No terrain effects on wind or noise in v1.
- Results are comparative within a site, not absolute values for compliance.
