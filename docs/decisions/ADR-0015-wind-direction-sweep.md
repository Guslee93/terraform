# ADR-0015 — All-directions sweep: worst-case map and direction rose

- **Status:** Accepted (owner request, 2026-11-07)
- **Related:** ADR-0014 (wind solver), `docs/research/forma-wind-notes.md`, `docs/handoffs/C27-wind-direction-sweep.md`

## Context

Forma's wind panel shows a wind rose (dominant sector and share), comfort shares and a Direction view, so a designer can see where and from which direction a site is worst. Forma's rose comes from measured climate data. Terraform has no climate data yet (a MET Norway Frost client ID is needed), and the project's rule is never to invent it.

## Decision

1. Add an **all-directions sweep**: the ground-level flow is solved for 8 directions (every 45°) in a separate worker, on a coarser grid, and resampled onto the analysis-circle lattice.
2. From the sweep, show:
   - a **worst-case map**: each cell gets the highest speed over all directions, and its worst direction;
   - a **direction rose**: per direction, wedge length = mean wind on open ground; the worst direction is the one with the largest share at or above 4 m/s (Lawson B/C, "too windy to stand"), then the highest mean;
   - the worst sector highlighted and clickable to set the dial.
3. **Equal weighting.** Every direction counts the same. The UI says so: "Equal weighting of 8 directions — not measured climate frequency." Once a measured wind rose exists, the same sweep feeds the annual Lawson maths already in `comfort.ts`.
4. No new dependency. The rose is inline SVG.

## Consequences

- A second worker runs only when the sweep is requested, and is cancelled when the circle or geometry changes. The live single-direction view stays as it is.
- The worst-case map overstates exposure compared with a climate-weighted map. That is the intended screening reading ("could this spot ever be windy?") and it is labelled.
- The 2D limits of ADR-0014 apply (low-rise clusters, downwash as a rule).

## Implementation note (2026-11-07)

Codex (C27) built `directionSweep.ts` (96² per direction, convergence stop, progressive, 4-entry cache), `sweepWorker.ts` and `useWindSweep.ts`: 12.6 s for 8 directions in Node (Compact Infill, r = 100 m). Claude built the rose (`DirectionRose.tsx`), the share bar, the worst-case display (`climateView` `'worst'`) and `WorstArrows.tsx`. A first threshold of 6 m/s left the rose almost empty on the sheltered demo site (≤ 1 %), so the wedge length became the mean speed and the share threshold 4 m/s.

