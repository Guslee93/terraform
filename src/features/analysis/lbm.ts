import { pointInPolygon } from '../../lib/polygon'
import type { Vec2 } from '../../lib/coordinates'
import type { FootprintBuilding } from './grid'

/**
 * 2D lattice-Boltzmann (D2Q9, BGK) flow around building footprints — renderer-free.
 * Flow runs along +x in the grid frame; the site is rotated into that frame (ADR-0014).
 * ponytail: plain BGK, no Smagorinsky term; tau >= 0.56 keeps it stable at u0 = 0.1. Add LES if
 * finer grids or lower viscosity are needed.
 */
export const FLOW_DISCLAIMER = 'Indicative wind screening — 2D flow, not engineering'

const EX = [0, 1, 0, -1, 0, 1, -1, -1, 1]
const EY = [0, 0, 1, 0, -1, 1, 1, -1, -1]
const W = [4 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 36, 1 / 36, 1 / 36, 1 / 36]
const OPP = [0, 3, 4, 1, 2, 7, 8, 5, 6]

export type Lbm = {
  readonly nx: number
  readonly ny: number
  solid: Uint8Array
  readonly u0: number
  readonly omega: number
  f: Float32Array
  tmp: Float32Array
}

function feq(k: number, rho: number, ux: number, uy: number): number {
  const eu = EX[k]! * ux + EY[k]! * uy
  return W[k]! * rho * (1 + 3 * eu + 4.5 * eu * eu - 1.5 * (ux * ux + uy * uy))
}

/** Density and velocity of cell i in a distribution buffer. */
function moments(f: Float32Array, n: number, i: number): [number, number, number] {
  let rho = 0
  let mx = 0
  let my = 0
  for (let k = 0; k < 9; k++) {
    const v = f[k * n + i]!
    rho += v
    mx += v * EX[k]!
    my += v * EY[k]!
  }
  return [rho, mx / rho, my / rho]
}

export function createLbm(nx: number, ny: number, solid: Uint8Array, u0 = 0.1, tau = 0.6): Lbm {
  const n = nx * ny
  const f = new Float32Array(9 * n)
  for (let k = 0; k < 9; k++) f.fill(feq(k, 1, u0, 0), k * n, (k + 1) * n)
  return { nx, ny, solid, u0, omega: 1 / tau, f, tmp: f.slice() }
}

export function stepLbm(s: Lbm, steps = 1): void {
  const { nx, ny, solid, omega, u0 } = s
  const n = nx * ny
  const post = new Float64Array(9)
  for (let step = 0; step < steps; step++) {
    const { f, tmp } = s
    // Collide and push-stream; halfway bounce-back against solid neighbours.
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        const i = y * nx + x
        if (solid[i]) continue
        let rho = 0
        let mx = 0
        let my = 0
        for (let k = 0; k < 9; k++) {
          const v = f[k * n + i]!
          rho += v
          mx += v * EX[k]!
          my += v * EY[k]!
        }
        const ux = mx / rho
        const uy = my / rho
        for (let k = 0; k < 9; k++) post[k] = f[k * n + i]! - omega * (f[k * n + i]! - feq(k, rho, ux, uy))
        for (let k = 0; k < 9; k++) {
          const tx = x + EX[k]!
          const ty = y + EY[k]!
          if (tx < 0 || tx >= nx || ty < 0 || ty >= ny) continue
          const j = ty * nx + tx
          if (solid[j]) tmp[OPP[k]! * n + i] = post[k]!
          else tmp[k * n + j] = post[k]!
        }
      }
    }
    // Open boundaries. Sides: zero-gradient. Inlet (x = 0): equilibrium at u0. Outlet: density pinned
    // to 1 with the neighbour's velocity, which anchors pressure (a zero-gradient outlet let mass
    // pile up and stall the flow in dense blocks).
    for (let k = 0; k < 9; k++) {
      const o = k * n
      for (let x = 0; x < nx; x++) {
        tmp[o + x] = tmp[o + nx + x]!
        tmp[o + (ny - 1) * nx + x] = tmp[o + (ny - 2) * nx + x]!
      }
    }
    for (let y = 0; y < ny; y++) {
      const [, uxOut, uyOut] = moments(tmp, n, y * nx + nx - 2)
      for (let k = 0; k < 9; k++) {
        tmp[k * n + y * nx] = feq(k, 1, u0, 0)
        tmp[k * n + y * nx + nx - 1] = feq(k, 1, uxOut, uyOut)
      }
    }
    s.f = tmp
    s.tmp = f
  }
}

/** |u| / u0 per cell (0 inside solids). This is the speed ratio the comfort maths uses. */
export function speedRatio(s: Lbm): Float32Array {
  const n = s.nx * s.ny
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    if (s.solid[i]) continue
    let rho = 0
    let mx = 0
    let my = 0
    for (let k = 0; k < 9; k++) {
      const v = s.f[k * n + i]!
      rho += v
      mx += v * EX[k]!
      my += v * EY[k]!
    }
    out[i] = Math.hypot(mx, my) / rho / s.u0
  }
  return out
}

/** Grid frame: local ENU centre, flow direction (unit, wind blowing TOWARDS), cell size. */
export type FlowFrame = {
  readonly nx: number
  readonly ny: number
  readonly dx: number
  readonly centre: Vec2
  readonly flow: Vec2
}

/** Square domain covering the study area with a margin; wind FROM `fromBearingDeg` (0 = north). */
export function flowFrame(studyArea: readonly Vec2[], fromBearingDeg: number, nx = 128, ny = 128, margin = 1.6): FlowFrame {
  const cx = studyArea.reduce((a, p) => a + p[0], 0) / studyArea.length
  const cy = studyArea.reduce((a, p) => a + p[1], 0) / studyArea.length
  const r = Math.max(...studyArea.map((p) => Math.hypot(p[0] - cx, p[1] - cy)))
  const rad = (fromBearingDeg * Math.PI) / 180
  return { nx, ny, dx: (2 * r * margin) / Math.min(nx, ny), centre: [cx, cy], flow: [-Math.sin(rad), -Math.cos(rad)] }
}

export function worldToGrid(fr: FlowFrame, p: Vec2): Vec2 {
  const dxw = p[0] - fr.centre[0]
  const dyw = p[1] - fr.centre[1]
  const along = dxw * fr.flow[0] + dyw * fr.flow[1]
  const across = -dxw * fr.flow[1] + dyw * fr.flow[0]
  return [along / fr.dx + fr.nx / 2, across / fr.dx + fr.ny / 2]
}

export function gridToWorld(fr: FlowFrame, g: Vec2): Vec2 {
  const along = (g[0] - fr.nx / 2) * fr.dx
  const across = (g[1] - fr.ny / 2) * fr.dx
  return [fr.centre[0] + along * fr.flow[0] - across * fr.flow[1], fr.centre[1] + along * fr.flow[1] + across * fr.flow[0]]
}

/** Columns kept free of obstacles at the inlet and outlet so the boundary conditions stay stable. */
const EDGE_CELLS = 3

/** Obstacle mask: a cell is solid when its centre falls inside any footprint. Heights ignored here (§6.3 rules). */
export function rasterize(fr: FlowFrame, buildings: readonly FootprintBuilding[]): Uint8Array {
  const solid = new Uint8Array(fr.nx * fr.ny)
  for (const b of buildings) {
    // Only test cells inside the footprint's grid-space bounding box.
    const g = b.footprint.map((p) => worldToGrid(fr, p))
    const x0 = Math.max(EDGE_CELLS, Math.floor(Math.min(...g.map((q) => q[0]))))
    const x1 = Math.min(fr.nx - 1 - EDGE_CELLS, Math.ceil(Math.max(...g.map((q) => q[0]))))
    const y0 = Math.max(0, Math.floor(Math.min(...g.map((q) => q[1]))))
    const y1 = Math.min(fr.ny - 1, Math.ceil(Math.max(...g.map((q) => q[1]))))
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (!solid[y * fr.nx + x] && pointInPolygon(gridToWorld(fr, [x + 0.5, y + 0.5]), b.footprint)) solid[y * fr.nx + x] = 1
      }
    }
  }
  return solid
}

/** Velocity / u0 per cell in grid axes, interleaved [ux, uy, ...]; zero inside solids. */
export function velocityField(s: Lbm): Float32Array {
  const n = s.nx * s.ny
  const out = new Float32Array(2 * n)
  for (let i = 0; i < n; i++) {
    if (s.solid[i]) continue
    let rho = 0
    let mx = 0
    let my = 0
    for (let k = 0; k < 9; k++) {
      const v = s.f[k * n + i]!
      rho += v
      mx += v * EX[k]!
      my += v * EY[k]!
    }
    out[2 * i] = mx / rho / s.u0
    out[2 * i + 1] = my / rho / s.u0
  }
  return out
}

/** World-frame (east, north) velocity ratio at a point; null outside the domain or inside a building. */
export function sampleVelocity(fr: FlowFrame, velocity: Float32Array, solid: Uint8Array, p: Vec2): Vec2 | null {
  const [gx, gy] = worldToGrid(fr, p)
  const x = Math.floor(gx)
  const y = Math.floor(gy)
  if (x < 0 || y < 0 || x >= fr.nx || y >= fr.ny) return null
  const i = y * fr.nx + x
  if (solid[i]) return null
  const a = velocity[2 * i]!
  const c = velocity[2 * i + 1]!
  return [a * fr.flow[0] - c * fr.flow[1], a * fr.flow[1] + c * fr.flow[0]]
}

/** Nearest-cell speed ratio at a world point; null outside the domain or inside a building. */
export function sampleRatio(fr: FlowFrame, ratio: Float32Array, solid: Uint8Array, p: Vec2): number | null {
  const [gx, gy] = worldToGrid(fr, p)
  const x = Math.floor(gx)
  const y = Math.floor(gy)
  if (x < 0 || y < 0 || x >= fr.nx || y >= fr.ny) return null
  const i = y * fr.nx + x
  return solid[i] ? null : ratio[i]!
}
