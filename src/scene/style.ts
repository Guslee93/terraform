/**
 * The scene style (TF-VIS-013, contract 04 §3.1). One typed object for every scene colour, line
 * weight and AO value; `NORDIC` holds today's exact values so the refactor is a zero-pixel change.
 *
 * Lines keep today's GL-line semantics (colour + opacity); `widthPx` is a placeholder (1) until the
 * fat-line work (TF-VIS-021) gives it meaning.
 */

export type LineStyle = { readonly color: string; readonly widthPx: number; readonly opacity: number }

export type SceneStyle = {
  readonly id: 'nordic' | 'diagram' | 'atmospheric'
  readonly background: string
  readonly ground: string
  readonly context: { readonly color: string; readonly roughness: number }
  readonly road: string
  readonly water: string
  readonly skirt: string
  /** The endless floor grid's 1 m / 10 m lines, and the terrain block's own 1 m grid lines. */
  readonly grid: { readonly minor: string; readonly major: string; readonly terrain: LineStyle }
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
  skirt: '#DCD8D1',
  grid: {
    minor: '#DDDDD9',
    major: '#D8D8D3',
    terrain: { color: '#7C8E7D', widthPx: 1, opacity: 0.22 },
  },
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
