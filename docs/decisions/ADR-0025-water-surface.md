# ADR-0025 — Water is a surface, not a tint on the terrain

- **Status:** Accepted (2026-11-12)
- **Relates to:** ADR-0005 (scene look §5a), ADR-0024 (tree placement), ADR-0023 (city context), ADR-0006 (site import)

## Context

A report on the studio showed water behaving as if it had a terrain of its own: the surface was
not flat, it bulged, and it stood proud of the ground it was supposed to lie in. Two screenshots
of an imported site in Trondheim (Bakklandet) show the defect: a pale-blue sheet carrying the
site's contour lines across it, and a wide body whose surface domed up out of the landscape.

The cause is in how water is drawn. The studio paints water as a **plan texture on the terrain
mesh** (`src/scene/landCoverTexture.ts`): every land-cover polygon of kind `water` is filled on
a 2048 px canvas and multiplied over the terrain, whose UVs carry the plan. A tint on the terrain
takes the terrain's relief, so the water was exactly as lumpy as the ground under it, and a
polygon that ran up a hillside was painted up the hillside too. The contour lines that cross the
water in the screenshots are the terrain's own contour lines, drawn on the terrain mesh under the
tint.

Two data problems make it worse.

1. **The elevation model is coarser than the water it carries.** The curated packages sample
   Kartverket DTM1 on a 16 m grid. The Akerselva in Compact Infill is a mapped ribbon about 14 m
   wide, so most grid nodes miss the channel and land on the valley wall instead. The ground
   under the mapped river is therefore a blend of channel and wall, and the tint took that blend.
   Measured on the shipped package: the ground across one bank-to-bank step of the mapped outline
   differs by up to **4.04 m** (0.41 m on average), so a tint of that ground was never flat
   across the river.
2. **On the import path, a river surface was read as ground.** Where DTM1 does not exist,
   Kartverket's `punkt` service falls back to *elevation curves* (`høydekurver`). A sample with
   `terreng: "Elv"` carries the height of the river surface, but referenced to the **curve's own
   datum**, not to mean sea level. A live transect across the Nidelva at Bakklandet returns
   `20.0`, `20.0` and `25.4` m beside land at `2.87`, `3.53` and `6.91` m — a 16 m step that is a
   datum artefact, not a hill. `parseKartverketSamples` treated those samples as ordinary land
   measurements, so the terrain grid carried a 16 m plateau along the river: 29 of the 169
   samples in that frame were river surfaces read as ground. The painted water then sat on that
   plateau as a slab.

## Decision

1. **Water is drawn as its own surface.** `src/scene/waterGeometry.ts` triangulates each mapped
   water body in plan and lifts it to its water level, and the studio renders it as one flat mesh.
   The land-cover texture no longer paints water: a tint cannot be flat.
2. **The water level is the ground at the outline, smoothed along the outline**
   (`src/features/sites/waterSurface.ts`, `computeWaterSurfaces`). The smoothing window is a disc
   in plan that reaches across the body as well as along it, so the two banks of a cross-section
   are averaged together and the surface is flat across the water. It follows the ground along the
   body, because a river descends and a pond does not.
3. **The ground inside the body is cut down to the water surface**
   (`carveTerrainForWater`). The cut removes what the coarse model left between the channel and
   the bank inside the mapped outline, so the water lies *in* the ground instead of on top of it.
   It stops at the outline: the ground outside is untouched, so the buildings and roads that stand
   next to the water keep the ground they were seated on.
4. **A river surface from an elevation curve is water, not ground.** `parseKartverketSamples`
   classifies `høydekurver` samples as `river`; `buildTerrainGrid` fills those cells from the
   banks and reports them as `river-surface`. The curve's height is not used, because it is not a
   height above mean sea level. The sea is unchanged: `Havflate` and `dybdekurver` still model a
   0 m water surface.
5. **Both rules are renderer-free.** The levels and the cut are pure functions over the terrain
   and the land cover, unit-tested without React or Three.js.

## Consequences

- The water is flat and lies in the landscape on both data paths. The bulge, the protruding slab
  and the contour lines running across the water are gone.
- The surface follows the mapped outline. It is a simplification of the water, not a survey of
  the river bed: where the ground inside the outline stands above the water level, that ground is
  dry and the water is narrower than the mapped polygon. The studio says the water is
  simplified.
- The river is narrower than it was drawn before, because the painted version covered the whole
  polygon including the valley wall the DEM had blended into it.
- The cut inside the outline is at most a few metres: on the shipped Akerselva it removes up to
  1.71 m (0.04 m on average) and leaves the ground outside the outline alone.
- The water level is an estimate, not a measurement. The Akerselva is mapped twice — a relation
  and one of its member ways — and the two outlines do not agree on the level: they differ by up
  to 2.69 m. Where they overlap, the ground follows the higher of the two, so one surface is
  visible and the other is buried. The estimate is honest about being an estimate; the About page
  says so.
- The streets keep the ground the package was built on, so a street that crosses a water body
  bridges the cut instead of diving into it. A path that runs *inside* the mapped outline keeps
  the package ground too, so it can sit up to about 3 m above the water surface where the two
  disagree. Four riverside paths in the Compact Infill package are in that position.
- The import path reports river cells in the manifest (`river-surface` samples) and in the import
  warnings, so a frame with a river in it says so instead of quietly carrying a false plateau.
- The curated packages are **unchanged**: the rule is applied when the studio loads a package, so
  `public/sites/**` stays byte-identical.

## Alternatives rejected

- **Flatten the terrain under the water polygons at build time** — would change the curated
  packages, and the same rule would then have to be re-implemented for the import path, with two
  implementations of one rule.
- **Use a separate elevation source for the water** — Kartverket's river-surface curves are
  referenced to their own datum, so they cannot be used as heights without a datum shift that the
  data does not carry.
- **Keep water as a tint and remove the terrain's relief under it** — the tint has no depth of its
  own, so it can only be hidden by changing the terrain everywhere the polygon touches it, which
  is the cut this decision already makes.
- **Draw the water as a single horizontal plane per body** — a river that descends 20 m over
  700 m would be a 20 m step between its ends.
