# C19 — Wind flow W1: worker, heatmap, particles, dial (Codex work order)

Project: Terraform. Read first: `AGENTS.md`, `docs/plans/wind-simulator-prd.md` §1–5, `docs/decisions/ADR-0014-wind-flow-solver.md`, `src/features/analysis/lbm.ts` (+ test), `src/features/analysis/climateView.ts`, `src/components/studio/ClimatePanel.tsx`, `src/scene/ClimateLayer.tsx`.

## HARD RULE
Edit only: new `src/features/analysis/flowWorker.ts`, new `src/features/analysis/useWindFlow.ts`, `climateView.ts`, `src/components/studio/ClimatePanel.tsx`, `src/scene/ClimateLayer.tsx`, new `src/scene/WindParticles.tsx`, and their tests. Do NOT edit `lbm.ts` (report needed changes) or create `comfort.ts` (another agent owns it). No new dependencies. Do not commit, merge or push.

## Items
1. **Worker.** `flowWorker.ts` (Vite `new Worker(new URL(...), { type: 'module' })`): receives `{ frame, solid, u0 }`, runs `stepLbm` in a loop (~12 steps per tick), posts `speedRatio` (transfer the buffer) ~20×/s. A new message resets the solver. Rebuild on building edits debounced 50 ms and on dial change.
2. **Heatmap.** In wind mode, `ClimateLayer` shows the speed ratio as a ground texture (`THREE.DataTexture`, linear filter) placed with `gridToWorld` corners, eased 300–600 ms between updates. Ramp: calm blue → teal → pale yellow → orange → red, ratio 0 … 1.6. Buildings masked.
3. **Particles.** `WindParticles.tsx`: ~5–20k points advected through the field (velocity = ratio × flow direction, look up with `worldToGrid`), short trails, respawn at inlet or when stalled. Count adapts to frame time. Under `prefers-reduced-motion`: draw static streamlines instead.
4. **Dial.** In `ClimatePanel`: circular direction control (keyboard: arrows ±15°, labelled, focus visible) plus reference speed slider 2–15 m/s. Replace the old exposure-index wind mode; keep noise untouched. Legend shows `FLOW_DISCLAIMER` always.
5. Tests: worker message contract (pure function extracted, no real Worker), dial keyboard behaviour, reduced-motion fallback, legend disclaimer present.

## Done when
`npm run lint`, `npm run test`, `npm run build` pass; flow visible ≤ 3 s on a curated site; UI stays responsive while dragging. Summary: files changed, tests, commands and results, anything stopped. Add no row to docs/agent-log.md.
