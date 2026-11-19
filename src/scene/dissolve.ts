/**
 * The atmospheric terrain dissolve (TF-VIS-02A, Run 8 fix). The fade is measured as the distance to
 * the nearest tile edge (a rounded rectangle), not radially from the site origin, so every one of
 * the four tile edges fades — the site never does. Pure and renderer-free; `dissolveAmount` is
 * mirrored exactly in the scene shader.
 */

/** The crisp zone holds the study area plus this margin (m); provisional. */
export const SITE_MARGIN_M = 40
/** The widest the fade band may be (m); provisional. */
export const MAX_FADE_WIDTH_M = 160
/** The narrowest fallback band, used when the crisp zone reaches near an edge (m); provisional. */
export const MIN_FADE_WIDTH_M = 40

export type DissolveParams = {
  readonly minX: number
  readonly maxX: number
  readonly minY: number
  readonly maxY: number
  readonly fadeWidth: number
}

/**
 * The dissolve amount at a world point: 0 = fully crisp, 1 = fully dissolved into the background.
 * Measured as the signed distance to a rounded rectangle (corner radius = fadeWidth) that fills the
 * tile: 1 at the boundary, 0 at `fadeWidth` inside it.
 */
export function dissolveAmount(east: number, north: number, params: DissolveParams): number {
  const centreX = (params.minX + params.maxX) / 2
  const centreY = (params.minY + params.maxY) / 2
  const halfX = (params.maxX - params.minX) / 2
  const halfY = (params.maxY - params.minY) / 2
  const radius = params.fadeWidth
  const qx = Math.abs(east - centreX) - halfX + radius
  const qy = Math.abs(north - centreY) - halfY + radius
  const signed = Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - radius
  const edgeDistance = -signed // positive inside the rounded rectangle, 0 on the boundary
  return 1 - Math.min(Math.max(edgeDistance / params.fadeWidth, 0), 1)
}

/**
 * The fade band for a site. The fully-crisp zone must contain the study area plus `SITE_MARGIN_M`
 * and the largest analysis circle plus the same margin, so the fade never touches the site or an
 * analysis boundary; the band is then as wide as it can be without starting inside either (capped at
 * `MAX_FADE_WIDTH_M`). If the crisp zone would reach within `MIN_FADE_WIDTH_M` of an edge, the
 * fallback band is used — it may then come close to the context, but never into the site or circle.
 */
export function dissolveRange(
  studyArea: readonly (readonly [number, number])[],
  analysisCircleRadiusM: number,
  terrain: { readonly minX: number; readonly maxX: number; readonly minY: number; readonly maxY: number },
): DissolveParams {
  let studyMinX = Infinity
  let studyMaxX = -Infinity
  let studyMinY = Infinity
  let studyMaxY = -Infinity
  for (const [east, north] of studyArea) {
    if (east < studyMinX) studyMinX = east
    if (east > studyMaxX) studyMaxX = east
    if (north < studyMinY) studyMinY = north
    if (north > studyMaxY) studyMaxY = north
  }
  const circleReach = analysisCircleRadiusM + SITE_MARGIN_M

  const minEdgeDistance = Math.min(
    studyMinX - SITE_MARGIN_M - terrain.minX,
    terrain.maxX - (studyMaxX + SITE_MARGIN_M),
    studyMinY - SITE_MARGIN_M - terrain.minY,
    terrain.maxY - (studyMaxY + SITE_MARGIN_M),
    -circleReach - terrain.minX,
    terrain.maxX - circleReach,
    -circleReach - terrain.minY,
    terrain.maxY - circleReach,
  )

  const fadeWidth = Math.max(MIN_FADE_WIDTH_M, Math.min(MAX_FADE_WIDTH_M, minEdgeDistance))
  return { minX: terrain.minX, maxX: terrain.maxX, minY: terrain.minY, maxY: terrain.maxY, fadeWidth }
}
