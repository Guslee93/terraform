import type { Vec2Tuple } from './manifest'
import type { TerrainData } from './package'

/** Bilinear height sample in local ENU metres. */
export function sampleTerrainHeight(terrain: TerrainData, east: number, north: number): number {
  const spanX = terrain.maxX - terrain.minX
  const spanY = terrain.maxY - terrain.minY
  const tx = Math.min(Math.max((east - terrain.minX) / spanX, 0), 1) * (terrain.cols - 1)
  const ty = Math.min(Math.max((north - terrain.minY) / spanY, 0), 1) * (terrain.rows - 1)

  const x0 = Math.floor(tx)
  const y0 = Math.floor(ty)
  const x1 = Math.min(x0 + 1, terrain.cols - 1)
  const y1 = Math.min(y0 + 1, terrain.rows - 1)
  const fx = tx - x0
  const fy = ty - y0

  const row0 = terrain.heights[y0]
  const row1 = terrain.heights[y1]
  if (!row0 || !row1) return 0

  const h00 = row0[x0] ?? 0
  const h10 = row0[x1] ?? 0
  const h01 = row1[x0] ?? 0
  const h11 = row1[x1] ?? 0

  // The same two triangles per grid cell as the drawn terrain mesh (createTerrainGeometry), not a
  // bilinear patch: on steep, twisted cells the two differ by metres, which buried or floated
  // everything draped on the terrain (heatmaps, roads, trees, building bases).
  return fx + fy <= 1
    ? h00 + fx * (h10 - h00) + fy * (h01 - h00)
    : h11 + (1 - fx) * (h01 - h11) + (1 - fy) * (h10 - h11)
}

/** Height difference (m) of the terrain inside a circle, sampled on a 9 × 9 grid over it. */
export function terrainRelief(terrain: TerrainData, centre: readonly [number, number], radius: number): number {
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY
  for (let row = -4; row <= 4; row += 1) {
    for (let col = -4; col <= 4; col += 1) {
      const dx = (col / 4) * radius
      const dy = (row / 4) * radius
      if (Math.hypot(dx, dy) > radius) continue
      const height = sampleTerrainHeight(terrain, centre[0] + dx, centre[1] + dy)
      min = Math.min(min, height)
      max = Math.max(max, height)
    }
  }
  return Number.isFinite(max - min) ? max - min : 0
}

export function terrainHeightRange(terrain: TerrainData): { min: number; max: number } {
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY

  for (const row of terrain.heights) {
    for (const height of row) {
      if (height < min) min = height
      if (height > max) max = height
    }
  }

  return Number.isFinite(min) && Number.isFinite(max) ? { min, max } : { min: 0, max: 0 }
}

export function polygonArea(points: readonly Vec2Tuple[]): number {
  let area = 0
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index]
    const next = points[index + 1]
    if (!current || !next) continue
    area += current[0] * next[1] - next[0] * current[1]
  }
  return Math.abs(area) / 2
}

export function pointInPolygon(point: Vec2Tuple, polygon: readonly Vec2Tuple[]): boolean {
  let inside = false
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const a = polygon[index]
    const b = polygon[previous]
    if (!a || !b) continue
    const intersects =
      a[1] > point[1] !== b[1] > point[1] &&
      point[0] < ((b[0] - a[0]) * (point[1] - a[1])) / (b[1] - a[1] || Number.EPSILON) + a[0]
    if (intersects) inside = !inside
  }
  return inside
}
