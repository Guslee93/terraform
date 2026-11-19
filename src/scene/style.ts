/**
 * The scene style (TF-VIS-013, contract 04 §3.1). One typed object for every scene colour, line
 * weight and AO value; `NORDIC` holds today's exact values so the refactor is a zero-pixel change.
 *
 * Lines keep today's GL-line semantics (colour + opacity); `widthPx` is a placeholder (1) until the
 * fat-line work (TF-VIS-021) gives it meaning.
 */
import type { GroundTint } from './styleColour'
import { adjustLightness } from './styleColour'

export type LineStyle = { readonly color: string; readonly widthPx: number; readonly opacity: number }

export type SceneStyle = {
  readonly id: 'nordic' | 'diagram' | 'atmospheric' | 'identity'
  readonly background: string
  readonly ground: string
  readonly context: { readonly color: string; readonly roughness: number }
  readonly road: string
  readonly water: string
  /** Water surface roughness: 0.55 (soft reflections) today; 1 flattens to no reflections. */
  readonly waterRoughness: number
  /** The terrain block's side skirt colour; null hides the skirt (the identity dissolves it). */
  readonly skirt: string | null
  /** The endless floor grid (1 m / 10 m lines) under the site block. */
  readonly floorGrid: boolean
  /**
   * How land-cover paint and terrain vertex colours are transformed (null = today). The two are
   * multiplied by the terrain material, so the factors act once per colour.
   */
  readonly groundTint: GroundTint | null
  /** The endless floor grid's 1 m / 10 m lines, and the terrain block's own 1 m grid lines. */
  readonly grid: { readonly minor: string; readonly major: string; readonly terrain: LineStyle }
  /** Where contours come from: the 16 m terrain grid, or the 1 m tile (TF-VIS-053). */
  readonly contourSource: 'grid16' | 'tile1m'
  /**
   * Atmospheric dissolve (TF-VIS-02A). `null` = none; `'auto'` = compute the band from
   * `dissolveRange` at mount (the params carry the terrain bounds, so they live on the scene, not
   * in this static object).
   */
  readonly dissolve: 'auto' | null
  /** Vegetation rendering: instanced mesh (today) or airy point cloud (TF-VIS-029). */
  readonly vegetation: 'mesh' | 'points'
  /** The point-cloud vegetation colour (unused while `vegetation` is 'mesh'). */
  readonly vegetationColour: string
  /** The identity tuning overrides, when a Lab session tuned the style (Run 8 T4). */
  readonly tuning?: IdentityTuning
  readonly lines: {
    readonly crease: LineStyle
    readonly silhouette: LineStyle | null
    readonly contourMinor: LineStyle
    readonly contourMajor: LineStyle
    readonly parcel: LineStyle
    readonly section: LineStyle
  }
  readonly ao: { readonly intensity: number; readonly radiusM: number; readonly color: string }
}

export const NORDIC: SceneStyle = {
  id: 'nordic',
  background: '#F1F1EF',
  ground: '#EBEBE8',
  context: { color: '#FAF9F6', roughness: 0.9 },
  road: '#C1BEB7',
  // soften('#CBE1EE') with the palette's 0.6 saturation (water keeps the colour it had, ADR-0025).
  water: '#D3E0E8',
  waterRoughness: 0.55,
  skirt: '#DCD8D1',
  floorGrid: true,
  groundTint: null,
  grid: {
    minor: '#DDDDD9',
    major: '#D8D8D3',
    terrain: { color: '#7C8E7D', widthPx: 1, opacity: 0.22 },
  },
  contourSource: 'grid16',
  dissolve: null,
  vegetation: 'mesh',
  vegetationColour: '#8C9A8A',
  lines: {
    // Context edges via EdgesGeometry above EDGE_THRESHOLD_DEG; ≈ 140/255 on white walls.
    crease: { color: '#7E7D7A', widthPx: 1, opacity: 0.85 },
    silhouette: null,
    contourMinor: { color: '#7E7D7A', widthPx: 1, opacity: 0.14 },
    contourMajor: { color: '#7E7D7A', widthPx: 1, opacity: 0.32 },
    // Parcel and section line values live in ParcelLines.tsx today; recorded here so the style is
    // one source of truth, wired there in a later task.
    parcel: { color: '#374151', widthPx: 1, opacity: 0.55 },
    section: { color: '#1F3BD6', widthPx: 1, opacity: 1 },
  },
  ao: { intensity: 1.6, radiusM: 4, color: '#2B3138' },
}

/**
 * The approved visual identity's first look (TF-VIS-020 stage A), reachable only through the Lab.
 * Every value here is PROVISIONAL and will be tuned by the owner in the Lab; the NORDIC style
 * above stays the production look and the pixel-identical rollback. No orthophoto yet (licence not
 * cleared), so the ground is the land-cover fallback desaturated and darkened by `groundTint`.
 */
export const IDENTITY: SceneStyle = {
  id: 'identity',
  // Charcoal world. Fog shares the background colour (ViewportCanvas.tsx), so the horizon fades
  // into this without a separate fog field.
  background: '#171B19',
  // The floor-grid plane is hidden (`floorGrid: false`), so `ground` is unused; kept dark.
  ground: '#171B19',
  // Matte-white massing, slightly less rough than NORDIC so it reads crisply on the dark ground.
  context: { color: '#EEEDE8', roughness: 0.92 },
  // A dark neutral just above the ground, so streets read but stay quiet.
  road: '#2C312E',
  // Flat, dark water — no reflections (roughness 1).
  water: '#26302F',
  waterRoughness: 1,
  // No skirt: the dissolve (TF-VIS-02A, later) will blend the terrain edge into the mist.
  skirt: null,
  floorGrid: false,
  // Desaturate the land-cover paint to ~20 % chroma and halve its lightness; applied to both the
  // paint and the (near-white) terrain vertex colours, whose product reads ≈ #2A2F2C–#3A403C.
  groundTint: { saturation: 0.2, lightness: 0.5 },
  grid: {
    // Unused while `floorGrid` is false; dark so nothing leaks if the flag is re-enabled.
    minor: '#232826',
    major: '#232826',
    // The terrain block's own 1 m grid (top/plan view): a subtle pale line on the dark ground.
    terrain: { color: '#9DA49F', widthPx: 1, opacity: 0.3 },
  },
  // The identity draws contours from the 1 m tile so they register with real topography.
  contourSource: 'tile1m',
  // Computed from `dissolveRange` at mount (TF-VIS-02A); stage A overrides this to null.
  dissolve: 'auto',
  vegetation: 'points',
  // Light enough to stand out from the dark tinted ground (≥ 1.6:1 contrast, provisional).
  vegetationColour: '#D4DED4',
  lines: {
    // Crease edges kept subtle on the white walls (a little quieter than NORDIC's).
    crease: { color: '#9DA49F', widthPx: 1, opacity: 0.6 },
    silhouette: null,
    // Fine pale-white contours.
    contourMinor: { color: '#F7F7F2', widthPx: 1, opacity: 0.16 },
    contourMajor: { color: '#F7F7F2', widthPx: 1, opacity: 0.38 },
    // Parcel and section keep NORDIC's values (R7 — geography stays recognisable).
    parcel: { color: '#374151', widthPx: 1, opacity: 0.55 },
    section: { color: '#1F3BD6', widthPx: 1, opacity: 1 },
  },
  // Today's intensity, darker tint so the contact shadows read on the charcoal ground.
  ao: { intensity: 1.6, radiusM: 4, color: '#0E1110' },
}

/** The three progressive identity stages (TF-VIS-020). */
export type IdentityStage = 'A' | 'B' | 'C'

/**
 * The derived IDENTITY variant for a stage. A = contours only (no dissolve, mesh trees); B = A +
 * dissolve (and the identity AO/shadow tuning already in IDENTITY); C = B + point vegetation. The
 * base IDENTITY object already carries C's look, so C is IDENTITY itself. Pure — no site data.
 */
export function identityStage(stage: IdentityStage): SceneStyle {
  if (stage === 'A') return { ...IDENTITY, dissolve: null, vegetation: 'mesh' }
  if (stage === 'B') return { ...IDENTITY, vegetation: 'mesh' }
  return IDENTITY
}

/** The identity tuning overrides the owner adjusts in the Lab (Run 8 T4). */
export type IdentityTuning = {
  readonly groundSaturation: number
  readonly groundLightness: number
  readonly roadLightness: number
  readonly waterLightness: number
  readonly contourMinorOpacity: number
  readonly contourMajorOpacity: number
  readonly minorFadeDistanceM: number
  readonly pointSizeMinPx: number
  readonly pointSizeMaxPx: number
  readonly treeColourLightness: number
  readonly treeDensity: number
  readonly dissolveSiteMarginM: number
  readonly dissolveMaxFadeWidthM: number
}

/** The tuning that reproduces IDENTITY exactly (all identity defaults). */
export const DEFAULT_TUNING: IdentityTuning = {
  groundSaturation: 0.2,
  groundLightness: 0.5,
  roadLightness: 1,
  waterLightness: 1,
  contourMinorOpacity: 0.16,
  contourMajorOpacity: 0.38,
  minorFadeDistanceM: 1.5, // × the isometric preset distance
  pointSizeMinPx: 1.5,
  pointSizeMaxPx: 4,
  treeColourLightness: 1,
  treeDensity: 1,
  dissolveSiteMarginM: 40,
  dissolveMaxFadeWidthM: 160,
}

/**
 * Derive a tuned IDENTITY variant. `tuning` overrides the style-level colours/opacities (ground
 * tint, road, water, contour opacity, vegetation colour) and is carried on the style for the
 * runtime parameters (dissolve, minor-contour fade, point size/density). Pure.
 */
export function applyTuning(base: SceneStyle, tuning: IdentityTuning): SceneStyle {
  return {
    ...base,
    groundTint: { saturation: tuning.groundSaturation, lightness: tuning.groundLightness },
    road: adjustLightness(base.road, tuning.roadLightness),
    water: adjustLightness(base.water, tuning.waterLightness),
    vegetationColour: adjustLightness(base.vegetationColour, tuning.treeColourLightness),
    lines: {
      ...base.lines,
      contourMinor: { ...base.lines.contourMinor, opacity: tuning.contourMinorOpacity },
      contourMajor: { ...base.lines.contourMajor, opacity: tuning.contourMajorOpacity },
    },
    tuning,
  }
}
