# Build report — foundation layers (`build/foundation`)

**Date:** 2026-11-15 to 2026-11-16 · **Executor:** Claude Fable 5.2 (one lead session) · **Plan:** `docs/plans/fable-build-plan.md` (kept in the `Terraform-feasibility` worktree, not committed)
**Branch:** `build/foundation`, worktree `../Terraform-build`, cut from `feasibility/audit` (fc7cf04)
**Nothing was pushed, merged or deployed.** No PR was opened. No CI workflow was added or changed. No dependency was added.

## 1. Status

| Package | Status | Commit | ADR |
|---|---|---|---|
| WP-0 Setup and baseline | Done | 8581434 | — |
| WP-1 Label and claim corrections | Done | 8581434 | — |
| WP-2 Layer provenance and attribution | Done | 04eac93 | ADR-0032 |
| WP-3 Measured heights for the curated sites | Done | 9190952 | ADR-0033 |
| WP-4 Official road-noise layer | Done | 204a03b | ADR-0034 |
| WP-5 Parcel layer | Done | 6a8fe5f | ADR-0035 |
| WP-6 Hazard facts and source health check | Done | a3c5685 | ADR-0036 |
| WP-7 1 m terrain tools | Done, with two recorded gaps (§6) | b05454a | ADR-0037 |
| WP-8 DEM runoff screening (stretch) | **Not started** | — | — |
| WP-9 Cut/fill pad (stretch) | **Not started** | — | — |

All MUST and SHOULD packages are complete and committed. The two COULD packages were not started: I stopped at a clean package boundary rather than begin a third data pipeline late in a long session.

## 2. Checks at the last commit (b05454a)

| Check | Result |
|---|---|
| `npm run lint` | pass (0 problems) |
| `npm run test` | **1171 passed, 4 skipped** (121 files passed, 1 skipped). Baseline: 1078 passed, 4 skipped |
| `npm run build` | pass. Studio chunk 78.5 kB gzip (baseline 73.8); `/new` 318.9 kB gzip (baseline 317.3); three-vendor unchanged |
| Playwright, full suite, production build, at WP-6 (a3c5685) | 49 passed, 12 opt-in skipped, 0 failed |
| Playwright after WP-7 (layers, keyboard, simplified-studio, m5-a11y, m3-disclaimers) | 33 passed, 2 skipped, 0 failed |
| Python builder tests (`scripts/test_build_site_packages.py`) | pass (run after WP-3) |
| `node scripts/check-sources.mjs` | 18 sources, 18 unchanged, 0 failed |

The full Playwright suite was **not** re-run after WP-7; the five specs above were. The Python builder tests were not re-run after WP-4 to WP-7 (those packages do not touch the Python builder).

## 3. Acceptance per package

| Package | "Done when" in the plan | Result |
|---|---|---|
| WP-1 | Tests pass; a screenshot per card | Met. Five new claim tests, including "no wind legend carries a safety class" |
| WP-2 | Panel and exports list the OSM and Kartverket lines from the new contract | Met. Checked in the browser: the panel follows the layer switches; a 3840 px still carries both lines |
| WP-3 | Both sites load measured heights; the sun claim switches wording | Met. Compact Infill 520 of 520 measured; Sloped Edge 220 of 230 (see §6) |
| WP-4 | Both sites and an Oslo import show the official bands; heuristic gone; gates pass | Met. Registration 100 % (gate 90 %); perf gate passes; a live Grünerløkka import showed the bands |
| WP-5 | Clicking a parcel on Compact Infill shows 0301-228/255, about 465 m² | Met. 464.4 m² from the polygon (register 464.6, feasibility 465.1); "464 m²" in the browser |
| WP-6 | Compact Infill: flood zones "not mapped by NVE", quick clay mapped in the extent, with source and date | Met. Quick clay reads "Mapped here" for the study area |
| WP-7 | The W–E section matches `terrain_bench.py` (8.98–21.44 m) within 0.05 m | Met. 8.97–21.45 m, within 0.014 m |

## 4. Performance against the WP-0 baseline

`feasibility/scratch/perf.mjs`, headed Chromium, 1440 × 900 @2x, three runs per site. The app's default open card is Noise, so idle and orbit draw the noise layer in every run. Evidence: `feasibility/scratch/evidence/perf-build-{baseline,wp4-noise,final}.json`.

| Run | Site | Orbit fps | Orbit frame p95 | Long tasks (idle + orbit) | Draw calls per frame |
|---|---|---|---|---|---|
| Baseline (fc7cf04) | Compact Infill | 53.7–56.1 | 25.1 ms | 1 (83 ms, idle) | 90 |
| Baseline | Sloped Edge | 58.3–59.6 | 24.9–26.8 ms | 0 | 90 |
| After WP-4 | Compact Infill | 51.6–55.0 | 25.1–27.0 ms | 0 | 90 |
| After WP-4 | Sloped Edge | 59.6–60.4 | 26.8 ms | 0 | 90 |
| Final (b05454a) | Compact Infill | 64.9–65.8 | 18.4–24.3 ms | 0 | 90 |
| Final | Sloped Edge | 69.3–70.2 | 17.7–18.1 ms | 0 | 90 |

- **WP-4 gate** (orbit p95 ≤ baseline + 10 % = 27.6 ms on Compact Infill; no new long task > 50 ms): passed, by one display-refresh step.
- **The final run is faster than the baseline.** Nothing in the build explains a 10 fps gain: the machine paced frames differently on the second day. Read the three runs together as "no measurable cost": draw calls are unchanged at 90, and there is no long task while idle or orbiting in any run after the baseline.
- The baseline's Compact Infill runs overlapped a 5 s unit-test run of mine, so its fps reads low by about 4.
- Parcels, slope and the section are off by default and were not measured switched on. No real phone was tested.

## 5. Screenshots (`docs/screenshots/`, 1440 × 900)

`build-labels-{sun,wind,noise}.png` · `build-provenance-panel.png` · `build-provenance-export-still.png` · `build-heights-sun.png` · `build-noise-noise.png` · `build-noise-noise-sloped-edge.png` · `build-noise-import-grunerlokka.png` · `build-parcels-{plan,3d}.png` · `build-hazards-panel.png` · `build-terrain-{slope,section}.png`

`build-labels-noise.png` was taken in WP-1 and still shows the old "61 dB" card; `build-noise-noise.png` shows the card as it is now.

## 6. Deviations from the plan, and why

| # | Plan | What was done | Why |
|---|---|---|---|
| 1 | Baseline lint expected to pass | `feasibility/scratch/**` added to the ESLint ignores | The branch started with 16 lint errors, all in the throwaway prototypes (browser globals). Product code was clean |
| 2 | WP-2: credits burned into "PNG and video frames" | Burned into the still, the white-model pass, the analysis pass and the clip. **Not the depth pass** | A text band would corrupt a depth signal. Recorded in ADR-0032 |
| 3 | WP-3: fetch DOM and DTM tiles | DOM only in WP-3; the DTM tile came with WP-7 | The roof fit needs the building base, which the package already has |
| 4 | WP-3: ≥ 99 % of buildings measured per site | Compact Infill 100 %, **Sloped Edge 95.7 %**; the test asserts 99 % and 95 % | The plan's figure came from Compact Infill alone. Ten small buildings (12–104 m²) are not in the surface model. The legend states the count |
| 5 | WP-3: re-baseline sun and wind fixtures | No numeric unit expectation changed | Those tests read `buildings.json`, which still holds the storey estimates by design (heights are a separate CC BY 4.0 layer). The visible change is documented in ADR-0033 (Sun card 9.0 → 8.5 h) |
| 6 | Resample rasters and vectors "as in 09 §3" (EPSG:25833 → ENU per vertex) | Every service is asked for **WGS84**, and the app's own `project()` places each vertex or pixel | The app's frame is linear in latitude and longitude, so this is exact and needs no reprojection library. The 27 m shortcut error cannot occur. Registration gates pass (ADR-0033 §3, ADR-0034 §2) |
| 7 | WP-4: rasterise "in a worker if it's over 16 ms" | Main thread, 2D canvas fill | No long task appeared in the perf runs |
| 8 | WP-6: flood susceptibility by WMS GetFeatureInfo "or the WFS in the catalogue" | The WFS (`wfs.flomaktsomhetsomrader`) | A fact about an area needs the polygons, not a point query |
| 9 | WP-6: health check "reports status and checksum drift" | Compares the **data**, ignoring the request timestamp and per-request feature ids | Raw checksums reported 14 of 16 sources as changed on the first run although nothing had changed |
| 10 | WP-7: import path reuses its terrain at 1 m when available | **Imports have no terrain tools** | The import samples a 13 × 13 grid; a 1 m raster on import is a second terrain pipeline. Left for later |
| 11 | WP-7: contours from the 1 m raster | **Not written** | No UI in this package uses them |
| 12 | Review: `/code-review` after each MUST package | Done at the low level for WP-1 to WP-4 (3 findings, all fixed). WP-5 to WP-7 were reviewed together afterwards at the owner's request (§10): 8 findings, all fixed | The plan asks for it on MUST packages; the owner asked for the rest before any push |
| 13 | Plan §0: port `registration/prep.py` and `main.js` | Not ported; the same results come from the app's own TypeScript | Deviation 6 made the Python resampling unnecessary |

## 7. Known limitations

- **Not verified in a browser:** the recorded clip's credit band (never played back); Safari; any phone. A live import with parcels and hazard facts was checked after the review (§10).
- **Imports ask six more services.** Noise, parcels and four hazard maps are fetched on import, all together since the review. One live Grünerløkka import took 3.6 s from "Open in 3D" to the studio; the slowest hazard service once took 20 s on its own, so the worst case is longer.
- **The repository grew.** `data/raw/` went from about 5 MB to 21 MB (raw GeoJSON, GML and GeoTIFF caches); `public/sites/` is 3.4 MB, of which 1.9 MB is the two 1 m terrain tiles (loaded on demand).
- **The wind legend still carries the Lawson activity names** (Sitting … Very uncomfortable). Feasibility 07 says to drop them unless a climate rose weights them; the plan's WP-1 asked only for the safety class.
- **Hazards:** "Not mapped" is decided from the answer for the extent, not from the services' own coverage layers. Polygons are not drawn on the map.
- **Parcels:** accuracy classes are not shown; the line weight and the over-the-model drawing are placeholders for the design phase.
- **Noise:** road only (no rail or aircraft); band colours reuse the old swatches.
- **Terrain tools:** the drawn ground is still the 16 m grid; only the overlay and the section read the 1 m tile.
- `comfort.ts` keeps an unused `lawsonClass` with an `unsafe` class (domain code, not shown anywhere).
- `feasibility/scratch/noise-points.test.ts` imports the deleted heuristic and no longer runs; its result is kept as evidence.
- `buildClimateView` keeps two unused parameters so its call sites and tests keep their shape (marked in the code).
- The Python builder now carries registered assets over when it rebuilds a manifest, but the site-asset steps must be rerun after it (building ids can change). This is written in the scripts, not enforced.

## 8. Decisions for the owner

1. **Push and PR.** The branch is local. Pushing creates a Vercel preview deploy; a PR to `main` is the path to production. Both wait for your yes. The plan foresees an independent review (Opus or Codex) of `build/foundation` first.
2. **The heuristic noise layer is deleted**, not kept as a fallback (ADR-0034). If you want it back as a "relative road proximity" view without dB, say so before the merge.
3. **Lawson activity names in the wind legend:** keep, or drop as 07 recommends.
4. **CI schedule for the health check:** ADR-0036 proposes a weekly `node scripts/check-sources.mjs --strict`. No workflow was added.
5. **Repository size:** keep the raw caches in git (reproducible, offline builds) or move them out.
6. **Sloped Edge at 95.7 % measured heights:** accept, or look at the ten buildings.
7. **Stretch packages WP-8 (runoff) and WP-9 (cut/fill):** both can now build on the 1 m tile and `terrainTools.ts`. Not started.
8. **Parcels are off by default.** Say if they should be on.
9. **The plan file itself** is uncommitted in the `Terraform-feasibility` worktree. This branch's ADRs and logs refer to it by path.

## 9. Where things are

- Decisions: `docs/decisions/ADR-0032` to `ADR-0037`; ADR-0013 marked superseded in part.
- Session log with the failed attempts: `progress.md` (eight entries dated 2026-11-15 and 2026-11-16).
- Agent log: `docs/agent-log.md` (seven rows).
- Build steps for the curated assets: `scripts/site-assets/` (`npx vitest run --config scripts/site-assets/vitest.config.ts`).
- Source health check: `scripts/check-sources.mjs`.
- Package format: `docs/data/site-package-spec.md` (heights, noise and the `layers` field are documented; parcels, hazards and the 1 m terrain are described in their ADRs only).

## 10. Review of WP-5 to WP-7 (2026-11-16, at the owner's request)

`/code-review` over `204a03b..b05454a` (8 angles, no separate verify pass). Eight findings, all fixed in the commit after this report's first version.

| # | Finding | Fix |
|---|---|---|
| 1 | The 1 m terrain loader stayed on "Loading…" when its request was aborted (Slope switched on and off quickly) | The effect's cleanup resets the state. Checked in the browser: no status line after a quick toggle |
| 2 | "Move circle" and "Draw a section" could both wait for a ground click | Placing the circle ends a waiting section |
| 3 | A GML ring built from curve segments would have been read as its first segment only | Such a ring is refused with an error. None occurs in the cached answers (all are linear rings) |
| 4 | The hazard facts were recomputed on every render of the panel | Memoised on the site's data |
| 5 | Horn slope ran twice when Slope was switched on (panel and scene) | Computed once in the studio shell and passed to both |
| 6 | The selected-parcel outline and the section line rebuilt their geometry on every viewport render | The line component takes a lift value; its inputs are stable |
| 7 | The noise, parcel and hazard requests on import ran one after another | Asked together |
| 8 | The section line faked a parcel with an unchecked cast (AGENTS.md §7) | The line component takes rings; no cast |

After the fixes: lint 0; **1172 unit tests pass**, 4 skipped; build OK; Playwright layers, keyboard and m5-a11y on the production build: 30 passed, 2 skipped.

Live checks on the production build after the fixes:
- **Import (Grünerløkka, 400 m):** 3.6 s to the studio; Noise "60–65 dB"; hazards "Not mapped by NVE / Mapped here / Mapped here / Not mapped by Kartverket"; a clicked parcel read "0301-228/496 · 247 m²"; no terrain tools on the import, as designed. Capture: `docs/screenshots/build-import-parcels-hazards.png`.
- **Compact Infill:** slope legend 76 / 18 / 5 / 1 %; a drawn section read "288 m long, from 20.2 m to 21.2 m above sea level". No page errors.

Not reviewed in this pass: `scripts/site-assets/*.build.ts` and `scripts/check-sources.mjs` beyond reading them; the full Playwright suite was not re-run after the fixes.
