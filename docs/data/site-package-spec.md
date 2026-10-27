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
  attribution.md
```

The card thumbnail lives at `public/sites/<site-id>.svg` and is referenced from
`assetPaths.thumbnail`. Paths in the manifest are relative to the package root,
except the thumbnail; no remote URLs.

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
    thumbnail: string
    attribution: string
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

1. Select a study area; record the decision and exact bbox.
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
