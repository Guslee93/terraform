import { describe, expect, it } from 'vitest'
import type { Vec2 } from './coordinates'
import { footprintDimensions } from './dimensions'

// Spec: status report §15.3b D9.

function expectDimensions(
  vertices: readonly Vec2[],
  width: number,
  depth: number,
  rotation: number,
): void {
  const result = footprintDimensions(vertices)
  expect(result.width).toBeCloseTo(width, 9)
  expect(result.depth).toBeCloseTo(depth, 9)
  expect(result.rotation).toBeCloseTo(rotation, 9)
}

/** Rotate `vertices` by `angle` radians counter-clockwise about the origin. */
function rotate(vertices: readonly Vec2[], angle: number): Vec2[] {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return vertices.map(([east, north]) => [
    east * cos - north * sin,
    east * sin + north * cos,
  ])
}

const RECTANGLE_18x12: readonly Vec2[] = [
  [-9, -6],
  [9, -6],
  [9, 6],
  [-9, 6],
]

describe('footprintDimensions', () => {
  it('measures an axis-aligned 18 × 12 rectangle', () => {
    expectDimensions(RECTANGLE_18x12, 18, 12, 0)
  })

  it('measures the same rectangle rotated 30° about its centre', () => {
    expectDimensions(rotate(RECTANGLE_18x12, Math.PI / 6), 18, 12, Math.PI / 6)
  })

  it('measures the 20 × 10 L-shape from the QA fixtures', () => {
    expectDimensions(
      [
        [0, 0],
        [20, 0],
        [20, 5],
        [10, 5],
        [10, 10],
        [0, 10],
      ],
      20,
      10,
      0,
    )
  })

  it('measures a 10 × 10 square with the smallest tie rotation', () => {
    expectDimensions(
      [
        [-5, -5],
        [5, -5],
        [5, 5],
        [-5, 5],
      ],
      10,
      10,
      0,
    )
  })

  it('measures a 12 wide × 18 deep rectangle as 18 × 12 at π/2', () => {
    expectDimensions(
      [
        [-6, -9],
        [6, -9],
        [6, 9],
        [-6, 9],
      ],
      18,
      12,
      Math.PI / 2,
    )
  })

  it('returns zeros for fewer than three vertices', () => {
    expectDimensions([], 0, 0, 0)
    expectDimensions([[0, 0]], 0, 0, 0)
    expectDimensions(
      [
        [0, 0],
        [20, 0],
      ],
      0,
      0,
      0,
    )
  })

  it('returns zeros for a degenerate collinear ring', () => {
    expectDimensions(
      [
        [0, 0],
        [10, 0],
        [20, 0],
      ],
      0,
      0,
      0,
    )
  })
})