# Wind validation note — the 2D flow solver

**Claim label: `Indicative wind screening — 2D flow, not engineering`**

What was tested: `src/features/analysis/wind-validation.test.ts` — the six canonical cases of the
wind simulator PRD §6 plus a mass-stability case, run 2026-11-06. Each case is a directional check
on the D2Q9 solver in `src/features/analysis/lbm.ts` with wind from the west (270°). Numbers are
speed ratios (|u| / u0), never m/s. Grids ≤ 128 × 96, ≤ 2500 steps, every case under 1.5 s.

## Results

| # | Case | Expectation from wind-engineering practice | Terraform result (measured) | Verdict |
|---|---|---|---|---|
| 1 | Single block 20 × 20 m | Wake behind the block is calm; flow accelerates around the shoulder | Wake 25 m behind **0.16**; shoulder 26 m beside **1.24**; open ground **1.00** | pass |
| 2 | Slab 60 × 12 m across the wind | A wide slab throws a **longer** wake than a compact block | At 40 m downwind: slab **0.58** vs block **0.11** — the slab's wake recovers sooner | **not reproduced** (2D limit) |
| 3 | Tower among low-rise | Height does not change a 2D slice; a wake still forms behind the block | Obstacle mask byte-identical for a 60 m and a 12 m tower; wake 25 m behind **0.38**; all values finite | pass |
| 4 | Two blocks, 12 m gap | Passages often carry *less* air than open ground (Blocken et al.); channelling must not be exaggerated | Gap **0.87** vs open ground **≈1.0**, domain margin 1.6 (as in the app). An earlier run in a tight domain showed 1.19 — a blockage artifact | pass (revised) |
| 5 | Courtyard with a closed inner court | A closed court stays sheltered and calm | Court mean < 0.3; outside > 0.9 with domain margin 2 | pass |
| 6 | L-shape | The inner (lee) corner is calmer than the outer upwind corner | Inner **0.025** vs outer upwind **0.70** | pass |
| S | Mass stability, 1250 → 2500 steps | No mass build-up once the flow has settled | Mean density 1.0218 → 1.0196, drift **0.0022** (target < 0.01) | pass |

Case 4 geometry note: the 12 m gap is a corridor aligned with the wind between two blocks, so the
wind is channelled through it. Two blocks separated *along* the wind produce no channelling in this
model (gap slot ratio ≈ 0.12).

## Limits

- **2D slice.** No vertical flow, no atmospheric boundary layer, no flow over the roof.
- **Low Reynolds number.** Wake, gap and corner numbers are comparative within one site and one
  wind direction. They are not wind-tunnel, LES or CFD values.
- **No terrain.** The ground is flat; slope, roughness and trees are not modelled.
- **Downwash is a rule, not a result.** The 2D slice cannot solve downwash. The boost in
  `comfort.ts` (`downwashQualifies` / `downwashBoost`) is a labelled geometric rule that only
  fires for a building standing well above its neighbours.
- **Case 2 is a model limit, not a pass.** Wake persistence in 2D follows a body's thickness along
  the wind, not its span, so the long wake of a wide slab cannot be reproduced here.

## Revision (2026-11-06)

The side boundaries were changed from zero-gradient to a uniform free stream after a sideways jet
was found on small analysis-circle domains. Cases 4 and 5 were re-run with domain margins matching
the app; case 4's expectation now follows the passage-flow literature instead of assuming channelling.
Numbers for cases 1, 2, 3, 6 and S in the table were measured before this boundary change. The
directional assertions still pass on the current solver; the exact values have not been re-recorded.

## Height slices (W5, 2026-11-06)

| # | Case | Expectation | Result | Verdict |
|---|---|---|---|---|
| S1 | 8 m block, wind from W | Wind passes over a low block | 10 m slice behind the block > 1.5 × the ground wake (ground < 0.6) | pass |
| S2 | 40 m tower | Taller than every slice: blocks all, wake in each | Solid at 2/10/20/35 m; wake < 0.6 × free stream at each | pass |
| S3 | Empty domain | Free stream follows the indicative profile | Each slice within 10 % of profileFactor(z)/profileFactor(2) × ground | pass |

The slices are 2D solves; rising over roofs in the 3D streamlines is a labelled rule, not a result.

## Direction sweep (2026-11-06)

Analysis circle r = 100 m, 160², margin 1.4, ground slice; share of the circle above 1.3× the free stream:

| Site | 0° | 45° | 90° | 135° | 180° | 225° | 270° | 315° |
|---|---|---|---|---|---|---|---|---|
| Compact Infill | 0.0 % | 1.7 % | 3.6 % | 1.0 % | 5.2 % | 0.4 % | 3.1 % | 3.5 % |
| Sloped Edge | 21.8 % | 17.0 % | 18.2 % | 22.5 % | 12.1 % | 0.0 % | 1.2 % | 27.6 % |

**Known 2D limit, not fixed:** on Sloped Edge the scattered low houses form one porous block in a 2D slice. At ground level the wind cannot go over them, so it accelerates round the cluster (1.3–1.7×). Neither a wider domain (margin 2.0) nor time-averaging changed this (checked), so it is the model, not the boundaries. In reality much of that air passes over the roofs. The height slices show this from 10 m up, but the pedestrian map overstates the speed-up beside low-rise clusters. The remedies are a canopy-drag term for low buildings or the true 3D run (W6). Both are owner decisions.
