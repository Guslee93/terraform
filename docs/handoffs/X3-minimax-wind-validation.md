# X3 — Wind validation suite + note (MiniMax work order)

Repo: `/Users/gustavekamanzi/Downloads/2026/Terraform` (TypeScript strict, Vitest). Read: `AGENTS.md` §1 and §7, `docs/plans/wind-simulator-prd.md` §6, `src/features/analysis/lbm.ts`, `src/features/analysis/lbm.test.ts` (style, and existing gap/L-shape cases).

## HARD RULE
Create ONLY `src/features/analysis/wind-validation.test.ts` and `docs/research/wind-validation-note.md`. Edit nothing else (another agent is editing the wind UI). No new dependencies, no `any`. Do not commit.

## 1. Test file: the six canonical cases (PRD §6)
Use `flowFrame` + `rasterize` + `createLbm` + `stepLbm` + `speedRatio` + `sampleRatio`, wind from the west (270°). Keep grids ≤ 128×96 and steps ≤ 2500; each case must finish in < 3 s. Directional asserts only, never exact m/s:
1. **Single block 20×20 m:** wake behind < 0.6; shoulder (beside the block, outside the wall layer) > 1.05.
2. **Slab 60×12 m across the wind:** wake behind longer than the single block's (compare the ratio at the same distance downwind).
3. **Tower among low-rise:** in 2D, height is ignored, so assert only that the mask and flow are stable (finite, wake behind). Add a comment saying downwash comes from the separate rule.
4. **Two blocks with a 12 m gap along the wind direction:** gap ratio > 1.0 and < 1.6 (don't exaggerate channelling).
5. **Courtyard (perimeter block with a closed inner court):** court mean ratio < 0.3.
6. **L-shape:** the inner corner (lee side) is calmer than the outer upwind corner.

Also add one stability case: mean density after 2500 steps stays within 0.01 of the value at 1250 (no mass build-up).

## 2. `docs/research/wind-validation-note.md` (≤ 50 lines)
A one-page public-facing note: what was tested, a table (case | expectation from wind-engineering practice | Terraform result as a number from your test run | pass/fail), limits (2D, low Reynolds number, no terrain, downwash is a rule), and the claim label `Indicative wind screening — 2D flow, not engineering`. No invented sources; if you cite a source, name it generically (e.g. "COST 732 best-practice guideline"). To record numbers, run the tests with a temporary `console.log`, then remove it.

## Done when
`npx vitest run src/features/analysis/wind-validation.test.ts` passes, and `npm run lint` and `npm run typecheck` pass. Report: case results table, commands and results, and any case you had to loosen (with the reason).
