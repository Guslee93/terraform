import { describe, expect, it } from 'vitest'
import type { TerrainData } from './package'
import { contourSegments } from './contours'

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
