# 04 — Proof-of-concept test results

**Baseline:** `2089fd4` (tag `pre-feasibility`), worktree `../Terraform-feasibility`, branch `feasibility/audit`.
**Machine (verified):** MacBook Pro `MacBookPro18,1`, Apple M1 Pro (8P + 2E cores), 16 GB, macOS 15.7.3 (24G419), Node 22.23.1, Python 3.10.7 (venv: pyproj 3.6.1, numpy 2.2.6, tifffile 2024.8.30, certifi).
**All scratch code:** `feasibility/scratch/`. It is outside `src/` and outside `npm run test`. Production code was not modified.

Reproduce:

```bash
cd ../Terraform-feasibility/feasibility/scratch
python3 -m venv .venv && .venv/bin/pip install pyproj==3.6.1 numpy==2.2.6 tifffile==2024.8.30 certifi
.venv/bin/python -I probe_services.py                     # Test 2 data probes
curl -o dtm_site_600m.tif "$(cat evidence/dtm-wcs-request.txt)"
.venv/bin/python -I terrain_bench.py                      # Test 3 terrain/cut-fill/flow
cd ../.. && npx vitest run --config feasibility/scratch/vitest.config.ts noise-points
cd feasibility/scratch && .venv/bin/python -I registration_bench.py   # Test 2 registration + noise compare
cd ../.. && npx vitest run --config feasibility/scratch/vitest.config.ts wind-bench   # Test 3 wind (~20 min)
npm run build && node feasibility/scratch/perf.mjs        # Test 4 (headed Chromium, real GPU)
```

## §0 Baseline suite (Test 1)

| Check at 2089fd4 (2026-11-15) | Result |
|---|---|
| `npm run lint` | pass |
| `npm run build` (typecheck + vite) | pass, 0.85 s; largest chunks: three-vendor 246 kB gzip, `/new` 317 kB gzip, studio 74 kB gzip |
| `npx vitest run` | **113 files passed, 1 skipped; 1078 tests passed, 4 skipped** (27.3 s) |
| Playwright | not run locally; GitHub Actions CI passed on 2089fd4 (run 43725610064) |

Classification of every analysis (implemented / partial / heuristic / absent): 01 §2.

## §1 Terrain, cut/fill and DEM flow (Test 3; `terrain_bench.py`, `evidence/terrain-bench.json`)

| Test | Input | Result | Tolerance | Verdict |
|---|---|---|---|---|
| DTM1 retrieval | WCS GetCoverage, 600 × 600 m at 1 m, EPSG:25833 | 200, GeoTIFF 1.64 MB, 1.9 s; 1.30–32.24 m, mean 18.82; no nodata | — | pass |
| Cross-service consistency | 25 lattice points: WCS bilinear vs height API (`datakilde dtm1`) | mean 0.000 m, max \|Δ\| 0.154 m, RMSE 0.053 m | < 0.2 m | pass (same source, so consistency only, not accuracy) |
| Origin elevation | WCS 20.404 m · API 20.42 m · curated manifest 20.28 m | the curated origin is 0.12–0.14 m lower than both | — | note |
| Slope (Horn), plane z = 0.1x + 0.05y | exact 6.37937° | max error 2.7 × 10⁻¹³° | 1e-6° | pass |
| Slope, paraboloid z = 0.002 r² | analytic | max error 0.0° (Horn is exact on quadratics, so this test can't catch higher-order error) | — | pass, weak test |
| Site slope | 1 m DTM | p50 2.53°, p90 9.71°, p99 30.67°; 5.3 % of cells > 15° (kerbs, walls, embankments in a bare-earth DTM) | — | descriptive |
| Profile sampler | bilinear along a line on an analytic plane | max error 1.2 × 10⁻¹¹ m | 1e-6 m | pass |
| W–E section through the origin | 579 m | 8.98–21.44 m | — | descriptive |
| Cut/fill | 40 × 40 m pad levelled on z = 0.1x | cut 800.0, fill 800.0 m³ (analytic 800) | exact | pass |
| DEM flow, synthetic valley | 150², priority-flood + D8 | 100 % of cells drain off-grid, 0 sinks | conservation | pass |
| DEM flow, site tile | 600² = 360 000 cells | **1st attempt failed**: 2 596 sinks, only 5.9 % drained (plain fill left flats). **Fix:** Priority-Flood+Epsilon (Barnes et al. 2014). After the fix: 100 % drained, 0 sinks; 11 340 cells filled > 5 cm, max fill 2.58 m, 2 341 m³ | conservation | pass |
| Flow runtime | single-thread CPython + numpy | fill 0.74 s, D8 + accumulation 0.16 s | — | measured (browser **not** measured) |

`evidence/flow-accumulation.png`: flow concentrates along street kerbs and Akerselva. Inside blocks it passes **through buildings**, because DTM1 is bare earth. That is the main limitation of the screening.

Not done: comparison with a reference GIS tool (WhiteboxTools/TauDEM) and a browser-worker timing.

## §2 One-site geodata round trip (Test 2; `registration_bench.py`, `evidence/registration-bench.json`)

### 2.1 Terrain in the renderer frame

The app's curated terrain grid (40 × 47, ≈ 16 m spacing, local ENU via the app's own `projection.ts` formula) was converted ENU → WGS84 → EPSG:25833 and compared with DTM1 bilinear. The check also tells which way the rows run.

| Row convention | Points | Mean | RMSE | p95 \|Δ\| |
|---|---|---|---|---|
| row 0 = minY (south) | 1 405 | +0.002 m | **0.039 m** | 0.071 m |
| row 0 = maxY | 1 405 | +0.019 m | 8.632 m | 14.90 m |

**Result:** the terrain is consistently transformed into the renderer frame, rows run south→north, and vertical registration is a few centimetres at the grid nodes. The 16 m mesh still smooths everything between nodes.

### 2.2 Buildings vs the Kartverket surface model

Normalised surface nDSM = DOM − DTM (both 1 m WCS). 392 OSM footprints fully inside the tile.

| Check | Result |
|---|---|
| Median share of footprint cells raised > 2.5 m | **1.00**; 5 buildings < 50 % |
| Shift test (mean raised share): 0,0 / ±2 m E / ±2 m N | **0.998** / 0.950, 0.951 / 0.949, 0.958 → peak at zero offset: footprints are registered to about 1 m |
| OSM height − nDSM p90 | median **−1.5 m**, mean \|Δ\| 3.06 m, p90 \|Δ\| 5.41 m, **54.6 %** within 3 m |

The surface model includes trees and roof furniture, and DOM and DTM epochs may differ. Even so, OSM heights are the weakest input to sun, wind and VSC.

### 2.3 Noise: app heuristic vs the official strategic map

32 open-ground points on a 30 × 38 m lattice in the study area. The app value comes from `noiseAt()` (unchanged code). The official value is the SVV `Strategiskstoykart_lden` band via GetFeatureInfo.

| Official band (Lden) | < 55 (unmapped) | 55–60 | 60–65 | 65–70 |
|---|---|---|---|---|
| Points | 12 | 5 | 6 | 9 |

- App value in the same 5 dB band: **46.9 %** of points.
- Where mapped (n = 20): app − band midpoint = **−5.7 dB** mean, 5.9 dB mean absolute.
- Caveat: the app's number is not defined as Lden, so some offset is expected. The point is that showing it as dB invites a comparison it fails.

### 2.4 Overlays at the site

All overlays below were checked with live requests (02, rows 7–19):
- NVE flood zones: none mapped.
- Flood susceptibility: coverage present, no polygon at the origin.
- Quick-clay susceptibility: 5 polygons in the box.
- Storm surge: polygons in the box.
- Strategic noise: band 55 at the origin.
- Parcel: 0301-228/255.
- Zoning: nothing in Oslo via NAP.

**Visual registration of draped WMS rasters on the 3D scene was not done.** That would need a scratch renderer, and it's listed as an unblocker in 03.

## §3 Wind solver reference benchmark (Test 3; `wind-bench.test.ts`, `evidence/wind-bench.json`)

**What it tests:** the app's own `createLbm` / `stepLbm` (unchanged) on laminar flow past a square cylinder. That is a textbook check of the numerics. **It is not a check of urban wind.** The app runs at lattice Re ≈ 30–60 for typical buildings (τ = 0.6, u0 = 0.1, a 20 m building ≈ 11 cells), against Re ≈ 10⁶–10⁷ for real buildings.

**Setup:**
- The app's boundary conditions: equilibrium inlet, free-stream sides, density-pinned outlet.
- Blockage D/ny = 8.3 %.
- The body is placed one cell off-centre as a seed for shedding.
- The probe sits 2 D behind the rear face; shedding frequency comes from zero crossings of the cross-stream velocity.
- u0 = 0.1, so τ = 3·u0·D/Re + 0.5.

| Re | D (cells) | grid | τ | shedding | St | Lr/D (steady) | runtime |
|---|---|---|---|---|---|---|---|
| 30 | 10 | 300 × 120 | 0.600 | no | — | 1.90 | 46 s |
| 30 | 20 | 600 × 240 | 0.700 | no | — | 1.90 (same at 2× resolution) | 281 s |
| 45 | 16 | 400 × 192 | 0.607 | no (amplitude 2e-4) | — | 2.94 | 201 s |
| 70 | 16 | 400 × 192 | 0.569 | **yes** | 0.140 | — | 201 s |
| 100 | 16 | 400 × 192 | 0.548 | **yes** | **0.153** | — | 201 s |

Throughput: **15.3–15.7 M cell-steps/s** single-threaded in Node 22 (the ADR-0014 figure was about 14 M).

**Comparison with literature (as I recall it; the exact papers were not retrieved for this report):**
- **Regime change.** For a square cylinder the onset of shedding is usually put at Re ≈ 47–54. The solver is steady at 45 and sheds at 70, which is **consistent**.
- **Strouhal number.** At Re = 100, published values are about 0.14–0.15; Sohankar et al. (1998) give about 0.146 at 5 % blockage. The solver's 0.153 is **within about 5 %**. Free-stream side boundaries at 8.3 % blockage are expected to push St up slightly.
- **Recirculation length.** Lr/D is grid-independent at Re 30 (1.90 at both resolutions) and grows with Re in the steady regime, as expected. The absolute value was **not** compared, because the Breuer et al. (2000) correlation could not be verified (search confirmed the paper, not the coefficients). This comparison is open for the independent reviewer.

**Verdict:** the solver's numerics are sound for what they are: a 2D laminar BGK solver with the correct bluff-body regimes. Nothing here supports urban comfort values. Re, turbulence, three-dimensionality and the boundary layer are all missing, and the repo's own validation note already records the slab-wake failure.

## §4 Rendering and performance of the current app (Test 4; `perf.mjs`, `evidence/perf-2026-11-15.json`)

**Setup:**
- Production build of 2089fd4 served by `vite preview` on localhost, so network latency is **not** included.
- Playwright Chromium, **headed**, WebGL renderer `ANGLE Metal Renderer: Apple M1 Pro`.
- Viewport 1440 × 900 at DPR 2, built-in XDR display.
- 3 cold runs per site, each in a fresh context.
- Each run has 5 windows of 6 s: settle with the default Sun card (which opens on sun hours, ADR-0031), steady idle, an orbit drag, opening the Wind card (solve starts), and wind steady.

The probe wraps the WebGL draw calls, records rAF intervals, uses `PerformanceObserver('longtask')`, and reads the JS heap from CDP `Performance.getMetrics`.

**Frame rate is vsync-locked.** p50 frame time is exactly 16.7 ms, so this harness ran at 60 Hz, and fps can't show headroom above 60. The useful signals are p95 and max frame time, long tasks and draw calls. The old 69–120 fps figures in `M5-perf.md` came from a different harness, before ADR-0023, and aren't comparable.

### 4.1 Unthrottled (median of 3 runs; ranges in `evidence/perf-2026-11-15.json`)

| Metric | Compact Infill (520 buildings) | Sloped Edge (230) |
|---|---|---|
| First contentful paint (localhost) | 100 ms (88–128) | 96 ms |
| Time to 3D canvas | 966 ms (964–1512; first run cold) | 890 ms |
| Load long tasks (settle window) | 1 task, 97 ms (95–347) | 3 tasks, max ≈ 125 ms, total ≈ 316 ms |
| Idle: fps · p95 · max frame | 58 · 25 ms · 26 ms | 63 · 24 ms · 27 ms |
| Orbit drag: fps · p95 · max | 58 · 25 ms · 27 ms; **0 long tasks** | 63 · 24 ms · 27 ms; 0 long tasks |
| Wind card open (solve): long tasks | 1–2, max 60 ms | 1, max 57 ms |
| Wind steady: p95 frame | 18 ms | 18 ms |
| Draw calls per frame | 90 (sun) → 99–102 (wind) | 90 → 99–102 |
| JS heap (CDP) | 17–30 MB idle, up to ≈ 51 MB during the wind solve | 13–21 MB idle, ≈ 40–47 MB with wind |
| Page errors | 0 | 0 |

**Reading:**
- Interaction is smooth on this machine: no long tasks while orbiting.
- About 5–10 % of idle and orbit frames take 1.5 vsyncs (p95 ≈ 25 ms). Cause not investigated.
- The only main-thread blocks over 50 ms are at load (≤ 347 ms cold) and one task of about 55–60 ms when the wind solve starts. That one breaks the 50 ms budget slightly.
- The draw-call budget is small (≈ 100), which leaves room for a few draped overlays.

### 4.2 4× CPU throttle (desktop proxy for a mid-range phone; **not a device measurement**)

| Metric | Compact Infill | Sloped Edge |
|---|---|---|
| Time to 3D canvas | ≈ 1.6 s | 2.6–3.5 s |
| Load long-task total | 810–885 ms (max single 524–550 ms) | 700–730 ms |
| Idle / orbit | 62 fps, p95 18 ms | **≈ 30 fps, p95 35 ms; draw calls fall from 90 to 15–20** (consistent with the ADR-0018 automatic quality downgrade; mechanism not confirmed) |
| Wind open | **≈ 41 fps, p95 42 ms**, long tasks up to 169 ms | ≈ 29 fps |
| Wind steady | 57 fps but ≈ 600 ms of long tasks per 6 s window | 30 fps |
| Page errors | 0 | 0 |

**Not measured:**
- Real mobile devices.
- Network load from the CDN.
- GPU memory.
- **Performance with a draped geodata overlay:** that needs a scratch renderer, and it's the gate for 0.1/1.4 in 06.

## §5 Sun (Test 3)

| Test | Result | Verdict |
|---|---|---|
| Repo sun/shadow suites re-run at 2089fd4 (`sun-reference`, `sun`, `shadowRay`, `circleSunHours`, `time`, `roofSolar`, `vsc`) | 6 files, **199/199 pass** | pass |
| Position vs NREL SPA (pvlib 0.15.2) and NOAA, Oslo + Tromsø, hourly 2026 | ≤ 0.5° above the horizon (existing test) | pass |
| Clear-sky roof upper bound vs PVGIS measured-weather irradiation | app 1239.3 kWh/m²·yr vs PVGIS SARAH3 horizontal **965** (2014–2023 mean; years 910–1062) → ratio 1.28 | consistent with the "upper bound" label. The test comment's "850–950" is slightly below PVGIS |
| Sun hours vs a trusted daylight tool (Ladybug/Radiance) | **not executed** | open |

## §6 Failures and things not executed

- DEM flow first attempt (sinks), fixed and re-run (§1).
- `nve.geodataonline.no` WMS: connection failure (retired host).
- `wms.geonorge.no/skwms1/wms.reguleringsplaner`: HTTP 500.
- NAP OGC API and Frost: HTTP 401 (expected).
- A matrikkel WFS query with a ±3 m bbox returned 0 features, while a 25 × 20 m bbox returned the parcel. Spatial-filter behaviour needs a robustness test before relying on tiny boxes.
- **Not executed:** WMS draped in 3D; mobile device performance; Frost and seNorge data pulls; CNOSSOS run; any 3D CFD; WhiteboxTools comparison; Ladybug comparison; Playwright e2e locally (CI passed on 2089fd4).
