import type { Vec2 } from '../../lib/coordinates'
import { pointInPolygon } from '../../lib/polygon'
import type { FlowSlice } from './flowRunner'
import type { FootprintBuilding } from './grid'
import { profileFactor } from './windProfile'
import { gridToWorld, sampleVelocity, worldToGrid, type FlowFrame } from './lbm'

/**
 * Pseudo-3D streamlines through the height-slice stack (W5c, docs/plans/wind-3d-plan.md §3B).
 *
 * Horizontal motion is the solved slice covering the line's height, scaled by the wind profile. Vertical
 * motion is a RULE, not solved physics: a line meeting a building it can clear within
 * CLIMB_MAX_M rises over the roof and relaxes back down afterwards; a taller building is left to
 * the horizontal field, which already routes the line round it. Labelled as visual guidance.
 */
export const STREAMLINE_3D_NOTE = 'Rise over roofs is a visual rule — the flow itself is layered 2D'

export const CLIMB_MAX_M = 15 // lines climb over buildings up to this much above them; taller ones are passed round
export const ROOF_CLEARANCE_M = 3
const LOOKAHEAD_M = 25
const LOOKAHEAD_SAMPLES = 5
const CLIMB_PER_M = 0.8 // metres up per metre travelled while climbing
const DESCEND_PER_M = 0.25
const MIN_Z_M = 1.5

export type Streamline3D = { readonly points: [number, number, number][]; readonly speeds: number[] }

/** Building height (m above terrain) per cell of the flow frame; 0 where open. Built once per field. */
export function heightGrid(frame: FlowFrame, buildings: readonly FootprintBuilding[]): Float32Array {
  const grid = new Float32Array(frame.nx * frame.ny)
  for (const b of buildings) {
    const g = b.footprint.map((p) => worldToGrid(frame, p))
    const x0 = Math.max(0, Math.floor(Math.min(...g.map((q) => q[0]))))
    const x1 = Math.min(frame.nx - 1, Math.ceil(Math.max(...g.map((q) => q[0]))))
    const y0 = Math.max(0, Math.floor(Math.min(...g.map((q) => q[1]))))
    const y1 = Math.min(frame.ny - 1, Math.ceil(Math.max(...g.map((q) => q[1]))))
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = y * frame.nx + x
      if (b.height > grid[i]! && pointInPolygon(gridToWorld(frame, [x + 0.5, y + 0.5]), b.footprint)) grid[i] = b.height
    }
  }
  return grid
}

function heightAtGrid(frame: FlowFrame, grid: Float32Array, p: Vec2): number {
  const [gx, gy] = worldToGrid(frame, p)
  const x = Math.floor(gx)
  const y = Math.floor(gy)
  if (x < 0 || y < 0 || x >= frame.nx || y >= frame.ny) return 0
  return grid[y * frame.nx + x]!
}

/**
 * Horizontal velocity ratio at (p, z); null if blocked. ADR-0029: the slice that covers z — the
 * highest solved height at or below it, where the same buildings block — scaled by the wind profile
 * to z. Exact within the layered model; blending toward a slice above would let a line pass
 * through a building that still stands at z.
 */
export function velocityAtHeight(frame: FlowFrame, slices: readonly FlowSlice[], p: Vec2, z: number): Vec2 | null {
  let covering = slices[0]
  for (const slice of slices) if (slice.z <= z) covering = slice
  if (!covering) return null
  const v = sampleVelocity(frame, covering.velocity, covering.solid, p)
  if (!v) return null
  const factor = profileFactor(Math.max(z, covering.z)) / profileFactor(covering.z)
  return [v[0] * factor, v[1] * factor]
}

/**
 * Seeds on an upwind line across the analysis area at a few heights, traced downwind.
 * Deterministic. Coordinates: x/y local ENU metres, z metres above terrain.
 */
export function traceStreamlines3D(
  frame: FlowFrame,
  slices: readonly FlowSlice[],
  buildings: readonly FootprintBuilding[],
  radius: number,
  { across = 18, heights = [2, 8, 16, 26], stepM = 2, maxSteps = 320 } = {},
): Streamline3D[] {
  if (slices.length === 0 || radius <= 0) return []
  const grid = heightGrid(frame, buildings)
  const [dx, dy] = frame.flow
  const perp: Vec2 = [-dy, dx]
  const c = frame.centre
  const limit = radius * 1.15 // a little past the circle, so the analysed area still reads
  const inside = (p: Vec2) => {
    const ox = p[0] - c[0]
    const oy = p[1] - c[1]
    return Math.abs(ox * dx + oy * dy) <= limit && Math.abs(ox * perp[0] + oy * perp[1]) <= limit
  }
  const lines: Streamline3D[] = []
  for (let k = 0; k < across * heights.length; k++) {
    const s = ((k % across) + 0.5) / across * 2 - 1
    const seedZ = heights[Math.floor(k / across)]! + (k % 3) * 0.7 // slight stagger so layers do not look ruled
    let p: Vec2 = [c[0] - dx * radius * 1.1 + perp[0] * s * radius * 1.05, c[1] - dy * radius * 1.1 + perp[1] * s * radius * 1.05]
    let z = seedZ
    const points: [number, number, number][] = []
    const speeds: number[] = []
    for (let step = 0; step < maxSteps && inside(p); step++) {
      if (heightAtGrid(frame, grid, p) > z) break // inside a building at this height
      const v = velocityAtHeight(frame, slices, p, z)
      if (!v) break
      const speed = Math.hypot(v[0], v[1])
      if (speed < 0.05) break
      points.push([p[0], p[1], z])
      speeds.push(speed)
      const ux = v[0] / speed
      const uy = v[1] / speed
      // Look ahead along the flow for the tallest roof this line could clear.
      let ahead = 0
      for (let j = 1; j <= LOOKAHEAD_SAMPLES; j++) {
        const h = heightAtGrid(frame, grid, [p[0] + ux * LOOKAHEAD_M * j / LOOKAHEAD_SAMPLES, p[1] + uy * LOOKAHEAD_M * j / LOOKAHEAD_SAMPLES])
        if (h > z - ROOF_CLEARANCE_M && h - z < CLIMB_MAX_M) ahead = Math.max(ahead, h)
      }
      const under = heightAtGrid(frame, grid, p)
      const target = Math.max(seedZ, ahead > 0 ? ahead + ROOF_CLEARANCE_M : 0, under > 0 ? under + ROOF_CLEARANCE_M : 0)
      z = Math.max(MIN_Z_M, z + Math.min(CLIMB_PER_M * stepM, Math.max(-DESCEND_PER_M * stepM, target - z)))
      p = [p[0] + ux * stepM, p[1] + uy * stepM]
    }
    if (points.length >= 4) lines.push({ points, speeds })
  }
  return lines
}
