import type { Vec2 } from '../../lib/coordinates'
import { pointInPolygon, polygonArea } from '../../lib/polygon'
import type { LandCoverArea, TerrainData } from './package'
import { sampleTerrainHeight } from './geometry'

/**
 * Water as a surface (ADR-0025).
 *
 * The studio painted water into the land-cover texture, which is draped on the terrain mesh. The
 * water therefore took the relief of whatever ground the mapped polygon covered: a river read as
 * a lumpy sheet with contour lines running across it, and a sheet that stood proud of the ground
 * it was supposed to lie in. The elevation model is coarser than the water it carries — a river
 * is narrower than one grid cell — so the ground under a mapped river is a blend of the channel
 * and the valley wall, and that blend is what the water was painted on.
 *
 * Water is now its own surface, and this module decides where it lies:
 *
 * - The water level of a mapped body is the ground at its outline, smoothed along the outline so
 *   the surface is flat across the body and steady along it. A river descends, so the surface
 *   descends with it; it does not bulge.
 * - The ground inside the body is cut down to that surface, so the water lies in the ground
 *   instead of on top of it. The cut is small: it removes the blend the coarse model left
 *   between the channel and the bank, and nothing else.
 *
 * Both numbers come from the terrain the package already carries. Nothing is measured twice and
 * no new source is needed. The result is a simplification — the water surface follows the mapped
 * outline, not a survey of the river bed — and the studio says so.
 */

/** A mapped water body, drawn as a surface with one elevation per outline vertex. */
export type WaterSurface = {
  id: string
  /** The mapped outline, unchanged. */
  ring: Vec2[]
  /** Water surface elevation (m) at each outline vertex, in the terrain's own frame. */
  levels: number[]
}

export type WaterSurfaceOptions = {
  /**
   * Half-width (m) of the outline window that smooths the elevation profile. Default: two
   * terrain cells, which reaches across a river to its other bank.
   */
  smoothRadius?: number
  /** Depth (m) the ground sits below the water surface inside the body. Default: 0.1 m. */
  clearance?: number
}

/** The shorter of the two grid spacings (m): the size of one terrain cell. */
export function terrainCellSize(terrain: TerrainData): number {
  const spanX = (terrain.maxX - terrain.minX) / Math.max(1, terrain.cols - 1)
  const spanY = (terrain.maxY - terrain.minY) / Math.max(1, terrain.rows - 1)
  return Math.min(spanX, spanY)
}

function median(values: readonly number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = sorted.length >> 1
  return sorted.length % 2 === 1 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2
}

/**
 * The mean width (m) of a mapped body: its area spread over its longest span.
 *
 * A river is many times longer than it is wide, so its width is the distance between the banks.
 * A pond is about as wide as it is long, so its width is the whole body. The smoothing window
 * is set from it, and that is what decides whether a body is treated as one level or as a
 * profile that follows its ground.
 */
function bodyWidth(ring: readonly Vec2[]): number {
  let diameter = 0
  for (let i = 0; i < ring.length; i += 1) {
    const a = ring[i]!
    for (let j = i + 1; j < ring.length; j += 1) {
      const b = ring[j]!
      const distance = Math.hypot(a[0] - b[0], a[1] - b[1])
      if (distance > diameter) diameter = distance
    }
  }
  if (diameter <= 0) return 0
  return (2 * polygonArea(ring)) / diameter
}

/**
 * Running median of `values` over the outline vertices within `radius` metres of each other.
 *
 * The window is a disc in plan, so it reaches across the body as well as along it: the two banks
 * of a cross-section are in the same window, and the median of that window is one level for the
 * whole cross-section — which is what makes the surface flat across the water. A median rather
 * than a mean: one bank can sit a metre above the other, and a mean would let that metre tilt
 * the surface.
 */
function smoothAlongRing(values: readonly number[], ring: readonly Vec2[], radius: number): number[] {
  if (radius <= 0) return [...values]
  return values.map((value, index) => {
    const point = ring[index]
    if (!point) return value
    const window: number[] = []
    for (let other = 0; other < values.length; other += 1) {
      const candidate = ring[other]
      if (!candidate) continue
      if (Math.hypot(candidate[0] - point[0], candidate[1] - point[1]) <= radius + 1e-9) window.push(values[other]!)
    }
    return window.length ? median(window) : value
  })
}

/**
 * The water surfaces of the mapped water bodies.
 *
 * One surface per body, one elevation per outline vertex: the ground at the outline, smoothed
 * along the outline so both banks of a river share a level.
 */
export function computeWaterSurfaces(
  terrain: TerrainData,
  areas: readonly LandCoverArea[],
  options: WaterSurfaceOptions = {},
): WaterSurface[] {
  const cell = terrainCellSize(terrain)
  return areas
    .filter((area) => area.kind === 'water' && area.ring.length >= 3)
    .map((area) => {
      // The window reaches across the body as well as along it: two terrain cells, and at least
      // the body's own width, so both banks of a cross-section are always in the same window.
      const radius = options.smoothRadius ?? Math.max(cell * 2, bodyWidth(area.ring))
      const ground = area.ring.map(([east, north]) => sampleTerrainHeight(terrain, east, north))
      return {
        id: area.id,
        ring: [...area.ring],
        levels: smoothAlongRing(ground, area.ring, radius),
      }
    })
}

/**
 * The water surface elevation at a point, taken from the nearest point on the outline.
 * Used for the ground cut and for tests.
 */
export function waterSurfaceLevel(surface: WaterSurface, east: number, north: number): number {
  const ring = surface.ring
  let best = Infinity
  let level = surface.levels[0] ?? 0
  for (let index = 0; index < ring.length; index += 1) {
    const a = ring[index]!
    const b = ring[(index + 1) % ring.length]!
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const lengthSquared = dx * dx + dy * dy
    const t = lengthSquared === 0
      ? 0
      : Math.max(0, Math.min(1, ((east - a[0]) * dx + (north - a[1]) * dy) / lengthSquared))
    const distance = Math.hypot(east - (a[0] + t * dx), north - (a[1] + t * dy))
    if (distance < best) {
      best = distance
      const levelA = surface.levels[index]!
      const levelB = surface.levels[(index + 1) % ring.length]!
      level = levelA + (levelB - levelA) * t
    }
  }
  return level
}

/**
 * The terrain with the ground inside every mapped water body cut down to the water surface.
 *
 * The cut removes what the coarse elevation model left between the channel and the bank inside
 * the mapped outline. It stops at the outline: the ground outside it is left alone, so the
 * buildings and roads that stand next to the water keep the ground they were seated on.
 *
 * The input terrain is not modified; a new one is returned.
 */
export function carveTerrainForWater(
  terrain: TerrainData,
  surfaces: readonly WaterSurface[],
  options: WaterSurfaceOptions = {},
): TerrainData {
  if (!surfaces.length) return terrain
  const clearance = options.clearance ?? 0.1
  const heights = terrain.heights.map((row) => [...row])
  for (let row = 0; row < terrain.rows; row += 1) {
    for (let col = 0; col < terrain.cols; col += 1) {
      const east = terrain.minX + ((terrain.maxX - terrain.minX) * col) / (terrain.cols - 1)
      const north = terrain.minY + ((terrain.maxY - terrain.minY) * row) / (terrain.rows - 1)
      let cut: number | null = null
      for (const surface of surfaces) {
        if (!pointInPolygon([east, north], surface.ring)) continue
        const level = waterSurfaceLevel(surface, east, north) - clearance
        cut = cut === null ? level : Math.max(cut, level)
      }
      if (cut === null) continue
      const heightsRow = heights[row]
      const height = heightsRow?.[col]
      if (!heightsRow || height === undefined) continue
      if (height > cut) heightsRow[col] = cut
    }
  }
  return { ...terrain, heights }
}
