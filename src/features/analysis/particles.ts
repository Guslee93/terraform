import type { FlowFrame } from './lbm'

/**
 * Motion of the wind trail particles through the solved 2D flow. Pure and allocation-free: these
 * run thousands of times per frame, so results go into caller-owned buffers.
 */

/**
 * Wind velocity (ratio to the free wind, world ENU axes) at a world point, blended between the
 * four nearest fluid cells. Solid cells are left out and the weights renormalised, so the flow
 * does not fade to a false standstill beside a wall. False inside a building or off the grid.
 */
export function smoothVelocity(fr: FlowFrame, velocity: Float32Array, solid: Uint8Array, x: number, y: number, out: Float32Array): boolean {
  const dxw = x - fr.centre[0]
  const dyw = y - fr.centre[1]
  const gx = (dxw * fr.flow[0] + dyw * fr.flow[1]) / fr.dx + fr.nx / 2
  const gy = (-dxw * fr.flow[1] + dyw * fr.flow[0]) / fr.dx + fr.ny / 2
  const cx = Math.floor(gx)
  const cy = Math.floor(gy)
  if (cx < 0 || cy < 0 || cx >= fr.nx || cy >= fr.ny || solid[cy * fr.nx + cx]) return false
  // Cell values sit at cell centres, half a cell in from the grid lines.
  const x0 = Math.floor(gx - 0.5)
  const y0 = Math.floor(gy - 0.5)
  const tx = gx - 0.5 - x0
  const ty = gy - 0.5 - y0
  let along = 0
  let across = 0
  let weight = 0
  for (let j = 0; j < 2; j += 1) {
    const yj = y0 + j
    if (yj < 0 || yj >= fr.ny) continue
    for (let i = 0; i < 2; i += 1) {
      const xi = x0 + i
      if (xi < 0 || xi >= fr.nx) continue
      const cell = yj * fr.nx + xi
      if (solid[cell]) continue
      const w = (i ? tx : 1 - tx) * (j ? ty : 1 - ty)
      along += w * velocity[2 * cell]!
      across += w * velocity[2 * cell + 1]!
      weight += w
    }
  }
  if (weight < 1e-6) return false
  along /= weight
  across /= weight
  out[0] = along * fr.flow[0] - across * fr.flow[1]
  out[1] = along * fr.flow[1] + across * fr.flow[0]
  return true
}

const half = new Float32Array(2)

/**
 * Moves the point at `pos[at], pos[at + 1]` one midpoint (second-order) step through the flow:
 * `metres` is the distance a particle travelling at the free wind speed would cover. The midpoint
 * step is what keeps trails curving smoothly round corners instead of cutting them.
 * Returns the local speed ratio, or −1 when the step starts or ends in a building or off the grid
 * (the point is then left where it was).
 */
export function advect(fr: FlowFrame, velocity: Float32Array, solid: Uint8Array, pos: Float32Array, at: number, metres: number, v: Float32Array): number {
  const x = pos[at]!
  const y = pos[at + 1]!
  if (!smoothVelocity(fr, velocity, solid, x, y, v)) return -1
  if (!smoothVelocity(fr, velocity, solid, x + v[0]! * metres * 0.5, y + v[1]! * metres * 0.5, half)) return -1
  const nx = x + half[0]! * metres
  const ny = y + half[1]! * metres
  if (!smoothVelocity(fr, velocity, solid, nx, ny, v)) return -1
  pos[at] = nx
  pos[at + 1] = ny
  return Math.hypot(v[0]!, v[1]!)
}
