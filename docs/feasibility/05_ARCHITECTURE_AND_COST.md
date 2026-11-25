# 05 — Architecture and cost

**Target:** about USD 50/month for hosting and infrastructure, excluding AI subscriptions. **Scale assumed:** a portfolio demo with low traffic (hundreds of visits a month, not thousands of concurrent users).
**Prices** below are from vendor pages or secondary summaries read on 2026-11-15. Where sources disagreed, the range is given and the row is marked **unverified**. Nothing was purchased or provisioned.

## 1. Where each workload can run

| Workload | Browser (client) | Precomputed static file | Hosted third-party API | Own background job | Heavy on-demand simulation |
|---|---|---|---|---|---|
| Sun position, shadows, sun hours (A basic) | **yes, today** (workers) | optional cache | — | — | — |
| Irradiation with weather (A adv.) | yes, once hourly weather is a static file | **PVGIS TMY per site** (no CORS → must be fetched server-side or at build time) | PVGIS | small job to fetch and cache | — |
| 2D wind screening (B basic) | **yes, today** | optional | — | — | — |
| Wind rose input (B) | — | **yes** (PVGIS TMY or Frost, per site) | Frost (client ID, must stay server-side) | small job | — |
| Pedestrian comfort / pressure (B adv.) | **no** (needs 3D RANS/LES) | yes, *if* solved offline per site | — | — | **yes** (OpenFOAM-class) |
| Noise overlay (C basic) | yes (WMS tiles, CORS `*`) | optional | Statens vegvesen WMS | — | — |
| Noise propagation for new geometry (C adv.) | not credibly (CNOSSOS-EU, many paths × many receivers) | — | — | yes (e.g. NoiseModelling, GPL, Java) | moderate |
| Flood hazard overlays (D basic) | yes (NVE/Kartverket WMS, CORS OK) | optional | NVE, Kartverket | — | — |
| DEM runoff/depression screening (D) | **yes** (360 k cells: 0.9 s in single-thread Python; browser not measured) | yes | Kartverket WCS (CORS `*`) | — | — |
| Hydraulic depths/velocities (D adv.) | illustrative only | — | — | — | **yes** (2D shallow-water) |
| Terrain slope/profile/contours/cut-fill (E) | **yes** | optional | Kartverket WCS | — | — |
| Snow climate context (F) | yes, from cached data | **yes** (seNorge / Frost summaries) | Frost / THREDDS | small job | — |
| Snowdrift quantitative (F adv.) | **no** | — | — | — | **yes** (3D CFD + snow transport) |
| Parcels (G) | yes (Kartverket WFS, CORS `*`) | — | Kartverket | — | — |
| Oslo zoning plans + provisions (G) | blocked: no open API found for Oslo | — | NAP restricted (401) | needs agreement | — |

**Architectural rules that follow from the evidence:**

1. **Keep analysis renderer-free, as it is today.** Each new module gets a pure-TS domain function plus a fixture test, exactly like `noise.ts` and `shadowRay.ts`. Rendering reads results, never computes them.
2. **Every overlay carries provenance in its data, not its legend:** source URL, dataset name, publication year (e.g. `BEREGNETÅR 2021`), retrieval timestamp, licence. The legend reads from that record.
3. **Credentials never go to the browser.** Frost needs a client secret; PVGIS has no CORS. Both mean one tiny server-side fetch-and-cache step: a build-time script, a scheduled GitHub Action, or a single serverless function.
4. **No multi-tenant infrastructure now.** Per-site precomputed JSON or COG files on static hosting are enough for a portfolio.

## 2. Proposed shape (portfolio phase)

```text
Browser (React/R3F, unchanged stack)
  ├─ domain workers: sun, 2D wind, terrain (slope/profile/cut-fill), DEM runoff screening
  ├─ live WMS/WFS overlays with CORS: Kartverket, NVE, Statens vegvesen, Bane NOR
  └─ static per-site files: /sites/<id>/climate.json (PVGIS TMY rose + irradiance), dtm-1m.tif (COG), provenance.json
Static hosting (Vercel today)
Build/scheduled job (GitHub Actions, already in place): fetch + checksum climate/terrain caches,
  holds the Frost secret in Actions secrets, writes static files. No always-on server.
Optional, owner-approved, off by default: one rented VM for offline precompute (CFD/noise/hydraulics)
  for ONE showcase site, destroyed after the run.
```

## 3. Monthly cost scenarios

| Scenario | Components | Estimated USD/month | Confidence |
|---|---|---|---|
| **0. Today** | Vercel Hobby, GitHub Actions free minutes | **0** | High (owner's current bill not seen) |
| **1. Portfolio + screening modules** | as 0, plus build-time caches for 1–5 sites, plus keyless APIs | **0** | Medium: **Vercel Hobby is limited to personal, non-commercial use** (Vercel docs) |
| **2. Same, commercial/SaaS-ready hosting** | Vercel Pro 1 seat ($20 incl. $20 usage credit) or equivalent | **≈ 20** | Medium (secondary sources agree on $20/seat) |
| **3. + object storage for larger rasters** | Cloudflare R2: 10 GB-month free, then ≈ $0.015/GB-month, no egress fee | **0–2** | Medium (official table not read directly) |
| **4. + small always-on worker** (proxy/cache, NoiseModelling batch) | small VPS (Hetzner CX-class) | **≈ 5–6** (≈ €4.4–4.6) | **Unverified**: 2026 price rises, plan renames |
| **5. Offline 3D CFD for one showcase site** | dedicated-vCPU VM rented for hours (Hetzner CCX-class quoted at €12–43/month depending on source and date); billed hourly | **one-off, likely < 50** for a handful of runs; **not** a monthly service | **Unverified**: run time per direction not measured |
| **6. On-demand CFD per user edit** | concurrent 3D solves (minutes to hours each, many cores) | **far above 50** | High: this is the workload that breaks the ceiling |

**Within USD 50/month:** scenarios 1–4 together (≈ 25–30 with Pro), plus an occasional one-off precompute run.
**Outside USD 50/month:** on-demand 3D wind (comfort/pressure), on-demand snowdrift CFD, on-demand 2D hydraulic flood modelling for arbitrary sites, and any per-request CNOSSOS run over many receivers for many users.

## 4. Performance plan (from measured numbers, see 04 §4)

- Measure at the baseline every time a module is added (`feasibility/scratch/perf.mjs` pattern: headed Chromium, real GPU, cold cache, idle/orbit/solve windows, long tasks, heap, draw calls).
- Budget per added overlay: no new long task over 50 ms on the main thread. Rasters decode in a worker. WMS tiles render as one textured draped mesh per layer, not one mesh per feature.
- Large derived rasters (1 m DTM for a 600 m tile = 360 k cells) are fine in a worker. Ship them as Cloud-Optimised GeoTIFF or a quantised binary, never as JSON arrays.
- Mobile: **not measured** (no device available). A 4× CPU-throttle desktop run is reported as a proxy only.

## 5. Build vs buy

| Need | Build (in-house, browser) | Buy / external | Recommendation |
|---|---|---|---|
| Sun hours, VSC | done | Ladybug/Radiance (desktop) | keep; validate against Ladybug once |
| Weather irradiance | small (Perez transposition + shading mask) | PVGIS (non-shaded only) | build on PVGIS input |
| Pedestrian wind comfort | not credible in-browser | OpenFOAM offline, or a commercial service (Forma, SimScale, Orbital Stack; pricing not verified) | defer; keep 2D as illustrative |
| Noise propagation | CNOSSOS-EU subset is large | NoiseModelling (open source, GPL), consultants | overlay official maps now; propagation later, server-side |
| Hydraulics | — | HEC-RAS 2D, LISFLOOD-FP, MIKE (desktop/consultant) | overlay NVE/Kartverket + DEM screening only |
| Zoning provisions | — | municipal data agreements; DiBK NAP partner access | owner action: request access |
