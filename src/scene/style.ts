/**
 * The scene style (TF-VIS-013, contract 04 §3.1). One typed object for every scene colour, line
 * weight and AO value; `NORDIC` holds today's exact values so the refactor is a zero-pixel change.
 *
 * Lines keep today's GL-line semantics (colour + opacity); `widthPx` is a placeholder (1) until the
 * fat-line work (TF-VIS-021) gives it meaning.
 */
import type { GroundTint } from './styleColour'
import { adjustLightness } from './styleColour'
import type { LandCoverKind } from '../features/sites/package'

export type LineStyle = { readonly color: string; readonly widthPx: number; readonly opacity: number }

export type SceneStyle = {
  readonly id: 'nordic' | 'diagram' | 'atmospheric' | 'identity'
  readonly background: string
  /** The aerial-perspective haze colour (Run 9 T2); identity materials mix toward this. */
  readonly hazeColour: string
  readonly ground: string
  readonly context: { readonly color: string; readonly roughness: number }
  readonly road: string
  readonly water: string
  /** Water surface roughness: 0.55 (soft reflections) today; 1 flattens to no reflections. */
  readonly waterRoughness: number
  /** Water environment-reflection strength (envMapIntensity); lower = a fainter static sheen. */
  readonly waterEnvIntensity: number
  /** Overall exposure (toneMappingExposure); NORDIC stays 1.0. */
  readonly toneMappingExposure: number
  /** Per-kind land-cover colours (identity palette); null keeps the NORDIC paint + tint. */
  readonly landCoverPalette: Record<LandCoverKind, string> | null
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
  /** Vegetation rendering: instanced mesh, airy point cloud, or speckled see-through crowns. */
  readonly vegetation: 'mesh' | 'points' | 'speckled'
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
  hazeColour: '#262E2A',
  ground: '#EBEBE8',
  context: { color: '#FAF9F6', roughness: 0.9 },
  road: '#C1BEB7',
  // soften('#CBE1EE') with the palette's 0.6 saturation (water keeps the colour it had, ADR-0025).
  water: '#D3E0E8',
  waterRoughness: 0.55,
  waterEnvIntensity: 1,
  toneMappingExposure: 1,
  landCoverPalette: null,
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
 * The identity fallback ground palette (look spec §2, TF-VIS-028a stand-in until the orthophoto
 * licence is cleared). Muted moss/field/granite greens, grouped by land-cover kind.
 */
export const IDENTITY_LANDCOVER: Record<LandCoverKind, string> = {
  water: '#4A5455',
  park: '#353B34',
  grass: '#353B34',
  wood: '#2E352D',
  scrub: '#2E352D',
  wetland: '#3A4039',
  field: '#353B34',
  pitch: '#353B34',
  cemetery: '#353B34',
  bare: '#43463F',
  plaza: '#4A4C47',
  nature: '#2E352D',
}

/**
 * The approved visual identity's first look (TF-VIS-020 stage A), reachable only through the Lab.
 * Every value here is PROVISIONAL and will be tuned by the owner in the Lab; the NORDIC style
 * above stays the production look and the pixel-identical rollback. No orthophoto yet (licence not
 * cleared), so the ground is the land-cover palette above.
 */
export const IDENTITY: SceneStyle = {
  id: 'identity',
  // Background = haze colour = the look spec's far haze (§2), so the tile edge melts into the
  // background (same colour through the same composer). The darker frame edges (#1B2220–#1D2522 in
  // the references) come from the vignette, not from a darker haze. Provisional; Lab-tunable.
  // Owner, 2026-11-24: a light grey world — the mist and background are light grey, not dark green.
  // Provisional; Lab-tunable.
  background: '#C8CBC6',
  hazeColour: '#C8CBC6',
  // The floor-grid plane is hidden (`floorGrid: false`), so `ground` is unused.
  ground: '#C8CBC6',
  // Warm off-white massing (look spec §3 Buildings), crisp on the dark ground.
  context: { color: '#E6E4DE', roughness: 0.9 },
  // Roads a step lighter than the field palette (look spec §2), never black.
  road: '#5A5C57',
  // Slate water with a faint static sheen (lower roughness + small environment reflection).
  water: '#4A5455',
  waterRoughness: 0.25,
  waterEnvIntensity: 0.6,
  toneMappingExposure: 1.35,
  // The look spec's fallback ground palette by land-cover kind (TF-VIS-028a stand-in).
  landCoverPalette: IDENTITY_LANDCOVER,
  // No skirt: the dissolve (TF-VIS-02A, later) will blend the terrain edge into the mist.
  skirt: null,
  floorGrid: false,
  // The palette carries the ground colour now; no extra tint (Run 9 T3).
  groundTint: null,
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
  // Speckled see-through crowns (Run 9 T5); `points` and `mesh` stay for comparison.
  vegetation: 'speckled',
  // Unused while vegetation is 'speckled'; kept for the point-cloud comparison.
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
  /** Overall exposure (toneMappingExposure). */
  readonly exposure: number
  /** Vignette darkness (postprocessing). */
  readonly vignetteStrength: number
  /** Water environment-reflection strength (envMapIntensity). */
  readonly waterSheen: number
  /** Contour slope fade: hidden below, full above (degrees). */
  readonly contourSlopeMinDeg: number
  readonly contourSlopeMaxDeg: number
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
  exposure: 1.35,
  vignetteStrength: 0.1,
  waterSheen: 0.6,
  contourSlopeMinDeg: 3,
  contourSlopeMaxDeg: 12,
}

/**
 * Derive a tuned IDENTITY variant. `tuning` overrides the style-level colours/opacities (ground
 * tint, road, water, contour opacity, vegetation colour) and is carried on the style for the
 * runtime parameters (dissolve, minor-contour fade, point size/density). Pure.
 */
export function applyTuning(base: SceneStyle, tuning: IdentityTuning): SceneStyle {
  return {
    ...base,
    // The ground colour is carried by the land-cover palette now (Run 9 T3); keep the base tint.
    groundTint: base.groundTint,
    road: adjustLightness(base.road, tuning.roadLightness),
    water: adjustLightness(base.water, tuning.waterLightness),
    waterEnvIntensity: tuning.waterSheen,
    toneMappingExposure: tuning.exposure,
    vegetationColour: adjustLightness(base.vegetationColour, tuning.treeColourLightness),
    lines: {
      ...base.lines,
      contourMinor: { ...base.lines.contourMinor, opacity: tuning.contourMinorOpacity },
      contourMajor: { ...base.lines.contourMajor, opacity: tuning.contourMajorOpacity },
    },
    tuning,
  }
}
