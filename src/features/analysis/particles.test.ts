import { describe, expect, it } from 'vitest'
import type { FlowFrame } from './lbm'
import { advect, smoothVelocity } from './particles'

// A 4 × 4 grid of 1 m cells centred on the origin, wind blowing east (+x): grid = world + 2.
const frame: FlowFrame = { nx: 4, ny: 4, dx: 1, centre: [0, 0], flow: [1, 0] }
const field = (along: (x: number, y: number) => number) => {
  const velocity = new Float32Array(32)
  for (let y = 0; y < 4; y += 1) for (let x = 0; x < 4; x += 1) velocity[2 * (y * 4 + x)] = along(x, y)
  return velocity
}
const open = new Uint8Array(16)
const out = new Float32Array(2)

describe('smoothVelocity', () => {
  it('returns the cell value at a cell centre and blends linearly between centres', () => {
    const velocity = field((x) => x) // 0, 1, 2, 3 across the columns
    expect(smoothVelocity(frame, velocity, open, -0.5, 0.5, out)).toBe(true) // centre of column 1
    expect(out[0]).toBeCloseTo(1)
    smoothVelocity(frame, velocity, open, 0, 0.5, out) // halfway between columns 1 and 2
    expect(out[0]).toBeCloseTo(1.5)
    expect(out[1]).toBeCloseTo(0)
  })

  it('rotates into world axes for another wind direction', () => {
    const north: FlowFrame = { ...frame, flow: [0, 1] }
    smoothVelocity(north, field(() => 1), open, 0.2, 0.3, out)
    expect(out[0]).toBeCloseTo(0)
    expect(out[1]).toBeCloseTo(1)
  })

  it('leaves solid neighbours out instead of dragging the flow to zero at a wall', () => {
    const solid = new Uint8Array(16)
    solid[1 * 4 + 2] = 1 // the cell east of column 1, row 1
    const velocity = field(() => 1)
    velocity[2 * (1 * 4 + 2)] = 0
    expect(smoothVelocity(frame, velocity, solid, -0.1, -0.5, out)).toBe(true) // fluid cell, right beside the wall
    expect(out[0]).toBeCloseTo(1)
  })

  it('is false inside a building and off the grid', () => {
    const solid = new Uint8Array(16)
    solid[1 * 4 + 2] = 1
    expect(smoothVelocity(frame, field(() => 1), solid, 0.5, -0.5, out)).toBe(false)
    expect(smoothVelocity(frame, field(() => 1), open, 5, 0, out)).toBe(false)
  })
})

describe('advect', () => {
  it('moves a point downwind by the free-wind distance times the local ratio', () => {
    const pos = new Float32Array([-1, 0.5])
    expect(advect(frame, field(() => 0.5), open, pos, 0, 2, out)).toBeCloseTo(0.5)
    expect(pos[0]).toBeCloseTo(0)
    expect(pos[1]).toBeCloseTo(0.5)
  })

  it('follows a turning flow with the midpoint step, not the starting direction', () => {
    // Along-wind 1 everywhere; cross-wind grows downstream, so the path should curve north.
    const velocity = field(() => 1)
    for (let y = 0; y < 4; y += 1) for (let x = 0; x < 4; x += 1) velocity[2 * (y * 4 + x) + 1] = x * 0.5
    const pos = new Float32Array([-1.5, -0.5]) // centre of column 0: cross-wind 0 there
    advect(frame, velocity, open, pos, 0, 1, out)
    expect(pos[0]).toBeCloseTo(-0.5)
    expect(pos[1]).toBeGreaterThan(-0.5) // an Euler step from the start would not have moved north at all
  })

  it('refuses a step that ends in a building and leaves the point in place', () => {
    const solid = new Uint8Array(16)
    solid[2 * 4 + 2] = 1
    const pos = new Float32Array([-0.5, 0.5])
    expect(advect(frame, field(() => 1), solid, pos, 0, 1, out)).toBe(-1)
    expect(Array.from(pos)).toEqual([-0.5, 0.5])
  })
})
