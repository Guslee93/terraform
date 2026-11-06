# C23 — Wind module code review (Codex, role: engineering-code-reviewer)

Read-only review. Write ONE file, `docs/reviews/wind-code-review.md`. Edit no source, test or other doc. Do not commit.

Scope: commits `bbbb30f..HEAD` touching wind (`git log --oneline bbbb30f^..HEAD -- src`). Files:
- `src/features/analysis/{lbm,flowRunner,flowWorker,useWindFlow,comfort,climateView,streamlines,windDemo,grid}.ts`
- `src/scene/{WindParticles,WindStreamlines,AnalysisCircle,ViewportCanvas}.tsx`
- `src/components/studio/{ClimatePanel,StudioShell}.tsx`

Check against `AGENTS.md` §1 and §7, `docs/decisions/ADR-0014-wind-flow-solver.md` and `docs/plans/wind-simulator-prd.md`:
1. **Correctness:** solver boundaries, world↔grid transforms, worker message ordering and stale results, warm start vs reset, baseline/delta comparability, demo restore paths, memory (buffers transferred, geometries disposed, workers terminated).
2. **Guardrails:** domain code free of React/Three, no `any` or unchecked `as`, numbers derived not hard-coded, claim labels present everywhere wind is shown, reduced motion, keyboard and labels on every new control.
3. **Performance:** per-frame allocations in `useFrame`, main-thread work per worker tick (`buildClimateView` runs on every message), rasterize cost on large imported sites.
4. **Tests:** gaps where a regression would pass unnoticed.

Format: a table of findings — severity (blocker / major / minor / nit) | file:line | finding | concrete fix. Then "Accepted as-is" items with one-line reasons, and a verdict (pass / pass with fixes / fail). Run `npm run lint` and `npm run test` and report the results. Max 120 lines. No speculative findings: each one must name the failing input or scenario.
