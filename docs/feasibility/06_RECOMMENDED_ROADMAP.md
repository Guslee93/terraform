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
