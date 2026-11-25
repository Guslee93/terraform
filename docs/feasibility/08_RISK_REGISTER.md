# 08 — Scientific, regulatory and liability risk register

Likelihood and impact are qualitative judgements (L/M/H). "Owner" says who must act. Every row links to evidence in 02/04.

## 1. Output classes: what the product may call each result

| Class | Definition | Allowed wording | Terraform outputs in this class |
|---|---|---|---|
| **Measured / authoritative data** | Published by a responsible authority, shown as published | "Source: NVE (Flomsoner), retrieved 2026-11-15" | DTM1 terrain; matrikkel parcels; NVE/Kartverket hazard overlays; SVV strategic noise map 2021 |
| **Deterministic calculation** | Exact geometry/astronomy with a passing reference test | "Calculated from …" | Sun position (NREL SPA ≤ 0.5°); slope, profile, cut/fill on the DTM (exact on analytic surfaces, 04 §1); parcel area from polygon |
| **Screening model** | Simplified physics, comparative only, known bias | "Screening estimate — not a [survey/simulation]" | Sun hours (no terrain or tree shading, OSM heights); 2D wind; DEM runoff on bare earth; clear-sky roof solar (upper bound) |
| **Heuristic** | Constant tables or rules | "Illustrative" | Current road-noise layer; downwash rule; "refill from above" σw/U = 0.12; 3D streamline rise |
| **Illustrative graphic** | Animation or visual effect, no quantitative claim | no numbers | Particles, streamline animation, any snowdrift picture |
| **Requires qualified professional** | Regulatory or engineering decision | never produced by Terraform | Flood safety class (TEK17 §7-2), T-1442 noise zones and façade compliance, wind comfort/safety sign-off, snow loads (NS-EN 1991-1-3), zoning compliance |

## 2. Risk register

| ID | Risk | Module | L | I | Evidence | Mitigation | Owner |
|---|---|---|---|---|---|---|---|
| R1 | A user reads "no NVE flood zone at this site" as "no flood risk" | D | H | H | 02 §2.1: 0 features at Compact Infill, Akerselva in the tile | Show "Not mapped by NVE", never "safe"; link the coverage layer; show the date | product |
| R2 | The current noise heuristic contradicts the official map, yet it is shown as dB levels | C | **already happening** | M–H | 04 §2.3: same band at 47 % of points, about −5.7 dB where mapped | Replace the default layer with the official SVV Lden/Lnight overlay; demote the heuristic to "relative ranking" or remove it | owner + dev |
| R3 | The 2D wind comfort map is used as pedestrian-comfort evidence | B | M | H | Lattice Re ≈ 30–60; slab-wake failure; benchmark 04 §3; comfort is momentary, not frequency-weighted | Keep "2D flow, not engineering"; hide Lawson classes unless a climate rose is present; never show safety pass/fail | product |
| R4 | OSM building heights are wrong by several metres, which feeds sun, wind and VSC | A, B | H | M | 04 §2.2: median −1.5 m, only 55 % within 3 m of the surface model | Derive heights from DOM−DTM (open, tested) for curated sites; show the height source per building | dev |
| R5 | Planning "checks" get presented as compliance | G | M | **H (liability)** | Oslo plans not available openly; provisions are documents needing interpretation | Only parcel geometry and BYA arithmetic with links; "Requires review against the plan provisions"; no pass/fail | owner |
| R6 | Licence breach on commercial use (PVGIS; SVV licence text not seen; ODbL share-alike) | all | M | M | 02 §3 | Verify licence pages before any SaaS; keep provenance records; ODbL: publish derived databases if distributed | owner |
| R7 | Service endpoints move or die (NVE moved hosts; NAP WMS 500; Overpass blocked) | D, G | H | M | 02 rows 11, 18; ADR-0027 | Per-source health check in CI; cached snapshot with date; graceful "unavailable" state | dev |
| R8 | Outdated overlay presented as current (noise 2021; flood zones of varying age; plans) | C, D, G | H | M | `BEREGNETÅR 2021` | Show the year and retrieval date in every legend | product |
| R9 | Vertical datum mix-up: NN2000 terrain vs storm-surge levels vs river-curve datum (ADR-0025) | D, E | M | H | GeoTIFF carries no vertical CRS; datum known only from documentation | Store the vertical datum in provenance; test water levels against DTM at known points | dev |
| R10 | Snowdrift pictures read as predictions | F | M | M | No validated method available in budget | Label "illustrative"; ship climate context only | product |
| R11 | Hydraulic depth/velocity implied by DEM ponding | D | M | H | DEM screening has no rainfall, infiltration or pipes; buildings are absent from the DTM | Show only "flow paths and depressions on bare-earth terrain"; no depths, no return periods | product |
| R12 | Costs grow beyond USD 50 with on-demand simulation | B, D, F | M if attempted | M | 05 §3 | Precompute one showcase site offline; no per-user solves | owner |
| R13 | Hobby-plan terms (non-commercial) breached when monetising | hosting | M | M | Vercel docs | Move to Pro (≈ $20) before any commercial use | owner |
| R14 | Credentials leak to the browser (Frost secret) | B, F | L | M | Frost uses client ID + secret | Fetch at build time in GitHub Actions secrets only | dev |
| R15 | Misleading precision: values shown to 0.1 dB, 0.01 m/s, 0.1 h | all | H | L–M | current UI shows "61 dB" for a heuristic | Round to band/class for screening outputs | product |

## 3. Professional-liability boundary (Norway, for orientation, not legal advice)

- **Flood/stormwater:** TEK17 §7-2 safety classes F1–F3 are tied to 20/200/1000-year floods. Documentation for a building application is the responsibility of the applicant's qualified designers. A screening map cannot discharge it.
- **Noise:** T-1442/2021 and guide M-2061 define red/yellow zones (secondary sources give road Lden 65/55) and the documentation requirements. Noise reports in planning are prepared by acousticians.
- **Wind:** Norway has no single statutory comfort criterion. Lawson-type criteria in consultancy practice are frequency-weighted and use validated CFD or wind-tunnel data.
- **Snow:** structural snow loads come from NS-EN 1991-1-3 with the national annex (paid standard). Terraform must not show load values.
- **Planning:** zoning compliance is decided by the municipality (in Oslo, PBE). Terraform may show where the plan is and link to it, never the decision.

Exact clause texts were **not** verified for this report (paid or not retrieved). Anything shown in the product needs a source link and a review by the owner or a qualified professional.
