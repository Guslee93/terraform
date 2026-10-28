import { describe, expect, it } from 'vitest'
import type { Vec2 } from './coordinates'
import { pointsOutsideRings } from './cullPoints'

describe('pointsOutsideRings', () => {
  it('returns a copy of all points when no rings are given', () => {
    const points: Vec2[] = [
      [0, 0],
      [10, 10],
    ]
    const result = pointsOutsideRings(points, [])
    expect(result).toEqual(points)
    expect(result).not.toBe(points) // fresh copy
  })

  it('removes points inside a single square ring', () => {
    const ring: Vec2[] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ]
    const points: Vec2[] = [
      [5, 5],   // inside → removed
      [-1, 5],  // outside → kept
      [5, -1],  // outside → kept
      [15, 5],  // outside → kept
      [12, 12], // outside → kept
    ]
    expect(pointsOutsideRings(points, [ring])).toEqual([
      [-1, 5],
      [5, -1],
      [15, 5],
      [12, 12],
    ])
  })

  it('treats a point exactly on an edge as inside (removed)', () => {
    const ring: Vec2[] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ]
    const onEdge: Vec2 = [5, 0] // on the bottom edge
    const corner: Vec2 = [0, 0] // on a ring vertex
    // pointInPolygon's ray-cast rule, verified: an edge-touching point crosses
    // once and registers as inside, matching the "on the edge counts as inside"
    // contract in D14.
    expect(pointsOutsideRings([onEdge, corner], [ring])).toEqual([])
  })

  it('handles two overlapping rings, removing points inside either', () => {
    const leftRing: Vec2[] = [
      [-10, -10],
      [10, -10],
      [10, 10],
      [-10, 10],
    ]
    const rightRing: Vec2[] = [
      [0, -10],
      [20, -10],
      [20, 10],
      [0, 10],
    ]
    const points: Vec2[] = [
      [-15, 0],  // outside both → kept
      [-5, 0],   // inside left only → removed
      [5, 0],    // inside both → removed
      [15, 0],   // inside right only → removed
      [25, 0],   // outside both → kept
    ]
    expect(pointsOutsideRings(points, [leftRing, rightRing])).toEqual([
      [-15, 0],
      [25, 0],
    ])
  })

  it('preserves input order', () => {
    const ring: Vec2[] = [
      [0, 0],
      [5, 0],
      [5, 5],
      [0, 5],
    ]
    const points: Vec2[] = [
      [10, 0],  // outside → 1st in result
      [2, 2],   // inside → removed
      [10, 10], // outside → 2nd in result
      [1, 1],   // inside → removed
      [0, 10],  // outside → 3rd in result
    ]
    expect(pointsOutsideRings(points, [ring])).toEqual([
      [10, 0],
      [10, 10],
      [0, 10],
    ])
  })
})