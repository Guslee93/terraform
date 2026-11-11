# Hektar underlay — what they actually load, and what Norway can match

**Date:** 2026-11-11
**Author:** research pass for the context-fidelity work order (`docs/plans/context-fidelity-plan.md`)
**Method:** read-only inspection of Hektar's public web bundle and Mapbox style documents, plus live
queries against Norwegian open-data services and a measurement of our own cached extract.
**Not used:** the signed-in project view. `app.hektar.ai/project/…` redirects to `/login`, so no live
session traffic could be observed. Everything below comes from artefacts Hektar ships publicly.

---

## 1. Summary

Hektar is not using a photogrammetry or LiDAR city model. Their underlay is:

| Layer | Source | How we know |
|---|---|---|
| Basemap, roads, water, land cover, land use | **Mapbox composite vector tiles** (`mapbox.mapbox-streets-v8` + `mapbox.mapbox-terrain-v2`) | Style JSON fetched with the token embedded in their bundle |
| Terrain relief | **Mapbox global DEM** (`mapbox.mapbox-terrain-dem-v1`) | Same style JSON |
| 3D building volumes | **Mapbox `building` source layer**, fill-extruded | `building-extrusion` layer in the style, plus Mapbox's own tile spec |
| Context trees | **OpenStreetMap** `natural=tree` / `tree_row`, imported into their backend as first-class objects | User-facing tooltips and their domain model in the bundle |
| Context buildings | **OpenStreetMap** footprints, imported into their backend | Same |
| Terrain and building models in some markets | **Nimbo** (3D building models), **TopoExport** (terrain delivery), **Lantmäteriet** (Swedish cadastral/terrain) | Per-layer attribution strings in their bundle |

The architectural difference is not the renderer. It is **the buildings are extruded per building
*part*, the trees are real objects with a size, and the scene is much wider than a single parcel.**

---

## 2. Evidence

### 2.1 Their bundle

`https://app.hektar.ai/assets/index-66ba9da9.js` embeds a Mapbox public token for the account
`sofmal` and four Mapbox Studio style ids, e.g. `mapbox://styles/sofmal/cm6sfpzox015101r51ho1e6x1`
(the "Monochrome" style).

Fetching that style with the same token returns:

```json
"sources": {
  "composite":   { "url": "mapbox://mapbox.mapbox-streets-v8",   "type": "vector" },
  "composite2":  { "url": "mapbox://mapbox.mapbox-terrain-v2",    "type": "vector" },
  "terrain":     { "url": "mapbox://mapbox.mapbox-terrain-dem-v1","type": "raster-dem" }
}
```

with a `building-extrusion` fill-extrusion layer over `source-layer: "building"`, plus
`landcover`, `landuse`, `water`, `road`/`road-label` and `landstructure` layers.

### 2.2 Why Mapbox buildings look "split into individual buildings"

Mapbox's Streets v8 `building` layer is not a flat footprint set. Per
[Mapbox Streets v8 tileset reference](https://docs.mapbox.com/data/tilesets/reference/mapbox-streets-v8/):

- `height` — metres, often derived from OSM `building:levels` at ~3 m per level.
- `min_height` — base offset for a part that does not start on the ground (penthouses, sky bridges).
- `type` — `building:part` for parts of a building; full footprints are the outlines.
- `building_id` — links each part to its parent building.
- `extrude` — `false` on the outline, `true` on the parts, so the parts alone are extruded.

So the crisp separated volumes with roof boxes in the Hektar screenshot are **per-part extrusions
of one OSM building**, not one box per building. That is the single biggest fidelity difference
between their view and ours.

### 2.3 Their context objects are OSM-derived and carry size

Their bundle contains the classes `ContextTreeHektarObject` and `ContextBuildingHektarObject`, and
these user-facing strings:

- "A context tree imported from OpenStreetMap. Adjust its height to match the real tree."
- "An existing building imported from OpenStreetMap."

The tree model holds **height** and **crown diameter**; the building model holds an array of
**building footprints** plus a height. Each imported layer carries its own attribution string, and
the set Hektar ships is `© Mapbox`, `© OpenStreetMap`, `© Nimbo`, `© Lantmäteriet`, `© TopoExport`.

Nimbo (3D building models) and TopoExport (terrain delivery) are the pieces Norway cannot simply
buy in the same form; Lantmäteriet is the Swedish equivalent of what Kartverket offers us.

---

## 3. What that means for us

Hektar streams live Mapbox tiles at runtime. **We ship static offline packages** (ADR-0006), and
Mapbox tiles cannot be baked into a shipped bundle under their terms, nor does the PRD allow live
GIS in v1. So we cannot copy the mechanism. We can only match the *result* by baking better open
data into the package — which is what the plan does.

Measured against our own pipeline today:

| Item | Our curated package (`compact-infill`) | Our import path | Hektar |
|---|---|---|---|
| Building footprints | 148 separate OSM ways — **no** multipolygon relations, **no** `building:part` | OpenMapTiles `building` layer, z14 | Per-part extrusions from Mapbox `building` |
| Building heights | 117/148 from `building:levels`, 0 from `height` | `render_height` from the tile | `height` from `levels` (~3 m/level) + `min_height` for parts |
| Roof shapes | Measured DOM roof planes (import path only, ADR-0022) | Measured DOM roof planes | Extruded parts, flat tops |
| Trees | 128 mapped `natural=tree` nodes, **no** `tree_row` | Overpass `natural=tree` + `tree_row` | OSM trees imported as sized objects |
| Green space | 10 land-cover areas, four kinds | OpenMapTiles landcover | Mapbox landcover |
| Scene extent | 190 × 210 m extract | 3×3 tiles at z14 | A whole neighbourhood |

Three findings matter most:

1. **Our trees were mapped, but there were too few and no rows.** The 128 trees in Compact Infill are
   real `natural=tree` nodes — the mappers' own positions — but a 190 × 210 m extract holds almost
   nothing else, and `natural=tree_row` ways were not read at all. Hektar's streets carry rows of
   trees; ours had none because the data path never looked for them.
2. **Our import path cannot show building parts.** The OpenMapTiles schema caps the `building`
   layer at `maxzoom 14` and publishes no `building_part` layer, so roof boxes, penthouses and
   stepped parts never arrive. Our renderer already understands `render_height`/`render_min_height`;
   the data simply does not contain parts.
3. **Our scene was too small to read as a place.** The extract stopped at the study boundary, so
   the scene ended in a hard edge with no horizon.

---

## 4. Norwegian sources that can close the gap

### 4.1 Trees — Oslo Bymiljøetaten tree inventory (verified live, 2026-11-11)

| Property | Value |
|---|---|
| Service | `https://geodata.bymoslo.no/arcgis/rest/services/geodata/Tredata_innsyn/MapServer/0` (layer `Tredata`) |
| Geometry / CRS | Point, EPSG:25832 (UTM 32 N / ETRS89) |
| Attributes | `treslag` (deciduous/conifer), `artsnavn`, `botnavn`, `stammediameter`, `kronediameter`, `tretype`, `livsfase`, `plantedato`, `bydel`, `anleggnavn`, `treplassering` |
| Count in the Compact Infill bbox | **51 real trees** (vs 128 synthetic ones today) |
| Count in a wider Oslo bbox | 11,103 |
| Companion | `parkanlegg_for_Publikum/4` = same trees plus annual rings; `/2` = park outlines (3 in our bbox) |
| Street trees | `BYM_gatetreanlegg/1` = street-tree planting areas as polygons (polygon, not point inventory) |
| 3D variant | `Trær_rundt` SceneServer — per-tree `hob` (height above ground, 4.0–25.8 m), `kronediameter` (3.2–10.1 m), `tre_typ`, `rotation`; drawn as spheres scaled by height and crown width, which is exactly the look in the Hektar screenshot |

**Open question:** the ArcGIS items carry no `licenseInfo` field. Oslo's open geodata is normally
published under NLOD 2.0, but the licence must be confirmed before any of it is baked into a
shipped package. This is a blocker for the tree work, not a detail.

### 4.2 Buildings

| Candidate | Fidelity | Licence | Verdict |
|---|---|---|---|
| OSM ways + relations + `building:part` | Good where OSM is detailed; ours currently ignores relations and parts entirely | ODbL 1.0 | **Use now.** Extends both paths with no new dependency |
| Kartverket FKB-Bygning | Authoritative LoD2, building parts, measured roofs | "Norge digitalt" — restricted | Out of v1 (already flagged in ADR-0006); a procurement project, not a sprint |
| Mapbox Streets v8 tiles | Parts and heights out of the box | Paid; tiles cannot be baked into a static bundle | Out of v1 |
| Overture Maps buildings | OSM-derived plus ML footprints | ODbL | Worth a spike for non-Oslo cities; not needed for Oslo |

### 4.3 Green space, terrain, roads

- **Green space:** Oslo's park outlines (`parkanlegg Omriss`) are crisper than OSM `leisure=park`; use them for Oslo sites and keep OSM as the fallback.
- **Terrain:** already correct — Kartverket DTM1 for the curated packages, Kartverket DOM for measured roofs on imports (ADR-0022). No change.
- **Roads:** our widths are documented as illustrative. NVDB remains the open item from the 2026-11-11 audit and still needs an ADR and a product decision.

---

## 5. Bottom line

- Hektar's precision comes from **Mapbox's per-part building extrusion, real OSM trees with a size,
  and a much wider scene** — not from a better renderer.
- We already own the harder half: measured roofs, a real terrain pipeline, a static package format
  and a renderer that understands `render_height`/`render_min_height`.
- The cheapest large visual win is **real trees with measured crown size** (Oslo inventory, licence
  pending). The second is **building parts** (Overpass on both paths). The third is **scene extent**.

## Sources

- Hektar public bundle and style documents: `https://app.hektar.ai/assets/index-66ba9da9.js`, `https://api.mapbox.com/styles/v1/sofmal/*`
- Mapbox Streets v8 tileset reference: https://docs.mapbox.com/data/tilesets/reference/mapbox-streets-v8/
- Mapbox 3D buildings guide: https://docs.mapbox.com/mapbox-gl-js/example/3d-buildings/
- Oslo Bymiljøetaten tree service: https://geodata.bymoslo.no/arcgis/rest/services/geodata/Tredata_innsyn/MapServer/0
- Oslo 3D tree service: https://services1.arcgis.com/6Zl7StNfHYXR0QK8/arcgis/rest/services/Trær_rundt/SceneServer
- Oslo park service: https://geodata.bymoslo.no/arcgis/rest/services/geodata/parkanlegg_for_Publikum/MapServer
- OpenFreeMap / OpenMapTiles TileJSON: https://tiles.openfreemap.org/planet
- OSM attribution and ODbL: https://www.openstreetmap.org/copyright
- Kartverket terms: https://www.kartverket.no/api-og-data/vilkar-for-bruk/
