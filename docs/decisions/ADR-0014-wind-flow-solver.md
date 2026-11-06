# ADR-0014 — Live 2D wind flow (CPU lattice-Boltzmann)

- **Status:** Accepted (owner request, 2026-11-06)
- **Related:** ADR-0002 (ENU), ADR-0012 (no export), ADR-0013 (screening layers), `docs/plans/wind-simulator-prd.md`

## Decision

1. Wind screening moves from the ray-cast exposure index to a 2D D2Q9 BGK lattice-Boltzmann flow in `src/features/analysis/lbm.ts`: plain TypeScript, no renderer, no new dependency.
2. The site is rotated into a square grid frame (default 128², margin 1.6 × study radius) so the inlet is always x = 0. One conversion path: `flowFrame` / `worldToGrid` / `gridToWorld`.
3. The solver runs in a Web Worker; the scene only receives the speed-ratio field. GPU (WebGL2/WebGPU) is a later optimisation, only if the worker misses R2.
4. 3D effects the 2D slice cannot produce (downwash) are explicit, toggleable rules in `comfort.ts`.
5. Claim label: `Indicative wind screening — 2D flow, not engineering`. ADR-0013 claim policy still applies.

## Consequences

- Measured: ~14 M cell-steps/s in Node → ~14 solver steps per frame at 128²; enough for a live look, settles in 1–3 s.
- Low-Re laminar flow: wakes and shedding are visual cues, not turbulence statistics.
- No live weather, no export, no external solver.
