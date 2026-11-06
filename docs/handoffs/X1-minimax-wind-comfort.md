# X1 — Wind comfort domain (MiniMax work order)

You are working in a TypeScript (strict) + Vitest repo: Terraform, an architectural screening prototype. Repo root: `/Users/gustavekamanzi/Downloads/2026/Terraform`.

Read first: `AGENTS.md` §1 and §7, `docs/plans/wind-simulator-prd.md`, `src/features/analysis/lbm.ts`, `src/features/analysis/lbm.test.ts`, `src/features/analysis/wind.ts` (style reference).

## HARD RULE
Create ONLY `src/features/analysis/comfort.ts` and `src/features/analysis/comfort.test.ts`, and add test cases to `src/features/analysis/lbm.test.ts`. Edit nothing else. No React, no Three.js, no new dependencies, no `any`. Do not commit.

## Build `comfort.ts` (pure functions)
1. `LAWSON_NORCONSULT` = thresholds `[2, 4, 6, 8, 10]` m/s → classes `'A'|'B'|'C'|'D'|'E'` (A sit, B stand, C stroll, D walk, E uncomfortable) at 5 % exceedance; `SAFETY` = 15 and 20 m/s. Export the criterion name string for the legend.
2. `localSpeed(ratio, refSpeed10m)` = ratio × refSpeed.
3. `downwashBoost(buildings, frame)`: for each building with H ≥ 2 × mean height of buildings within 100 m, or H ≥ 30 m, return a per-cell multiplier field (Float32Array, length nx*ny, default 1) that adds a capped boost (max ×1.3) in a ring of width ∝ H (≈ 0.5 H, capped) around the footprint, strongest on the upwind side and corners. Use `gridToWorld` from `lbm.ts`. Each rule is a named constant.
4. `exceedanceProbability(ratiosByDirection, rose, threshold)`: rose = 8 or 12 sectors `{ fromDeg, frequency, weibullK, weibullC }` (frequencies sum to 1). P(speed > t) per cell = Σ freq × exp(-(t / (ratio × c))^k). Return Float32Array.
5. `lawsonClass(probabilities by threshold)` → class per cell: the lowest class whose threshold is exceeded ≤ 5 % of the time; `'unsafe'` when P(>15) > 0.0003 (≈ 2.5 h/yr) — name the constant and cite "Lawson safety, indicative".
6. `COMFORT_DISCLAIMER = 'Indicative wind comfort (Lawson, Norconsult variant) — 2D screening, not engineering'`.

## Tests (hand-computable fixtures)
- Class boundaries: exact threshold values, one rose sector with frequency 1.
- Exceedance: single sector, k = 2, c = 5, ratio 1, t = 5 → e^-1.
- Downwash: 40 m tower among 10 m blocks gets a ring >1 at its base; 10 m block alone gets all 1s; boost never exceeds 1.3.
- In `lbm.test.ts` add two canonical flow cases with directional asserts only: two blocks with a gap (gap ratio > 1.0 but < 1.5) and an L-shape (inner corner calmer than outer corner). Keep grids ≤ 96×64 and steps ≤ 1500 so each test runs < 2 s.

## Done when
`npx vitest run src/features/analysis` passes, `npm run lint` and `npm run typecheck` pass. Report: files changed, test names, commands and results, any assumption you made.
