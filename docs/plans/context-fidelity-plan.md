# Context fidelity plan — Hektar-grade underlay without Mapbox

**Status:** Phase A–C implemented (2026-11-11); Phase D–E partly done; Phase F: F1 and F4 done, F2
partly (curated sites captured, the import capture still needs a network run), F3 self-reviewed and
still open with the design gate reviewer
**Date:** 2026-11-11 · **ADR:** `docs/decisions/ADR-0023-city-context.md`
**Research:** `docs/research/hektar-underlay.md`
**Goal:** make the studio read like a real place — individually modelled buildings with real roof
parts, a believable tree canopy, and enough context around the study area to see sun and shadow —
using only data we are allowed to ship.

This is a **data and look work order**, not a feature. It adds no controls, no new analysis and no
new route. It must not disturb the search → analyse → export flow (ADR-0020) or the M5 gate.

---

## 1. Why our scene reads flatter than Hektar's

Measured, not guessed:

1. **Too few trees, and no rows.** The 128 trees in Compact Infill were real `natural=tree` nodes,
   but a 190 × 210 m extract holds little else and `natural=tree_row` ways were never read.
   Hektar's streets carry rows of trees. **Now: 926 trees, rows included, none on water.**
2. **Our import path cannot receive building parts.** OpenMapTiles caps the `building` layer at
   z14 and publishes no `building_part` layer, so penthouses, roof boxes and stepped parts never
   arrive. Hektar's Mapbox `building` layer extrudes every part with its own `height` and
   `min_height`, which is where their crisp individual volumes come from.
3. **Our curated builder discards relations and parts** — it parses building *ways* only, so a
   building drawn as a multipolygon relation never enters a package.
4. **The scene was 190 × 210 m** and ended in a hard edge. **Now: a 200 m context halo**, so the
   site sits in a neighbourhood with a horizon.
5. **The greenery was thin.** Four land-cover kinds, so gardens, allotments, scrub, pitches,
   cemeteries and bare rock were dropped or painted as generic grass. **Now: twelve kinds on both
   paths**; Compact Infill went from 10 land-cover areas to 58.
6. **The context was being thrown away.** `buildings[:220]` dropped 296 of 516 real footprints
   once the extract grew. The ceiling is now 900, and the smallest drawn building is 12 m².
7. **Roof solar measured the whole neighbourhood**, so the site's figure included its neighbours
   and cost 8 s of worker time. **Now: the site is measured; the context only casts shadows.**

---

## 2. Phases

Sizes: S ≈ half a day, M ≈ one to two days, L ≈ three to five days.

### Phase A — Real trees with a real size  *(largest visual delta, M + M + S)*

| # | Task | Size | Notes |
|---|---|---|---|
| A1 | Confirm the licence for Oslo Bymiljøetaten tree data (NLOD 2.0 or otherwise) | S | **Dropped.** OSM already carries 598 of the city's own tree references (`ref:oslo:tree`), so the positions are available under ODbL. No municipal dependency, no licence question |
| A2 | Snapshot the tree inventory into `data/raw/` with checksum + fetch date | — | Not needed: A1 was dropped. The OSM extract already carries the mapped positions |
| A3 | Extend the tree record with measured size attributes | — | **Deferred by owner request** ("keep the objects we have for now"). `trees.json` stays `schemaVersion 1`: bare `[e, n]` points. A schema change would have been needed to carry a crown diameter |
| A4 | Render trees from measured size | — | Deferred with A3. The tree objects stay as they are; only placement changed |
| A5 | Derive height where the inventory has none | S | Oslo's inventory gives crown diameter, trunk diameter and species but no height. Derive per species group, and mark it as derived in the data, not as measurement |
| A6 | Let trees cast shadows and shade the ground | M | ADR-0021 currently states "terrain and trees do not shade". Adding tree shadows improves the picture and changes that claim — update the note and the limitation line in the same change |
| A7 | Import path: keep Overpass trees | — | Already done: the import path reads `natural=tree` and `natural=tree_row`. No municipal source added |

**Done when:** the Compact Infill package holds the mapped tree positions at full coverage (926 trees
including rows); the canopy reads as a canopy rather than a lattice; the attribution states where the
tree positions came from.

### Phase B — Buildings as individual units with parts  *(M + L)*

| # | Task | Size | Notes |
|---|---|---|---|
| B1 | Parse building **multipolygon relations** in `scripts/build_site_packages.py`, one building per outer member | M | Both current extracts happen to contain none, but the omission is a silent data loss for any other site |
| B2 | Parse `building:part` with its base offset and height | M | A part is a roof box, a penthouse or a setback volume |
| B3 | Prefer `height` over `building:levels`, and read `roof:height`/`roof:shape` where present | S | Mapbox and we both fall back to ~3 m per level; using the real tag first is strictly better |
| B4 | Import path: fetch buildings from Overpass for the frame — footprints, relations, parts, heights — and merge with the existing z14 tile layer | L | Our renderer already understands `render_height`/`render_min_height`; only the data lacks parts. Keep the tile layer as the geometry fallback |
| B5 | Reject overlaps: a simplified footprint may not intersect a neighbour | S | Extend the builder topology test, which already exists for self-intersections |

**Done when:** every building in a package is one OSM building, parts render at their own level, and
no two context footprints overlap.

### Phase C — A wider, greener context  *(M)*

| # | Task | Size | Notes |
|---|---|---|---|
| C1 | Extend the curated OSM extract beyond the study area (200 m halo) and keep the study area as the focus | M | **Done.** The data bbox, the terrain extent and the clipping extent all grow with it |
| C2 | Scale the terrain grid with the extent (13 × 13 → 40 × 47 for the compact site) | M | **Done.** Sample spacing stays near 16 m, so the relief does not get coarser |
| C3 | Replace OSM park polygons with Oslo's park outlines where available | S | **Dropped.** OSM park polygons now come with ten more kinds around them; the municipal licence question is not worth it |
| C4 | Keep the land-cover kinds and the legend as they are | — | No new legend concepts |

**Done when:** the default camera sees buildings and greenery beyond the study boundary, and the
horizon does not end in a hard edge.

### Phase D — The look pass  *(M)*

| # | Task | Size | Notes |
|---|---|---|---|
| D1 | Push context buildings back visually: warmer white, lower contrast against the study mass, subtler edge shading | S | The study mass must stay the brightest thing in the frame |
| D2 | Soften the sun shadow slightly and widen the ground-contact AO | S | Buildings should sit on the ground instead of hovering |
| D3 | Give trees a canopy green that sits inside the warm palette | S | The foliage palette already carries four softened greens; revisit once measured sizes land |
| D4 | Add a distance fade so the wider context dissolves instead of stopping | S | Purely visual; no data effect |

### Phase E — Provenance and claims  *(S + S)*

| # | Task | Size | Notes |
|---|---|---|---|
| E1 | Per-package `attribution.md`: OSM ODbL 1.0, Oslo Bymiljøetaten (with its licence), Kartverket CC BY 4.0 | S | Required by ODbL and by the claim policy in AGENTS.md |
| E2 | Show tree and building provenance with the capture date in the inspector's "Site and sources" panel | S | "Curated Oslo demo · simplified context" stays, but now it is more true |
| E3 | Update `docs/data/site-package-spec.md` for tree schema v2 and building parts; write ADR-0023 | M | A schema change is a contract change |
| E4 | Update the case study and `About#data` with the new sources | S | No claim of completeness or official data |

### Phase F — Verification  *(M)*

| # | Task | Size | Notes |
|---|---|---|---|
| F1 | Fixture counts: measured-tree count, building-part count, overlap checks, exact counts in tests (no loose assertions) | S | Follows the 2026-11-11 audit habit |
| F2 | Fixed-camera screenshots of both curated sites and one import, before and after, at 1440 × 900 | M | `npm run capture`; required by the definition of done. **Done** (`docs/screenshots/context-*.png`: both curated sites in 3D and plan, a drawn mass in context, and Grünerløkka and Kampen imported live) |
| F3 | Visual gate with `design-ui-finish-gate-reviewer` against the design contract | S | The look pass must not break the white-model language. **Self-review recorded** (`docs/reviews/context-fidelity-visual-gate.md`); the reviewer pass is still open |
| F4 | Measure fps and draw calls with the larger context and the new canopy | S | Budget from the M1 baseline (60.1 fps at 1440 × 900). **Done**: 90.2 fps GPU at 1440 × 900; the density also cost the noise screening a second (fixed with a building index) |

---

## 3. Owner decisions

These change the outcome and are not mine to take.

| # | Decision | Recommendation |
|---|---|---|
| D1 | May Oslo's municipal tree inventory be baked into a shipped package? | **Answered: no need.** OSM carries the city's own tree references for this area, so the positions come from ODbL data. The licence question only returns if measured tree sizes are wanted (A3/A4) |
| D2 | Widen the curated context beyond the study area? | **Done: 200 m.** It is the difference between a model of a parcel and a model of a place. Cost: 112.5 → 90.2 fps on the GPU (ADR-0023) |
| D3 | Pursue Kartverket FKB-Bygning under a "Norge digitalt" agreement for authoritative building parts? | **Not for v1.** It is a licensing and procurement project, not a sprint. Keep as an M6/ADR candidate |
| D4 | Is a wider, denser scene worth the frame cost at import time? | Measure in F4 and decide; the import budget is 3 × 3 tiles at z14 today |

---

## 4. What this work order changed, in numbers

| | Before | After |
|---|---|---|
| Compact Infill context buildings | 137 | 520 |
| Compact Infill trees | 128 | 926 |
| Compact Infill land-cover areas | 10 | 58 (ten kinds) |
| Compact Infill terrain grid | 13 × 13 | 40 × 47 |
| Sloped Edge context buildings | 33 | 230 |
| Sloped Edge trees | 122 | 251 |
| Sloped Edge land-cover areas | 2 | 24 |
| Roof-solar analysis scope | every roof in the scene | the site (context still casts shadows) |
| GPU frame rate, 1440 × 900 @1× | 112.5 fps | 90.2 fps |
| Noise screening pass (456 cells × 627 road pieces × 520 buildings) | 1021 ms | 145 ms |
| Undo click in the studio (headless software rendering) | 4976 ms | 1774 ms |

The last two rows are the price of the density, and the fix for it: the road-noise screening was a
linear scan over every context building, for every cell and every street. A uniform-grid building
index (`indexBuildings` in `src/features/analysis/grid.ts`) now returns the same candidate set in a
handful of buildings, so the numbers are unchanged and the studio stays responsive (ADR-0023 §8).

## 5. Out of scope

- Mapbox tiles in the shipped app: their terms do not allow baking tiles into a static bundle, and
  the PRD forbids live GIS in v1.
- Live GIS, cloud basemaps, aerial imagery, photogrammetry, and any AI-generated building massing.
- Any claim that our trees, buildings or boundaries are official or complete. The claim policy in
  AGENTS.md is unchanged: `Curated Oslo demo · simplified context`, `Illustrative design constraints`.
- New runtime dependencies. Everything above uses what is already installed (Overpass is already a
  runtime path for trees; the builder already parses OSM XML).

---

## 6. Risks

| Risk | Mitigation |
|---|---|
| Oslo tree licence blocks redistribution | D1 decides before any work; the fallback keeps the current OSM + illustrative path and we drop the "real canopy" claim |
| Bigger packages slow first paint | Measure package size and load in F4; keep the halo modest (≈150 m) and the terrain grid at 25 × 25 |
| Tree shadows change the sun claims | Update ADR-0021 and the panel note in the same change; keep canopy shading labelled as illustrative |
| The look pass drifts from the white-model language | F3 visual gate against the design contract |
| More buildings in the sun study change published numbers | Re-run the sun fixtures and update any figure quoted in the case study |

---

## 7. Definition of done

- [ ] Both curated packages and one import path show per-building volumes with parts where the data has them.
      *(The curated packages now show individual buildings — 520 and 230 — but building **parts** are
      still missing: the builder reads building ways only, and the import path is capped at z14. See
      Phase B.)*
- [ ] The Compact Infill package holds measured trees with crown sizes, and the inspector names the source and capture date.
      *(Deferred by owner request: the tree objects stay as they are, so placement and vegetation only.)*
- [ ] Trees cast shadows; the sun notes state that canopy shading is illustrative.
- [x] Attribution files, the site package spec, ADR-0023, the case study and `About#data` agree with the shipped data.
- [x] `npm run lint`, `npm run test`, `npm run build` pass; the builder self-check passes.
- [x] Fixed-camera screenshots for both sites plus one import, and a visual gate record.
      (`docs/screenshots/context-*.png` — both curated sites in 3D and plan, a drawn mass in context, and
      two live imports; the visual gate record is `docs/reviews/context-fidelity-visual-gate.md`,
      self-reviewed, with the design gate reviewer still to pass it.)
- [x] No new dependency, no live GIS, no fabricated data.
