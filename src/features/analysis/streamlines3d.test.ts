import { describe, expect, it } from 'vitest'
import type { Vec2 } from '../../lib/coordinates'
import { createFlowRunner, type FlowSlice } from './flowRunner'
import { circlePolygon } from './grid'
import { flowFrame } from './lbm'
import { CLIMB_MAX_M, heightGrid, traceStreamlines3D, velocityAtHeight } from './streamlines3d'

const rect = (x0: number, x1: number, y0: number, y1: number): Vec2[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
const R = 60
const frame = flowFrame(circlePolygon([0, 0], R), 270, 64, 64, 1.4) // wind from the west, blows east

/** Solve the full slice stack synchronously for a building set. */
function stack(buildings: { height: number; footprint: Vec2[] }[]): FlowSlice[] {
  const runner = createFlowRunner(() => 0) // budget never runs out within one chunk loop
  runner.request({ id: 1, frame, buildings, reset: true, slices: true })
  for (let i = 0; i < 5000; i++) {
    const r = runner.tick(0)
    if (r?.slicesComplete && r.slices) return r.slices
  }
  throw new Error('slices did not complete')
}

describe('pseudo-3D streamlines', { timeout: 30_000 }, () => {
  const low = { height: 8, footprint: rect(-10, 10, -10, 10) }
  const slicesLow = stack([low])

  it('interpolates between slices and is blocked only where every bracketing slice is solid', () => {
    // 8 m block: at 12 m both bracketing slices (10, 20) are open over it.
    expect(velocityAtHeight(frame, slicesLow, [0, 0], 12)).not.toBeNull()
    const g = heightGrid(frame, [low])
    expect(Math.max(...g)).toBe(8)
  })

  it('lines rise over a low block, never pass through it, and come back down', () => {
    const lines = traceStreamlines3D(frame, slicesLow, [low], R, { across: 9, heights: [2] })
    const g = heightGrid(frame, [low])
    expect(lines.length).toBeGreaterThan(0)
    const over = lines.filter((l) => l.points.some(([x, y]) => Math.abs(x) < 9 && Math.abs(y) < 9))
    expect(over.length).toBeGreaterThan(0) // some lines cross the roof
    for (const l of lines) for (const [x, y, z] of l.points) {
      if (Math.abs(x) < 9 && Math.abs(y) < 9) expect(z).toBeGreaterThan(8) // above the roof, never through it
    }
    const crossing = over[0]!
    const lastZ = crossing.points.at(-1)![2]
    const peak = Math.max(...crossing.points.map((q) => q[2]))
    expect(peak).toBeGreaterThan(8)
    expect(lastZ).toBeLessThan(peak) // relaxes back down downwind
    expect(g.length).toBe(frame.nx * frame.ny)
  })

  it(`does not climb a tower more than ${CLIMB_MAX_M} m above a line; is deterministic`, () => {
    const tower = { height: 40, footprint: rect(-10, 10, -10, 10) }
    const slices = stack([tower])
    expect(velocityAtHeight(frame, slices, [0, 0], 5)).toBeNull() // 40 m tower: the covering 2 m slice is solid up to its roof
    const a = traceStreamlines3D(frame, slices, [tower], R, { across: 9, heights: [2] })
    const b = traceStreamlines3D(frame, slices, [tower], R, { across: 9, heights: [2] })
    expect(a).toEqual(b)
    for (const l of a) for (const [x, y, z] of l.points) {
      expect(z).toBeLessThan(2 + CLIMB_MAX_M + 5)
      expect(Math.abs(x) < 9 && Math.abs(y) < 9).toBe(false) // goes round, not through
    }
  })
})
