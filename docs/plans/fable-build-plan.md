# Fable 5.2 build plan — Terraform foundation layers

**Written:** 2026-11-15 by Claude Code (Opus 5.5) from the closed feasibility study · **Executor:** Claude Fable 5.2 (one lead session) · **Owner:** project owner
**Scope:** build the Tier 1 capabilities verified in `docs/feasibility/07_DECISION_BRIEF.md`, plus label fixes. **Not** the visual redesign. Functional UI only, built from existing components and tokens.

---

## 0. Read first, in this order (do not skip)

1. `AGENTS.md`: guardrails, commands, definition of done. They all still apply.
2. `docs/feasibility/07_DECISION_BRIEF.md`: capability tiers. Build **Tier 1 only** (plus WP-8/9 stretch items, which are Tier 2 and must be labelled as screening).
3. `docs/feasibility/09_FOUNDATION_VERIFICATION.md`: registration method (§1), noise restrictions (§2a, binding), heights method (§3), licences (§4), label table (§5).
4. `docs/feasibility/08_RISK_REGISTER.md` §1: output classes and allowed wording.
5. `docs/feasibility/04_POC_TEST_RESULTS.md` §1–2: fixtures and tolerances to reuse.
6. Working prototypes to port, not reinvent:
   - `feasibility/scratch/registration/prep.py`: ENU conversion, noise rasterising, parcel GML parsing.
   - `feasibility/scratch/registration/main.js`: draped band texture.
   - `feasibility/scratch/height-bench.test.ts`: `roofFit` over curated buildings.
   - `feasibility/scratch/terrain_bench.py`: slope, profile, cut/fill, priority-flood + D8.
   - `feasibility/scratch/perf.mjs`: performance gate.

## 1. Hard rules

| Rule | Why |
|---|---|
| Work on branch **`build/foundation`** in a new worktree cut from **`feasibility/audit`** (fc7cf04, = production 2089fd4 + feasibility docs) | keeps the evidence and scripts available |
| **Never push to, merge into or open a PR against `main` without the owner's explicit yes.** Vercel deploys `main` to production automatically. Don't push any branch without asking (pushes create preview deploys) | production safety |
| Never run `vercel` deploy commands | same |
| **No new runtime dependencies.** Everything below is doable with three, R3F, existing utilities and plain TS. A dev-only tool needs an ADR (AGENTS §1.8) | bundle and licence discipline |
| **Domain logic is renderer-free** and lives in `src/features/**`, with fixture tests. Scene files only draw results | AGENTS §1.3 |
| **Local ENU metres**, reprojected **per vertex** with the app's `projection.ts` formula. Never treat UTM offsets as ENU: at Oslo that is a 27 m error (09 §1) | registration |
| Curated packages are **immutable**: add new asset files and bump the package's own version/notes; don't rewrite existing files in place. Record every new asset in the manifest `sources` with licence and retrieval date | AGENTS §10, site-package spec |
| Live services are fetched **at build time** for curated sites (cache raw responses in `data/raw/` with entries in `SHA256SUMS`, like the existing OSM/elevation caches) and **at import time** for imported sites (all are CORS `*` or origin-echoing, see 02) | offline demo stays reliable |
| Every overlay carries **provenance**: owner, dataset, URL, licence, retrieved date, data year **read from the data**, and use limitation | 09 §4 |
| Claim policy (AGENTS §7, 08 §1): bands not decimals for screening; "not mapped" ≠ "safe"; **no per-building noise values**; no pass/fail of any regulation | liability |
| One ADR per work package that adds an asset, layer or schema field (`docs/decisions/ADR-0032…`) | AGENTS §1 |
| After every WP: `npm run lint && npm run test && npm run build` pass, commit on `build/foundation` with a clear message, append to `progress.md` and `docs/agent-log.md` | definition of done |
| **No visual redesign:** reuse existing card, legend and layer-toggle patterns. Keep colours from existing tokens; new band ramps may be added as tokens with a note "to be revisited in the design phase" | owner paused visual work |
| If something in this plan turns out wrong, stop that WP, write the finding in `progress.md`, and move to the next independent WP | don't improvise science |

## 2. Work packages (in priority order)

Each WP leaves the branch in a releasable state, so stopping after any WP is safe.

### MUST — do these first

#### WP-0 Setup and baseline (small)
- Create the worktree/branch above, run `npm ci`, and run `npm run lint`, `npm run test` and `npm run build`. Record the counts (expected: 1078 passed / 4 skipped).
- Re-run `feasibility/scratch/perf.mjs` once and keep its JSON as **the perf baseline** for gates below.
- **Done when:** baseline numbers are logged in `progress.md`.

#### WP-1 Label and claim corrections (small; 09 §5)
- **Wind:** remove the safety class ("Unsafe (> 15 m/s)") from the comfort legend and the card. Rename the view to "Indicative wind speed classes at the chosen wind". Change the card headline to "share of open ground ≥ 4 m/s at <dir> <speed> m/s (your input)". Change "about 1.8 m resolution" to "grid spacing 1.8 m (not accuracy)".
- **Sun:**
  - Round sun-hour headlines and medians to **0.5 h**.
  - Extend the sun disclaimer to "…buildings only (heights estimated from storeys); terrain and trees do not shade". After WP-3 this becomes "heights from Kartverket surface model".
- **Roof solar:** add "about 30 % above typical measured weather (PVGIS 2014–2023)".
- **Trees:** add "Trees are shown, not analysed" to the layer legend.
- **Tests:** update `claims.test.tsx` and the affected card tests. Add a test that no legend contains "Unsafe".
- **Done when:** the tests pass, plus one screenshot per card at 1440 × 900 in `docs/screenshots/build-labels-*.png`.

#### WP-2 Layer provenance contract and attribution (medium; prerequisite for WP-4 to WP-6)
- **Domain** (`src/features/sites/provenance.ts`): a type `LayerProvenance { id, owner, dataset, datasetUuid?, url, licence: 'CC BY 4.0' | 'NLOD 1.0' | 'ODbL 1.0' | 'no conditions', licenceUrl, attribution, retrieved, dataYear?, useLimitation? }`, plus a strict parser (no `any`).
- **Packages:** the manifest gains `layers: LayerProvenance[]`, with backward-compatible parsing. Existing packages without it get OSM and Kartverket entries synthesised from `sources`.
- **UI:** the site panel's "Data attribution" lists one line per *visible* layer, with source, year, licence link and limitation where present. Use the NLOD default wording from 09 §4.
- **Export (IT-3):** `exportPasses.ts` burns the visible layers' attribution lines (and a short noise limitation when noise is visible) into PNG and video frames.
- **ADR-0032** "Layer provenance".
- **Tests:** parser fixtures (valid, missing licence, unknown licence); export burn-in unit test.
- **Done when:** the attribution panel and exports list the existing OSM and Kartverket lines from the new contract.

#### WP-3 Measured building heights for the curated sites (medium; IT-2)
- **Method:** the app's existing `src/features/import/roofFit.ts` (ADR-0022), with the base rule from `assemble.ts` (lowest terrain under outline and centroid − 0.3 m). Scratch proof: 336 of 337 measured on Compact Infill.
- **Build step:** fetch DOM and DTM tiles for each curated site from `wcs.geonorge.no/skwms1/wcs.hoyde-dom-nhm-25833` / `…-dtm-nhm-25833`, the open NHM services (**not** "DTM Sømløs", which is restricted). Cache them in `data/raw/` with checksums. Resample to an ENU raster exactly as in 09 §3. Run the fit, then write **a new asset `heights.json`**: `{ id, height, kind: flat|gabled|complex|unmeasured, roof? }` keyed by OSM building id.
  - Preferred: a Node build script that imports `roofFit.ts` without a new dependency. Node 22's type stripping works if imports resolve; otherwise run it through the existing Vitest with a dedicated config, as the scratch benchmark does.
  - Alternative: a Python port inside `build_site_packages.py`, **with a parity test** against the TS fit (≤ 0.1 m on all buildings).
- **Licence:** heights stay a **separate CC BY 4.0 layer** ("© Kartverket"), never merged into the ODbL `buildings.json` (09 §3).
- **Loader** (`package.ts`): if `heights.json` is present, the measured height and roof replace the estimate. The per-building height source is kept for the legend.
- **ADR-0033** "Measured heights for curated packages".
- **Tests:**
  - parser;
  - the merge;
  - ≥ 99 % of buildings measured per site;
  - re-baseline sun-hours and wind fixtures that depend on curated heights, and document every changed expectation in the ADR.
- **Done when:** both curated sites load measured heights, and the sun disclaimer switches wording (WP-1).

#### WP-4 Official road-noise layer replaces the heuristic (large; 09 §2, §2a; IT-1)
- **Data:** Statens vegvesen WFS `https://www.vegvesen.no/kart/ogc/norstoy_1_0/ows`, `typeNames=norstoy_1_0:Strategiskstoykart_lden` and `…_lnight`, `outputFormat=application/json`, `srsName=EPSG:25833`, bbox = package extent.
  - Curated sites: fetch at build time, cache raw, convert to **ENU polygons with holes**, and write asset `noise.json` `{ metric: 'Lden'|'Lnight', bandLow, rings }[]` plus provenance with `dataYear` from `BEREGNETÅR` (expect 2021) and the verbatim use limitation.
  - Import path: the same converter, live at import time.
- **Domain** (`src/features/analysis/officialNoise.ts`):
  - band lookup at a point (even-odd over rings);
  - band shares over open ground in the analysis circle/study area;
  - a "not mapped" result when there is no coverage.
  - Fixtures: a square with a hole, nested bands, an empty tile.
- **Scene:** rasterise the ENU polygons to a band texture, in a worker if it's over 16 ms, and drape it on the terrain via planar ENU UVs (prototype: `registration/main.js`). No per-feature meshes.
- **Card:** Lden/Lnight switch, band legend with shares, source and year line, and the limitation «not for assessing individual buildings».
  - **Remove the "61 dB" peak headline**; the headline becomes the band covering the largest share, or "No strategic noise map here".
  - When a drawn block lies in a band ≥ 55, show: "Noise-sensitive development here requires a detailed noise calculation (Statens vegvesen; T-1442)". Never a value for the block.
- **Retire the heuristic:** remove `noise.ts` and its UI and tests (deletion over addition), unless the owner says otherwise. Record it in **ADR-0034**, which supersedes ADR-0013's noise part.
- **Perf gate (IT-1):** re-run `perf.mjs` with noise visible. No new long task > 50 ms, and orbit p95 frame time ≤ baseline + 10 %.
- **Registration gate:** port the 09 §1 checks into a test: ≥ 90 % of major-road samples inside the ≥ 65 band at zero offset on Compact Infill.
- **Done when:** both curated sites and an Oslo import show the official bands; the heuristic is gone; the gates pass.

### SHOULD — next, if credits remain

#### WP-5 Parcel layer (medium; 09 §1, §4; IT-5)
- **Data:** Kartverket WFS `https://wfs.geonorge.no/skwms1/wfs.matrikkelen-eiendomskart-teig`, `typeNames=app:Teig`, GML 3.2, bbox = package extent. Take parcels from the WFS, never by copying matrikkelkart WMS tiles (Geovekst rights).
  - Curated: build-time `parcels.json` (ENU rings + matrikkel id + `kommunenr-gnr/bnr` where present + updated date).
  - Import: live.
- **Robustness (IT-5):** a ±3 m bbox returned 0 features where a 25 m bbox returned the parcel. Always query the full extent and filter client-side; add a test.
- **Domain:** point → parcel lookup; parcel area (shoelace in ENU) as a deterministic fact.
- **Scene:** draped outlines (+0.25 m), with the selected parcel highlighted.
- **Panel:** parcel id, area, "eiendomskart — not a surveyed boundary", and a link-out to Oslo Planinnsyn `https://od2.pbe.oslo.kommune.no/kart/` (no data reuse).
- **ADR-0035.**
- **Done when:** clicking a parcel on Compact Infill shows **0301-228/255**, about **465 m²**, from the polygon (scratch value 465.1 m²).

#### WP-6 Hazard facts (medium; 02 rows 7–10; IT-4)
- **Queries per site** (build time for curated, live for import):
  - NVE Flomsoner (`wfs.geonorge.no/skwms1/wfs.flomsoner`, `app:FlomAreal`);
  - NVE flood susceptibility (`kart.nve.no/enterprise/services/Flomaktsomhet/MapServer/WMSServer` GetFeatureInfo, or the WFS listed in the catalogue);
  - NVE quick-clay susceptibility (`wfs.geonorge.no/skwms1/wfs.aktsomhetskartforkvikkleireskred`);
  - Kartverket storm surge (`wfs.geonorge.no/skwms1/wfs.stormflo_havniva`).
- **Domain:** for the study area or analysis circle, report one of "mapped here" / "mapped nearby (within the package extent)" / "not mapped by <owner>", with retrieval date and dataset year where available. **Never "safe" or "no risk".**
- **Panel:** a "Mapped hazards" fact list. Polygon draping is optional (reuse the WP-4 texture path).
- **Health check (IT-4):** `scripts/check-sources.mjs` re-queries every service used by WP-2 to WP-6 and reports status and checksum drift. **Do not add or alter CI workflows**; propose the schedule in the ADR for the owner.
- **ADR-0036.**
- **Done when:** Compact Infill reports flood zones "not mapped by NVE" and quick-clay susceptibility as mapped within the extent (both verified in feasibility), each with source and date.

#### WP-7 1 m terrain tools (medium–large; 04 §1)
- **Data:** ship a 1 m DTM tile per curated site as a compact binary: Int16 centimetres relative to `originElevation` plus a JSON header, resampled to ENU as in 09 §3. Record the size in the ADR (expect under 1 MB gzip per site). Import path: reuse the import's own terrain fetch at 1 m when available; otherwise keep the existing grid.
- **Domain** (`src/features/analysis/terrainTools.ts`):
  - Horn slope;
  - bilinear profile along a polyline;
  - contours at a chosen interval from the 1 m raster.
  - Fixtures from 04 §1: plane slope exact to 1e-9°, profile exact to 1e-9 m, quadratic.
- **UI:**
  - **Section tool:** draw a two-point line, see a profile chart (elevation vs distance, NN2000) in the panel, plus the line in the scene.
  - **Slope overlay toggle:** bands < 5°, 5–15°, 15–30°, > 30°, draped via the WP-4 texture path.
- **ADR-0037.**
- **Done when:** the profile across Compact Infill matches `terrain_bench.py`'s W–E section (8.98–21.44 m) within 0.05 m.

### COULD — stretch (Tier 2: must be labelled "screening")

#### WP-8 DEM runoff screening (medium)
- Priority-Flood+Epsilon + D8 in a worker, on the WP-7 raster, **with building footprints burned in** (raised). Port `terrain_bench.py` and keep its conservation test (100 % drains, 0 sinks).
- Overlay: main flow paths (accumulation over a threshold) and filled depressions.
- Label: "Screening: flow paths and depressions on bare-earth terrain with buildings as blocks. No rainfall, drainage or depths."
- IT-7: compare with WhiteboxTools in `feasibility/scratch/` only. Not a runtime dependency; ADR if any tool is installed.

#### WP-9 Cut/fill pad (small–medium)
- The user draws a pad polygon and sets a level (NN2000). Report cut and fill m³ from the 1 m raster.
- Fixture: the 40 × 40 m pad on z = 0.1x gives 800 m³ each way.
- Label: "Volume against Kartverket DTM1 — not a survey".

### OUT OF SCOPE (do not start)

- Visual identity and redesign, landing page, art direction.
- Wind comfort/safety ratings, noise for new geometry, flood depths, snow/snowdrift, zoning provisions/compliance (Tier 3).
- PVGIS-based irradiance or wind rose: the licence is unconfirmed.
- Frost: no credentials yet.
- Any backend, auth, database or paid service.

## 3. Execution model

- **One lead Fable session**, sequential WPs. WP-2 to WP-6 all touch the package loader, manifest schema, scene composer and panel, so parallel writers would collide.
- Inside the session, read-only fan-out (searching, reading docs) may use subagents. Writing stays in the lead session.
- **Optional second Fable session, only after WP-2 lands:** WP-7 *domain only* (`terrainTools.ts` + tests, new file, no UI) in its own worktree off `build/foundation`. The lead integrates it.
- **Review:** after each MUST WP, run `/code-review` on the WP diff and fix confirmed findings before moving on. The owner will ask Claude Code (Opus) or Codex for an independent review of `build/foundation` before any PR.

## 4. Reporting (end of session, or when credits run low)

Write `docs/reviews/build-foundation-report.md` with:
- the WPs completed, partial or not started;
- commits per WP;
- test, lint and build results;
- perf gate numbers vs the WP-0 baseline;
- screenshots taken;
- known limitations;
- every deviation from this plan, and why;
- anything that needs an owner decision (push, PR, CI schedule, deleting the heuristic if contested).

**Stop early and report** rather than leave a WP half-merged. Uncommitted half-work must be either finished or stashed and described.
