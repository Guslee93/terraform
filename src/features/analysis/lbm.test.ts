import { describe, expect, it } from 'vitest'
import type { Vec2 } from '../../lib/coordinates'
import { createLbm, flowFrame, gridToWorld, rasterize, refillExchange, sampleRatio, sampleVelocity, speedRatio, stepLbm, velocityField, worldToGrid } from './lbm'

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

describe('refill from above (ADR-0030)', () => {
  it('turns a refill length into a per-step rate: the free stream crosses it once per e-fold', () => {
    expect(refillExchange(25, 3.5)).toBeCloseTo(0.014, 12) // 0.1 cells/step × 3.5 m / 25 m
    expect(refillExchange(null, 3.5)).toBe(0)
    expect(refillExchange(0.1, 3.5)).toBe(1) // never more than all the way in one step
  })

  it('leaves the free stream as it is', () => {
    const s = createLbm(32, 16, new Uint8Array(32 * 16), 0.1, 0.6, 0.05)
    stepLbm(s, 200)
    for (const v of speedRatio(s)) expect(v).toBeCloseTo(1, 2)
  })

  it('shortens a wake without removing it, and keeps the density', () => {
    const fr = flowFrame(square(-100, 100, -100, 100), 270, 96, 64)
    const solid = rasterize(fr, [{ height: 20, footprint: square(-10, 10, -10, 10) }])
    const solve = (exchange: number) => {
      const s = createLbm(fr.nx, fr.ny, solid, 0.1, 0.6, exchange)
      stepLbm(s, 1500)
      let rho = 0, fluid = 0
      for (let i = 0; i < fr.nx * fr.ny; i++) if (!solid[i]) { fluid++; for (let k = 0; k < 9; k++) rho += s.f[k * fr.nx * fr.ny + i]! }
      return { r: speedRatio(s), rho: rho / fluid }
    }
    const flat = solve(0), refilled = solve(refillExchange(20, fr.dx)) // refills over 20 m
    const deficit = (r: Float32Array, p: Vec2) => 1 - sampleRatio(fr, r, solid, p)!
    // Right behind the block the wake is still there; 50 m on, most of it has refilled.
    expect(1 - deficit(refilled.r, [13, 0])).toBeLessThan(0.6)
    expect(deficit(refilled.r, [60, 0])).toBeLessThan(deficit(flat.r, [60, 0]) / 3)
    expect(Math.abs(refilled.rho - 1)).toBeLessThan(0.01)
  })
})
