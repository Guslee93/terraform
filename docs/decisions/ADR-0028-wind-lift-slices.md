# ADR-0028 — The wind analysis lifts through terrain-following height slices

- **Status:** Proposed (2026-11-13)
- **Relates to:** ADR-0014 (wind simulator), ADR-0015 (wind follow-ups), ADR-0023 §8 (density cost), ADR-0026 (analysis cards)
- **Plan:** `docs/plans/wind-lift-plan.md`

## Context

The wind map shows only the 2 m pedestrian field. The solver already computes a stack of 2D
slices (2, 10, 20, 35 m, plus a top slice above tall roofs), but the slices are visible only as
flat streamlines and roof colours. The owner wants to lift the wind map itself with a handle and
see the flow at each height, measured from the terrain.

A 3D "dome" was considered on 2026-11-13 and set aside: a dome filled from four slices implies
vertical knowledge the solver does not have, and a real 3D solve (D3Q19) is a separate, larger
decision.

## Decision

1. **Heights.** The standard slices become **2, 5, 10, 15, 20, 25 and 30 m above terrain**. When
   the tallest analysed building is over 30 m, one extra top slice is added just above it
   (rounded up to 5 m, +5 m clearance, capped at 120 m) — the existing rule with its threshold
   moved from 35 m to 30 m.
2. **Terrain-following.** Every slice is drawn at `terrain height + slice height` at each point. A
   building blocks a slice when its own height (above its own ground) exceeds the slice height —
   the rule `sliceObstacles` already applies.
3. **Only solved heights are shown.** The disc snaps to solved slices; no value is interpolated
   between heights.
4. **One height control.** A single height setting drives the heatmap, flat streamlines and
   particles, through a red handle in the scene and a stepped slider in the panel (keyboard path).
   It is a view setting and creates no undo entry; `Esc` cancels a drag.
5. **Legend by height.** Comfort/activity classes are shown at 2 m only. Above 2 m the map shows
   speed in m/s.

## Consequences

- Upper solve work roughly doubles (3–4 slices → 6–7). It must be measured on the curated and
  import sites (ADR-0023 §8) before release; if it is too slow, the requested height is solved
  first.
- Roof colours (`RoofWind`) improve: roofs pick a slice closer to their own height.
- Claims are unchanged: indicative wind screening, 2D flow per slice, not engineering. Following
  the terrain is a drawing choice — the solver still treats each slice as flat and does not model
  speed-up over slopes or ridges; the existing slope note stays.
- A building on a slope has one height, though its downhill wall is taller. Accepted.
- The worst-direction sweep stays a 2 m pedestrian screen.

## Alternatives considered

- **Dome filled from the slices** — rejected: blends between slices and implies a vertical field
  that was never solved.
- **True 3D solve (D3Q19)** — deferred: needs its own ADR, validation fixture and a WebGPU vs CPU
  decision (`docs/plans/wind-3d-plan.md` §3C).
- **Flat slices at a fixed elevation** — rejected: on a sloped site a flat plane is 2 m above the
  ground on one side and 20 m on the other, so "2 m" would mean nothing.
