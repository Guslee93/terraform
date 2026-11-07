# C27 — All-directions sweep: domain, worker and hook (Codex work order)

Read first: `AGENTS.md` §1, `docs/decisions/ADR-0015-wind-direction-sweep.md`, `docs/decisions/ADR-0014-wind-flow-solver.md` (both addenda), `src/features/analysis/{lbm,flowRunner,flowWorker,useWindFlow,grid,comfort}.ts` (+ tests).

## HARD RULE
Create only `src/features/analysis/directionSweep.ts`, `src/features/analysis/sweepWorker.ts`, `src/features/analysis/useWindSweep.ts` and their tests. You may add small **exports** to `lbm.ts`/`flowRunner.ts` if you need to reuse a helper, but don't change their behaviour. Do NOT edit any UI, scene, `climateView.ts` or `StudioShell.tsx` (Claude builds those in parallel against the contract below). No new dependencies. Local ENU metres. Do not commit.

## Contract (Claude codes against this — keep the names and types exactly)
```ts
// directionSweep.ts
export const SWEEP_DIRECTIONS = [0, 45, 90, 135, 180, 225, 270, 315] as const
export const SWEEP_CELL_M = 4
export type SweepRequest = {
  readonly id: number
  readonly centre: Vec2
  readonly radius: number
  readonly buildings: readonly FootprintBuilding[]
  readonly downwash: boolean
}
export type SweepResult = {
  readonly id: number
  /** Open-ground lattice centres inside the circle, interleaved [x0, y0, x1, y1, …]; SWEEP_CELL_M spacing, same lattice as sampleGrid(circlePolygon(centre, radius), SWEEP_CELL_M) minus building cells. */
  readonly cells: Float32Array
  /** Bearings solved so far, in SWEEP_DIRECTIONS order. */
  readonly directions: readonly number[]
  /** One speed-ratio field per solved direction, aligned with `cells` (length cells.length / 2). */
  readonly ratios: readonly Float32Array[]
  readonly complete: boolean
}
export type SweepSummary = {
  /** Per cell: the highest ratio over the solved directions, and the index (into `directions`) that caused it. */
  readonly maxRatio: Float32Array
  readonly worstIndex: Uint8Array
  /** Per solved direction: share of cells with ratio ≥ thresholdRatio, and the mean ratio. */
  readonly perDirection: readonly { readonly from: number; readonly shareAbove: number; readonly meanRatio: number }[]
  /** Direction with the largest shareAbove (ties → larger meanRatio); null before any direction is solved. */
  readonly worst: { readonly from: number; readonly shareAbove: number } | null
}
export function summariseSweep(result: SweepResult, thresholdRatio: number): SweepSummary
export function createSweepRunner(now?: () => number): {
  request(req: SweepRequest): void
  tick(budgetMs: number): SweepResult | null
  hasPendingWork(): boolean
}
// useWindSweep.ts
export function useWindSweep(circle: { centre: Vec2; radius: number } | null, buildings: readonly FootprintBuilding[], enabled: boolean, downwash: boolean): SweepResult | null
```

## Items
1. **Runner.**
   - For each direction in order: build `flowFrame(circlePolygon(centre, radius), from, SWEEP_GRID, SWEEP_GRID, 1.4)` with `SWEEP_GRID = 96`.
   - Rasterise, run `createLbm`/`stepLbm` with the same convergence early stop as `flowRunner`, and apply the downwash boost when requested.
   - Sample the speed ratio at every lattice cell with `sampleVelocity` (NaN where solid in that run).
   - Post progressively after each direction. Any new request cancels in-progress work.
   - Cache complete sweeps by (centre, radius, geometry hash, downwash), at most 4 entries. Reuse the hashing approach in `flowRunner`.
2. **Worker + hook.**
   - `sweepWorker.ts` follows the `flowWorker.ts` pattern: coalesce to the newest request, transfer buffers.
   - `useWindSweep` follows `useWindFlow`: one worker while enabled, a request throttle of ≥ 250 ms (sweeps are heavier), and results ignored if their id isn't the latest. It returns null when disabled.
3. **Summary.** Implement `summariseSweep`. Cells that are NaN in a direction are skipped for that direction's share and mean.
4. **Tests:**
   - An empty site: every direction has meanRatio ≈ 1 (±0.05) and shareAbove(1.3) = 0.
   - A single 20 × 20 m block: the worst direction for a cell just east of it isn't 270° (a west wind puts that cell in the wake), and a cell north of the block has its max from 90° or 270° (corner flow). Pick cells and assert directionally.
   - Summary maths on a hand-made `SweepResult` (2 directions, 3 cells).
   - Progressive results arrive in direction order; a new request cancels; a cache hit returns `complete` without stepping.
   - Benchmark (skip unless `WIND_BENCHMARK`): report the total sweep time in Node for Compact Infill, r = 100 m.

## Done when
`npm run lint`, `npm run test`, `npm run build` pass. The sweep takes ≤ 20 s in Node for Compact Infill (report the number). Summary: files changed, tests, timings, commands and results.
