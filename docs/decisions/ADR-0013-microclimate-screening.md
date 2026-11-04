# ADR-0013 — Wind and noise screening layers; microclimate becomes the main path

- **Status:** Accepted (owner, 2026-11-04)
- **Date:** 2026-11-04
- **Deciders:** Project owner
- **PRD references:** §3 non-goals (line 55: wind CFD, acoustic simulation), §10, §13
- **Related:** `docs/plans/microclimate-pivot.md`

## Context

The PRD is written around designing massing. The owner wants a different main path: landing page → "Try it" → enter an address → choose the study area → microclimate and area analysis (sun, wind, noise, areas). PRD line 55 excluded accurate wind CFD and acoustic simulation. Those stay excluded; screening-level indices were never decided either way.

## Decision

1. Add **wind exposure** and **road-noise** *screening* layers computed in renderer-free domain code from data the site package already holds (building footprints and heights, road class and centrelines). No new data source, no new dependency.
2. They are comparative indices within one site, not simulations. Every surface that shows them carries a claim label:
   - `Screening estimate — not a wind simulation`
   - `Indicative road-noise screening — not a noise survey`
3. The main path becomes address → study area → analysis dashboard. The massing editor and scenarios stay in the code, behind a "Test a building" toggle.
4. CFD, acoustic simulation, daylight factor and compliance claims remain out of scope. Claim policy in AGENTS.md is unchanged.

## Consequences

- Noise levels come from a small table of nominal per-road-class levels (indicative, named constants in one place). Wind direction is an input (built-in typical table plus override); no live weather.
- Terrain effects, reflections, traffic counts and rail are not modelled in v1.
- Results must never be described as measured, compliant or verified.
