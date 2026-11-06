# C21 — Wind streamlines + baseline delta + Forma tab names (Codex work order)

Goal: copy two of Forma's "wow" moments (see `docs/research/forma-wind-notes.md` §4): flow filaments wrapping the buildings, and "the same spot was orange, now it's green".

Read first: `AGENTS.md` §1, `docs/research/forma-wind-notes.md`, `src/features/analysis/{lbm,flowRunner,climateView}.ts`, `src/scene/{WindParticles,AnalysisCircle,ViewportCanvas}.tsx`, `src/components/studio/{ClimatePanel,StudioShell}.tsx` (+ ClimatePanel.test).

## HARD RULE
Edit only: the files above, plus new `src/features/analysis/streamlines.ts` (+ test) and `src/scene/WindStreamlines.tsx`. Do NOT touch `lbm.ts`, `comfort.ts`, `lbm.test.ts` or anything under `src/features/analysis/*validation*` (another agent owns those). No new dependencies. Local ENU metres. Do not commit.

## Items
1. **Streamlines (domain).** `streamlines.ts`, renderer-free: `traceStreamlines(flow, circle, { seeds = 400, keep = 150, stepM = 1.5, maxSteps = 300 })`. Seed on a jittered grid inside the circle and integrate forward and backward (RK2) through `sampleVelocity`. Stop at buildings, the circle edge or stagnation (|v| < 0.05). Score = length × mean speed. Return the top `keep` as `{ points: Vec2[]; speeds: number[] }[]`. Use a seeded PRNG so the output is deterministic.
2. **Streamlines (scene).** `WindStreamlines.tsx`: one `lineSegments` draw call, 1.5 m above the terrain, Forma-like dark blue `#1E3A8A` at opacity rising with speed. Recompute when the flow settles and when the circle or direction changes, not on every worker tick. Panel toggle "Streamlines" (default off). Under `prefers-reduced-motion`, show streamlines instead of particles automatically.
3. **Tab rename.** The Speed/Activity switch becomes **Comfort** (activity bands) / **Direction** (speed-ratio bands), with **Comfort** as the default (Forma 1:07, 1:13). Keep `WindDisplay` values or rename them consistently, and update the tests.
4. **Baseline + delta.** A "Set baseline" button stores the current settled field (copy of `velocity` + `frame` + circle + direction). While a baseline exists, a **Delta** view appears beside Comfort/Direction. Colour = local ratio minus baseline ratio, in bands ≤ −0.3 / −0.1 / ±0.1 / +0.1 / ≥ +0.3 (calmer blue → no change neutral → windier red). Legend: "Calmer / No change / Windier vs baseline". If the direction or circle changed since the baseline, show "Baseline was taken for W 270°, r = 100 m. Reset it to compare." and no delta. "Clear baseline" removes it. Keep the baseline in state only (no persistence).
5. **Tests:** deterministic streamlines (same input → same output); no streamline point inside a building or outside the circle; delta bands at hand-made values; the baseline mismatch message; the tab rename.

## Done when
`npm run lint`, `npm run test`, `npm run build` pass. On Compact Infill: streamlines bend round the blocks and run through the western gap. Setting a baseline, then drawing a mass in "Test a building" mode, shows red/blue delta around it. Summary: files changed, tests, commands and results, anything stopped.
