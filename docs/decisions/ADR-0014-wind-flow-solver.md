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

## Addendum (2026-11-06)

- **Analysis circle.** The frame is built from a movable circle (radius 60–250 m), not the study area: 160² cells over 1.4 × r ≈ 1.75 m at r = 100 m. Heatmap (4 m cells), particles and streamlines are clipped to it.
- **Boundaries.** Outlet density pinned to 1 (zero-gradient let mass pile up in dense blocks); sides held at the free stream (zero-gradient let a sideways jet into small domains); obstacles kept 3 cells off every edge. A floating inlet density was tried and diverged.
- **Worker updates** are throttled (≤ every 80 ms), not debounced, so a continuous drag re-solves live; only a fresh, settled field can become a delta baseline.
- **Comfort** uses Lawson (Norconsult) thresholds at one chosen reference speed, labelled as momentary. Annual Lawson stays off until a measured per-site wind rose exists.

## Addendum 2 (2026-11-06) — layered "3D look" (W5)

- **Height slices.** After the 2 m field settles, the worker solves slices at 10, 20 and 35 m where only taller buildings are obstacles, scaled by the indicative urban power law (α = 0.22). Upper slices run on an 80² lattice, bilinear-upsampled to the fine frame, warm-started from the slice below; every solve stops on convergence (mean |Δspeed| < 2e-4 per 250 steps) with `MAX_STEPS` as a cap. Results post progressively; complete stacks are cached (8 entries). Browser: full stack ≈ 8 s on Compact Infill (was ≈ 60 s).
- **Rendering.** Roofs take their colour from the slice just above them; streamlines can be flat at a slice height or pseudo-3D: horizontal flow interpolated between slices, rising over buildings they can clear within 15 m and going round taller ones. The vertical motion is a **rule**, labelled in the panel.
- **Units.** Field ratios are relative to the 2 m free stream; the slider is the reference at 10 m. m/s = ratio × ref × profileFactor(2) (≈ 0.70). Before this fix every m/s value was ≈ 1.42× too high.
- **Still not:** 3D CFD, terrain-driven flow, or roofs above 35 m (uncoloured).
