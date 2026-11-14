# ADR-0029 — The wind lift reaches every whole metre

- **Status:** Accepted (2026-11-14, the owner's request)
- **Amends:** ADR-0028 §1 (heights) and §3 (only solved heights are shown)
- **Relates to:** ADR-0014 (wind simulator), ADR-0023 §8 (density cost)

## Context

ADR-0028 lifted the wind map through fixed slices at 2, 5, 10, 15, 20, 25 and 30 m, plus a top slice
above tall roofs. The owner asked for the map to be lifted smoothly to any height instead, so that
lifting the disc shows exactly where each building stops shaping the wind.

In this model a slice is a 2D solve in which a building blocks the wind when it is taller than the
slice (`sliceObstacles`). The flow runner then scales each solve by the indicative wind profile,
`profileFactor(z) / profileFactor(2)`. So between two heights where no roof ends, the set of
obstacles is the same and the solved flow differs only by that scale factor.

## Decision

1. **Solve where roofs end.** The stack is solved at 2 m and at each whole metre where a roof ends
   (`ceil(height)` of every building that can reach the solve frame), and nowhere else
   (`sliceHeightsFor`). Buildings that cannot reach the frame add no solve (`buildingsNearFrame`).
2. **Show every whole metre.** Any height from 2 m to the lift top is the solved slice that covers it
   (the highest solve at or below it), scaled by the profile from that slice's height to this one
   (`flowAtHeight`). This is exact within the model: nothing is interpolated between two different
   obstacle sets, which keeps ADR-0028 §3's intent.
3. **Lift range.** From 2 m to 5 m above the tallest roof near the frame, at least 30 m and at most
   120 m (`liftTop`).
4. **The slices are the fields as solved.** The 2 m slice no longer carries the downwash rule (a
   ground-level rule); the pedestrian map still does, through the flow's own `velocity`.
5. **Controls.** The panel slider and the lift handle step 1 m (Page Up/Down 5 m on the handle);
   the dashed rings mark 2 m and every 5 m. Heights are ready from the bottom up: right after the
   ground solve, everything up to the first roof.
6. **3D streamlines** sample the covering slice too (`velocityAtHeight`), instead of blending
   between neighbouring slices, which with irregular solve heights would have blended through a
   building that still stands.

## Consequences

- **Cost**, measured with the full stack on a 4-core container: Compact Infill 16.0 s → 18.2–19.6 s
  (8 → 10 solves); Sloped Edge 7.6–8.0 s → 8.5–9.1 s (7 → 5 solves). The 2 m solve dominates and
  is unchanged. Roof heights in the curated data fall on storey multiples, so solves are about
  3 m apart. A site with many distinct roof heights solves more; the bound is one per metre.
- **The lift top follows the frame, not the site.** Compact Infill's top moves from 65 m (a tower
  outside the solve frame) to 35 m.
- **A finished stack of just the ground solve is now possible** (no roof above 2 m near the frame);
  the runner now caches it too.
- **Unchanged limit.** Each height is still a flat 2D slice: the lift shows correctly which buildings
  block the wind at each metre, not flow over a roof or down a façade. That needs a true 3D solve,
  still deferred (ADR-0028, alternatives).

## Alternatives considered

- **Solve every metre** — up to 120 solves per direction, nearly all identical between roof heights.
- **Interpolate between the fixed slices** — would invent values between obstacle sets that differ,
  which ADR-0028 §3 rules out.
