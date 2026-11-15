# 07 — Decision brief

**Date:** 2026-11-15 · **Baseline:** `2089fd4` (production) · **Evidence:** 01–06, 08 in this folder; raw outputs in `feasibility/scratch/evidence/`.

## The answer in one paragraph

Two of the seven modules are ready for a screening prototype today: **Sun (basic)** and **Terrain (basic)**. Both are backed by passing reference tests and open, keyless data that registers with the 3D scene to centimetres (terrain) and about a metre (buildings). **Noise, Flood, Planning, Snow and basic Wind are CONDITIONAL.** The data exists or the method works, but specific evidence is missing; each gap is named below. **Every "advanced" capability except weather-based sun and cut/fill is NO-GO for this phase.** Wind comfort, noise propagation, flood depths, snowdrift and zoning compliance each need 3D or hydraulic simulation, specialist validation, restricted data, or professional sign-off that a USD 50/month browser product can't supply.

## Build (first vertical slice)

**"One Oslo parcel: terrain, sun and mapped hazards, with full provenance."**
- Parcel outline (Kartverket matrikkel), a 1 m terrain tile with slope, sections and contours, and sun hours on buildings whose heights come from Kartverket's surface model instead of OSM.
- A strip of *mapped / not mapped* hazard facts (NVE flood zones and susceptibility, quick clay, storm surge), each with source and date.
- Everything runs in the browser or from build-time caches. Cost: **USD 0** on today's Hobby hosting (non-commercial), or **≈ 20** on Pro.
- This is the slice that should get the premium visual redesign. Proof gates are in 06, Phase 1.

## Fix before anything new

1. **Retire or relabel the road-noise heuristic.** It agrees with the official 2021 strategic map in only 47 % of points and reads about 6 dB low. Show the official Lden/Lnight overlay instead.
2. **Replace OSM building heights** with DOM − DTM. Today only 55 % are within 3 m.
3. **Drop the Lawson class labels** from the 2D wind unless a climate rose weights them.

## Delay (CONDITIONAL; each has a named unblocker)

| Item | Unblocker |
|---|---|
| Official noise overlay | Drape prototype + SVV licence check |
| Weather-based irradiation | PVGIS licence + ±5 % reproduction test |
| DEM runoff screening | Reference-tool comparison + buildings burned into the DEM |
| Climate wind rose | PVGIS now; Frost after the client ID |
| Snow-climate context | seNorge pull + licence |
| Oslo zoning overlay | Access from Oslo PBE or DiBK (owner) |

## Stop

- Any pass/fail against TEK17, T-1442, plan provisions or snow loads.
- On-demand 3D CFD or hydraulic simulation per user.
- Quantitative snowdrift.
- Automated zoning compliance.

## The three most important unknowns

1. **Oslo zoning-plan access.** The open national service has plans for Bergen, Trondheim and Lillestrøm but **none for Oslo**, and the structured API is restricted (401). Without an agreement, Planning stays a link-out. *Owner action:* ask Oslo PBE and DiBK.
2. **Commercial terms of the free data you'd lean on.** PVGIS (no explicit API terms found), Statens vegvesen noise WMS (licence not in the service metadata), Vercel Hobby (non-commercial only). They don't block a portfolio; they block a SaaS.
3. **Whether a precomputed 3D wind case is worth it.** The 2D solver's numerics check out (shedding regime and St ≈ 0.153 at Re 100), but it can't produce defensible comfort values. A single offline OpenFOAM run for one showcase site is the only affordable path, and its run time and cost are **not measured**. Decide only after the slice ships.

## What was proven vs only researched

- **Proven by test today:**
  - Terrain registration: RMSE 0.04 m.
  - Footprint registration: about 1 m.
  - Slope, profile and cut/fill: exact on analytic surfaces.
  - DEM flow: conserving, 0.9 s for 360 k cells in Python.
  - Sun position: within 0.5° of NREL SPA.
  - Wind solver regimes.
  - Live responses from the Kartverket, NVE, Statens vegvesen, Bane NOR, DiBK, MET and PVGIS endpoints (19 probed in the main script: 16 × 200, 1 × 500, 2 × 401), and their CORS status.
  - Noise heuristic vs the official map.
  - Current app performance (04 §4).
- **Researched only:** Frost, seNorge, climate profiles, licences of SVV/PVGIS, CFD/hydraulic costs, regulatory clauses.
- **Failed or blocked:** NAP API (401), Frost (401), Geonorge zoning WMS (500), the retired NVE host, the first DEM-fill attempt (fixed).
