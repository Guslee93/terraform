# Site package specification

- **Status:** Implemented in M1 — validated against both packages
- **PRD references:** §4.1, §8.3, §9
- **Owner:** `gis-spatial-data-engineer`
- **Validator:** `gis-qa-engineer`

A site package is an immutable, versioned bundle of static assets plus a manifest. It is produced offline and shipped with the app. The runtime never calls a live GIS service for a P0 site.

## 1. Package layout

```text
public/sites/<site-id>/
  manifest.json
  terrain.json             # rows/cols + heights in metres relative to origin
  buildings.json           # simplified footprints, heights, base elevations
  study-area.json          # authored boundary; not a cadastral parcel
  roads.json               # optional: OSM highway centrelines + illustrative widths (ADR-0005)
  trees.json               # optional: OSM natural=tree points and natural=tree_row lines
  landcover.json           # optional: OSM water/green/vegetation/paved polygons (illustrative ground tints)
  attribution.md
```

`roads.json` and `trees.json` are optional and referenced by `assetPaths.roads` /
`assetPaths.trees`. Packages without them stay valid and load with empty layers;
the Streets and Trees layer toggles are hidden for such packages.

`landcover.json` is optional through `assetPaths.landcover`; absent paths load as
`landcover: []` without a request. Its schema is `{ schemaVersion: 1, siteId,
areas: [{ id, kind, ring }] }`, where kind is `water | park | grass | wood | scrub |
wetland | field | pitch | cemetery | bare | plaza | nature` and ring is an open,
counter-clockwise array of local `[east, north]` points.
The builder clips closed ways and joined multipolygon outer rings to the terrain,
simplifies at 0.5 m and drops areas below 4 m². Inner rings and incomplete rings are
ignored. When a multipolygon's outer ring runs outside the bbox extract, its missing
member ways are fetched separately (`data/raw/<site-id>-ways.xml`) so the ring can still
be closed; without them the whole polygon would be dropped. Rivers, canals and streams
mapped as lines become illustrative ribbons of water. IDs retain `way/<id>` or
`relation/<id>`; multiple outer rings of a relation share its source ID. Polygons are
illustrative ground tints drawn as a plan texture on the terrain, switched by the
**Land cover** layer toggle.

`plaza` is a paved pedestrian area and `nature` a protected area; both are ground
tints, not built or surveyed surfaces. `wood` is tree canopy, `scrub` low brush,
`wetland` wet ground, `field` cultivated land, `pitch` a made play or sports surface,
`cemetery` grave ground and `bare` rock or sand. Every kind is an illustrative tint
over the terrain, never a surveyed surface.

`water` is the one exception to "a tint on the terrain" (ADR-0025). A tint takes
the terrain's relief and can never be flat, so a `water` area is drawn as its own
surface: the studio computes a water level from the ground along the mapped ring
(smoothed over a plan window that reaches across the body as well as along it), lifts
the polygon to that level, and cuts the terrain inside the outline down to it. The
surface therefore lies in the landscape rather than on it, and where the ground
inside the outline stands above the water level that ground stays dry — the water is
narrower than the mapped polygon. The rule is applied when the studio loads a
package, so the package itself carries no level and stays immutable. It follows the
mapped outline, not a survey of the river bed.

The card thumbnail lives at `public/sites/<site-id>.svg` and is referenced from
`assetPaths.thumbnail`. Paths in the manifest are relative to the package root,
except the thumbnail; no remote URLs. `assetPaths.thumbnail` and `assetPaths.attribution`
are optional: a user import keeps its assets in browser storage rather than as static
files, so it lists its sources in `manifest.sources` instead and ships no attribution
file. A curated package points `assetPaths.attribution` at its `attribution.md`, which
the studio links from the inspector.

## 2. Manifest contract

```ts
type SiteId = string

interface SiteManifest {
  schemaVersion: 1
  id: SiteId
  title: string
  subtitle: string
  description: string
  morphology: string
  location: {
    latitude: number
    longitude: number
    timeZone: 'Europe/Oslo'
  }
  crs: {
    sourceEPSG: 'EPSG:4326'
    horizontalDatum: 'WGS84'
    verticalDatum: 'NN2000'
    originLatitude: number
    originLongitude: number
    originElevation: number
    projection: 'local-tangent-plane-wgs84'
  }
  unit: 'm'
  dataStatus: 'curated-demo' | 'licensed-real-world-simplified'
  assetPaths: {
    terrain: string
    buildings: string
    studyArea: string
    thumbnail?: string
    attribution?: string
    roads?: string
    trees?: string
    landcover?: string
  }
  constraints: {
    maxHeightMeters: number
    setbackMeters: number
    label: 'Illustrative design constraint'
  }
  cameraPresets: Record<'isometric' | 'top' | 'north' | 'south' | 'eyeLevel', CameraPreset>
  sources: Array<{
    title: string
    url?: string
    license?: string
    attribution?: string
    acquiredAt?: string
  }>
  simplified: string[]
  statistics: {
    buildingCount: number
    terrainSamples: number
    studyAreaM2: number
    sourceChecksum: string
  }
}

interface CameraPreset {
  position: [east: number, north: number, up: number]
  target: [east: number, north: number, up: number]
  projection: 'perspective' | 'orthographic'
  fov?: number
}
```

v1 accepts perspective presets only; an orthographic value is rejected by the
validator rather than silently ignored.

Unknown fields are rejected or ignored explicitly; required fields are validated. Numeric values must be finite. `dataStatus` must be present.

## 3. Coordinate and unit rules

- All geometry is in local ENU metres, recentered at package build time (ADR-0002).
- `originLatitude`, `originLongitude` and `originElevation` are the only bridge back to the source CRS.
- JSON in the package uses `[east, north]`, not longitude/latitude. This is a deliberate local projection; documented in `attribution.md`.
- Vertical units are metres; DTM1 heights are recorded as NN2000 orthometric heights, then expressed relative to the origin elevation.
- North is +north; solar azimuth conversion is validated in M3.
- Do not store raw source coordinates in mesh buffers.
- The study boundary is authored for the demo and explicitly labelled as not a cadastral parcel.

## 4. Preprocessing pipeline

1. Select a study area; record the decision and exact bbox. The data bbox is the study
   bbox plus a context halo (ADR-0023), so the site reads as part of a city.
2. Obtain data only from legally usable sources; record licence, attribution and access date.
3. Project WGS84 lat/lon into a local tangent plane; record origin latitude, longitude, origin elevation and the NN2000 vertical datum.
4. Simplify context buildings with topology repair, sample terrain, and align base elevations.
5. Write compact `terrain.json`, `buildings.json` and `study-area.json` assets.
6. Validate topology, simple rings, units, boundary closure and statistics consistency.
7. Render fixed-camera comparisons at the reference presets.
8. Compute the source checksum and record asset sizes.
9. Commit the package with `attribution.md`; no runtime fetching.
10. Rebuild deterministically with `python3 scripts/build_site_packages.py --offline`.

## 5. Validation checklist

- [ ] Manifest parses and matches the schema version.
- [ ] All referenced assets exist and are non-empty.
- [ ] Study boundary is closed, simple, non-self-intersecting, positive area.
- [ ] Building footprints are simple, finite, positive-area rings with unique IDs.
- [ ] Terrain grid dimensions match the manifest and every height is finite.
- [ ] Terrain bounds contain the study boundary.
- [ ] North orientation verified against a known bearing or source grid.
- [ ] Elevation range is plausible and documented.
- [ ] `sources` includes title, licence and attribution for every dataset.
- [ ] `dataStatus` and `simplified` describe what was changed.
- [ ] Manifest statistics match the building count, terrain samples and boundary area.
- [ ] Attribution states that the boundary is not a cadastral parcel.
- [ ] Deterministic load: same manifest → same scene checksum.
- [ ] Optional roads: every run has ≥ 2 points and a width in (0, 50] m; runs are clipped to the terrain extent; tunnels and area-tagged ways omitted; a covered passage is kept as a street.
- [ ] Optional trees: finite `[east, north]` points inside the terrain extent; no size data implied. A `natural=tree_row` way becomes a tree every 8 m along the row, and a tree is never counted twice. A tree stands on ground: no tree lies inside a land-cover area of kind `water` (ADR-0024).
- [ ] Optional land cover: matching site ID, ≤ 5000 areas, known kinds, ≥ 3 finite points and positive area per ring; built rings open, counter-clockwise, ≥ 4 m² and clipped to terrain; inner rings ignored and documented.
- [ ] Water areas: a `water` ring is drawn as a flat surface at the level of the ground along the ring, and the terrain inside the outline is cut down to that level (ADR-0025). The package carries no level of its own, so the rule is applied at load time and the package stays immutable.
- [ ] Building footprints: 3–200 vertices, so an outline the parser would reject is coarsened rather than dropped; a building under 12 m² is not drawn.
- [ ] Every multipolygon whose outer ring leaves the extract is either closed from the supplementary ways file or reported as a dropped feature by the builder.

## 6. Performance budgets (initial)

| Metric | Budget | Current M1 |
|---|---|---|
| Package download (uncompressed) | ≤ 8 MB per site, target 5 MB | ~95 KB compact · ~32 KB slope |
| Terrain triangles | ≤ 120k at highest LOD | 288 |
| Context triangles | ≤ 250k total, simplified aggressively | ~5k both sites |
| Draw calls | ≤ 120 with context merged/instanced | ~5 |
| Texture memory | ≤ 64 MB | 0 |
| Studio FPS at 1440×900 | > 45, target 60 | 60.1 (Apple M1 Pro / Metal) |
| First interactive studio | ≤ 5 s on target desktop after assets cached | ~1.5 s locally |

Budgets are reviewed with a real trace in M1; exceeding one requires an ADR or simplification.

## 7. Error handling

- Missing manifest: `Reload demo data` recovery, no infinite spinner.
- Missing asset: named asset + retry; disable only the affected layer.
- Invalid schema: reject package, show safe message, keep the other site available.
- Corrupt persisted scenario: quarantine and offer export/reset.

## 8. Provenance text

`attribution.md` must state: source, licence, licence link, acquisition date, transformations, simplifications, coordinate origin, vertical datum, and the sentence:

> Curated demonstration site. Geometry is simplified for interactive study and is not a cadastral or regulatory representation.
