# ADR-0027 — The import reads the water and the trees from OpenStreetMap's own geometry

- **Status:** Accepted (2026-11-13)
- **Relates to:** ADR-0025 (water as a surface), ADR-0024 (tree placement), ADR-0006 (site import), ADR-0002 (coordinate model)
- **Corrects:** ADR-0025 §4 — the river classification it introduced never ran (see below)

## Context

On 2026-11-13 the owner reported that the water of an imported site was still wrong: *"the geometry
of water is completely wrong"* — a large pale-blue sheet rather than a river channel. ADR-0025 had
already made the water a flat surface that lies in the ground, and it had been deployed; the sheet
in the screenshot was its result.

Three separate defects were behind it, all measured against live data.

### 1. A river was never recognised as a river, so the ground carried a 20 m wall

Where Kartverket's DTM1 has no data — over a river — the elevation service falls back to
*elevation curves*. The rule ADR-0025 introduced was to treat those samples as water and take the
ground under them from the banks. The rule never ran, because of a **spelling**:

- Kartverket's own name for the source is `høydekurver` (with `ø`), and that is the name its
  `/datakilder` endpoint lists and its `/datakilder/{id}/punkt` endpoint expects.
- The **answers** spell it `hoydekurver` (ASCII). Every answer measured — at the Nidelva, on the
  `hoydedata/v1/punkt` endpoint the importer uses — carries `"datakilde": "hoydekurver"`.

`parseKartverketSamples` compared against `'høydekurver'`, so **no sample was ever classified as a
river**, and the 29 river surfaces in the 400 m Bakklandet frame kept their curve heights as
ground. The terrain grid carried the river's curve heights — 16.1 m to 25.8 m relative to the
frame's origin — along the whole channel, beside land at 1.3 m to 8.2 m: **a 16–20 m wall along
the river**. The water was then drawn on top of that wall and the carve cut it back down to the
plain's level, which is the pale sheet in the screenshot: a flat blue plane at the level of the
surrounding plain, with the shape of the wall's outline.

The unit test that covered the rule used the same wrong spelling, so it passed.

### 2. The tile outline is not the mapped outline

The water in the tiles is generalised to the tile grid. Measured in the Bakklandet frame:

| | tiles (z14) | OpenStreetMap |
|---|---|---|
| water in the frame | 35 273 m² | 31 026 m² |
| edges | stair-stepped along the tile grid | the mapped meander |
| the river's centre line | drawn again as a ribbon, +4 131 m² | inside the mapped area, not drawn twice |

The duplicate is the tile's `waterway` layer: the Nidelva's centre line is drawn as a ribbon on top
of the area that already carries the same water, which is where the narrow protrusions in the
screenshot came from.

OpenStreetMap's own rendering of the same data confirms which outline is right: measuring the blue
band in the OSM map tiles at 1440 × 900 gives 58–61 m of river in the northern half of the frame
and 78–106 m in the southern half — the widths the mapped polygons carry.

### 3. The mapped trees came from an endpoint that was down

The tree step queried the public Overpass instances. At the time of the owner's import they
answered `HTTP 502`, `HTTP 429` and `fetch failed`, so the import fell back to illustrative trees
and said so: *"Trees are illustrative, not mapped positions"*.

## Decision

1. **A river is recognised by its terrain type.** `parseKartverketSamples` classifies a sample as
   `river` when the answer says `terreng: "Elv"` or when the source is an elevation curve under
   either spelling (`høydekurver`, `hoydekurver`). The height of a curve is still not used as
   ground; the cell is filled from the banks and reported as `river-surface`. The sea is unchanged.
2. **The import reads the frame's water from OpenStreetMap's own geometry**, from one request per
   frame: `api.openstreetmap.org/api/0.6/map?bbox=…` returns every node, way and relation in the
   box, and the closed ways that map a water surface, the relations that map a wider body and the
   centre lines of the watercourses that have no area are read from it (`src/features/import/osm.ts`,
   `src/features/import/water.ts`). A watercourse that runs inside a mapped area is the same water
   seen from its centre line, so the area is drawn and the line is not.
3. **The same answer carries the mapped trees**, so the Overpass dependency is removed: a tree is a
   `natural=tree` node and a tree row is a `natural=tree_row` way (`src/features/import/trees.ts`).
   One request per frame now answers for the water and the trees.
4. **The generalised tile outline is the fallback**, with the `water-coarse` warning that says the
   shape is approximate. The import never fails because a source was unavailable.
5. **A rate-limited answer is repeated once** after a short pause. The API answers a burst with
   HTTP 429; a second failure is reported and the fallback takes over.

## Consequences

- The Bakklandet import now reports **29 of 169 river-surface samples** where it reported none, and
  the terrain along the river is the ground from the banks: the river's columns fall from 16–22 m
  to −4.2 m to 3.5 m relative to the origin, beside land at 3.5 m to 8.2 m.
- The water lies in the ground: its level is −2.45 m to 0.23 m relative to the origin (0.5 m to
  4.2 m above NN2000), the banks stand 3.5 m to 8.2 m above the same origin, and the cut inside the
  mapped outline removes 2.9 m to 5.2 m of ground. The channel is 4–5 m deep in the terrain.
- The water's **shape** is the mapped one: the meander of the Nidelva, with the centre line no
  longer drawn on top of it. In the frame the studio draws 31 026 m² of mapped water against
  35 273 m² of tile water.
- The 12 mapped trees in the Bakklandet frame are placed as mapped positions. The frame has no
  mapped tree rows, so none is invented.
- The import makes one request to OpenStreetMap per import, to an endpoint that asks for at most
  one request a second per client, and it is repeated once if the API rate-limits it.
- The **curated packages are unchanged**: the rule is applied when the studio loads a package, so
  `public/sites/**` stays byte-identical. The Compact Infill package has no elevation-curve cells
  in its recorded samples, so nothing in it depended on the broken spelling.
- The import reports the river in its manifest and warnings, so a frame with a river in it says so
  instead of quietly carrying a false plateau.

## Alternatives rejected

- **Read the curve's heights as the river's surface.** The curve's height is referenced to the
  curve's own datum: a live transect along the Nidelva returns 20.0 m beside land at 2.6–9.7 m, and
  the values are constant along a reach (20.0 m repeated), so they carry neither the level nor the
  slope of the river. Kartverket's DTM1 holds no data over the river ("only land areas"), so there
  is no other ground under it to measure. The bed is not modelled, and the studio says so.
- **Keep the tile outline.** It is the same data generalised to the tile grid, with stair-stepped
  edges and the centre line drawn twice. The mapped geometry is one request away.
- **Query Overpass for the water as well.** The public instances were unreachable or took 75 s
  cold, against an import budget of 15 s, and they were the source of the tree failure in the
  first place.
- **Ask for a higher tile zoom.** The OpenFreeMap planet tiles stop at z14; z15 and above decode to
  zero features.
- **Rebuild the curated packages with the corrected terrain.** The curated packages carry no
  elevation-curve samples, so there is nothing to rebuild, and the packages stay immutable.
