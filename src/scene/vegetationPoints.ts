/**
 * Seeded point-cloud vegetation (TF-VIS-029). Pure and renderer-free (no three.js): for each mapped
 * tree it samples a porous canopy (points in an ellipsoid biased toward the surface, so the interior
 * is sparse) plus a few trunk points, sized from the same illustrative sizes as `Trees.tsx`. The
 * same seed gives the same output. Returns the full set plus two LOD subsets (≈40 % and ≈15 %) for
 * distance-based thinning.
 */

export type VegetationShape = 'round' | 'tall'

export type VegetationTree = {
  readonly east: number
  readonly north: number
  readonly ground: number
  readonly scale: number
  readonly shape: VegetationShape
}

export type VegetationLod = {
  /** Positions x, y, z per point (local ENU with y up, z = -north). */
  readonly positions: Float32Array
  /** Per-point RGB (0–1) with a slight green-grey variation. */
  readonly colors: Float32Array
}

export type VegetationPoints = {
  readonly full: VegetationLod
  readonly mid: VegetationLod
  readonly far: VegetationLod
}

/** Illustrative sizes (m) before the per-tree scale — same as Trees.tsx. */
export const CANOPY_RADIUS_M = 2.3
export const TRUNK_HEIGHT_M = 2.8
/** Canopy half-axes in canopy-radius units. */
export const CANOPY_RADII: Readonly<Record<VegetationShape, readonly [number, number, number]>> = {
  round: [1, 0.8, 1],
  tall: [0.65, 1.45, 0.65],
}

/** Points per tree: canopy + trunk. */
const CANOPY_POINTS = 42
const TRUNK_POINTS = 4
/** The provisional green-grey fallback, used when a caller passes none. Light enough to stand out
 *  from the dark tinted ground (≥ 1.6:1 contrast, see vegetationPoints.test.ts). */
export const VEGETATION_COLOUR = '#D4DED4'

/** Small seeded PRNG (same as foliage.ts's mulberry32). */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let value = Math.imul(state ^ (state >>> 15), state | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 0x100000000
  }
}

/** `#RRGGBB` → [r, g, b] in 0–1, without a three.js import. */
export function hexToRgb(hex: string): [number, number, number] {
  const value = parseInt(hex.replace(/^#/, ''), 16)
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255]
}

/** WCAG 2.x relative luminance of an sRGB hex colour (0–1). */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex)
  const channel = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** WCAG contrast ratio of two hex colours (≥ 1, higher = more contrast). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

/** A random direction on the unit sphere. */
function direction(random: () => number, out: [number, number, number]) {
  const y = random() * 2 - 1
  const azimuth = random() * Math.PI * 2
  const radius = Math.sqrt(1 - y * y)
  out[0] = radius * Math.cos(azimuth)
  out[1] = y
  out[2] = radius * Math.sin(azimuth)
}

/** Subsample a flat xyz/rgb array (3 floats per point) to a fixed fraction. */
function stride3(array: Float32Array, keepMod: number, keepLess: number): Float32Array {
  const out: number[] = []
  for (let index = 0, point = 0; index + 2 < array.length; index += 3, point += 1) {
    if (point % keepMod < keepLess) out.push(array[index]!, array[index + 1]!, array[index + 2]!)
  }
  return new Float32Array(out)
}

export function buildVegetationPoints(
  trees: readonly VegetationTree[],
  seed: number,
  baseColourHex: string = VEGETATION_COLOUR,
  density = 1,
): VegetationPoints {
  const random = mulberry32(seed)
  const base = hexToRgb(baseColourHex)
  const canopyPoints = Math.max(1, Math.round(CANOPY_POINTS * density))
  const trunkPoints = Math.max(1, Math.round(TRUNK_POINTS * density))
  const positions: number[] = []
  const colors: number[] = []
  const dir: [number, number, number] = [0, 0, 0]

  for (const tree of trees) {
    const [rx, ry, rz] = CANOPY_RADII[tree.shape]
    const radiusX = rx * CANOPY_RADIUS_M * tree.scale
    const radiusY = ry * CANOPY_RADIUS_M * tree.scale
    const radiusZ = rz * CANOPY_RADIUS_M * tree.scale
    // Canopy centre sits above the ground the same way Trees.tsx places it.
    const centreY = tree.ground + (TRUNK_HEIGHT_M + CANOPY_RADIUS_M * 0.75) * tree.scale

    for (let point = 0; point < canopyPoints; point += 1) {
      direction(random, dir)
      // Bias strongly toward the surface (porous shell, sparse interior): radius in the outer ~20 %.
      const shell = 0.8 + 0.2 * random()
      positions.push(
        tree.east + dir[0] * radiusX * shell,
        centreY + dir[1] * radiusY * shell,
        -tree.north + dir[2] * radiusZ * shell,
      )
      const jitter = 0.9 + 0.2 * random()
      colors.push(base[0] * jitter, base[1] * jitter, base[2] * jitter)
    }
    for (let point = 0; point < trunkPoints; point += 1) {
      const t = (point + 0.5) / trunkPoints
      positions.push(tree.east, tree.ground + TRUNK_HEIGHT_M * tree.scale * t, -tree.north)
      const jitter = 0.82 + 0.12 * random()
      colors.push(base[0] * jitter * 0.9, base[1] * jitter * 0.85, base[2] * jitter * 0.85)
    }
  }

  const fullPositions = new Float32Array(positions)
  const fullColors = new Float32Array(colors)
  return {
    full: { positions: fullPositions, colors: fullColors },
    mid: { positions: stride3(fullPositions, 5, 2), colors: stride3(fullColors, 5, 2) },
    far: { positions: stride3(fullPositions, 20, 3), colors: stride3(fullColors, 20, 3) },
  }
}
