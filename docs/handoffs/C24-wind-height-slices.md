# C24 — W5a: wind height slices (Codex work order)

Read first: `AGENTS.md` §1, `docs/plans/wind-3d-plan.md` §3A and §4, `docs/decisions/ADR-0014-wind-flow-solver.md` (incl. addendum), `src/features/analysis/{lbm,flowRunner,flowWorker,useWindFlow}.ts` (+ tests).

## HARD RULE
Edit only `flowRunner.ts`, `flowWorker.ts`, `useWindFlow.ts`, their tests, and new `src/features/analysis/windProfile.ts` (+ test). Do NOT edit `lbm.ts` (report needed changes), UI or scene files. No new dependencies. Do not commit.

## Items
1. **`windProfile.ts`:**
   - `SLICE_HEIGHTS_M = [2, 10, 20, 35]` as a named constant.
   - `profileFactor(z) = (z / 10) ^ ALPHA` with `ALPHA = 0.22` (urban power law, indicative). The pedestrian slice at 2 m is the reference slice used today.
   - `sliceObstacles(buildings, z)` keeps only buildings with `height > z`.
2. **Runner:** `FlowRequest` gains `slices?: boolean`.
   - When false or absent, behaviour is unchanged (pedestrian slice only, live).
   - When true: once the ground slice settles, solve the upper slices one after another in the same worker. Each one is a fresh `createLbm` with that slice's mask, run to `MAX_STEPS`.
   - Post `FlowResult.slices?: { z: number; velocity: Float32Array; solid: Uint8Array }[]`. Velocities are scaled by `profileFactor(z) / profileFactor(2)` so they read relative to the pedestrian reference. Same frame for every slice.
   - Any new request cancels slice work in progress.
   - Cache the slices by `(frame centre, flow direction, dx, building-set hash)` so returning to a direction is instant. Keep at most 8 entries.
3. **Hook:** `useWindFlow(..., slices = false)` passes the flag through.
4. **Tests:**
   - `profileFactor(10) = 1` and `profileFactor(20) ≈ 1.165`.
   - A 15 m block is solid in the 10 m slice and absent from the 20 m slice.
   - The upper slice over a low block is faster than the ground slice behind it.
   - A new request cancels slice work.
   - A cache hit returns without stepping.

## Done when
`npm run lint`, `npm run test`, `npm run build` pass. Report how long the slice solve takes per slice in Node for a 160² frame. Summary: files changed, tests, commands and results.
