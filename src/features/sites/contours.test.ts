import { describe, expect, it } from 'vitest'
import type { TerrainData } from './package'
import { chainContours, contourSegments, flattenContours, gaussianBlur, rasterContourSegments, type ContourSegment, type RasterGrid } from './contours'

function terrain(heights: number[][]): TerrainData {
  return {
    schemaVersion: 1,
    siteId: 'fixture',
    cols: heights[0]?.length ?? 0,
    rows: heights.length,
    minX: 0,
    maxX: 10 * ((heights[0]?.length ?? 1) - 1),
    minY: 0,
    maxY: 10 * (heights.length - 1),
    originElevation: 0,
    heights,
    source: 'fixture',
  }
}

describe('contourSegments', () => {
  it('traces a 1 m contour on an east-facing ramp as a north-south line at the right east', () => {
    // Height rises 0 → 4 m from west to east over 20 m: the 1 m contour sits at east = 5.
    const ramp = terrain([
      [0, 2, 4],
      [0, 2, 4],
      [0, 2, 4],
    ])
    const { minor, major } = contourSegments(ramp, 1, 5)
    const atOne = minor.filter(([a]) => a[2] === 1)
    expect(atOne.length).toBeGreaterThan(0)
    for (const [a, b] of atOne) {
      expect(a[0]).toBeCloseTo(5, 6)
      expect(b[0]).toBeCloseTo(5, 6)
      expect(b[2]).toBe(1)
    }
    // The contour spans the full north extent (0…20 m) with no gaps.
    const norths = atOne.flatMap(([a, b]) => [a[1], b[1]])
    expect(Math.min(...norths)).toBeCloseTo(0, 6)
    expect(Math.max(...norths)).toBeCloseTo(20, 6)
    // Levels on grid vertices (2 m, and 4 m along the east edge) are traced too; none is a 5 m major.
    expect(new Set(minor.map(([a]) => a[2]))).toEqual(new Set([1, 2, 3, 4]))
    expect(major).toEqual([])
  })

  it('puts multiples of the major interval in the major set', () => {
    const slope = terrain([
      [0, 6, 12],
      [0, 6, 12],
    ])
    const { minor, major } = contourSegments(slope, 1, 5)
    expect(new Set(major.map(([a]) => a[2]))).toEqual(new Set([5, 10]))
    expect(major.length).toBeGreaterThan(0)
    expect(minor.some(([a]) => a[2] === 5)).toBe(false)
  })

  it('returns nothing on flat ground', () => {
    const flat = terrain([
      [3, 3],
      [3, 3],
    ])
    expect(contourSegments(flat, 1, 5)).toEqual({ minor: [], major: [] })
  })
})

function raster(heights: number[][]): RasterGrid {
  const rows = heights.length
  const cols = heights[0]?.length ?? 0
  const flat = new Float32Array(rows * cols)
  heights.forEach((row, r) => row.forEach((height, c) => { flat[r * cols + c] = height }))
  return { cols, rows, minX: 0, maxX: cols * 10, minY: 0, maxY: rows * 10, heights: flat }
}

describe('rasterContourSegments (1 m tile)', () => {
  it('splits levels into minor and major on an east-facing ramp', () => {
    const ramp = raster([
      [0, 6, 12],
      [0, 6, 12],
      [0, 6, 12],
    ])
    const { minor, major } = rasterContourSegments(ramp, 1, 5)
    expect(minor.length).toBeGreaterThan(0)
    expect(major.length).toBeGreaterThan(0)
    for (const [a] of major) expect(a[2] % 5).toBeCloseTo(0, 9)
    for (const [a] of minor) expect(a[2] % 5).not.toBeCloseTo(0, 9)
  })

  it('keeps the segment level (z) for the caller to re-sample the drawn surface', () => {
    const ramp = raster([
      [0, 2, 4],
      [0, 2, 4],
    ])
    const { minor } = rasterContourSegments(ramp, 1, 5)
    // Every minor vertex carries its contour level in z (the level, not the surface height).
    for (const [a] of minor) expect([1, 2, 3, 4]).toContain(a[2])
  })

  it('skips no-data cells without throwing', () => {
    const withGap = raster([
      [0, NaN, 4],
      [0, 2, 4],
    ])
    const { minor, major } = rasterContourSegments(withGap, 1, 5)
    expect(minor.length + major.length).toBeGreaterThan(0)
  })

  it('flattens a segment to [ax, ay, bx, by]', () => {
    const segment: ContourSegment = [[1, 2, 3], [4, 5, 6]]
    expect(Array.from(flattenContours([segment]))).toEqual([1, 2, 4, 5])
  })
})

describe('gaussianBlur (Run 10 T5)', () => {
  it('is unchanged on a constant raster', () => {
    const flat = raster([[3, 3, 3], [3, 3, 3], [3, 3, 3]])
    const blurred = gaussianBlur(flat, 3)
    for (const value of blurred.heights) expect(value).toBeCloseTo(3, 5)
  })

  it('spreads an impulse symmetrically', () => {
    const size = 13
    const impulse = raster(Array.from({ length: size }, () => Array(size).fill(0)))
    impulse.heights[6 * size + 6] = 1
    const blurred = gaussianBlur(impulse, 3)
    // Symmetric around the centre: mirrored cells match.
    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        expect(blurred.heights[row * size + col]).toBeCloseTo(blurred.heights[(size - 1 - row) * size + (size - 1 - col)]!, 5)
      }
    }
    // The centre is the peak.
    expect(blurred.heights[6 * size + 6]).toBeGreaterThan(blurred.heights[6 * size + 4]!)
  })
})

describe('chainContours (Run 10 T5)', () => {
  it('joins a square ring into one polyline and keeps it', () => {
    const ring: ContourSegment[] = [
      [[0, 0, 1], [10, 0, 1]],
      [[10, 0, 1], [10, 10, 1]],
      [[10, 10, 1], [0, 10, 1]],
      [[0, 10, 1], [0, 0, 1]],
    ]
    const chained = chainContours(ring, 20)
    expect(chained.length).toBe(4) // the whole 40 m ring survives
  })

  it('drops a polyline shorter than the minimum length', () => {
    const short: ContourSegment[] = [
      [[0, 0, 1], [5, 0, 1]],
      [[5, 0, 1], [10, 0, 1]],
    ]
    expect(chainContours(short, 20)).toEqual([])
    expect(chainContours(short, 5).length).toBe(2)
  })
})
