# Site package specification

- **Status:** Contract for M1
- **PRD references:** §4.1, §8.3, §9
- **Owner:** `gis-spatial-data-engineer`
- **Validator:** `gis-qa-engineer`

A site package is an immutable, versioned bundle of static assets plus a manifest. It is produced offline and shipped with the app. The runtime never calls a live GIS service for a P0 site.

## 1. Package layout

```text
public/sites/<site-id>/
  manifest.json
  terrain.glb              # or terrain.bin + height samples
  context.glb              # simplified neighbouring buildings
  parcel.geojson           # local ENU coordinates, metres
  linework.geojson         # streets, edges, context lines
  constraints.geojson      # illustrative setback + height reference
  thumbnail.webp
  attribution.md
```

Paths in the manifest are relative to the package root. No absolute URLs.

## 2. Manifest contract

```ts
type SiteId = string

interface SiteManifest {
  schemaVersion: 1
  id: SiteId
  title: string
  subtitle: string
  location: {
    latitude: number
    longitude: number
    timeZone: 'Europe/Oslo'
  }
  crs: {
    sourceEPSG: string
    originEast: number
    originNorth: number
    originElevation: number
  }
  unit: 'm'
  assetPaths: {
    terrain: string
    context: string
    parcel: string
    linework: string
    constraints: string
    thumbnail: string
  }
  constraints: {
    maxHeightMeters: number
    heightReference: 'grade' | 'datum'
    setbackMeters: number
    label: 'Illustrative design constraint'
  }
  cameraPresets: Record<'isometric' | 'top' | 'north' | 'south' | 'eyeLevel', CameraPreset>
  sources: Array<{
    title: string
    url?: string
    license?: string
    acquiredAt?: string
    notes?: string
  }>
  dataStatus: 'curated-demo' | 'licensed-real-world-simplified'
  simplified: string[]
}

interface CameraPreset {
  position: [number, number, number] // ENU metres
  target: [number, number, number]
  projection: 'perspective' | 'orthographic'
  fov?: number
  zoom?: number
}
```

Unknown fields are rejected or ignored explicitly; required fields are validated. Numeric values must be finite. `dataStatus` must be present.

## 3. Coordinate and unit rules

- All geometry is in local ENU metres, recentered at package build time (ADR-0002).
- `originEast`, `originNorth` and `originElevation` are the only bridge back to the source CRS.
- GeoJSON in the package uses `[east, north]`, not longitude/latitude. This is a deliberate local projection; document it in `attribution.md`.
- Vertical units are metres; record whether elevations are ellipsoidal, orthometric or relative to a chosen datum.
- North is +north; solar azimuth conversion is validated in M3.
- Do not store raw source coordinates in mesh buffers.

## 4. Preprocessing pipeline

1. Select or fictionalize the site; record the decision.
2. Obtain data only from legally usable sources; record licence, attribution and access date.
3. Reproject to the chosen source metric CRS, then translate to the local origin.
4. Simplify context buildings, decimate terrain, repair polygons, align elevations.
5. Export compact glTF/GLB or typed binary plus local GeoJSON.
6. Validate topology, winding, normals, units, parcel closure and north orientation.
7. Render a fixed-camera comparison against the source underlay.
8. Compute checksums and record asset sizes.
9. Commit the package with `attribution.md`; no runtime fetching.

## 5. Validation checklist

- [ ] Manifest parses and matches the schema version.
- [ ] All referenced assets exist and are non-empty.
- [ ] Parcel polygon is closed, simple, non-self-intersecting, positive area.
- [ ] Context meshes do not contain NaN/Inf vertices.
- [ ] Terrain bounds contain the parcel and context extents.
- [ ] North orientation verified against a known bearing or source grid.
- [ ] Elevation range is plausible and documented.
- [ ] No embedded textures above the agreed budget without compression.
- [ ] `sources` includes title and licence for every dataset.
- [ ] `dataStatus` and `simplified` describe what was changed.
- [ ] Deterministic load: same manifest → same scene checksum.

## 6. Performance budgets (initial)

| Metric | Budget |
|---|---|
| Package download (compressed) | ≤ 8 MB per site, target 5 MB |
| Terrain triangles | ≤ 120k at highest LOD |
| Context triangles | ≤ 250k total, simplified aggressively |
| Draw calls | ≤ 120 with context merged/instanced |
| Texture memory | ≤ 64 MB |
| First interactive studio | ≤ 5 s on target desktop after assets cached |

Budgets are reviewed with a real trace in M1; exceeding one requires an ADR or simplification.

## 7. Error handling

- Missing manifest: `Reload demo data` recovery, no infinite spinner.
- Missing asset: named asset + retry; disable only the affected layer.
- Invalid schema: reject package, show safe message, keep the other site available.
- Corrupt persisted scenario: quarantine and offer export/reset.

## 8. Provenance text

`attribution.md` must state: source, licence, acquisition date, transformations, simplifications, coordinate origin, vertical datum, and the sentence:

> Curated demonstration site. Geometry is simplified for interactive study and is not a cadastral or regulatory representation.
