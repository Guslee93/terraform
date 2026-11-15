# 03 — Feasibility matrix

**Scoring (brief §7):** each dimension 0–2 — **D**ata · **C**alculation · **I**ntegration · **P**erformance/cost · **R**ights/compliance.
**Status:** **GO (prototype)** = no zeroes, with test evidence for the core claims · **CONDITIONAL** = something unresolved; the unblocking evidence is named · **NO-GO (current phase)** = it can't currently be done safely or affordably.
A GO is approval for a **screening prototype only**. It is never approval for professional engineering or regulatory use.

Evidence references: 02 = data register, 04 = test results, 08 = risk register.

## Summary

| Module | Level | D | C | I | P | R | Status |
|---|---|---|---|---|---|---|---|
| A Sun | Basic: position, shadows, direct-sun hours | 2 | 2 | 2 | 2 | 2 | **GO** |
| A Sun | Advanced: weather-based irradiation, alternatives, neighbour impact | 2 | 1 | 1 | 1 | 1 | **CONDITIONAL** |
| B Wind | Basic: indicative 2D flow picture + climate wind rose | 2 | 1 | 2 | 2 | 2 | **CONDITIONAL** |
| B Wind | Advanced: frequency-weighted comfort, surface pressure | 1 | 0 | 0 | 0 | 1 | **NO-GO** |
| C Noise | Basic: official Lden/Lnight overlay | 2 | 2 | 1 | 1 | 1 | **CONDITIONAL** |
| C Noise | Advanced: façade exposure, geometry/mitigation changes | 1 | 1 | 0 | 1 | 1 | **NO-GO (current phase)** |
| D Flood | Basic: NVE/Kartverket hazard overlays + DEM flow/depression screening | 2 | 1 | 1 | 2 | 2 | **CONDITIONAL** |
| D Flood | Advanced: depths, velocities, rainfall–runoff, interventions | 1 | 0 | 0 | 0 | 1 | **NO-GO** |
| E Terrain | Basic: elevation, slope, contours, profiles, parcel outline | 2 | 2 | 2 | 2 | 2 | **GO** |
| E Terrain | Advanced: cut/fill, buildable-area screening | 2 | 2 | 1 | 2 | 1 | **CONDITIONAL** |
| F Snow | Basic: snow-climate context, illustrative drift zones | 1 | 1 | 1 | 2 | 1 | **CONDITIONAL** |
| F Snow | Advanced: quantitative drift/deposition, snowmelt runoff | 0 | 0 | 0 | 0 | 1 | **NO-GO** |
| G Planning | Basic: parcel + zoning-plan overlay for Oslo | 1 | 2 | 1 | 2 | 1 | **CONDITIONAL** (Oslo plans not openly available) |
| G Planning | Advanced: BYA/BRA, setbacks, heights against provisions | 0 | 1 | 0 | 2 | 0 | **NO-GO** |

P scores for implemented modules are backed by measurements of the current build (04 §4). The scene holds vsync with zero long tasks while orbiting, about 100 draw calls, and a heap of 13–51 MB. The wind solve start costs one main-thread task of about 55–60 ms. Under a 4× CPU throttle, Sloped Edge drops to about 30 fps. Mobile devices were not measured.

---

## A. Sun

**Basic: GO (prototype).**
- **D2:** no external data needed beyond geometry. Footprints register with the Kartverket surface model to about 1 m (04 §2.2). **But OSM heights are biased**: median −1.5 m, 55 % within 3 m.
- **C2:** solar position agrees with NREL SPA within 0.5° (repo test, re-run 199/199 on 2026-11-15). The shadow ray is exact for extruded prisms (analytic tests).
- **I2:** in production (ADR-0021/0031).
- **P2:** measured in 04 §4: no long tasks while orbiting; the Sun card settles with one 95–347 ms load task.
- **R2:** no third-party rights beyond ODbL/CC BY.
- **Claim limit:** "direct-sun hours from simplified building volumes". Terrain and trees cast no shade. Not a daylight assessment (TEK17 §13-7, EN 17037).

**Advanced: CONDITIONAL.**
- **D2:** PVGIS SARAH3/ERA5 hourly TMY tested keyless at the site (965 kWh/m²·yr horizontal, 2014–2023 mean).
- **C1:** the app's roof figure is a clear-sky upper bound (1239, 1.28× PVGIS). A weather-driven model (beam + Perez-diffuse with a sky-view shading mask) is proposed, not built.
- **I1:** PVGIS has no CORS, so it needs a build-time fetch.
- **P1:** an hourly-annual run with shading on 2 m façade grids is not measured.
- **R1:** PVGIS commercial terms are unconfirmed.
- **Unblock:**
  1. Reproduce PVGIS's unshaded horizontal and tilted annual totals within ±5 % from the same TMY in the domain code.
  2. Compare one shaded façade point with Ladybug/Radiance.
  3. Time the annual run in a worker.
  4. Confirm the PVGIS licence.

## B. Wind

**Basic: CONDITIONAL.**
- **D2:** PVGIS TMY gives a keyless hourly 10 m wind rose at the site. ERA5 is a ~30 km grid, so it isn't a station or urban measurement. Frost station data needs a client ID.
- **C1:** the solver reproduces a canonical bluff-body case (04 §3), but at lattice Re ≈ 30–100 against real Re ≈ 10⁶–10⁷, in 2D. The slab wake fails and low-rise speed-up is overstated (wind-validation note). Vertical refill uses an assumed σw/U.
- **I2:** in production.
- **P2:** the solver runs in a worker. Measured: one 55–60 ms main-thread task at solve start, wind steady p95 18 ms (04 §4). Under a 4× CPU throttle, about 41 fps.
- **R2:** labels are in place.
- **Why CONDITIONAL and not GO:** the honest claim is "indicative 2D flow picture". The benchmark supports the numerics, not urban accuracy.
- **Unblock:**
  1. Make climate weighting visible: replace the equal-weight 8-direction sweep with PVGIS/Frost frequencies.
  2. Remove Lawson class labels unless they are frequency-weighted.
  3. Compare a whole-site field against one published 3D reference case (AIJ benchmark, simple building array).

**Advanced: NO-GO (current phase).**
- Frequency-weighted pedestrian comfort and surface pressure need 3D RANS/LES with an atmospheric-boundary-layer inflow, validation against wind-tunnel data (AIJ/COST 732 practice) and a site wind climate. None of that fits in a browser, and on-demand solving breaks the cost ceiling (05 §3).
- **Possible later:** one offline OpenFOAM precompute for a single showcase site, clearly dated and labelled. That needs owner approval for compute spend and a specialist review.

## C. Noise

**Basic: CONDITIONAL.**
- **D2:** the Statens vegvesen strategic noise map answers at the site: band Lden 55, Lnight 50, CNOSSOS-EU, `BEREGNETÅR 2021`, municipal roads with AADT > 500 included. CORS `*`.
- **C2:** display only. The method is the authority's.
- **I1:** draping a WMS raster on the terrain hasn't been prototyped in this repo.
- **P1:** a tile-overlay cost has not been measured.
- **R1:** the licence text isn't shown in the service capabilities (catalogue says "no restrictions").
- **Unblock:**
  1. An isolated prototype drapes `Strategiskstoykart_lden` on the DTM and registers it against roads.
  2. Measure frame cost.
  3. Confirm the SVV licence.
- **Must say:** strategic map, year 2021, 5 dB bands; not T-1442 planning zones; not façade levels. (Assessment height to verify; 4 m is the EU noise-directive convention.)
- **Existing heuristic:** it fails against this map (04 §2.3: 47 % band agreement, −5.7 dB bias). Retire it or relabel it as relative ranking (08 R2).

**Advanced: NO-GO (current phase).**
- Evaluating new geometry needs a propagation model (CNOSSOS-EU or Nord2000) with traffic input (NVDB AADT, speeds, heavy share; not tested), reflections and diffraction.
- In-browser CNOSSOS is not credible at product quality. A server-side NoiseModelling batch is plausible but unbenchmarked.
- T-1442 façade compliance is acoustician work (08 §3).
- **Unblock for screening use:** run one CNOSSOS tool for the site and reproduce the official 2021 bands at ≥ 80 % of points before anything else.

## D. Flood and stormwater

**Basic: CONDITIONAL.**
- **D2:** NVE flood-zone and flood-susceptibility WMS/WFS, quick-clay, and Kartverket storm surge all answer; DTM1 at 1 m was tested. At this site NVE has *not mapped* flood zones (0 features).
- **C1:** the overlays are display only (fine). The DEM screening (priority-flood + epsilon, D8) passes conservation (100 % of 360 k cells drain off-grid, 0 sinks) and an analytic valley, in 0.9 s single-thread Python. It has **not** been compared with a reference GIS tool, and the bare-earth DTM lets water pass through buildings.
- **I1:** not in the app.
- **P2:** cheap.
- **R2:** NLOD / CC BY 4.0.
- **Unblock:**
  1. Compare accumulation and depressions with WhiteboxTools or TauDEM on the same tile.
  2. Burn building footprints into the DEM and re-test.
  3. Find out whether Oslo kommune publishes its own stormwater susceptibility map (not found yet).
  4. Run the browser-worker timing.
- **Must say:** "Not mapped by NVE" ≠ safe (08 R1). The screening shows flow paths and depressions on bare earth, without depths or return periods.

**Advanced: NO-GO.**
- Depths and velocities need 2D shallow-water hydraulics with design rainfall (IDF + ≥ 40 % climate allowance per the Oslo/Akershus profile), infiltration, and the drainage network (Oslo VAV data; access not established).
- That is consultant work, and on-demand it is over budget.

## E. Terrain and site

**Basic: GO (prototype).**
- **D2:** DTM1 WCS 1 m, keyless, CC BY 4.0. Parcels from the matrikkel WFS (0301-228/255, 465.1 m²).
- **C2:** slope (Horn) exact on a plane (error 3 × 10⁻¹³°) and on a quadratic. The profile sampler is exact on a plane. The two Kartverket services agree to RMSE 0.053 m. That is **consistency, not accuracy**, because both are DTM1. Kartverket's published accuracy hasn't been verified here.
- **I2:** the app's terrain registers to DTM1 with RMSE 0.04 m in ENU (04 §2.1).
- **P2:** trivial.
- **R2.**
- **Claim limit:**
  - Use the 1 m raster for slope and profiles, not the app's 16 m mesh.
  - Parcel lines are the *eiendomskart* representation, with an accuracy class ("Gult" at this parcel; meaning to confirm). They are not a surveyed legal boundary.

**Advanced: CONDITIONAL.**
- **C2:** grid cut/fill is exact against an analytic pad (800 m³ each way).
- **I1:** there is no editing of a proposed surface yet.
- **R1:** buildable area depends on planning (G).
- **Unblock:**
  1. Specify the proposed-surface input (pad, slope, retaining) and the units, both NN2000.
  2. A test with a known excavation.

## F. Snow and winter

**Basic: CONDITIONAL.**
- **D1:** seNorge 1 km SWE/depth and Frost snow observations exist; neither is tested (THREDDS not probed; Frost needs credentials).
- **C1:** climate context is just statistics. "Likely deposition zones" from the 2D wind's calm areas is illustrative only.
- **I1, P2, R1.**
- **Unblock:**
  1. Fetch the seNorge SWE/depth time series for the site cell.
  2. Get the Frost snow-depth series once a client ID exists.
  3. Confirm the NVE/MET snow licence.

**Advanced: NO-GO.** Quantitative drift needs 3D CFD with a snow-transport model, calibration against field or wind-tunnel data, and storm-event wind climates. No browser path exists and on-demand compute breaks the budget. Snow loads are NS-EN 1991-1-3 territory (08 §3).

## G. Planning and zoning

**Basic: CONDITIONAL for Oslo.**
- **D1:** parcels are open, but Oslo zoning plans are **not** in the open NAP WMS at two Oslo points, while Bergen, Trondheim and Lillestrøm return plans. The NAP API is 401 (Norge digitalt partners only). Oslo's Planinnsyn has no documented open API.
- **C2:** overlay or display only.
- **I1, P2.**
- **R1:** access agreement needed.
- **Unblock (owner action):**
  1. Ask Oslo PBE whether an open WMS/WFS for gjeldende reguleringsplaner exists, and on what terms.
  2. Or ask DiBK about NAP access for a non-partner portfolio project.
- **Fallback that works now:** link out to Planinnsyn for the parcel (no data reuse).

**Advanced: NO-GO.**
- **D0** for Oslo provisions in structured form. Provisions are plan documents that need interpretation.
- **I0, R0:** automated compliance carries material liability (08 R5).
- What *is* safe: deterministic arithmetic with sources (footprint area / parcel area = BYA %, height of a drawn block), labelled "needs review against plan provisions", with no pass/fail.
