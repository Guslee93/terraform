# C26 — Faster height slices (Codex work order)

Goal: the 3D wind (all four slices) should be ready in **≤ 15 s** in the browser on Compact Infill (r = 100 m, 160² frame), down from ~40–60 s. Today each slice runs a fixed 6000 steps at 160² (~10 s each in Node).

Read first: `AGENTS.md` §1, `docs/decisions/ADR-0014-wind-flow-solver.md` (incl. addendum), `src/features/analysis/{lbm,flowRunner,flowWorker,windProfile}.ts` (+ tests).

## HARD RULE
Edit only `flowRunner.ts`, `flowWorker.ts`, `lbm.ts` (additive helpers only — do not change `stepLbm` or the boundary behaviour), and their tests. Do NOT touch UI, scene, `climateView.ts` or `streamlines*` (Claude owns those in parallel). No new dependencies. Do not commit.

## Contract with Claude's part
- `FlowResult.slices` may now be **partial**: sorted by `z`, ground (2 m) first, containing every slice finished so far.
- Add `FlowResult.slicesComplete: boolean`.
- Every slice keeps the **same frame, `nx` and `ny`** as the ground field, so `sampleVelocity(flow.frame, slice.velocity, slice.solid, p)` keeps working.

## Items
1. **Coarse upper slices.** Solve slices above 2 m on a coarser lattice (default 80², a named constant) over the same physical frame. Then bilinear-upsample the coarse velocity to the fine `nx × ny` grid. The `solid` mask comes from rasterising the fine frame with `sliceObstacles`, and velocity is zero in fine solid cells. Keep the profile scaling. The ground slice stays at full resolution.
2. **Early stop on convergence.** For every solve (ground and upper), every 250 steps compare the speed field with the previous check: mean |Δ|speed| over fluid cells. Stop when it's below a named threshold (start at 2e-4 in lattice ratio units; tune with the canonical cases). `MAX_STEPS` stays as a hard cap. `settled` means converged or at the cap.
3. **Warm start upward.** Initialise each upper slice from the previous upper slice's coarse distributions where the cell is fluid in both. Fall back to equilibrium otherwise.
4. **Progressive results.** Post a result as each slice finishes (partial `slices`, `slicesComplete: false`), and a final one with `slicesComplete: true`. Keep the "don't re-post an unchanged field" rule otherwise. Cancellation and the cache behave as now: cache only complete stacks.
5. **Tests:**
   - Upsampling: a uniform coarse field upsamples to uniform; values at coarse cell centres are preserved.
   - Early stop: an empty domain converges in far fewer than `MAX_STEPS`.
   - The coarse 10 m slice over a low block is still faster than the ground wake.
   - Progressive posts arrive in z order.
   - The validation suite (`wind-validation.test.ts`) and `lbm.test.ts` still pass unchanged.
6. **Benchmark:** report the Node time per slice and the total for the 160² Compact Infill frame (as in C24), before and after.

## Done when
`npm run lint`, `npm run test`, `npm run build` pass, and the reported total stack time is ≤ 15 s in Node. Summary: files changed, tests, before/after timings, commands and results.
