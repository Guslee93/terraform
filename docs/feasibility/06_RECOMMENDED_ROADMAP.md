# 06 — Recommended roadmap

No week counts. Each step has a **proof gate**: evidence that must exist before the next step starts. Steps marked ⛔ wait for an owner action.

## Phase 0 — Make what exists honest (no new modules)

| Step | Work | Depends on | Proof gate |
|---|---|---|---|
| 0.1 | Replace the default road-noise layer with the official SVV strategic Lden/Lnight overlay; demote the heuristic to "relative ranking" or remove it | 03 C | Isolated drape prototype registers against roads; legend shows source, year 2021, bands; frame-time delta measured (04 §4 method) |
| 0.2 | Building heights from Kartverket DOM − DTM for the two curated sites (OSM height kept as fallback, source shown per building) | 04 §2.2 | ≥ 90 % of buildings within 3 m of the nDSM p90 (now 55 %); sun-hours and wind fixtures re-baselined |
| 0.3 | Remove Lawson class labels from wind unless a climate rose weights them; show the equal-weight sweep as "all directions equal" | 03 B | UI copy review against 08 §1 classes |
| 0.4 | Update AGENTS.md / README / status report to the real state (live GIS on `/new`; perf numbers superseded) | 01 §5 | Docs match 01 |

## Phase 1 — First vertical slice: "Sun + terrain + site facts for one Oslo parcel"

The narrowest convincing slice, built only from GO-rated parts. It gets the premium visual pass first.

| Step | Work | Depends on | Proof gate |
|---|---|---|---|
| 1.1 | Parcel outline (matrikkel WFS) + 1 m DTM tile for the curated site, cached at build time with checksums and provenance | 02 rows 2, 4 | Overlay registers with the terrain mesh within 1 m (repeat 04 §2 test); attribution visible |
| 1.2 | Slope, profile/section and contour tools in the renderer-free domain, computed on the 1 m raster | 04 §1 | Analytic fixtures (plane, quadratic) pass in Vitest; profile matches the Python benchmark on the real tile within 0.01 m |
| 1.3 | Sun hours with DOM-derived heights + optional terrain shading | 0.2 | One façade point checked against Ladybug/Radiance (independent reviewer); terrain-shading fixture |
| 1.4 | Hazard context strip: NVE flood zone / susceptibility / quick clay / storm surge **as "mapped / not mapped" facts with dates** | 02 rows 7–10 | Copy reviewed against 08 R1; offline cache works when the service is down |
| 1.5 | Performance gate for the slice | 04 §4 | No new long task > 50 ms; orbit p95 frame time not worse than baseline + 10 % |

## Phase 2 — Screening extensions (each optional, each gated)

| Step | Work | Depends on | Proof gate |
|---|---|---|---|
| 2.1 | Weather-based irradiation (PVGIS TMY, build-time fetch) | ⛔ PVGIS licence confirmed | Unshaded annual horizontal within ±5 % of PVGIS MRcalc for the same years |
| 2.2 | Climate-weighted wind rose (PVGIS TMY now; Frost when credentials arrive) feeding the existing sweep | ⛔ Frost client ID optional | Rose reproduces PVGIS sector shares exactly; comfort wording reviewed |
| 2.3 | DEM runoff/depression screening with buildings burned in | 1.1 | Accumulation matches WhiteboxTools/TauDEM on the same tile (cell agreement ≥ 95 % on main paths); worker time measured |
| 2.4 | Snow-climate context (seNorge SWE/depth for the site cell) | data test | Series reproduced from THREDDS with licence recorded |
| 2.5 | Cut/fill against a user-defined pad | 1.2 | Known-volume fixtures; NN2000 units shown |

## Phase 3 — Only with new evidence, budget or partners

| Item | Why deferred | What would reopen it |
|---|---|---|
| Oslo zoning overlay | No open API found; NAP restricted | ⛔ Written access from Oslo PBE or DiBK |
| Noise propagation for new geometry | Needs CNOSSOS + traffic data; acoustician territory | A CNOSSOS run reproducing the 2021 bands at ≥ 80 % of points |
| 3D wind comfort / pressure | 3D CFD + validation + climate | ⛔ Owner approves offline compute for one showcase site + specialist review |
| Flood depths / velocities | 2D hydraulics + drainage network | Partner/consultant data; not a Terraform computation |
| Quantitative snowdrift | No validated, affordable method | Research partner |
| Automated zoning compliance | Liability; provisions are documents | **Stop** — do not build |

## Stop list

- Pass/fail of any regulation (TEK17, T-1442, plan provisions, snow loads).
- Any per-user on-demand 3D CFD or hydraulic solve.
- Presenting the road-noise heuristic as dB levels.

## Agent split (when work starts)

| Bounded task | Owner | Integration criterion |
|---|---|---|
| Independent re-run of 04 §1–3 (sun, terrain, flow, wind benchmark) | Codex (reviewer) | Same numbers within stated tolerances, or a written disagreement |
| Ladybug/Radiance reference point for 1.3 | Codex | Value + script committed under `feasibility/scratch/` |
| Licence verification rows R6 (PVGIS, SVV, NVE snow) | smaller model | Each row has a URL + quote + date |
| Slice implementation 1.1–1.5 | Claude Code | Proof gates above, `npm run lint && test && build` |

One lead per step; no parallel agents on the same decision (AGENTS.md §9).

## Deferred verification tasks (to run during implementation, not before the design phase)

These were explicitly **not executed** during feasibility. Each is a gate for the implementation step it belongs to. Scripts to start from already exist in `feasibility/scratch/`.

| ID | Test | Why it is still open | Method / starting point | Pass criterion | Blocks |
|---|---|---|---|---|---|
| IT-1 | Draped overlay inside the production R3F scene (noise bands or parcels), with post-processing and ADR-0018 quality tiers | Registration proven only in an isolated three.js viewer (09 §1) | Port `registration/` mesh+UV approach; re-run `perf.mjs` | Same 0.59 m / RMSE checks reproduced in-app; no new long task > 50 ms; orbit p95 ≤ baseline + 10 % | 0.1, 1.1, 1.4 |
| IT-2 | Curated package rebuild with measured heights | `roofFit.ts` run in scratch only; curated builder is Python | Run the TS fit at build time, or port it with a parity test | ≥ 99 % buildings measured; heights within 0.1 m of the TS fit; sun-hours fixtures re-baselined | 0.2, 1.3 |
| IT-3 | Attribution and limitation burn-in on image/video export | Export (ADR-0019) predates new layers | Export each layer; inspect output | Every exported frame carries per-layer source, year and the NLOD limitation where required | 0.1 |
| IT-4 | Service health and snapshot drift in CI | Services moved or failed during this study (NVE host, Geonorge 500, bygningspunkt) | Scheduled job re-runs `probe_services.py` subset; compares checksums | Alert on change; app keeps working from snapshot | 1.1, 1.4 |
| IT-5 | WFS small-bbox robustness (matrikkel) | ±3 m bbox returned 0 features where a 25 m bbox returned the parcel | Query grid of bbox sizes around known parcels | Parcel found for every bbox ≥ the parcel's extent, or a documented minimum | 1.1 |
| IT-6 | Sun-hours reference point vs Ladybug/Radiance | Only analytic tests so far | One façade + one ground point, same geometry and date | Within 0.25 h | 1.3 |
| IT-7 | DEM runoff vs WhiteboxTools/TauDEM | Python method only | Same tile, same fill/D8 | ≥ 95 % cell agreement on main flow paths | 2.3 |
| MP-1 | Real mid-range phone: iOS Safari and Android Chrome | Only a desktop 4× CPU-throttle proxy (Sloped Edge ≈ 30 fps) | `perf.mjs` windows via remote debugging; record device, OS, browser | Time to 3D ≤ 4 s on 4G profile; idle/orbit ≥ 30 fps; no crash or context loss in 5 min | redesign density decisions |
| MP-2 | Network load from the CDN (cold, throttled 4G) | All load numbers so far are localhost | Playwright network throttling against a preview deployment (owner approval needed to deploy a preview) | Landing LCP and time-to-3D recorded with and without overlays | landing page experience |
| MP-3 | GPU memory and thermal behaviour over a 10-minute session | Not measured anywhere | Chrome tracing / Safari Web Inspector on device | No memory growth trend; no thermal throttling below 30 fps | cinematic landing / long sessions |
| MP-4 | Reduced-motion and low-power paths for cinematic sequences | Redesign not yet specified | After art direction exists | Equivalent information without motion | landing page |
| RV-1 | Independent re-run of 04 §1–3 and 09 by a second agent (Codex) | Brief §9 reviewer role not yet exercised | Same scripts, clean checkout | Same numbers within stated tolerances, or a written disagreement | phase gate |
