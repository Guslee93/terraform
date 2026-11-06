import { describe, expect, it } from 'vitest'
import type { Vec2 } from '../../lib/coordinates'
import { createLbm, flowFrame, gridToWorld, rasterize, sampleRatio, speedRatio, stepLbm, worldToGrid } from './lbm'

const square = (x0: number, x1: number, y0: number, y1: number): Vec2[] => [
  [x0, y0],
  [x1, y0],
  [x1, y1],
  [x0, y1],
]

describe('flow frame', () => {
  it('round-trips world <-> grid and points the grid +x downwind', () => {
    const fr = flowFrame(square(-100, 100, -100, 100), 270) // wind from west, blows east
    const p: Vec2 = [12, -7]
    const back = gridToWorld(fr, worldToGrid(fr, p))
    expect(back[0]).toBeCloseTo(12, 6)
    expect(back[1]).toBeCloseTo(-7, 6)
    expect(worldToGrid(fr, [50, 0])[0]).toBeGreaterThan(worldToGrid(fr, [-50, 0])[0])
  })
})

describe('D2Q9 solver', () => {
  it('keeps uniform flow uniform with no obstacles', () => {
    const s = createLbm(32, 16, new Uint8Array(32 * 16))
    stepLbm(s, 200)
    const r = speedRatio(s)
    for (const v of r) expect(v).toBeCloseTo(1, 2)
  })

  it('shows a calm wake behind and faster flow beside a single block (wind from west)', () => {
    const fr = flowFrame(square(-100, 100, -100, 100), 270, 96, 64)
    const block = { height: 20, footprint: square(-10, 10, -10, 10) }
    const solid = rasterize(fr, [block])
    const s = createLbm(fr.nx, fr.ny, solid, 0.1, 0.6)
    stepLbm(s, 1500)
    const r = speedRatio(s)
    const wake = sampleRatio(fr, r, solid, [25, 0])! // downwind (east)
    const side = sampleRatio(fr, r, solid, [0, 36])! // beside the block, outside the wall boundary layer
    expect(sampleRatio(fr, r, solid, [0, 0])).toBeNull()
    expect(wake).toBeLessThan(0.6)
    expect(side).toBeGreaterThan(1.05)
    for (const v of r) expect(Number.isFinite(v)).toBe(true)
  })
})
