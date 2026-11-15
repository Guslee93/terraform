# 07 — Decision brief

**Date:** 2026-11-15 (updated after the foundation verification, 09) · **Baseline:** `2089fd4` (production) · **Evidence:** 01–06, 08, 09 in this folder; raw outputs in `feasibility/scratch/evidence/`.

> **Phase status: CLOSED (2026-11-15).** Feasibility ends here. No product features were implemented and production is unchanged (baseline `2089fd4`). Next phase: visual identity, art direction, UX, 3D rendering aesthetics, interaction design and the cinematic landing page. It is designed against the Tier 1 capabilities below; Tier 2 gets a distinct "screening" grammar; Tier 3 is out of scope. Implementation starts only after that design phase, gated by the deferred tests in 06.

## Update after the foundation verification (09)

**Result:** the technical foundation for the redesign is confirmed for one curated Oslo site.

1. **Registration is proven.** Terrain, Kartverket parcels and the official Lden noise polygons render together in Terraform's local ENU frame, with OSM buildings and roads as references. Building-to-parcel agreement is 0.59 m (median), terrain RMSE is 0.04 m, and noise holes sit exactly on buildings. The one hard rule: **reproject every vertex**. Treating UTM offsets as ENU misplaces corners by 27 m.
2. **The official noise map replaces the heuristic.** It is open data under NLOD with commercial use allowed, it's available as vector WFS, and it covers all urban test places. It is **static** (2021 traffic) and carries the publisher's limitation "not for assessing measures on individual buildings".
3. **Heights:** reuse the app's own `roofFit.ts` over the curated sites at build time. It measured 336 of 337 buildings. Today's estimates are 1.2 m low (median), and switching to measured heights moves 14.6 % of midsummer ground sun-hour cells by an hour or more.
4. **Licences are verified** from publisher metadata for every first-release layer (09 §4). Two traps to avoid:
   - the restricted "DTM Sømløs" WCS (Norge digitalt only);
   - copying Kartverket WMS cache tiles (Geovekst rights).
5. **Labels:** 13 items reviewed. The ones that must change before the redesign are the noise headline "61 dB", the wind "Unsafe" class and the sun precision (09 §5).

### Recommended visual-redesign baseline

Design the new identity on **this content**, and only this. Everything below is evidence-backed and can't be invalidated by later science.

| Layer of the design | Content to design for | Evidence |
|---|---|---|
| Site frame | One curated Oslo site (Compact Infill), 600 m tile, rotated true north, scale and compass | 04 §2, 09 §1 |
| Ground | 1 m terrain (shaded relief, contours, section line) | GO, RMSE 0.04 m |
| Property | Parcel lines from Kartverket, labelled "eiendomskart" | 0.59 m registration, CC BY 4.0 |
| Buildings | Context massing with **measured** heights and simple gable roofs; user blocks in a distinct material | roofFit, 336/337 |
| Sun | Shadows plus sun-hours on ground, roofs and façades in the analysis circle, rounded to 0.5 h | NREL ≤ 0.5°, GO |
| Mapped facts | Road-noise Lden bands (2021) as a draped, static map; NVE/Kartverket hazard "mapped / not mapped" chips with dates | NLOD, tested at site |
| Provenance | A per-layer source/year/licence line, designed as a first-class element, not a footnote | 09 §4 |

**Design system requirements that follow from the evidence:**
- **Distinct visual grammar per output class** (08 §1). Mapped authority data (flat, banded, sourced), deterministic calculation (continuous ramps, units), screening (hatched or softened, "indicative"), and illustrative motion (particles) must never look the same.
- **Bands, not decimals,** for any screening value.
- **An empty and "not mapped" state** for every overlay, distinct from "low" or "safe".
- **Wind stays in the product as illustrative motion** (particles and streamlines over a 2D flow), without comfort or safety classes. Use it as atmosphere, not as a result.

### Capability tiers: what the redesign may rely on

Each capability sits in exactly one tier. "In the app today" says whether the production build already has it. A verified method that isn't yet in the app is still verified, but needs implementation.

**Tier 1 — Verified capability.** Tested at the Oslo site against a reference, open licence confirmed. Design around these freely, within the stated claim.

| Capability | Evidence | In the app today | Claim limit |
|---|---|---|---|
| Sun position and shadows | NREL SPA ≤ 0.5° (199/199 tests) | yes | "geometric sun direction" |
| Direct-sun hours, ground/roofs/façades | exact ray test vs analytic cases | yes (estimated heights) | "direct sun from simplified volumes"; 0.5 h steps |
| Local ENU registration of terrain, parcels, overlays | RMSE 0.04 m; parcels 0.59 m; 3D viewer (09 §1) | terrain yes; parcels and overlays no | must reproject per vertex |
| 1 m terrain: elevation, slope, contours, sections, cut/fill arithmetic | exact on analytic surfaces; DTM1 open | contours only (16 m mesh) | "Kartverket DTM1"; not survey |
| Parcel outlines | matrikkel WFS, CC BY 4.0 | no | "eiendomskart, not a surveyed boundary" |
| Measured context heights + simple gable roofs | roofFit on 336/337 curated buildings | import path yes; curated sites no | "from Kartverket surface model"; not survey |
| Official road-noise bands (Lden/Lnight 2021) as static context | WFS at site, 10/11 places, NLOD | no | area bands only; not per building (09 §2a) |
| Hazard *presence/absence* chips (NVE flood zones/susceptibility, quick clay, Kartverket storm surge) | live at site, NLOD | no | "mapped / not mapped by [owner], [date]"; never "safe" |

**Tier 2 — Preliminary screening.** Physics or method simplified on purpose. It can be shown, labelled *indicative* and visually distinct from Tier 1. The redesign gives these a "screening" visual grammar (08 §1).

| Capability | Status | What keeps it in this tier | Unblocker to reach Tier 1 (if any) |
|---|---|---|---|
| 2D wind flow picture (particles, streamlines, speed at chosen wind) | in app | 2D, laminar, lattice Re ≈ 30–100; numerics check passes (St 0.153 at Re 100); urban validity unproven | none affordable; stays screening |
| VSC on drawn façades | in app | overcast-sky geometry, no daylight claim | Radiance/Ladybug comparison |
| Clear-sky roof irradiation | in app | upper bound, about 1.28× measured weather | PVGIS-driven model + licence check |
| DEM runoff paths / depressions | method tested in Python | bare earth, no drainage, no reference-tool comparison | WhiteboxTools/TauDEM agreement + buildings burned in |
| Climate-weighted wind rose | data tested (PVGIS TMY) | ERA5 ~30 km grid; PVGIS terms unconfirmed | licence check or Frost credentials |
| Snow-climate context (SWE/depth) | researched only | not yet pulled | seNorge/Frost pull + licence |

**Tier 3 — Requires further R&D (do not design for).** Needs 3D or hydraulic simulation, specialist validation, restricted data or professional sign-off. Out of scope for the redesign and the USD 50/month budget.

| Capability | Blocking reason |
|---|---|
| Pedestrian wind comfort / safety ratings, façade pressure | 3D RANS/LES + wind-tunnel validation + climate data; on-demand compute far above budget |
| Noise for new geometry, façade levels, mitigation | propagation model + traffic data; publisher forbids per-building use of the map |
| Flood depths, velocities, return periods, interventions | 2D hydraulics + drainage network data |
| Quantitative snowdrift, snow loads | 3D CFD with snow transport; NS-EN 1991-1-3 is engineering |
| Oslo zoning overlay and provisions | no open access found (NAP 401); provisions need interpretation |
| Any compliance pass/fail (TEK17, T-1442, plan provisions) | professional and municipal responsibility; liability |

### Remaining technical risks (after 09)

The tests that will retire these risks are scheduled as implementation tasks IT-1…IT-7, MP-1…MP-4 and RV-1 in 06 ("Deferred verification tasks").

| Risk | Why it remains | Mitigation |
|---|---|---|
| Overlays inside the production renderer | Proven in an isolated three.js viewer, not in the R3F scene with post-processing, quality tiers and phones | First implementation step: drape one layer and re-run `perf.mjs` (no new long task > 50 ms) |
| Phone performance | Only a 4× CPU-throttle proxy (Sloped Edge ≈ 30 fps); no real device | Test on one real mid-range phone before finalising visual density |
| Service drift | NVE moved hosts, a Geonorge WMS returns 500, the bygningspunkt WFS fails server-side | Build-time snapshots with checksums and dates; the live service is optional |
| Heights still lack independent truth | FKB-Bygning is restricted; DOM agreement is measurement, not survey | Label "from Kartverket surface model"; consider a Norge digitalt request later |
| Noise is static | It can't react to a drawn block | Design the noise view as context, not as an analysis of the user's design |
| Oslo zoning access | NAP shows nothing in Oslo; the API returns 401 | Owner request to Oslo PBE / DiBK; design a link-out until then |
| Licence of merged data | ODbL footprints + CC BY heights | Keep heights in a separate CC BY layer keyed by OSM id |

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
