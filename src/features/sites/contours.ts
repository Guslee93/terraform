import type { Vec3 } from '../../lib/coordinates'
import type { TerrainData } from './package'
import type { TerrainRaster } from '../analysis/terrainTools'

export type ContourSegment = readonly [Vec3, Vec3]

/** The parts of a 1 m raster the contour pass reads (the worker transfers exactly these). */
export type RasterGrid = Pick<TerrainRaster, 'cols' | 'rows' | 'minX' | 'minY' | 'maxX' | 'maxY' | 'heights'>

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

/**
 * Contour lines of the 1 m terrain tile (ADR-0037). Marching triangles over the raster's cell
 * centres (row 0 is the north edge), so the (east, north) of every crossing carries the 1 m tile's
 * resolution; the segment's z is the contour *level* (not the surface height — the caller re-samples
 * the drawn 16 m terrain). Cells with no data are skipped. Pure and renderer-free, so it can run in
 * a worker.
 */
export function rasterContourSegments(
  raster: RasterGrid,
  interval: number,
  majorInterval: number,
): { minor: ContourSegment[]; major: ContourSegment[] } {
  const minor: ContourSegment[] = []
  const major: ContourSegment[] = []
  const { cols, rows, heights } = raster
  const cellX = (raster.maxX - raster.minX) / cols
  const cellY = (raster.maxY - raster.minY) / rows

  const centre = (row: number, col: number): Vec3 => [
    raster.minX + (col + 0.5) * cellX,
    raster.maxY - (row + 0.5) * cellY,
    heights[row * cols + col]!,
  ]

  const traceTriangle = (corners: readonly [Vec3, Vec3, Vec3]) => {
    const cornerHeights = corners.map((corner) => corner[2])
    if (cornerHeights.some(Number.isNaN)) return
    const low = Math.min(...cornerHeights)
    const high = Math.max(...cornerHeights)
    for (let step = Math.floor(low / interval) + 1; step * interval <= high; step += 1) {
      const level = step * interval
      const crossings: Vec3[] = []
      for (let index = 0; index < 3; index += 1) {
        const a = corners[index]
        const b = corners[(index + 1) % 3]
        if (!a || !b || a[2] >= level === b[2] >= level) continue
        const t = (level - a[2]) / (b[2] - a[2])
        const east = a[0] + (b[0] - a[0]) * t
        const north = a[1] + (b[1] - a[1]) * t
        crossings.push([east, north, level])
      }
      const [start, end] = crossings
      if (!start || !end || (start[0] === end[0] && start[1] === end[1])) continue
      const isMajor = Math.abs(level / majorInterval - Math.round(level / majorInterval)) < 1e-9
      ;(isMajor ? major : minor).push([start, end])
    }
  }

  for (let row = 0; row < rows - 1; row += 1) {
    for (let col = 0; col < cols - 1; col += 1) {
      const a = centre(row, col)
      const b = centre(row, col + 1)
      const c = centre(row + 1, col)
      const d = centre(row + 1, col + 1)
      traceTriangle([a, b, c])
      traceTriangle([b, d, c])
    }
  }

  return { minor, major }
}

/** Segments → a flat Float32Array of `[ax, ay, bx, by]` per segment (the z level is dropped). */
export function flattenContours(segments: readonly ContourSegment[]): Float32Array {
  const flat = new Float32Array(segments.length * 4)
  segments.forEach(([a, b], index) => {
    const offset = index * 4
    flat[offset] = a[0]
    flat[offset + 1] = a[1]
    flat[offset + 2] = b[0]
    flat[offset + 3] = b[1]
  })
  return flat
}

/** A 1D Gaussian kernel of the given sigma (in cells), normalised. */
function gaussianKernel(sigma: number): number[] {
  const radius = Math.max(1, Math.ceil(sigma * 3))
  const kernel: number[] = []
  let sum = 0
  for (let i = -radius; i <= radius; i += 1) {
    const value = Math.exp(-(i * i) / (2 * sigma * sigma))
    kernel.push(value)
    sum += value
  }
  return kernel.map((value) => value / sum)
}

/**
 * A separable Gaussian blur of the raster heights (Run 10 T5): smooths kerbs and mounds so contours
 * follow real relief, not 1 m DTM noise. No-data cells are ignored (weighted by the kernel); a cell
 * with no in-range data yields no data. Pure and renderer-free.
 */
export function gaussianBlur(raster: RasterGrid, sigmaM: number): RasterGrid {
  const { cols, rows, heights } = raster
  const cellX = (raster.maxX - raster.minX) / cols
  const cellY = (raster.maxY - raster.minY) / rows
  const sigma = sigmaM / Math.max(cellX, cellY)
  const kernel = gaussianKernel(sigma)
  const radius = Math.floor(kernel.length / 2)

  const convolve = (src: Float32Array): Float32Array => {
    const out = new Float32Array(cols * rows)
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        let sum = 0
        let total = 0
        for (let k = -radius; k <= radius; k += 1) {
          const c = col + k
          if (c < 0 || c >= cols) continue
          const value = src[row * cols + c]!
          if (Number.isNaN(value)) continue
          const w = kernel[k + radius]!
          sum += value * w
          total += w
        }
        out[row * cols + col] = total === 0 ? Number.NaN : sum / total
      }
    }
    return out
  }

  // Horizontal pass, then a transposed vertical pass.
  const horizontal = convolve(heights)
  const transposed = new Float32Array(cols * rows)
  for (let row = 0; row < rows; row += 1) for (let col = 0; col < cols; col += 1) transposed[col * rows + row] = horizontal[row * cols + col]!
  const verticalTransposed = convolve(transposed)
  const out = new Float32Array(cols * rows)
  for (let col = 0; col < cols; col += 1) for (let row = 0; row < rows; row += 1) out[row * cols + col] = verticalTransposed[col * rows + row]!
  return { ...raster, heights: out }
}

/** Total horizontal length of a polyline (the z level is ignored). */
function polylineLength(points: readonly Vec3[]): number {
  let length = 0
  for (let index = 0; index < points.length - 1; index += 1) {
    const a = points[index]!
    const b = points[index + 1]!
    length += Math.hypot(b[0] - a[0], b[1] - a[1])
  }
  return length
}

/**
 * Chain the per-cell marching-squares segments into polylines (by shared endpoints) and drop
 * polylines shorter than `minLengthM` (Run 10 T5). Returns the segments of the surviving polylines.
 */
export function chainContours(segments: readonly ContourSegment[], minLengthM: number): ContourSegment[] {
  const key = (p: Vec3) => `${p[0].toFixed(3)}|${p[1].toFixed(3)}|${p[2].toFixed(3)}`
  const byEndpoint = new Map<string, number[]>()
  segments.forEach((segment, index) => {
    for (const point of segment) {
      const k = key(point)
      const list = byEndpoint.get(k) ?? []
      list.push(index)
      byEndpoint.set(k, list)
    }
  })

  const used = new Set<number>()
  const out: ContourSegment[] = []
  for (let index = 0; index < segments.length; index += 1) {
    if (used.has(index)) continue
    used.add(index)
    const first = segments[index]!
    const chain: Vec3[] = [first[0], first[1]]
    // Extend from both ends while a neighbouring segment shares the endpoint.
    for (const side of [0, 1] as const) {
      let extend = true
      while (extend) {
        extend = false
        const endpoint = side === 0 ? chain[0]! : chain[chain.length - 1]!
        for (const neighbour of byEndpoint.get(key(endpoint)) ?? []) {
          if (used.has(neighbour)) continue
          const segment = segments[neighbour]!
          const other = key(segment[0]) === key(endpoint) ? segment[1] : key(segment[1]) === key(endpoint) ? segment[0] : null
          if (!other) continue
          used.add(neighbour)
          if (side === 0) chain.unshift(other)
          else chain.push(other)
          extend = true
          break
        }
      }
    }
    if (polylineLength(chain) < minLengthM) continue
    for (let k = 0; k < chain.length - 1; k += 1) out.push([chain[k]!, chain[k + 1]!])
  }
  return out
}

/**
 * Smooth the raster, contour it, and keep only the long polylines (Run 10 T5). The identity
 * contour pipeline: Gaussian blur σ, marching squares, chain, drop short lines.
 */
export function smoothRasterContours(
  raster: RasterGrid,
  interval: number,
  majorInterval: number,
  sigmaM: number,
  minLengthM: number,
): { minor: ContourSegment[]; major: ContourSegment[] } {
  const blurred = gaussianBlur(raster, sigmaM)
  const { minor, major } = rasterContourSegments(blurred, interval, majorInterval)
  return { minor: chainContours(minor, minLengthM), major: chainContours(major, minLengthM) }
}
