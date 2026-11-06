import { describe, expect, it } from 'vitest'
import type { Vec2 } from '../../lib/coordinates'
import { createFlowRunner } from './flowRunner'
import { flowFrame, sampleVelocity } from './lbm'

const square = (x0: number, x1: number, y0: number, y1: number): Vec2[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
const area = square(-100, 100, -100, 100)
const tower = { height: 40, footprint: square(-10, 10, -10, 10) }
const speedAt = (downwash: boolean, p: Vec2) => {
  const runner = createFlowRunner()
  const frame = flowFrame(area, 270, 64, 64)
  runner.request({ id: 1, frame, buildings: [tower], reset: true, downwash })
  const r = runner.tick(0)!
  const v = sampleVelocity(r.frame, r.velocity, r.solid, p)!
  return Math.hypot(v[0], v[1])
}

describe('flow runner', () => {
  it('applies the downwash boost on the upwind face of a 40 m tower only when asked', () => {
    const upwind: Vec2 = [-16, 0]
    expect(speedAt(true, upwind)).toBeGreaterThan(speedAt(false, upwind) * 1.05)
    const lee: Vec2 = [20, 0]
    expect(speedAt(true, lee)).toBeCloseTo(speedAt(false, lee), 6)
  })
  it('reports settled only after the step budget', () => {
    const runner = createFlowRunner()
    runner.request({ id: 7, frame: flowFrame(area, 0, 16, 16), buildings: [], reset: true })
    const first = runner.tick(0)!
    expect(first.id).toBe(7)
    expect(first.settled).toBe(false)
  })
})
