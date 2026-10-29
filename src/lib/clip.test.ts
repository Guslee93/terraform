import { describe, expect, it } from 'vitest'
import type { Vec2 } from './coordinates'
import {
  differencePolygons,
  intersectPolygons,
  multiPolygonArea,
  outerRings,
  unionPolygons,
} from './clip'

const square = (size: number, [cx, cy]: Vec2 = [0, 0]): Vec2[] => [
  [cx - size / 2, cy - size / 2],
  [cx + size / 2, cy - size / 2],
  [cx + size / 2, cy + size / 2],
  [cx - size / 2, cy + size / 2],
]

describe('planar clip helpers', () => {
  it('unions overlapping squares into one polygon of the right area', () => {
    const result = unionPolygons([[square(10)], [square(10, [5, 0])]])
    expect(result).toHaveLength(1)
    expect(multiPolygonArea(result)).toBeCloseTo(150, 9)
  })

  it('keeps disjoint squares as two polygons', () => {
    const result = unionPolygons([[square(10)], [square(10, [30, 0])]])
    expect(result).toHaveLength(2)
    expect(multiPolygonArea(result)).toBeCloseTo(200, 9)
  })

  it('intersects to the shared area and returns nothing when disjoint', () => {
    expect(multiPolygonArea(intersectPolygons([[square(10)]], [[square(10, [5, 0])]]))).toBeCloseTo(50, 9)
    expect(intersectPolygons([[square(10)]], [[square(10, [30, 0])]])).toEqual([])
  })

  it('difference leaves the uncovered part, with a hole when needed', () => {
    const ring = differencePolygons([[square(10)]], [[square(10, [5, 0])]])
    expect(multiPolygonArea(ring)).toBeCloseTo(50, 9)
    const donut = differencePolygons([[square(10)]], [[square(4)]])
    expect(donut).toHaveLength(1)
    expect(donut[0]).toHaveLength(2)
    expect(multiPolygonArea(donut)).toBeCloseTo(84, 9)
    expect(outerRings(donut)).toHaveLength(1)
  })

  it('a square touching another only along an edge adds no shared area', () => {
    expect(intersectPolygons([[square(10)]], [[square(10, [10, 0])]])).toEqual([])
  })

  it('works at ENU-scale coordinates without geodesic distortion', () => {
    const big = square(1000, [5000, -8000])
    expect(multiPolygonArea(unionPolygons([[big], [square(1000, [5500, -8000])]]))).toBeCloseTo(1_500_000, 3)
  })

  it('returns empty for empty input', () => {
    expect(unionPolygons([])).toEqual([])
    expect(differencePolygons([], [[square(1)]])).toEqual([])
    expect(multiPolygonArea([])).toBe(0)
  })
})
