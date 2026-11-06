import type { Vec2 } from '../../lib/coordinates'
import type { FlowResult } from './flowRunner'
import { sampleVelocity } from './lbm'

export type WindCircle = { readonly centre: Vec2; readonly radius: number }
export type Streamline = { points: Vec2[]; speeds: number[] }

/** Deterministic, bidirectional midpoint integration in local ENU metres. */
export function traceStreamlines(flow: FlowResult, circle: WindCircle, { seeds = 400, keep = 150, stepM = 1.5, maxSteps = 300 } = {}): Streamline[] {
  if (seeds <= 0 || keep <= 0 || stepM <= 0 || maxSteps <= 0 || circle.radius <= 0) return []
  let state = 21
  const random = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296)
  const sample = (p: Vec2) => {
    if (Math.hypot(p[0] - circle.centre[0], p[1] - circle.centre[1]) > circle.radius) return null
    const v = sampleVelocity(flow.frame, flow.velocity, flow.solid, p)
    return v && Number.isFinite(Math.hypot(...v)) && Math.hypot(...v) >= 0.05 ? v : null
  }
  // Check the whole segment at sub-cell intervals, including RK2's midpoint probe.
  const clearSegment = (a: Vec2, b: Vec2) => {
    const checks = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (flow.frame.dx / 4)))
    for (let j = 1; j <= checks; j++) {
      if (!sample([a[0] + (b[0] - a[0]) * j / checks, a[1] + (b[1] - a[1]) * j / checks])) return false
    }
    return true
  }
  const h = stepM
  const trace = (seed: Vec2, sign: number): Streamline => {
    const points: Vec2[] = []
    const speeds: number[] = []
    let p = seed
    for (let i = 0; i < maxSteps; i++) {
      const v = sample(p)
      if (!v) break
      points.push(p)
      speeds.push(Math.hypot(...v))
      const d = sign * h / Math.hypot(...v)
      const mid: Vec2 = [p[0] + v[0] * d / 2, p[1] + v[1] * d / 2]
      const vm = sample(mid)
      if (!vm || !clearSegment(p, mid)) break
      const dm = sign * h / Math.hypot(...vm)
      const next: Vec2 = [p[0] + vm[0] * dm, p[1] + vm[1] * dm]
      if (!clearSegment(p, next)) break
      p = next
    }
    return { points, speeds }
  }
  const side = Math.ceil(Math.sqrt(seeds * 4 / Math.PI))
  const candidates = []
  for (let i = 0, accepted = 0; i < side * side && accepted < seeds; i++) {
    const p: Vec2 = [circle.centre[0] + ((i % side + random()) / side * 2 - 1) * circle.radius,
      circle.centre[1] + ((Math.floor(i / side) + random()) / side * 2 - 1) * circle.radius]
    if (!sample(p)) continue
    accepted++
    const forward = trace(p, 1)
    const backward = trace(p, -1)
    const points = [...backward.points.slice(1).reverse(), ...forward.points]
    const speeds = [...backward.speeds.slice(1).reverse(), ...forward.speeds]
    if (points.length < 2) continue
    const length = points.slice(1).reduce((sum, q, j) => sum + Math.hypot(q[0] - points[j]![0], q[1] - points[j]![1]), 0)
    candidates.push({ points, speeds, score: length * speeds.reduce((sum, s) => sum + s, 0) / speeds.length })
  }
  return candidates.sort((a, b) => b.score - a.score).slice(0, keep).map(({ points, speeds }) => ({ points, speeds }))
}
