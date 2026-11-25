# ADR-0038 — Stormwater runoff screening

- **Status:** Accepted (2026-11-16, owner request: "make sure you also do … the storm water analysis";
  the plan's stretch package WP-8)
- **Relates to:** ADR-0037 (1 m terrain tile), ADR-0036 (mapped hazard facts), ADR-0026 (analysis
  cards), feasibility 04 §1, 07 (Tier 2: preliminary screening), 08 §1 and R11
- **Dependencies:** none added.

## Context

The owner's feasibility summary reads: "Flood-risk layers and preliminary runoff screening are
feasible. Accurate water-depth predictions need hydraulic modeling." The mapped layers arrived with
ADR-0036. The screening was tested in feasibility in Python: Priority-Flood+Epsilon and D8 on the
1 m terrain conserve water (100 % of cells drain, no sinks). Its main weakness there was that the
bare-earth terrain lets water run through buildings.

## Decision

1. **Method** (`src/features/analysis/runoff.ts`, renderer-free), a port of `terrain_bench.py`:
   - every building footprint, context and drawn, is **raised 10 m** as a block, so the flow goes around it;
   - **Priority-Flood+Epsilon** (Barnes et al. 2014) fills depressions from the tile's edge inwards;
   - **D8** hands each cell's water to its steepest downhill neighbour; accumulation is the number
     of cells draining through a cell;
   - the tile's edge, and any cell without data, is an outlet.
2. **What is drawn** (`RunoffOverlay`, the draped-texture path of ADR-0034, one pixel per cell):
   - flow paths, where water from 500 m² or more passes; main flow paths from 5 000 m², drawn three
     cells wide so they read at site scale;
   - depressions: cells more than 5 cm below the level at which their hollow spills.
   Buildings are never drawn on.
3. **A Water card** beside Sun, Wind and Noise. Opening it loads the 1 m tile (if not loaded), runs
   the screening **in a worker** (`runoffWorker.ts`, `useRunoff`, 250 ms debounce) and drapes the
   result. The card also lists what the authorities have mapped about water (flood zones, flood
   susceptibility, storm surge, from ADR-0036), kept visibly apart from the screening.
4. **A drawn block is a block in the model**: the paths go around it. This is geometry, not a
   statement about drainage.
5. **Claims** (feasibility 08 §1, screening class; the plan's wording):
   "Screening: flow paths and depressions on bare-earth terrain with buildings as blocks. No
   rainfall, drainage or depths." Also stated: the tile's edge is an outlet, so water from outside
   is not included; kerbs, culverts, drains and pipes are not in the model; **a courtyard closed in
   by buildings shows as a depression, because the model has no gateways or drains.**
   - The only figure is the share of open ground lying in depressions or enclosed courtyards. On
     Compact Infill it is 16 %, most of it courtyards: a property of the block structure, not of
     flood risk. No depth, volume, rainfall or return period is shown anywhere.

## Consequences

- Curated sites only: the screening needs the 1 m tile (ADR-0037). On an imported site the card says so.
- Cost in the browser: about 0.8 s from opening the card to the figure on both curated sites,
  tile download included, with no long task on the main thread.
- Studio chunk 78.5 → 81.1 kB gzip (both new cards); the worker is 2.7 kB.

## Not done

- **No comparison with a reference tool** (WhiteboxTools or TauDEM; feasibility IT-7). The method
  is checked for conservation and on analytic cases, not against another implementation. It stays
  Tier 2 screening.
- No rainfall, infiltration, pipe network, kerb heights or culverts; no depths or velocities.
- Flow entering the tile from uphill outside it is not modelled.

## Verification (2026-11-16)

- `runoff.test.ts`: the feasibility valley (every cell drains, no pit, flow gathers on the axis and
  grows downhill, no false depression); a 1 m pit fills to its spill level; a block across the
  valley diverts the flow and holds water behind it as a depression, with nothing lost; a cell
  without data is an outlet; the wording carries no depth or return period.
- Shipped Compact Infill tile with its 520 buildings burned in: 458 016 cells, all drained, 0 pits.
- Browser, production build: both curated sites; no page errors.
  Captures: `docs/screenshots/build-water-{compact-infill,sloped-edge}.png`.
