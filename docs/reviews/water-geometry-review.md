# Review record — the water's geometry on the import path (ADR-0027)

- **Date:** 2026-11-13
- **Reviewer:** the implementer (self-review). The `engineering-code-reviewer` pass is still
  outstanding — this record is the evidence set, not the gate decision.
- **Scope:** `src/features/import/osm.ts` (new), `src/features/import/water.ts` (new),
  `src/features/import/trees.ts`, `src/features/import/terrain.ts`,
  `src/features/import/context.ts`, `src/features/import/assemble.ts`,
  `src/app/NewSitePage.tsx`, `src/features/import/store.ts`, and their tests.
- **Commands run:** `npm run lint`, `npm run test` (1044 passed / 4 skipped), `npm run build`.
- **Screenshots:** `docs/screenshots/water-import-bakklandet-1440x900.png`,
  `docs/screenshots/water-import-bakklandet-low-1440x900.png`,
  `docs/screenshots/water-compact-infill-plan-1440x900.png`,
  `docs/screenshots/water-compact-infill-river-1440x900.png`
  (captured by `scripts/capture-water.mjs`; the import frames need the network, so they are
  captured with `IMPORT=1`)
- **Related:** `docs/decisions/ADR-0027-osm-water-geometry.md`, `docs/data/site-package-spec.md` §1

## The report

The owner sent a screenshot of an imported site in Trondheim (Bakklandet) and wrote that the water
was still wrong: *"the geometry of water is completely wrong"* — a large pale-blue sheet rather
than a river channel. ADR-0025 had made the water a flat surface that lies in the ground and had
been deployed; the sheet was its result.

Three defects were found, all confirmed against live data rather than guessed.

1. **The rule ADR-0025 introduced never ran.** It classifies a river by the source name
   `høydekurver`; the answers spell it `hoydekurver`. So no sample was ever a river, and the 29
   river surfaces in the frame kept their curve heights (16–26 m) as ground: a 16–20 m wall along
   the river. The water was drawn on that wall and cut back to the plain's level — the sheet. The
   unit test that covered the rule used the same wrong spelling, so it passed.
2. **The tile outline is not the mapped outline.** At z14 the water is generalised to the tile
   grid, with stair-stepped edges, and the river's centre line is drawn again as a ribbon on top
   of the same water: 35 273 m² against the mapped 31 026 m², of which 4 131 m² is the duplicate.
3. **The trees came from an endpoint that was down.** Overpass answered 502, 429 and "fetch
   failed", so the import fell back to illustrative trees.

## What changed

| Area | Change | File |
|---|---|---|
| Domain | A river is recognised by `terreng: "Elv"` or by either spelling of the elevation-curve source; its height is not ground | `src/features/import/terrain.ts` |
| Domain | The frame's OpenStreetMap answer is parsed once: nodes, ways, relations and their tags | `src/features/import/osm.ts` (new) |
| Domain | The water of the answer: closed ways that map a surface, relations that map a body, centre lines of the watercourses | `src/features/import/water.ts` (new) |
| Domain | The mapped trees of the same answer: `natural=tree` nodes and `natural=tree_row` ways | `src/features/import/trees.ts` |
| Import | One request per frame for the water and the trees; the tile outline is the fallback, with the `water-coarse` warning | `src/features/import/assemble.ts` |
| Import | The tiles' water moves out of the land cover and into the fallback path | `src/features/import/context.ts` |
| Import | A rate-limited answer is repeated once after a pause | `src/features/import/osm.ts` |
| App | The import asks for the OpenStreetMap answer instead of Overpass | `src/app/NewSitePage.tsx` |

## Findings

| Severity | File / area | Issue | Recommendation | Status |
|---|---|---|---|---|
| blocker | — | — | — | none |
| major | — | — | — | none |
| minor | `src/features/import/terrain.ts` | The rule now also matches the terrain type `Elv`, which is a broader signal than the source name. | Accepted: the source name is the one Kartverket spells inconsistently, and `Elv` is the type it assigns to a river. A cell that is both `Havflate` and `Elv` is treated as sea, which is the safer reading. | accepted |
| minor | `src/features/import/water.ts` | Two traces of the same river can both be mapped (at Bakklandet, one from a Landsat trace and one from a Bing trace). Where they overlap the ground follows the higher level, so one surface is visible and the other is buried. | Accepted. The same effect exists in the curated packages (ADR-0025 §consequences). De-duplicating the mapping would need a rule about which trace to trust, which the data does not carry. | accepted, documented |
| minor | `src/features/import/osm.ts` | The API rate-limits a burst with HTTP 429, and a scripted capture can trip it. | One request is repeated after a 2 s pause; a second failure falls back to the tiles with the `water-coarse` warning, which names the reason. | fixed in the implementation |
| minor | the frame's extent | The API's `/map` endpoint refuses a bbox that holds too many nodes. | Accepted for now: the import frame is 400 m, and the measured answer for a dense frame is 1 926 nodes and 497 kB. A 600 m frame in the densest part of a city could reach the limit, and then the tiles take over and the import says so. | accepted, disclosed |
| nit | `src/features/import/trees.ts` | The Overpass source is gone, so the tree source no longer has its own request. | Accepted: one request per frame now answers for the water and the trees, and the endpoint that was failing is no longer called. The removed code was 80 lines with six tests of its own. | accepted |
| nit | `src/features/import/store.ts` | The import can emit a `terrain-river` warning, and the persisted-site reader has to accept it. | Accepted: the warning-code list is now an exhaustive map over the union, so a new code fails to compile until it is listed. | already in the tree |

## Measurements

Measured on a live import of the 400 m Bakklandet frame (63.428 N, 10.4029 E) and on the
OpenStreetMap answer for the same box.

| Quantity | Before | After |
|---|---|---|
| River-surface samples read as land | 0 of 169 (the rule never ran) | 29 of 169, reported as `river-surface` |
| Ground along the river (relative to the frame origin) | 16.1 m to 25.8 m | −4.2 m to 3.5 m, beside land at 3.5 m to 8.2 m |
| Water in the frame | 35 273 m² (tile outline) | 31 026 m² (mapped outline) |
| The river's centre line drawn again | 4 131 m² of ribbon | not drawn: it runs inside the mapped area |
| Water level (relative to the frame origin) | on the wall, at 16–22 m | −2.45 m to 0.23 m |
| Ground cut inside the mapped outline | — | 2.9 m to 5.2 m: a 4–5 m channel |
| Mapped trees in the frame | 0 (Overpass failed) | 12, placed as mapped positions |
| OpenStreetMap answer for the frame | — | HTTP 200 in 0.47 s, 497 524 bytes, 1 926 nodes, 122 ways, 17 relations |
| Curated package bytes changed | — | none: `public/sites/**` is byte-identical |

The mapped outline was checked against OpenStreetMap's own map tiles for the same box: the blue
band measures 58–61 m of river in the northern half of the frame and 78–106 m in the southern
half, which is the width the mapped polygons carry. The tiles' water polygons have the same area
but stair-stepped edges, and the tile waterway layer adds the centre line a second time.

## What the screenshots show

| Screenshot | What it shows |
|---|---|
| `water-import-bakklandet-1440x900.png` | The Nidelva at Bakklandet after a live import: a meandering channel between its banks, following the mapped outline. Before the fix the same frame carried a pale-blue sheet with a straight-edged notch and a narrow spike at the foot of the frame. |
| `water-import-bakklandet-low-1440x900.png` | The same import from a lower angle: the ground rises on both sides of the water, and the river lies in the cut instead of on a wall. |
| `water-compact-infill-plan-1440x900.png` | The curated Akerselva in plan: unchanged, because the curated packages are not touched by this fix. |
| `water-compact-infill-river-1440x900.png` | The same curated site in an oblique: unchanged. |

## Gate decision

- [x] Pass
- [ ] Pass with follow-ups
- [ ] Fail — re-review required

## Follow-ups (separate tasks, not sneaky edits)

1. The `engineering-code-reviewer` pass over this change is still open.
2. The `design-ui-finish-gate-reviewer` pass over the import screenshots is still open.
3. The water level remains a simplification of the elevation model, not a surveyed level; the About
   page says so.
4. The import path is still capped at z14 by the OpenMapTiles schema, so an imported site has no
   building parts — Phase B work, unchanged by this fix.

## Notes

- The renderer-free rule holds: the OpenStreetMap reader, the water areas and the mapped trees are
  pure functions over the answer and the frame, unit-tested without React or Three.js
  (`src/features/import/osm.test.ts`, 5 tests; `water.test.ts`, 6; `trees.test.ts`, 7).
- The import path no longer calls Overpass. The frame's water and its mapped trees come from one
  OpenStreetMap answer, credited in the manifest as `OpenStreetMap API`.
- No new dependency, no change to any published number, and no claim changed: the water is still
  an illustrative simplification of a mapped outline.
