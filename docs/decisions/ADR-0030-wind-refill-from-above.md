# ADR-0030 — Wakes above 2 m refill from above

- **Status:** Accepted (2026-11-14, the owner's request: "the wind path still shows the path between
  the buildings even above the buildings")
- **Amends:** ADR-0029 §1 (solve heights) and its claim that every metre is exact within the model
- **Relates to:** ADR-0014 (wind simulator), ADR-0028 (wind lift), ADR-0029 (every metre)

## Context

Lifted to 15 m on Compact Infill, the map still looked like the street pattern under the disc: 34 % of
the circle read 0–2 m/s, with calm bands lying over buildings lower than the disc.

The solver was not using those lower buildings. A diagnostic run of the 14 m solve (which covers
15 m) against a cold solve with the same obstacles matched it exactly. The open cells inside the
footprints of the lower buildings were as fast as the rest (mean 0.88 against 0.83). Two other things
made the pattern:

1. **Buildings still taller than the disc.** Inside the circle 16 buildings are 16–17 m tall, and 43 in
   the solve frame. The fast channels between them are real at 15 m in this model.
2. **Wakes that never refill.** Each height is a flat 2D slice, so the calm air behind a building can
   only be refilled from the sides, slowly and viscously. Around a real building, air comes down
   from above the roof and refills the wake within a few building widths. In the slice, a cluster of
   17 m buildings upwind left 48 % of the 15 m frame below half the free stream. A single 20 m building
   left a calm streak across the whole 280 m frame at 18 m. On the coarse upper-slice grid the lattice
   is also twice as viscous as on the ground grid, so the wakes there are wider still.

## Decision

1. **Refill from above.** In every solve above 2 m, each step relaxes the momentum of every fluid cell
   toward the free stream by a fixed fraction (`Lbm.exchange`), keeping its density: air mixing down
   from above the slice. The deficit in a wake then falls by a factor e over a **refill length**
   (`refillExchange`: rate = u0 · dx / length).
2. **Refill length.** The gap from the slice up to the roofs that cast its wakes, divided by a vertical
   turbulence intensity σw/U = 0.12 (`refillLength`, `VERTICAL_TURBULENCE_INTENSITY`). The gap is taken
   to the median roof among the buildings still taller than the slice. Just under the roofs a wake
   refills within metres; deep under them it barely refills. 0.12 is an indicative assumption, not a
   fitted or measured value. It is the order of near-neutral turbulence near roof level (σw about
   1.25 u*, with u* a tenth to a fifth of the mean wind there), taken at the low end, so wakes are
   never refilled faster than that range suggests. Roth (2000, QJRMS 126, 941–990) describes the
   roughness sublayer, where building wakes dominate, as reaching about 2.5–3 building heights.
3. **The 2 m field keeps no refill.** The pedestrian field, its comfort classes and the validated
   canonical cases are unchanged. A building of three or more storeys is deep over 2 m, so the refill
   would be weak there anyway.
4. **Solve heights.** Under ADR-0029, solves sit at 2 m and wherever a roof ends. Each band between two
   of those now also gets a solve at every whole metre where the gap to the band's median roof has
   halved, down to a 1 m gap (`sliceHeightsFor`). Any metre is still the solve below it scaled by the
   wind profile, and nothing is interpolated. A solve's refill length is now at most twice the one at
   any metre it covers with a gap of 1 m or more. Under a 1 m gap the refill length is under about
   8 m, two cells of the upper-slice grid. The 2 m solve covers only metres at least half as far
   under the roofs as 2 m.

## Consequences

- **Compact Infill at 15 m:** 0–2 m/s falls from 34 % to 13 % of the circle, and 4–6 m/s rises from
  20 % to 35 %. The channels between the 16–17 m buildings stay. At 18 m the field is 89 % at 6–8 m/s,
  with a short wake behind the one 20 m building.
- **Validation:** the canonical cases (pedestrian field) are unchanged. S2 still holds: a 40 m tower
  blocks every metre under its roof and stops at it. New case S4: 40 m behind the tower, the wind is
  0.07 of the free stream at 2 m, 0.33 at 25 m and 0.85 at 38 m. Right behind it, it is calm at every
  height.
- **Cost, measured** (full stack, 4-core container, two runs): Compact Infill 18.3–19.1 s → 16.6–17.5 s,
  10 → 14 solves. Sloped Edge 9.1 s → 7.9–8.6 s, 5 → 7 solves. Refilled slices settle sooner (a cold-started
  14 m solve: 750 steps against 2,000), which more than pays for the extra solves.
- **ADR-0029's claim is narrower.** Every metre is still the covering solve scaled, but the refill
  depends on the height, so "exact within the model" now means exact up to the factor-of-two refill
  bound above.
- **Still a 2D model.** The refill is a rule, not flow over a roof or down a façade; it shortens wakes
  and does not create downdrafts. The caption keeps "2D flow, not engineering". A true 3D solve
  remains deferred (ADR-0028, alternatives).

## Alternatives considered

- **Solve every metre with the refill.** Exact for the rule, but 33 solves on Compact Infill and up to
  118 under the 120 m top. The halving bands give the same picture within a factor of two at a
  quarter of the cost.
- **Refill in the 2 m field as well.** Physically consistent, but it would change the comfort classes
  and their validation. That would be a separate decision, if the owner wants it.
- **One refill rate for every slice.** Simpler, but it refills a slice deep under the roofs as fast as
  one just under them, which is exactly the wrong way round.
- **Fade the map over low buildings.** That would hide the artefact instead of fixing it.
