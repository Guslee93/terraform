import { describe, expect, it } from 'vitest'
import type { Vec2 } from '../../lib/coordinates'
import { createLbm, flowFrame, gridToWorld, rasterize, sampleRatio, sampleVelocity, speedRatio, stepLbm, velocityField, worldToGrid } from './lbm'

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
    // World velocity upstream points east (downwind) with magnitude ~1.
    const up = sampleVelocity(fr, velocityField(s), solid, [-80, 40])!
    expect(up[0]).toBeGreaterThan(0.9)
    expect(Math.abs(up[1])).toBeLessThan(0.1)
  })
})

describe('canonical flow cases', () => {
  it('channels wind through the gap between two blocks (wind from west)', () => {
    const fr = flowFrame(square(-100, 100, -100, 100), 270, 96, 64)
    const blocks = [
      { height: 20, footprint: square(-15, 15, -50, -25) },
      { height: 20, footprint: square(-15, 15, 25, 50) },
    ]
    const solid = rasterize(fr, blocks)
    const s = createLbm(fr.nx, fr.ny, solid, 0.1, 0.6)
    stepLbm(s, 1500)
    const r = speedRatio(s)
    const gap = sampleRatio(fr, r, solid, [0, 0])! // in the gap between the blocks
    const open = sampleRatio(fr, r, solid, [-85, 0])! // open ground upstream on the same axis
    expect(gap).toBeGreaterThan(1.0) // channelled: faster than the reference wind
    expect(gap).toBeLessThan(1.5) // modest channelling only — do not exaggerate it
    expect(gap).toBeGreaterThan(open)
  })

  it('keeps the inner corner of an L calmer than the outer corner (wind from west)', () => {
    const fr = flowFrame(square(-100, 100, -100, 100), 270, 96, 64)
    const l: Vec2[] = [
      [-10, -40],
      [30, -40],
      [30, -20],
      [10, -20],
      [10, 10],
      [-10, 10],
    ]
    const solid = rasterize(fr, [{ height: 20, footprint: l }])
    const s = createLbm(fr.nx, fr.ny, solid, 0.1, 0.6)
    stepLbm(s, 1500)
    const r = speedRatio(s)
    const inner = sampleRatio(fr, r, solid, [14, -16])! // concave corner, sheltered in the lee of the arm
    const outer = sampleRatio(fr, r, solid, [14, 14])! // convex corner, the flow separates around it
    expect(Number.isFinite(inner)).toBe(true)
    expect(Number.isFinite(outer)).toBe(true)
    expect(inner).toBeLessThan(outer / 2)
  })

  it('keeps density bounded and flow moving through a dense block grid (outlet anchors pressure)', () => {
    const nx = 96
    const ny = 64
    const solid = new Uint8Array(nx * ny)
    for (let y = 0; y < ny; y++) for (let x = 20; x < 76; x++) if ((x - 20) % 14 < 10 && y % 14 < 10) solid[y * nx + x] = 1
    const s = createLbm(nx, ny, solid)
    const meanRho = () => {
      let rho = 0
      let fluid = 0
      for (let i = 0; i < nx * ny; i++) {
        if (solid[i]) continue
        fluid++
        for (let k = 0; k < 9; k++) rho += s.f[k * nx * ny + i]!
      }
      return rho / fluid
    }
    stepLbm(s, 1500)
    const early = meanRho()
    stepLbm(s, 1500)
    expect(Math.abs(meanRho() - early)).toBeLessThan(0.01) // settled, not accumulating mass
    expect(speedRatio(s)[11 * nx + 50]).toBeGreaterThan(0.5) // street running with the wind
  })
})
