import { profileFactor, sliceObstacles, SLICE_HEIGHTS_M } from './windProfile'
import type { FootprintBuilding } from './grid'
import { downwashBoost } from './comfort'
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
}

/** Sorted geometry fingerprint: hash for lookup, full signature checked to avoid collisions. */
function buildingKey(buildings: readonly FootprintBuilding[]) {
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
  let stack: FlowSlice[] = []
  let upper: Lbm | null = null
  let upperSteps = 0
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
    const slices = wantsSlices && stack.length === SLICE_HEIGHTS_M.length
      ? stack.map((slice, i) => i === 0 ? { z: slice.z, velocity: velocity.slice(), solid: slice.solid.slice() } : copySlice(slice))
      : undefined
    return { id, frame: frame!, solid: ground.solid.slice(), velocity, settled: steps >= MAX_STEPS,
      ...(slices ? { slices } : {}) }
  }

  return {
    request(req: FlowRequest): void {
      // Every request discards unfinished upper work, including partially completed stacks.
      upper = null
      upperSteps = 0
      stack = []
      pending = true
      wantsSlices = req.slices === true
      buildings = req.buildings
      frame = req.frame
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
          // The old distributions belong to another request; never warm-start them after a hit.
          lbm = null
          return
        }
      }
      const solid = rasterize(frame, wantsSlices ? sliceObstacles(buildings, 2) : buildings)
      // Geometry edits keep the current flow (warm start) so dragging stays live.
      if (lbm && !req.reset && lbm.nx === frame.nx && lbm.ny === frame.ny) {
        lbm.solid = solid
        steps = Math.min(steps, MAX_STEPS / 2)
      } else {
        lbm = createLbm(frame.nx, frame.ny, solid)
        steps = 0
      }
    },
    /** Includes upper work even when the live pedestrian result is already settled. */
    hasPendingWork(): boolean { return pending },
    /** Runs one slice for up to budgetMs; yields between chunks for request cancellation. */
    tick(budgetMs: number): FlowResult | null {
      if (!pending || !frame) return null
      if (stack.length === SLICE_HEIGHTS_M.length) {
        pending = false
        return result()
      }
      const start = now()
      if (steps < MAX_STEPS && lbm) {
        do {
          stepLbm(lbm, STEPS_PER_CHUNK)
          steps += STEPS_PER_CHUNK
        } while (steps < MAX_STEPS && now() - start < budgetMs)
        if (steps >= MAX_STEPS) {
          if (wantsSlices) stack.push({ z: 2, velocity: velocityField(lbm), solid: lbm.solid.slice() })
          else pending = false
        }
      } else if (wantsSlices) {
        const z = SLICE_HEIGHTS_M[stack.length]!
        upper ??= createLbm(frame.nx, frame.ny, rasterize(frame, sliceObstacles(buildings, z)))
        do {
          stepLbm(upper, STEPS_PER_CHUNK)
          upperSteps += STEPS_PER_CHUNK
        } while (upperSteps < MAX_STEPS && now() - start < budgetMs)
        if (upperSteps >= MAX_STEPS) {
          const velocity = velocityField(upper)
          const factor = profileFactor(z) / profileFactor(2)
          for (let i = 0; i < velocity.length; i++) velocity[i] = velocity[i]! * factor
          stack.push({ z, velocity, solid: upper.solid.slice() })
          upper = null
          upperSteps = 0
          if (stack.length === SLICE_HEIGHTS_M.length) {
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
