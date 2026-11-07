import type { Vec2 } from '../../lib/coordinates'
import { circlePolygon, insideAnyBuilding, sampleGrid, type FootprintBuilding } from './grid'
import { downwashBoost } from './comfort'
import { buildingKey, convergenceCheck, CONVERGENCE_INTERVAL, MAX_STEPS } from './flowRunner'
import { createLbm, flowFrame, rasterize, sampleVelocity, stepLbm, velocityField, type FlowFrame, type Lbm } from './lbm'

export const SWEEP_DIRECTIONS = [0, 45, 90, 135, 180, 225, 270, 315] as const
export const SWEEP_CELL_M = 4
const SWEEP_GRID = 96

export type SweepRequest = {
  readonly id: number
  readonly centre: Vec2
  readonly radius: number
  readonly buildings: readonly FootprintBuilding[]
  readonly downwash: boolean
}
export type SweepResult = {
  readonly id: number
  /** Open-ground circle lattice centres, interleaved east/north metres. */
  readonly cells: Float32Array
  readonly directions: readonly number[]
  readonly ratios: readonly Float32Array[]
  readonly complete: boolean
}
export type SweepSummary = {
  readonly maxRatio: Float32Array
  readonly worstIndex: Uint8Array
  readonly perDirection: readonly { readonly from: number; readonly shareAbove: number; readonly meanRatio: number }[]
  readonly worst: { readonly from: number; readonly shareAbove: number } | null
}

export function summariseSweep(result: SweepResult, thresholdRatio: number): SweepSummary {
  const maxRatio = new Float32Array(result.cells.length / 2).fill(NaN)
  // 255 denotes a cell with no solved, non-NaN value; ties retain the first direction.
  const worstIndex = new Uint8Array(maxRatio.length).fill(255)
  const perDirection = result.directions.map((from, d) => {
    let count = 0, above = 0, sum = 0
    for (let i = 0; i < maxRatio.length; i++) {
      const ratio = result.ratios[d]![i]!
      if (Number.isNaN(ratio)) continue
      count++
      sum += ratio
      if (ratio >= thresholdRatio) above++
      if (Number.isNaN(maxRatio[i]!) || ratio > maxRatio[i]!) {
        maxRatio[i] = ratio
        worstIndex[i] = d
      }
    }
    return { from, shareAbove: count ? above / count : 0, meanRatio: count ? sum / count : 0 }
  })
  let worst: (typeof perDirection)[number] | null = null
  for (const direction of perDirection) {
    if (!worst || direction.shareAbove > worst.shareAbove ||
      (direction.shareAbove === worst.shareAbove && direction.meanRatio > worst.meanRatio)) worst = direction
  }
  return { maxRatio, worstIndex, perDirection, worst: worst ? { from: worst.from, shareAbove: worst.shareAbove } : null }
}

/** Cooperative sequential solves; outbound buffers never alias cache or unfinished work. */
export function createSweepRunner(now: () => number = () => performance.now()) {
  let request: SweepRequest | null = null
  let cells: Float32Array = new Float32Array(0)
  let ratios: Float32Array[] = []
  let solver: Lbm | null = null
  let frame: FlowFrame | null = null
  let check: (() => boolean) | null = null
  let steps = 0
  let pending = false
  let key = '', signature = ''
  const cache = new Map<string, { signature: string; cells: Float32Array; ratios: Float32Array[] }>()
  const result = (): SweepResult => ({
    id: request!.id, cells: cells.slice(), directions: SWEEP_DIRECTIONS.slice(0, ratios.length),
    ratios: ratios.map((field) => field.slice()), complete: ratios.length === SWEEP_DIRECTIONS.length,
  })
  return {
    request(req: SweepRequest): void {
      request = req
      solver = null
      frame = null
      check = null
      steps = 0
      ratios = []
      pending = true
      const geometry = buildingKey(req.buildings)
      signature = geometry.signature
      key = JSON.stringify([req.centre, req.radius, geometry.hash, req.downwash])
      const hit = cache.get(key)
      if (hit?.signature === signature) {
        cache.delete(key)
        cache.set(key, hit)
        cells = hit.cells
        ratios = hit.ratios
        return
      }
      cells = Float32Array.from(sampleGrid(circlePolygon(req.centre, req.radius), SWEEP_CELL_M)
        .filter(({ x, y }) => !insideAnyBuilding(x, y, req.buildings)).flatMap(({ x, y }) => [x, y]))
    },
    hasPendingWork(): boolean { return pending },
    tick(budgetMs: number): SweepResult | null {
      if (!pending || !request) return null
      if (ratios.length === SWEEP_DIRECTIONS.length) {
        pending = false
        return result()
      }
      const start = now()
      if (!solver) {
        frame = flowFrame(circlePolygon(request.centre, request.radius), SWEEP_DIRECTIONS[ratios.length]!, SWEEP_GRID, SWEEP_GRID, 1.4)
        solver = createLbm(SWEEP_GRID, SWEEP_GRID, rasterize(frame, request.buildings))
        check = convergenceCheck(solver)
        steps = 0
      }
      let settled: boolean
      do {
        stepLbm(solver, 10)
        steps += 10
        settled = steps >= MAX_STEPS || (steps % CONVERGENCE_INTERVAL === 0 && check!())
      } while (!settled && now() - start < budgetMs)
      if (!settled) return null
      const velocity = velocityField(solver)
      if (request.downwash) {
        const boost = downwashBoost(request.buildings, frame!)
        for (let i = 0; i < boost.length; i++) {
          velocity[2 * i] = velocity[2 * i]! * boost[i]!
          velocity[2 * i + 1] = velocity[2 * i + 1]! * boost[i]!
        }
      }
      const field = new Float32Array(cells.length / 2)
      for (let i = 0; i < field.length; i++) {
        const v = sampleVelocity(frame!, velocity, solver.solid, [cells[2 * i]!, cells[2 * i + 1]!])
        field[i] = v ? Math.hypot(v[0], v[1]) : NaN
      }
      ratios.push(field)
      solver = null
      if (ratios.length === SWEEP_DIRECTIONS.length) {
        pending = false
        cache.set(key, { signature, cells, ratios })
        if (cache.size > 4) cache.delete(cache.keys().next().value!)
      }
      return result()
    },
  }
}
