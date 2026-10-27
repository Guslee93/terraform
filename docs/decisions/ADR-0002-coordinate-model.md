# ADR-0002 — Local East/North/Up coordinate model

- **Status:** Accepted
- **Date:** 2026-10-27
- **Deciders:** Project owner, `engineering-software-architect`, `gis-3d-scene-developer`
- **PRD references:** §4.1, §5.3, §8.3, §9

## Context

Site geometry originates in a geographic CRS, while editing, raycasting, snapping, measurement and rendering need stable metric coordinates. Using latitude/longitude directly as vertices causes floating-point imprecision, inconsistent north orientation and fragile snapping.

## Decision

1. Authored project geometry uses a **local metric frame**:
   - `east` (+x): metres from the site origin
   - `north` (+y): metres from the site origin
   - `up` (+z): metres above the site origin elevation
2. The renderer consumes `(east, up, -north)` — a Y-up, right-handed Three.js frame.
3. Each site package records `crs.sourceEPSG`, `originEast`, `originNorth`, `originElevation`, `unit: 'm'`, and the transform used during preprocessing.
4. **One conversion pipeline** (`src/lib/coordinates.ts`) serves imports, raycasts, snapping, measurement, camera framing and export.
5. Latitude/longitude are used only for solar position and provenance metadata. They are never mesh vertices.
6. Site packages are recentered during offline preprocessing. Runtime re-origining is out of scope for v1.
7. `baseElevation` is explicit per mass. A footprint crossing sloped terrain does not deform; the tool reports clearance/intersection warnings.

## Consequences

- North orientation is a single, testable convention. Visual north must match the solar azimuth convention used by SunCalc.
- All domain code can be tested in metres without a renderer.
- Export and import must carry origin metadata or geometry becomes ambiguous.
- Future MapLibre context needs an explicit transform between local ENU and geographic coordinates; it must not bypass the pipeline.

## Tests

- `enuToThreeXyz([e, n, u])` returns `[e, u, -n]`.
- `threeXyzToEnu` is the exact inverse for finite values.
- Horizontal distance is independent of elevation.
- M1 adds a package-level fixture asserting known parcel corners in both local and source coordinates.

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| Raw EPSG:25832 metres directly in meshes | Large coordinates and no recentering; precision and camera issues. |
| Latitude/longitude vertices | Non-metric, imprecise, breaks snapping and measurement. |
| Z-up throughout, converting only at render | Constant friction with Three.js and Drei helpers. |
| Per-object local origins | Complicates snapping, aggregation and export. |

## Revisit triggers

A second geographic region, a live map integration, or precision problems beyond the curated site extents.
