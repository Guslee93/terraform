import { describe, expect, it } from 'vitest'
import { traceStreamlines } from './streamlines'
import { rasterize, sampleVelocity, type FlowFrame } from './lbm'
import type { FlowResult } from './flowRunner'
import { pointInPolygon } from '../../lib/polygon'
import type { Vec2 } from '../../lib/coordinates'

const frame: FlowFrame = { nx: 80, ny: 80, dx: 1, centre: [0, 0], flow: [1, 0] }
const block = { height: 10, footprint: [[-5, -10], [5, -10], [5, 10], [-5, 10]] as Vec2[] }
const velocity = new Float32Array(80 * 80 * 2)
for (let i = 0; i < velocity.length; i += 2) velocity[i] = 1
const flow: FlowResult = { id: 1, frame, velocity, solid: rasterize(frame, [block]), settled: true }
const circle = { centre: [0, 0] as Vec2, radius: 30 }

describe('traceStreamlines', () => {
  it('is deterministic, ranks and caps results, with a speed per point', () => {
    const lines = traceStreamlines(flow, circle)
    expect(lines).toEqual(traceStreamlines(flow, circle))
    expect(lines).toHaveLength(150)
    const scores = lines.map((l) => {
      expect(l.speeds).toHaveLength(l.points.length)
      const length = l.points.slice(1).reduce((sum, p, i) => sum + Math.hypot(p[0] - l.points[i]![0], p[1] - l.points[i]![1]), 0)
      return length * l.speeds.reduce((sum, s) => sum + s, 0) / l.speeds.length
    })
    expect(scores).toEqual([...scores].sort((a, b) => b - a))
  })
  it('never enters a building or leaves the circle, even with a large requested step', () => {
    for (const line of traceStreamlines(flow, circle, { stepM: 12 })) {
      for (const p of line.points) {
        expect(Math.hypot(...p)).toBeLessThanOrEqual(circle.radius)
        expect(pointInPolygon(p, block.footprint)).toBe(false)
        expect(sampleVelocity(frame, velocity, flow.solid, p)).not.toBeNull()
      }
    }
  })
  it('stops at stagnation', () => {
    expect(traceStreamlines({ ...flow, velocity: new Float32Array(velocity.length) }, circle)).toEqual([])
  })
  it('integrates both forward and backward', () => {
    const lines = traceStreamlines({ ...flow, solid: new Uint8Array(flow.solid.length) }, circle, { seeds: 1, maxSteps: 200 })
    expect(lines.length).toBeGreaterThan(0)
    expect(lines[0]!.points[0]![0]).toBeLessThan(0)
    expect(lines[0]!.points.at(-1)![0]).toBeGreaterThan(0)
  })
})
