# 01 — Repository audit

**Audited commit:** `2089fd4aab0410f9e48caac08da576a6b7904ea8` (`origin/main`, tag `pre-feasibility`, local only, not pushed)
**Why this commit:** it is the commit Vercel serves in production. `vercel inspect` shows deployment `dpl_5WPTGrh96m86CsPEDz3Tm1pF8EHQ` (created 2026-11-15 15:40 CET) with `gitSource.sha = 2089fd4…`, aliased to `terraform-studio-murex.vercel.app`. GitHub Actions CI passed on that push (run 43725610064).
**Not the baseline:** local `main` (`4aa6ea4`) is 31 commits behind `origin/main`, and the original checkout branch `ci/github-actions` (`874062d`) is already merged. My first-pass audit read that stale checkout; this document replaces it.
**Worktree:** `../Terraform-feasibility`, branch `feasibility/audit`. Nothing has been committed or pushed. The 11 prunable worktrees are untouched.

> Vercel deploys `main` automatically through its Git integration (alias `terraform-studio-git-main-…`). **Any push to `main` is a production deploy.** Pushing `feasibility/audit` would create a preview deployment. Nothing was pushed.

## 1. Stack (verified in `package.json` / build output)

| Layer | Actual | Note |
|---|---|---|
| Build | Vite 8.3.5, TypeScript 6.0.3 (strict), ESLint 10 | `npm run build` = typecheck + vite build, **passes** at 2089fd4 (2026-11-15) |
| UI | React 19.3.1, React Router 7, zustand 5, Tailwind 4 | |
| 3D | three 0.186.1, @react-three/fiber 9.8.2, drei 10.7.9, postprocessing 6.39.5, n8ao 2.0.1 | three-vendor chunk 924 kB raw / 246 kB gzip |
| Map/import | maplibre-gl 5.24.0, @mapbox/vector-tile, pbf, @turf/turf 7.4 | `/new` chunk 1,153 kB raw / 317 kB gzip |
| Domain | suncalc 2.1.1; own LBM solver, shadow ray, noise heuristic | renderer-free under `src/features/analysis/` (33 modules) |
| Storage | Dexie 4 (IndexedDB) for imported sites | no backend |
| Hosting | Vercel static SPA (`vercel.json` rewrite only) | **no server code, no functions, no database** |
| CI | GitHub Actions: lint, test, build, sharded Playwright | |

Size: ~18.3 k lines of non-test TS/TSX in `src/`, 114 test files, 16 Playwright specs, 31 ADRs.

## 2. What each analysis actually is (code, not docs)

Status key: **implemented** = in the production path with tests · **partial** = exists, with material gaps against the brief · **heuristic** = a rule or constant table, not a physical model · **absent** = no code.

| Module | Status | Method in code | Inputs | Validation evidence in repo | Material limits |
|---|---|---|---|---|---|
| **A. Sun position/shadows** | implemented | `suncalc` → `sun.ts`; DST via `time.ts` | lat/lon, IANA zone | `sun-reference.test.ts`: suncalc vs NOAA equations vs NREL SPA (pvlib 0.15.2) within **0.5°** above the horizon, Oslo + Tromsø; DST fixtures. Re-run 2026-11-15: 199/199 sun/shadow tests pass | Refraction differs near the horizon |
| **A. Sun hours (ground/roof/façade)** | implemented | `shadowRay.ts`: exact ray vs extruded footprints, DDA grid; `circleSunHours.ts` (ADR-0031): 2 m cells and façade grids in the analysis circle, 15-min samples | OSM footprints + heights | Analytic tests (10 m wall blocks at 5 m, clears at 12 m; L-shapes; polar night; south vs north wall) | **Terrain casts no shade; trees cast none; flat-roof assumption except measured gables (ADR-0022); OSM heights** (see 04 §2: median −1.5 m vs surface model) |
| **A. Roof solar** | heuristic upper bound | Meinel clear-sky DNI + constant 10 % diffuse, 12 representative days | none (no weather) | Test pins 1239.3 kWh/m²·yr unshaded in Oslo; PVGIS measured mean is **965** (04 §1.2) | Labelled "upper bound … not a yield estimate" (correct) |
| **A. VSC** | implemented | 5° hemisphere integration under the CIE overcast sky, on user-drawn façades | geometry | unit tests | Not a daylight-factor or EN 17037 claim (labelled) |
| **B. Wind flow** | implemented, screening | 2D D2Q9 BGK LBM (`lbm.ts`), τ = 0.6 default, u0 = 0.1, far-field sides, pinned outlet; Web Worker; slices at roof-end heights (ADR-0029); "refill from above" momentum exchange with an **assumed** σw/U = 0.12 (ADR-0030); power-law profile α = 0.22 | wind direction + reference speed from the UI; no climate data | `wind-validation.test.ts` (directional cases); `wind-validation-note.md` records the slab-wake **failure** and low-rise overstatement | Lattice Re ≈ 30–60 vs real ≈ 10⁶–10⁷; vertical flow and downwash are **rules**; no terrain; benchmark in 04 §3 |
| **B. Comfort** | partial | Lawson (Norconsult variant) at **one** reference speed | slider speed | unit tests | Momentary, not frequency-weighted; no wind climate |
| **B. Direction sweep / rose** | partial | 8 directions, **equal weights** (ADR-0015) | none | tests | Not a climate rose |
| **C. Noise** | **heuristic** | `noise.ts`: fixed level at 10 m per OSM road class (motorway 78 … service 50 dB), −10·log10(r/10), flat −10 dB if any ≥ 3 m building crosses the line | OSM road class + footprints | Unit tests only | **Not Lden, no traffic, no rail, no reflections, no ground effect.** Against the official 2021 Lden map: same 5 dB band at **47 %** of points, about **5.7 dB low** where mapped (04 §2.3) |
| **D. Flood/stormwater** | absent | — | — | — | — |
| **E. Terrain** | partial | DTM1 sampled to a 40 × 47 grid (≈ 16 m) on the curated sites, 13 × 13 on import; contours (`contours.ts`); terrain-following wind slices | Kartverket DTM1 | Grid matches DTM1 with RMSE **0.04 m** at its own points (04 §2.1) | No slope, profile, section, cut/fill or parcel tools. The 16 m mesh smooths anything finer |
| **F. Snow** | absent | — | — | — | — |
| **G. Planning** | **removed** | ADR-0020 removed the envelope/setback/height checks; `constraints.ts` remains, labelled "Illustrative constraint — not planning advice" | — | — | About page explicitly disclaims parcels and zoning |

**Analysis/rendering separation holds.** Every analysis above lives in `src/features/analysis/` without React or Three imports, consistent with AGENTS.md guardrail 3. The animated wind particles and streamlines are drawn from the solved field, and the vertical rise of 3D streamlines is labelled a drawing rule (ADR-0014 add. 2). No physical result is inferred from animation.

## 3. Data paths

- **Curated sites** (`public/sites/compact-infill`, `sloped-edge`): offline-built packages. OSM footprints (ODbL), Kartverket DTM1 (CC BY 4.0), authored study rectangle labelled "not a cadastral parcel". Compact Infill: 520 buildings, 926 trees, 1880 terrain samples.
- **Import path** (`/new`): live OpenFreeMap z14 tiles, OSM API 0.6 (water, trees), Kartverket height API, Geonorge DOM WCS, AWS Terrarium outside Norway, Photon + Kartverket address search. This is **live GIS in production**, which AGENTS.md §1.11 still lists as out of scope. That document is out of date, not the code (ADR-0006).

## 4. Tests and gates at the baseline

| Check | Result (2026-11-15, worktree at 2089fd4) |
|---|---|
| `npm run lint` | pass |
| `npm run build` | pass (built in 0.85 s; chunk sizes above) |
| `npm run test` | see 04 §0 |
| Playwright | CI-only for this audit (`e2e` passed in GitHub Actions on 2089fd4) |

## 5. Documentation drift (do not trust these without checking code)

| Document | Claim | Reality |
|---|---|---|
| `README.md` header | "M1 complete … M2 next" | M0–M5 done, simplified per ADR-0020, wind lift ADR-0028–0030, sun hours ADR-0031 |
| `docs/status-report.md` | dated 2026-10-27, M2 in progress | stale by 31 ADRs |
| `docs/reviews/M5-perf.md` | 69–120 fps | measured 2026-11-02, **before** the ×4 context density (ADR-0023) and the wind lift. Superseded by 04 §4 |
| `AGENTS.md` §1.11 | "no live GIS, no backend" | live GIS ships on `/new`; still no backend |
| `wind-validation-note.md` | case values | measured before the 2026-11-06 boundary change; only the directions were re-asserted |

## 6. Preservation recommendations

1. Keep tag `pre-feasibility` → `2089fd4` as the recoverable baseline. It is local only; push the tag when the owner approves (it does not deploy).
2. Do all feasibility code under `feasibility/scratch/` on branch `feasibility/audit`. It is outside `src/`, outside `npm run test`'s include glob, and has its own `vitest.config.ts` and Python venv.
3. Never push this branch to `main`: production deploys from `main`.
4. Before adding any module, fix the noise heuristic's labelling or retire it (03, C). The official map is now proven available and disagrees with it.
