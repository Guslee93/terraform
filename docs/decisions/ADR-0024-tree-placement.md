# ADR-0024 — A tree stands on ground: no tree inside painted water

- **Status:** Accepted (2026-11-12)
- **Relates to:** ADR-0023 (city context), ADR-0005 (scene look), ADR-0006 (site import)

## Context

A screenshot of an imported site showed a large lake covered by trees: a regular grid of canopies
standing on the water in the middle of a park. It reads as broken, and it is.

The cause is in the data, not the renderer. The studio paints water as a **plan texture on the
terrain mesh** (`src/scene/landCoverTexture.ts`): every land-cover polygon of kind `water` is
filled on a 2048 px canvas and multiplied over the terrain. There is no separate water surface, so
a tree that stands on painted water is exactly a tree whose plan position falls inside a water
polygon.

Two different defects put trees there.

1. **The import path fills a land polygon with a grid.** `illustrativeTrees` lays a jittered grid
   of trees inside every mapped park, wood, garden and cemetery polygon. The tile's park polygon
   and the tile's water polygon are simplified **independently**, so their edges do not agree: a
   park that runs into a lake keeps its ground over the water, and the grid follows it. The
   recorded Oslo Bjørvika fixture shows this directly — the park polygon `landcover-5456992072`
   has **3 of its 12 vertices inside a water area**.
2. **The grid was laid on the raw clipped ring**, while the painted ground came from the *repaired*
   ring (`repairRing` in `src/features/import/geometry.ts`). Where the two differ, the canopy
   stands on a colour the studio never paints.

The curated path has the same rule but different numbers: 9 of the 935 mapped trees in Compact
Infill fell inside a water polygon — a `natural=tree_row` way that reached into the river.

## Decision

1. **A tree stands on ground.** A tree may not stand where the studio paints water. The rule is
   one function, `dropTreesOnWater` in `src/features/sites/treePlacement.ts`, applied on **both**
   data paths and in the **renderer**.
2. **The tree grid is laid on the repaired ring**, the same ring the ground is painted from, so a
   canopy always stands on the green it was placed for.
3. **The rule is applied where the data is made**, not only at draw time:
   - the import path applies it to both mapped and illustrative trees before the package is
     assembled (`src/features/import/assemble.ts`);
   - the curated builder applies it to the mapped trees before `trees.json` is written
     (`scripts/build_site_packages.py`), and the packages are rebuilt.
4. **The renderer applies it as well** (`src/scene/Trees.tsx`). An import already saved in the
   browser keeps the trees it was imported with, so a data-only fix would leave the user's saved
   site broken until it was re-imported — which needs a network round trip.
5. **Dropping the tree is the fix; moving it would not be.** There is no data that says where a
   tree on water should instead stand. Inventing a position would be a worse lie than an absent
   tree, and the studio already states where its trees come from.

Only water is excluded. A tree inside a building footprint is already excluded by the import path
(`placeTrees`), and street trees are real: OSM maps the trees along a kerb, and they are not
removed.

## Consequences

- Compact Infill: 935 → **926** mapped trees; 9 dropped for standing on water. Sloped Edge: 251
  trees, unchanged — none stood on water.
- A park that overlaps a lake keeps its canopy around the lake, and the lake is clear.
- The rule is renderer-free and testable without React or Three.js
  (`src/features/sites/treePlacement.test.ts`), and the shipped packages are covered by a
  regression test that fails if any tree returns to the water.
- The curated packages are no longer byte-identical to the previous build; the builder still
  rebuilds them deterministically offline.
- A tree exactly on the polygon's edge is treated as outside, because the shared ray-casting
  helper (`pointInPolygon` in `src/lib/polygon.ts`) reports an on-edge point as outside. The
  painted texture resolves a pixel of the edge, so the visual difference is under 0.4 m.

## Alternatives rejected

- **Clip the water polygons out of the park polygons** — would change the painted ground, and the
  park is a mapped feature; the tree is the thing that cannot stand there.
- **Move the tree to the nearest land** — invents a position the data does not have, and the
  canopy would pile up on the shore.
- **Draw the trees under the water** — the water is a texture with no depth, so the tree would
  still be visible through it.
- **Remove the park polygons that overlap water** — loses the park, and the overlap is a
  simplification artefact, not a real conflict.
