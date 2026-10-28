import type { Vec3 } from '../../lib/coordinates'
import type { TerrainData } from './package'

export type ContourSegment = readonly [Vec3, Vec3]

/**
 * Contour lines of the terrain grid, in local ENU metres. Uses marching triangles over the same
 * two-triangles-per-cell split the terrain mesh renders (a,b,c)/(b,d,c), so every segment lies on
 * the drawn surface. Levels that are multiples of `majorInterval` go in `major`.
 */
export function contourSegments(
  terrain: TerrainData,
  interval: number,
  majorInterval: number,
): { minor: ContourSegment[]; major: ContourSegment[] } {
  const minor: ContourSegment[] = []
  const major: ContourSegment[] = []
  const { cols, rows } = terrain

  const point = (row: number, col: number): Vec3 => [
    terrain.minX + ((terrain.maxX - terrain.minX) * col) / (cols - 1),
    terrain.minY + ((terrain.maxY - terrain.minY) * row) / (rows - 1),
    terrain.heights[row]?.[col] ?? 0,
  ]

  const traceTriangle = (corners: readonly [Vec3, Vec3, Vec3]) => {
    const heights = corners.map((corner) => corner[2])
    const low = Math.min(...heights)
    const high = Math.max(...heights)
    // Half-open (low, high] matches the `>= level` side test, so levels that land exactly on
    // grid vertices are traced once (along the shared edge) instead of being dropped.
    for (let step = Math.floor(low / interval) + 1; step * interval <= high; step += 1) {
      const level = step * interval
      const crossings: Vec3[] = []
      for (let index = 0; index < 3; index += 1) {
        const a = corners[index]
        const b = corners[(index + 1) % 3]
        if (!a || !b || a[2] >= level === b[2] >= level) continue
        const t = (level - a[2]) / (b[2] - a[2])
        crossings.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, level])
      }
      const [start, end] = crossings
      if (!start || !end || (start[0] === end[0] && start[1] === end[1])) continue
      const isMajor = Math.abs(level / majorInterval - Math.round(level / majorInterval)) < 1e-9
      ;(isMajor ? major : minor).push([start, end])
    }
  }

  for (let row = 0; row < rows - 1; row += 1) {
    for (let col = 0; col < cols - 1; col += 1) {
      const a = point(row, col)
      const b = point(row, col + 1)
      const c = point(row + 1, col)
      const d = point(row + 1, col + 1)
      traceTriangle([a, b, c])
      traceTriangle([b, d, c])
    }
  }

  return { minor, major }
}
