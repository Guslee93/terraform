# PRD — Wind Flow Simulator (Terraform integration)

**Status:** accepted for build · **Date:** 2026-11-06 · **Owner:** Gustav Kamanzi
**Source:** `~/Downloads/Terraform_Wind_Microclimate_PRD.md` v0.1 (the wish list). This file is the version that fits Terraform's guardrails (AGENTS.md §1, ADR-0013). Where they disagree, this file wins for the build.
**Decision record:** ADR-0014.

## 1. What we build

Replace today's ray-cast wind *exposure* index (`wind.ts`, ADR-0013) with a live 2D flow field around the site's buildings:

- animated particles and a pedestrian-level speed heatmap,
- a wind dial (direction + reference speed) that re-runs the flow live,
- Lawson-style comfort and safety classes, with a rule-based downwash boost for tall buildings,
- plain-language hotspot cards.

Label everywhere: `Indicative wind screening — 2D flow, not engineering`. Never "accurate", "verified", "compliant", "CFD".

## 2. What changes from the source PRD (and why)

| Source PRD | Here | Why |
|---|---|---|
| WebGPU compute LBM, WebGL2 fallback | **CPU D2Q9 in TypeScript, in a Web Worker**, 128² grid. GPU port only if the perf budget fails | Domain logic must be renderer-free and unit-tested (guardrail 3); no new deps; measured ≈ 14 M cell-steps/s → ~14 steps per 60 fps frame at 128² |
| MET Norway Frost API / NORA3 live | Built-in typical wind rose per site, labelled "typical, not measured"; user override | No live data or backend in v1 (guardrail 11). Offline-baked rose = later, needs ADR |
| Clip/GIF/PNG export, presets, watermark | **Out** | ADR-0012 dropped export |
| Paid tiers, Verify (Infrared/OpenFOAM), ML U-Net | **Out** | No payments/backend/AI before M6 |
| Use-tag painting (Bergen targets), 4-option compare | **Later** (W4) | Scenarios already exist; reuse them for compare instead of new UI |
| Smagorinsky LES term | Plain BGK, tau ≥ 0.56 | Stable at our grid size; add if finer grids need it |

## 3. Requirements

| ID | Requirement | Check |
|---|---|---|
| R1 | Flow visible ≤ 3 s after opening the Wind layer, no settings | e2e timing |
| R2 | Moving a building or the dial updates the flow while dragging; UI stays ≥ 30 fps (solver in a worker) | perf probe |
| R3 | Corner acceleration, wake and gap channelling appear where expected for the 6 canonical cases (§6) | unit fixtures |
| R4 | Comfort map uses Lawson (Norconsult variant: 2/4/6/8/10 m/s, 5 % exceedance; safety 15/20 m/s); criterion named in the legend | unit tests |
| R5 | Downwash rule only for H ≥ 2 × mean neighbour height or H ≥ 30 m; visible as its own toggle | unit tests |
| R6 | One colour ramp (calm blue → red), deuteranopia-safe, discrete steps for comfort | design review |
| R7 | `prefers-reduced-motion` → static streamlines, no particles | unit + e2e |
| R8 | Disclaimer visible in the panel and legend at all times | e2e |

## 4. Architecture

```
site package (footprints, heights) + dial (bearing, speed)
  → flowFrame + rasterize        src/features/analysis/lbm.ts   (done)
  → createLbm / stepLbm          src/features/analysis/lbm.ts   (done, CPU, in worker)
  → speedRatio field (|u|/u0)
  → comfort.ts: downwash boost, Lawson classes, annual combine   (W2)
  → insights.ts: hotspot cards                                   (W3)
  → scene: heatmap DataTexture + particle advection              (W1)
```

All world ↔ grid maths goes through `flowFrame`/`worldToGrid`/`gridToWorld` (local ENU metres, ADR-0002). Wind is rotated by rotating the *site* into the grid frame; the inlet is always x = 0.

## 5. Phases and owners

| Phase | Scope | Owner | Done when |
|---|---|---|---|
| **W0** | ADR-0014, solver, frame, rasterizer, tests | Claude (done) | `lbm.test.ts` green |
| **W1** | Worker, heatmap overlay, particles, wind dial in ClimatePanel; replaces the old wind exposure mode | Codex — `docs/handoffs/C19-wind-flow-ui.md` | R1, R2, R7, R8 |
| **W2a** | `comfort.ts`: Lawson classifier, safety, downwash rule, annual combine + fixtures | MiniMax — `docs/handoffs/X1-minimax-wind-comfort.md` | R4, R5 |
| **W2b** | Comfort/Safety layers in UI, typical wind rose, Annual toggle | Codex (after W1 + W2a merge) | R4 in UI |
| **W3** | Insights cards (corner, wake, gap, downwash), click to fly | Codex | cards match fixtures |
| **W4** | Delta vs saved scenario; use tags | later, owner decides | — |
| **Gate** | lint/test/build, e2e, screenshots, review note | Claude | AGENTS.md §7 |

W1 and W2a touch different files and run in parallel.

## 6. Validation

Six canonical cases as unit fixtures (single block, slab, tower among low-rise, two blocks with gap, courtyard, L-shape). Assertions are directional, not m/s: wake ratio < 0.6 behind, ratio > 1.05 at the shoulder, gap faster than open ground only modestly (do not exaggerate channelling). An OpenFOAM side-by-side note is optional and outside this build.

## 7. Known limits (state in UI/About)

- 2D slice at pedestrian height: no real downwash, no terrain, no vertical flow. Downwash is a labelled rule.
- OSM footprints/heights are incomplete in places.
- Typical wind rose, not measured site statistics.
- Low Reynolds-number flow scaled to look plausible; results are comparative within one site.
