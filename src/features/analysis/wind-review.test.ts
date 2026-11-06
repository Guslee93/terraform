// Regression tests for the C23 wind code review findings (docs/reviews/wind-code-review.md).
import { describe, expect, it } from 'vitest'
import type { Vec2 } from '../../lib/coordinates'
import { baselineMatches, buildClimateView, captureBaseline, DEFAULT_WIND } from './climateView'
import { downwashBoost } from './comfort'
import { createFlowRunner } from './flowRunner'
import { circlePolygon } from './grid'
import { flowFrame } from './lbm'

const rect = (x0: number, x1: number, y0: number, y1: number): Vec2[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
const circle = { centre: [0, 0] as Vec2, radius: 40 }
const disc = circlePolygon(circle.centre, circle.radius)

describe('C23 review regressions', () => {
  it('a baseline taken with the downwash rule on does not match with it off (finding 2)', () => {
    const runner = createFlowRunner()
    runner.request({ id: 1, frame: flowFrame(disc, 270, 32, 32), buildings: [], reset: true })
    const base = captureBaseline(runner.tick(0)!, circle, 270, true)
    expect(baselineMatches(base, circle, 270, true)).toBe(true)
    expect(baselineMatches(base, circle, 270, false)).toBe(false)
    const flow = runner.tick(0)!
    const view = buildClimateView('wind', disc, [], [], flow, { ...DEFAULT_WIND, display: 'delta', downwash: false, centre: circle.centre, radius: circle.radius }, 10, base)
    expect(view.assessed).toBe(0) // no delta across different model settings
  })

  it('downwash ignores buildings that cannot reach the frame, and stays fast on large sites (finding 5)', () => {
    const frame = flowFrame(circlePolygon([0, 0], 100), 270, 160, 160, 1.4)
    const tower = { height: 40, footprint: rect(-10, 10, -10, 10) }
    const far = Array.from({ length: 5000 }, (_, i) => ({ height: 12, footprint: rect(2000 + (i % 100) * 20, 2010 + (i % 100) * 20, Math.floor(i / 100) * 20, Math.floor(i / 100) * 20 + 10) }))
    const t0 = performance.now()
    const withFar = downwashBoost([tower, ...far], frame)
    const ms = performance.now() - t0
    expect([...withFar]).toEqual([...downwashBoost([tower], frame)]) // far buildings change nothing
    expect(ms).toBeLessThan(300) // was ~856 ms when every building was a candidate
  })
})
