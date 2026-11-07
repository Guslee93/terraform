import { profileFactor, sliceHeightsFor, sliceObstacles } from './windProfile'
import type { FootprintBuilding } from './grid'
import { downwashBoost } from './comfort'
import { createLbm, rasterize, stepLbm, velocityField, speedRatio, upsampleVelocity, warmStartLbm, type FlowFrame, type Lbm } from './lbm'

/** Hard cap for unconverged flow. */
export const MAX_STEPS = 6000
export const UPPER_SLICE_RESOLUTION = 80
export const CONVERGENCE_INTERVAL = 250
export const CONVERGENCE_THRESHOLD = 2e-4
const STEPS_PER_CHUNK = 10

export function convergenceCheck(solver: Lbm) {
  let previous = speedRatio(solver)
  return () => {
    const next = speedRatio(solver)
    let delta = 0, fluid = 0
    for (let i = 0; i < next.length; i++) if (!solver.solid[i]) {
      delta += Math.abs(next[i]! - previous[i]!)
      fluid++
    }
    previous = next
    return fluid > 0 && delta / fluid < CONVERGENCE_THRESHOLD
  }
}

export type FlowRequest = {
  readonly id: number
  readonly frame: FlowFrame
  readonly buildings: readonly FootprintBuilding[]
  /** True when the frame changed (new direction or site): restart from uniform flow. */
  readonly reset: boolean
  /** Multiply the field by the rule-based downwash boost (comfort.ts) at tall-building bases. */
  readonly downwash?: boolean
  /** Solve a cached stack after the live pedestrian field settles. */
  readonly slices?: boolean
}

export type FlowSlice = {
  readonly z: number
  readonly velocity: Float32Array
  readonly solid: Uint8Array
}

export type FlowResult = {
  readonly id: number
  readonly frame: FlowFrame
  readonly solid: Uint8Array
  readonly velocity: Float32Array
  /** Pedestrian field is settled; upper slices may still be pending. */
  readonly settled: boolean
  readonly slices?: FlowSlice[]
  readonly slicesComplete?: boolean
  /** Every slice height this stack will have (the standard four, plus a top slice for tall buildings). */
  readonly sliceHeights?: readonly number[]
}

/** Sorted geometry fingerprint: hash for lookup, full signature checked to avoid collisions. */
export function buildingKey(buildings: readonly FootprintBuilding[]) {
  const signature = JSON.stringify(buildings.map((b) => JSON.stringify([b.height, b.footprint])).sort())
  let hash = 2166136261
  for (let i = 0; i < signature.length; i++) hash = Math.imul(hash ^ signature.charCodeAt(i), 16777619)
  return { hash: hash >>> 0, signature }
}

const copySlice = (slice: FlowSlice): FlowSlice => ({
  z: slice.z, velocity: slice.velocity.slice(), solid: slice.solid.slice(),
})

/** Solver state behind the worker; pure so it can be tested without a Worker. */
export function createFlowRunner(now: () => number = () => performance.now()) {
  let lbm: Lbm | null = null
  let frame: FlowFrame | null = null
  let id = 0
  let steps = 0
  let boost: Float32Array | null = null
  let buildings: readonly FootprintBuilding[] = []
  let wantsSlices = false
  let heights: number[] = []
  let stack: FlowSlice[] = []
  let upper: Lbm | null = null
  let upperSteps = 0
  let previousUpper: Lbm | null = null
  let coarseFrame: FlowFrame | null = null
  let settled = false
  let checkGround: (() => boolean) | null = null
  let checkUpper: (() => boolean) | null = null
  let pending = false
  let key = ''
  let signature = ''
  const cache = new Map<string, { signature: string; stack: FlowSlice[] }>()

  function result(): FlowResult {
    // All outbound buffers are copies: transferring them must not detach solver/cache state.
    const ground = stack[0] ?? { z: 2, velocity: velocityField(lbm!), solid: lbm!.solid }
    const velocity = ground.velocity.slice()
    if (boost) for (let i = 0; i < boost.length; i++) {
      velocity[2 * i] = velocity[2 * i]! * boost[i]!
      velocity[2 * i + 1] = velocity[2 * i + 1]! * boost[i]!
    }
    const slices = wantsSlices && stack.length > 0
      ? stack.map((slice, i) => i === 0 ? { z: slice.z, velocity: velocity.slice(), solid: slice.solid.slice() } : copySlice(slice))
      : undefined
    return { id, frame: frame!, solid: ground.solid.slice(), velocity, settled, slicesComplete: wantsSlices && stack.length === heights.length, sliceHeights: wantsSlices ? heights : undefined,
      ...(slices ? { slices } : {}) }
  }

  return {
    request(req: FlowRequest): void {
      // Every request discards unfinished upper work, including partially completed stacks.
      upper = null
      upperSteps = 0
      previousUpper = null
      checkUpper = null
      settled = false
      stack = []
      pending = true
      wantsSlices = req.slices === true
      heights = sliceHeightsFor(req.buildings)
      buildings = req.buildings
      frame = req.frame
      // Integer downsampling preserves both physical extents, including rectangular frames.
      let scale = Math.max(1, Math.ceil(Math.max(frame.nx, frame.ny) / UPPER_SLICE_RESOLUTION))
      while (scale > 1 && (frame.nx % scale !== 0 || frame.ny % scale !== 0)) scale--
      coarseFrame = { ...frame, nx: frame.nx / scale, ny: frame.ny / scale, dx: frame.dx * scale }
      id = req.id
      boost = req.downwash ? downwashBoost(buildings, frame) : null
      if (wantsSlices) {
        const geometry = buildingKey(buildings)
        signature = geometry.signature
        key = JSON.stringify([frame.centre, frame.flow, frame.dx, frame.nx, frame.ny, geometry.hash])
        const hit = cache.get(key)
        if (hit?.signature === signature) {
          cache.delete(key)
          cache.set(key, hit)
          stack = hit.stack
          steps = MAX_STEPS
          settled = true
          // The old distributions belong to another request; never warm-start them after a hit.
          lbm = null
          return
        }
      }
      const solid = rasterize(frame, wantsSlices ? sliceObstacles(buildings, 2) : buildings)
      // Geometry edits keep the current flow (warm start) so dragging stays live.
      if (lbm && !req.reset && lbm.nx === frame.nx && lbm.ny === frame.ny) {
        lbm.solid = solid
        steps = 0
      } else {
        lbm = createLbm(frame.nx, frame.ny, solid)
        steps = 0
      }
      checkGround = convergenceCheck(lbm)
    },
    /** Includes upper work even when the live pedestrian result is already settled. */
    hasPendingWork(): boolean { return pending },
    /** Runs one slice for up to budgetMs; yields between chunks for request cancellation. */
    tick(budgetMs: number): FlowResult | null {
      if (!pending || !frame) return null
      if (stack.length === heights.length) {
        pending = false
        return result()
      }
      const start = now()
      if (!settled && lbm) {
        do {
          stepLbm(lbm, STEPS_PER_CHUNK)
          steps += STEPS_PER_CHUNK
          settled = steps >= MAX_STEPS || (steps % CONVERGENCE_INTERVAL === 0 && checkGround!())
        } while (!settled && now() - start < budgetMs)
        if (settled) {
          if (wantsSlices) stack.push({ z: 2, velocity: velocityField(lbm), solid: lbm.solid.slice() })
          else pending = false
        }
      } else if (wantsSlices) {
        const z = heights[stack.length]!
        if (!upper) {
          upper = createLbm(coarseFrame!.nx, coarseFrame!.ny, rasterize(coarseFrame!, sliceObstacles(buildings, z)))
          if (previousUpper) warmStartLbm(upper, previousUpper)
          checkUpper = convergenceCheck(upper)
        }
        let upperSettled: boolean
        do {
          stepLbm(upper, STEPS_PER_CHUNK)
          upperSteps += STEPS_PER_CHUNK
          upperSettled = upperSteps >= MAX_STEPS || (upperSteps % CONVERGENCE_INTERVAL === 0 && checkUpper!())
        } while (!upperSettled && now() - start < budgetMs)
        if (upperSettled) {
          const solid = rasterize(frame, sliceObstacles(buildings, z))
          const velocity = upsampleVelocity(coarseFrame!, velocityField(upper), frame, solid)
          const factor = profileFactor(z) / profileFactor(2)
          for (let i = 0; i < velocity.length; i++) velocity[i] = velocity[i]! * factor
          stack.push({ z, velocity, solid })
          previousUpper = upper
          upper = null
          upperSteps = 0
          if (stack.length === heights.length) {
            cache.delete(key)
            cache.set(key, { signature, stack })
            if (cache.size > 8) cache.delete(cache.keys().next().value!)
            pending = false
          }
        }
      }
      return result()
    },
  }
}
