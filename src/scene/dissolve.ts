/**
 * The atmospheric terrain dissolve (TF-VIS-02A). A pure, renderer-free calculation of the radial
 * fade band: the terrain blends into the background beyond the study area and its 200 m context
 * halo, and beyond the largest analysis circle, ending at the terrain's own extent. The site and
 * the analysis circle therefore stay crisp, and the fade never coincides with an analysis boundary.
 */

/** The context halo around the study area (ADR-0023 §1). */
export const CONTEXT_HALO_M = 200

export type DissolveRange = { readonly start: number; readonly end: number }

/** The farthest distance (m) of any point from the site origin (0, 0). */
function boundingRadius(points: readonly (readonly [number, number])[]): number {
  let max = 0
  for (const [east, north] of points) max = Math.max(max, Math.hypot(east, north))
  return max
}

/**
 * Radial fade radii. `start` is outside the study area plus the 200 m halo and outside the analysis
 * circle; `end` is the terrain's bounding radius (so the corners dissolve). The band is never
 * inverted: if the terrain were smaller than the site+halo, `end` collapses to `start` (a hard cut
 * rather than a reversed fade).
 */
export function dissolveRange(
  studyArea: readonly (readonly [number, number])[],
  analysisCircleRadiusM: number,
  terrain: { readonly minX: number; readonly maxX: number; readonly minY: number; readonly maxY: number },
): DissolveRange {
  const start = Math.max(boundingRadius(studyArea) + CONTEXT_HALO_M, analysisCircleRadiusM)
  const terrainRadius = boundingRadius([
    [terrain.minX, terrain.minY],
    [terrain.maxX, terrain.minY],
    [terrain.minX, terrain.maxY],
    [terrain.maxX, terrain.maxY],
  ])
  return { start, end: Math.max(start, terrainRadius) }
}
