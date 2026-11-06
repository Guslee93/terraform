import type { FootprintBuilding } from './grid'
import { createLbm, rasterize, stepLbm, velocityField, type FlowFrame, type Lbm } from './lbm'

/** Steps after which the flow counts as settled and the solver idles (≈ 7 s at 128²). */
export const MAX_STEPS = 6000
const STEPS_PER_CHUNK = 10

export type FlowRequest = {
  readonly id: number
  readonly frame: FlowFrame
  readonly buildings: readonly FootprintBuilding[]
  /** True when the frame changed (new direction or site): restart from uniform flow. */
  readonly reset: boolean
}

export type FlowResult = {
  readonly id: number
  readonly frame: FlowFrame
  readonly solid: Uint8Array
  readonly velocity: Float32Array
  readonly settled: boolean
}

/** Solver state behind the worker; pure so it can be tested without a Worker. */
export function createFlowRunner(now: () => number = () => performance.now()) {
  let lbm: Lbm | null = null
  let frame: FlowFrame | null = null
  let id = 0
  let steps = 0
  return {
    request(req: FlowRequest): void {
      const solid = rasterize(req.frame, req.buildings)
      // Geometry edits keep the current flow (warm start) so dragging stays live.
      if (lbm && !req.reset && lbm.nx === req.frame.nx && lbm.ny === req.frame.ny) lbm.solid = solid
      else lbm = createLbm(req.frame.nx, req.frame.ny, solid)
      frame = req.frame
      id = req.id
      steps = req.reset ? 0 : Math.min(steps, MAX_STEPS / 2)
    },
    /** Runs for up to `budgetMs`; returns the current field, or null when idle. */
    tick(budgetMs: number): FlowResult | null {
      if (!lbm || !frame) return null
      const start = now()
      do {
        stepLbm(lbm, STEPS_PER_CHUNK)
        steps += STEPS_PER_CHUNK
      } while (steps < MAX_STEPS && now() - start < budgetMs)
      return { id, frame, solid: lbm.solid.slice(), velocity: velocityField(lbm), settled: steps >= MAX_STEPS }
    },
  }
}
