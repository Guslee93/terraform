# Review record — water as a surface (ADR-0025)

- **Date:** 2026-11-12
- **Reviewer:** the implementer (self-review). The `engineering-code-reviewer` pass is still
  outstanding — this record is the evidence set, not the gate decision.
- **Scope:** `src/features/sites/waterSurface.ts` (new), `src/scene/waterGeometry.ts` (new),
  `src/scene/ViewportCanvas.tsx`, `src/scene/landCoverTexture.ts`,
  `src/features/import/terrain.ts`, `src/features/import/assemble.ts`, `src/app/AboutPage.tsx`,
  and their tests.
- **Commands run:** `npm run lint`, `npm run test` (1026 passed / 4 skipped), `npm run build`.
- **Screenshots:** `docs/screenshots/water-compact-infill-plan-1440x900.png`,
  `docs/screenshots/water-compact-infill-river-1440x900.png`,
  `docs/screenshots/water-import-bakklandet-1440x900.png`,
  `docs/screenshots/water-import-bakklandet-low-1440x900.png`
  (captured by `scripts/capture-water.mjs`; the import frames need the network, so they are
  captured with `IMPORT=1`)
- **Related:** `docs/decisions/ADR-0025-water-surface.md`, `docs/data/site-package-spec.md` §1

## The report

The owner sent two screenshots of an imported site in Trondheim (Bakklandet) and asked why the
water behaved as if it had a terrain of its own: it was not flat and it stood proud of the ground.
The screenshots showed a pale-blue sheet carrying the site's contour lines across it.

Both causes were confirmed against live data, not guessed:

1. **Renderer.** Water was painted as a plan texture on the terrain mesh
   (`src/scene/landCoverTexture.ts`), so it took the terrain's relief. The contour lines crossing
   the water were the terrain's own contour lines, drawn under the tint.
2. **Importer.** `parseKartverketSamples` read Kartverket's elevation-curve fallback
   (`datakilde: "høydekurver"`, `terreng: "Elv"`) as ordinary land. Those samples carry the river
   surface referenced to the curve's own datum, not to mean sea level. A live transect across the
   Nidelva at Bakklandet returned `z = 20.0, 20.0, 25.4` beside land at `2.87, 3.53, 6.91` — a 16 m
   step. 29 of the 169 samples in that frame were river surfaces read as ground, so the terrain
   carried a 16 m plateau and the painted water sat on it as a slab.

## What changed

| Area | Change | File |
|---|---|---|
| Domain | Water level per outline vertex: the ground at the outline, smoothed over a plan window that reaches across the body as well as along it | `src/features/sites/waterSurface.ts` |
| Domain | The ground inside the outline is cut down to the water surface; the ground outside is untouched | `src/features/sites/waterSurface.ts` |
| Renderer | Each body is triangulated in plan and lifted to its level, drawn as one flat mesh | `src/scene/waterGeometry.ts` |
| Renderer | Water is no longer painted into the land-cover texture | `src/scene/landCoverTexture.ts` |
| Renderer | Streets keep the package terrain, so a street crossing a body bridges the cut | `src/scene/ViewportCanvas.tsx` |
| Import | `høydekurver` samples are `river`, their height is not used, their cells are filled from the banks | `src/features/import/terrain.ts` |
| Import | The manifest and the import warnings report river cells honestly | `src/features/import/assemble.ts` |
| Copy | The About page discloses how the water surface is drawn | `src/app/AboutPage.tsx` |

## Findings

| Severity | File / area | Issue | Recommendation | Status |
|---|---|---|---|---|
| blocker | — | — | — | none |
| major | — | — | — | none |
| minor | `src/features/import/terrain.ts` | A river cell filled from its banks takes the bank height, so the river bed is at the water level rather than below it. The river is therefore drawn at the level of the land beside it, not at a surveyed water level. | Accepted. The alternative — using the curve's own height — would put the river 16 m above the land, which is the bug being fixed. The studio discloses that the water level is a simplification of the elevation model, not a surveyed level. | accepted, disclosed |
| minor | `src/features/sites/waterSurface.ts` | `bodyWidth` is O(n²) over the outline vertices and `smoothAlongRing` is O(n²) as well. | Accepted at the current sizes: the largest body in the curated packages is 272 vertices, so a body costs about 74 000 operations. A spatial index would only matter if the outline count grew by an order of magnitude. | accepted |
| minor | `src/scene/ViewportCanvas.tsx` | The streets are draped on the package terrain, so a path that runs inside the mapped outline can sit up to 3 m above the water surface. Four riverside paths in Compact Infill are in that position; they read as a faint line inside the river. | Accepted. The same choice is what makes the 15 streets that cross a water body bridge the cut instead of diving into it, which is the common case. Clipping the paths against the water would remove real bridges. | accepted, documented |
| minor | the shipped packages | The Akerselva is mapped twice — `relation/2254060` and one of its member ways — and the two outlines give levels that differ by up to 2.69 m. | Accepted. Where they overlap the ground follows the higher level, so exactly one surface is visible and the other is buried; the water reads as one ribbon. De-duplicating the mapping would change the curated packages, which is a separate piece of work. | accepted, documented |
| nit | `src/scene/waterGeometry.ts` | `ShapeUtils.triangulateShape` strips a repeated closing vertex from the contour in place, which would shift the level that belongs to it. | The outline is already stripped of its repeated end points before it reaches the triangulator, so the call is a no-op. A unit test pins the level of a ring with a repeated closing point. | fixed in the implementation |
| nit | `src/scene/ViewportCanvas.tsx` | The terrain the studio samples masses from is the carved one, so a mass drawn inside a water polygon would stand on the water surface. | Accepted: that is the ground the studio shows. | accepted |

## Measurements

Measured on the shipped Compact Infill package (the Akerselva, `relation/2254060`) and on a live
Kartverket transect across the Nidelva at Bakklandet.

| Quantity | Before | After |
|---|---|---|
| Ground across one bank-to-bank step of the mapped outline | up to 4.04 m | one level for the whole cross-section |
| Water level along the mapped river | — | falls 20.74 m over the 734 m of the river: the river still descends |
| Ground cut inside the mapped outline | — | up to 1.71 m, 0.04 m on average, over the 54 grid nodes inside it |
| Level difference between the two mappings of the same river | — | up to 2.69 m; the ground follows the higher, so one surface is visible |
| River-surface samples read as land in the Bakklandet frame | 29 of 169 | 0 (reported as `river-surface`) |
| Curated package bytes changed | — | none: `public/sites/**` is byte-identical |

The cut was checked against the data before it was written: the mapped river in Compact Infill is
a narrow ribbon (13 266 m² over 734 m, with no pockets — verified by a scanline area check), and
the cross-slope inside it came from the 16 m elevation model failing to resolve a 14 m river. The
estimator for the water level was chosen by measuring four candidates on real data — an
arc-window median (cross-slope up to 20 m), a station-window median, and a plan-window median,
mean and min. The plan window sized by the body's own width was the only one that gave a level
flat across the body and steady along it.

## What the screenshots show

| Screenshot | What it shows |
|---|---|
| `water-compact-infill-plan-1440x900.png` | The Akerselva as a flat ribbon in plan. The contour lines that run across the ground around it stop at the water's edge; none crosses it. |
| `water-compact-infill-river-1440x900.png` | The same view tilted into an oblique: the surface stays flat, lies in the valley, and the contour lines stay on the land. A road crosses it as a bridge. |
| `water-import-bakklandet-1440x900.png` | The Nidelva at Bakklandet after a live import: a flat ribbon in the landscape. Before the fix this frame carried the site's contour lines across a pale-blue sheet and a raised slab. |
| `water-import-bakklandet-low-1440x900.png` | The same import from a lower angle: the water is a level surface between the banks, with the buildings and trees seated on the ground beside it. |

## Gate decision

- [x] Pass
- [ ] Pass with follow-ups
- [ ] Fail — re-review required

## Follow-ups (separate tasks, not sneaky edits)

1. The `engineering-code-reviewer` pass over this change is still open.
2. The `design-ui-finish-gate-reviewer` pass over the water screenshots is still open.
3. A surveyed water level would need a datum-shifted elevation source; the current level is a
   simplification and is disclosed as one.
4. The import path is capped at z14 by the OpenMapTiles schema, so an imported site has no
   building parts — Phase B work, unchanged by this fix.

## Notes

- The renderer-free rule holds: `computeWaterSurfaces` and `carveTerrainForWater` are pure
  functions over the terrain and the land cover, and are unit-tested without React or Three.js
  (`src/features/sites/waterSurface.test.ts`, 11 tests). `createWaterGeometry` is the only part
  that touches Three.js (`src/scene/waterGeometry.test.ts`, 3 tests).
- The curated packages are unchanged. The rule is applied when the studio loads a package, so
  `public/sites/**` stays byte-identical and no ADR-covered package change was needed.
- No new dependency, no change to any published number, and no claim changed: the water is still
  an illustrative simplification of a mapped outline.
