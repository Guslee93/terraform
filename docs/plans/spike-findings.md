# C3 — Live site import spike findings

Date: 2026-10-28. Implementer: Codex, spatial-data-engineer role. Work order: [C3-import-spike.md](../handoffs/C3-import-spike.md). Scope: throwaway Node script; no app integration.

**Result: all three valid packages; C3 implementation acceptance is met under the approved terrain policy.** The 2026-10-28 handoff addendum is implemented. Bjørvika now has 113 measured nodes, 54 modelled water-surface nodes and two nearest-valid-neighbour estimates (1.18%, below the 5% cap). Both Oslo frames were fetched again; Grünerløkka’s terrain heights, origin elevation and buildings are unchanged. All three packages pass the existing manifest, asset and complete package-loader validations. This is the bounded C3 spike gate, not P2 or studio visual acceptance.

## Reproduce

From the repository root (Node v22.23.1, installed pinned dependencies):

```sh
node scripts/spike-import.mjs --lat 59.9225 --lon 10.7595 --size 400 --id spike-grunerlokka --title "Grünerløkka, Oslo"
node scripts/spike-import.mjs --lat 59.9075 --lon 10.7530 --size 400 --id spike-bjorvika --title "Bjørvika, Oslo"
node scripts/spike-import.mjs --lat 59.3160 --lon 18.0710 --size 400 --id spike-sodermalm --title "Södermalm, Stockholm"
node tmp/spike/verify-terrain-policy.mjs
node tmp/spike/verify-spike.mjs
npm run lint
npm run test
npm run build
```

Packages: `tmp/spike/spike-grunerlokka/`, `tmp/spike/spike-bjorvika/` and `tmp/spike/spike-sodermalm/`. Each contains seven JSON package assets, source attribution and an SVG footprint-plan thumbnail, plus `spike-summary.json`. The manifest's paths all resolve. Bjørvika’s older `spike-failure.json` remains historical evidence from the pre-policy run; its newer `spike-summary.json` records the successful rerun. All output is gitignored by `tmp/`.

The script fetches TileJSON afresh on each run. The observed template was `https://tiles.openfreemap.org/planet/20261025_080012_pt/{z}/{x}/{y}.pbf`. The recorded checksums cover the TileJSON, tile bytes and elevation response bytes. This spike does not install packages or change runtime dependencies.

## Measurements

The Oslo rows below are the addendum reruns (Bjørvika acquired at 10:46:15 UTC; Grünerløkka at 10:46:17 UTC, 2026-10-28). Stockholm retains its original successful run and was revalidated without refetching, as the addendum requests only Oslo reruns. These are single live runs, with no script-side cache. Remote/CDN caching is uncontrolled; these timings are observations, not latency guarantees. Requests are sequential, including four elevation batches of 49/49/49/22 points. Timings use a monotonic clock and exclude Node/module startup. Total includes assembly and validation; write excludes the final diagnostic summary. kB means 1,000 bytes and includes all nine package files, excluding diagnostics and logs.

| Frame (400 m) | Tiles | Tiles s | Decode s | Merge s | Terrain s | Validate s | Write s | Total s | Package kB | Failure / fallback |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| Grünerløkka (59.9225, 10.7595) | 2 | 0.157 | 0.051 | 0.061 | 1.182 | 0.074 | 0.005 | 1.533 | 264.07 | 169 measured; geometry unchanged |
| Bjørvika (59.9075, 10.7530) | 1 | 0.107 | 0.021 | 0.021 | 3.666 | 0.067 | 0.003 | 3.889 | 145.35 | 113 measured / 54 water-surface / 2 estimated; passed |
| Södermalm (59.3160, 18.0710) | 1 | 0.120 | 0.026 | 0.053 | 0.623 | 0.088 | 0.004 | 0.919 | 197.59 | 169/169 no-data; labelled flat zero grid |

| Frame | Buildings | Same-ID union groups¹ | Fragments removed by union | Cross-tile groups | Parts below 12 m² dropped | Roads² | Park | Grass | Wood | Water | Trees |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Grünerløkka | 202 | 16 | 75 | 0 | 25 | 168 | 0 | 14 | 0 | 1 | 0 |
| Bjørvika | 52 | 14 | 3 | 0 | 4 | 180 | 0 | 40 | 0 | 3 | 0 |
| Södermalm | 148 | 19 | 16 | 0 | 4 | 201 | 0 | 9 | 0 | 0 | 0 |

¹ A union group has more than one input outer ring with the same feature ID; disconnected parts can remain separate polygons. Fragment reductions are 302→227, 59→56 and 168→152 respectively, before small-part filtering. These three frames did not exercise a real cross-tile building merge despite Grünerløkka fetching two tiles. A deterministic adjacent-fragment union check covers that algorithm, but recorded seam-crossing data is still needed for P2. ² Roads count clipped line runs, not unique streets; tile-buffer overlaps are not deduplicated.

### Height defaults

The diagnostic uses the most common raw `render_height` as a **suspicious-default proxy**, counted once per emitted outer-ring building part after union/filtering. It does not claim the modal value is actually a default or identify tagged versus estimated heights. Extrusion is `max(2.5, render_height - render_min_height)`; raw height statistics must not be confused with extrusion statistics.

| Frame | Most common `render_height` values (metres: count) | Modal share | Share with raw height 5 m |
|---|---|---:|---:|
| Grünerløkka | 15:58; 5:48; 19:35; 11:28; 22:13 | 58/202 = 28.71% | 48/202 = 23.76% |
| Bjørvika | 34:9; 5:5; 26:4; 20:3; 30:3; 31:3; 32:3 | 9/52 = 17.31% | 5/52 = 9.62% |
| Södermalm | 15:26; 19:18; 4:13; 11:13; 5:9; 8:9 | 26/148 = 17.57% | 9/148 = 6.08% |

No included building lacked its feature ID or numeric height properties in these runs. `hide_3d` skips were 6 / 7 / 0 across the fetched tiles, including features subsequently outside the frame. The summaries preserve the ten most frequent raw heights.

## Approved terrain policy — addendum applied

- `terreng: "Havflate"` **or** `datakilde: "dybdekurver"` sets a node to **0 m NN2000 mean sea level before recentring**, flagged `water-surface`, even when its returned height is null. Sea-floor depth is not modelled. This is stated in the manifest’s `simplified` list and copied into attribution; no bathymetric-datum claim remains.
- Other null nodes copy the nearest originally valid node by squared Euclidean row/column grid distance. Equal distances choose lowest row, then lowest column. Water-surface nodes are valid donors; newly filled estimates are never donors. Filled nodes remain flagged `estimated`.
- More than 5% estimated nodes fails with a Kartverket-naming error: a 13 × 13 grid permits eight missing nodes, rejects nine. Stockholm’s explicitly authorised entirely uncovered flat-grid fixture remains a separate exception, labelled unmeasured; it does not silently bypass the cap for other frames.
- `spike-summary.json` now includes `terrainFlags` as a 13 × 13 row-major matrix and `terrainFlagCounts` for `measured`, `water-surface`, `estimated`, alongside the original provider-source counts. These diagnostics do not change the app’s terrain schema. The manifest and attribution state the estimated and sea-node counts.
- Bjørvika: **113 measured / 54 water-surface / 2 estimated**. The two gaps are row 0 column 11 and row 9 column 3; their selected donors yield absolute elevations 0.89 m and 2.54 m respectively. The origin is 2.33 m NN2000, so these estimates are −1.44 m and +0.21 m in local ENU, and the modelled sea surface is −2.33 m. All 54 sea nodes were checked after recentring.
- Grünerløkka: **169 measured / 0 water-surface / 0 estimated**. Heights and origin match the saved pre-policy output exactly; the complete buildings asset is identical. Package size changed only through policy/provenance text. Stockholm’s retained package uses the earlier explicit flat-grid labels; the revised code’s flat exception was verified synthetically without a third live rerun.

## What broke and what surprised me

- **Bjørvika is not a complete measured grid.** Of 169 samples, 113 came from `dtm1`, 54 from `dybdekurver` and two were null. Missing positions, in `[longitude, latitude]`, are `[10.75597855, 59.90570484]` (row 0, column 11) and `[10.75121287, 59.90839758]` (row 9, column 3). Both were classified `ÅpentOmråde` by the service. Explicit `dtm1` and `hoydekurver` source probes also returned null. Neighbour probes at 0.5–10 m did not resolve the first gap; the second yielded nearby sea depths, not a verified ground height. The original run stopped at these gaps. Under the approved addendum, the exact grid is retained and these two nodes now use flagged nearest-valid-neighbour estimates.
- **The generic Kartverket endpoint returns depths as well as elevations.** It selects sources using terrain type; it is not guaranteed DTM1 everywhere. The script records `datakilde` counts and labels returned sources. The addendum resolves this for C3: sea cells become a modelled 0 m NN2000 water surface before recentring; bathymetry is discarded. This behaviour is documented in [Kartverket's API schema](https://ws.geonorge.no/hoydedata/v1/openapi.json).
- **Stockholm coverage failure is ordinary data absence, not HTTP failure.** All four batches returned valid JSON with null heights. The work order's flat-grid allowance is used, and the manifest, terrain source, attribution and summary say the zero grid is not measured terrain. Its origin elevation is synthetic zero and its vertical datum is explicitly unreferenced.
- **Same-ID features can contain multiple parts even within one tile.** Union materially reduced fragment counts, particularly in Grünerløkka. Applying union only when an ID occurs in multiple tiles would miss this effect.
- **Park/wood counts are zero in all three frames under the requested layer mappings.** Grass exists. No park/wood values were invented or inferred from unrelated layers. Layer selection/generalisation deserves a visual check in P2.
- **Not every transportation class maps to a road.** For example, pier, bridge, transit, rail, ferry and `*_construction` classes were skipped when absent from the specified width table. Full skipped-class counts are in the summaries. Tunnels are omitted as requested.
- **Parser compatibility requires an inaccurate category.** `dataStatus: 'curated-demo'` is used solely because today's parser rejects `user-import`; the descriptive fields explicitly call this an import spike. These packages have not undergone a curated-site gate.

### Failed attempts and source availability

All final live HTTP requests succeeded on their first attempt. The initial Bjørvika run failed at the first null sample; the diagnostic was improved to collect all 169 samples and report both gaps. A diagnostic probe for a guessed `dtm10` endpoint returned non-JSON/404; the actual source catalogue lists `dtm1`, `dom1`, `dybdekurver`, `hoydekurver` and `innsjohoyde`, not `dtm10`. No such guessed endpoint is used by the importer. The explicit available-source probes did not close the gaps.

A later lint run discovered generated Vite dependency-cache JavaScript under `tmp/spike/` (gitignore does not exclude it from ESLint). The validator and temporary full-loader verification helper now disable dependency discovery; the generated caches were removed. Lint was rerun after this fix.

All three packages are small and fast in this environment, but the three-frame result does **not** establish arbitrary-frame reliability or the <8 s import target under outages. Both addendum reruns completed without HTTP retries.

## Implementation and validation

Delivered code: `scripts/spike-import.mjs`. Imports are the already installed `@mapbox/vector-tile@3.0.0`, `pbf@5.1.2`, Turf and Vite (only to execute the unchanged TypeScript parsers in Node). Pbf v5 uses the named `PbfReader` export.

- Projection and clipping were ported from the existing builder. Coordinates are local East/North metres, with a 0.0000001 m numerical normalisation before planar union. Buildings use outer rings, 0.3 m simplification and a 12 m² cutoff. As in the builder, study membership uses the vertex-average centroid and base elevation is the minimum bilinear terrain sample at footprint vertices plus that centroid, minus 0.3 m.
- Roads use the specified widths and OpenMapTiles class mapping, with Liang–Barsky clipping into runs. Land-cover rings use Sutherland–Hodgman frame clipping. Holes are intentionally omitted. Trees are empty.
- Study boundary is a closed 280 × 280 m rectangle for these 400 m frames. Its area is 78,400 m². Camera presets follow the builder's formulas. The mandatory constraint fields use illustrative 18 m / 4 m defaults labelled `Illustrative — not planning advice`, never local regulations.
- Requests have a 30-second timeout covering the response body, one retry and 750 ms backoff; all send a descriptive User-Agent. Failures name the source and are recorded in `spike-failure.json`. Malformed elevations and more than 5% missing nodes are rejected with Kartverket named in the error. Up to 5% are estimated under the policy below. The entirely null Stockholm fixture alone retains the work order’s explicitly labelled flat-grid exception (centre 59.3160, 18.0710); an entirely null grid elsewhere fails the cap.
- Existing `parseSiteManifest`, `parseTerrain`, `parseBuildings`, `parseStudyArea`, `parseRoads`, `parseTrees`, `parseLandCover` run before package writes; IDs and statistics are cross-checked. All three packages also passed the actual `loadSitePackage` with filesystem-backed responses.
- Temporary verification command: `node tmp/spike/verify-spike.mjs`. It checks Python projection parity at three known points (maximum difference **2.84 × 10⁻¹⁴ m**), clipping, adjacent-fragment union (100 m²), duplicate-fragment union (50 m²), full package loading, frame containment, origin recentring, unique building IDs, computed areas and asset existence. Results: `tmp/spike/verification.json`.
- Temporary fault-injection checks use `node --import ./tmp/spike/mock-source-failure.mjs scripts/spike-import.mjs …` with HTTP 503 and actual abort fixtures (timer shortened to 5 ms after asserting the configured 30,000 ms). Both exit nonzero after exactly two attempts, at least 750 ms backoff, and a source-naming error. Results: `tmp/spike/failure-verification.json`. These synthetic failures are separate from live measurements.
- Addendum verification: `node tmp/spike/verify-terrain-policy.mjs` checks each sea classifier independently (including a null sea node), zeroing before recentring, row/column tie-breaking, exclusion of filled gaps as donors, water-surface donors, 8/169 accepted versus 9/169 rejected, exactly 5% accepted, all-null rejection and the explicit Stockholm exception, malformed heights, manifest/attribution text, and unchanged Grünerløkka geometry. **Passed**; evidence: `tmp/spike/terrain-policy-verification.json`. Temporary helpers stay under gitignored `tmp/` to respect ownership.
- `npm run lint`: **passed** (rerun after addendum).
- `npm run test`: **33 files, 296 tests passed** (rerun after addendum).
- `npm run build`: **passed** (rerun after addendum), with the existing >500 kB chunk-size warning.
- No app UI changed; no fixed-camera screenshot or studio visual acceptance is claimed. No commits or staging operations were made by this implementer; the existing index was preserved. Only the owned script and findings were edited, with generated outputs and verification helpers under `tmp/spike/`. Existing app/package edits were left alone. Work records are kept here to respect C3's explicit file ownership rather than editing unrelated milestone logs.

## What must change for P2

1. Port the approved terrain policy and its fixture checks into the renderer-free importer. Preserve per-node source/validity and estimation in a validated production contract (the spike stores flags only in diagnostics), and add the non-Norwegian terrain provider. Do not silently turn incomplete Norwegian data into measured terrain.
2. Add `user-import` to the validated manifest schema and carry import warnings/height provenance as structured data. Replace required illustrative constraints with a way to represent absent real-world constraints. Establish arbitrary-place time-zone lookup; this spike uses Oslo/Stockholm zones only near the test centres and UTC elsewhere.
3. Add recorded multi-tile fixtures that actually cut a building, plus missing-ID, conflicting-height, concave clipping, courtyard, invalid-ring and raised-part cases. This spike fails on invalid output or conflicting same-ID heights; it does not claim general repair. P2 must decide whether to preserve holes and elevated bases in an expanded schema.
4. Deduplicate overlapping buffered road/land-cover fragments, check geometry visually and decide whether additional source layers/classes are needed. Keep that work separate from this bounded layer-mapping spike.
5. Separate fetching, decoding, geometry, terrain and assembly into renderer-free modules with caller cancellation and provider policies. Budget concurrency, cache/version source snapshots, and make package writes atomic. The present output directory may retain a previous successful package after a failed rerun; inspect the current run's summary/failure and timestamp.
6. Measure repeated cold/warm imports and browser decode/UI cost. These Node timings exclude module startup and any browser rendering. Confirm source licences/attribution in D23 before release; the supplied ODbL and CC BY notices follow the work order, not a completed legal verification.

## Open questions / acceptance

Terrain coverage and sea-surface questions are resolved for C3 by the approved terrain policy above. Remaining P2 questions:

- Can tagged-versus-estimated heights be established from these tile attributes, or must the product retain a blanket “partly estimated” label?
- What are the correct semantics for raised building parts and courtyard holes in today's single-ring building schema?

**C3 implementation acceptance is complete:** three packages exist in `tmp/spike/`, all pass the full loader, both required Oslo reruns succeeded, the findings are updated and lint passes. Tests/build and policy fixtures also pass. No app integration or new studio screenshots are claimed; review remains with the handoff owner.

## P1 gate — Claude review (2026-10-28)

**Passed.** Grünerløkka and Bjørvika were loaded into the unchanged studio through a temporary local catalogue entry (reverted afterwards) and inspected on the GPU at 1440 × 900:

- Grünerløkka: the street grid, Olaf Ryes plass (with fountain) and Sofienbergparken match the real neighbourhood; lighting, outlines, shadows, AO and land cover all work on imported data. `docs/screenshots/import-spike-grunerlokka-{iso,top}.png`.
- Bjørvika: the Opera House, the Barcode towers and the harbour basin are recognisable; the fjord renders as a flat water surface at mean sea level (no sea-floor pit), 2 of 169 nodes estimated. `docs/screenshots/import-spike-bjorvika-iso.png`.

Carry into P2 (C4/C5), beyond §"What must change": repair self-intersecting merged footprints (one fan-triangulated building in Grünerløkka, south-east corner); `user-import` data status so the studio stops showing "Curated demo"; sloped roofs (Opera) are flat extrusions, so state that in the data notes.

## P2 C4/C5 result

Work resumed 2026-10-28 after the interrupted C4 run. Scope follows `docs/handoffs/C4-C5-importer-library.md`; records are kept in this owned document rather than changing milestone logs outside the work order. No UI, dependency, staging or commit changes.

C4: reviewed the seven partial modules, fixed the readonly tuple mismatch in `geometry.ts`, and added offline tests for projection, frames, tiles, geometry repair, building unions, context and requests. First targeted run: **7 files / 38 tests passed**. Three recorded z14 tiles (737,423 bytes total) serve both Oslo frames and the real seam case, MVT building **9090116012** east of Oslo S, crossing 14/8681/4765–4766. Fixture provenance is in `src/features/import/__fixtures__/tiles/README.md`.

The saved P1 Grünerløkka buildings all pass today's `isSimpleRing`; the visually reported south-east fan artifact could not be isolated as a self-intersection from that output. The complete recorded frame and a synthetic bow-tie are covered without inventing a real failing case. Courtyard holes remain omitted and raised parts remain grounded, matching the spike/schema; drafts retain `minHeight` for a future schema decision.

C5 fixture recording: the initial recorder tried to import the spike's non-exported `unproject` and failed before any requests. Retried with the exact projection formula and recorded both 169-point Kartverket grids (four batches each). Implementation and final checks follow below.

C5 delivers `terrain.ts` (provider interface, Kartverket batching/response validation, pure Terrarium decoder and bilinear sampler, browser PNG adapter, grid policy) and `assemble.ts` (five-stage progress, abort, warnings, provenance, manifest/assets and parser/statistics validation). `manifest.ts` now accepts `user-import`; its dedicated tests also preserve both old values and reject unknown values. Optional provider URL/licence/datum metadata avoids claiming NN2000 for arbitrary custom or Terrarium sources. `buildTerrainGrid` exposes per-node flags; the existing package schema carries aggregate counts in terrain source/manifest notes and structured import warnings.

Offline results after review:

| Frame | Buildings | Roads | Land-cover parts | Terrain measured / water / estimated | Package JSON bytes¹ |
|---|---:|---:|---:|---|---:|
| Grünerløkka | 202 | 162 | 11 | 169 / 0 / 0 | 104074 |
| Bjørvika | 52 | 180 | 41 | 113 / 54 / 2 | 61285 |

¹ Compact `JSON.stringify(SitePackage)`, not the spike's pretty-printed files plus thumbnail/attribution. Sources include the recorded fixture provider metadata. Six Grünerløkka road runs are removed by the required 0.5 m same-class deduplication. Land-cover counts differ from C3 because `repairRing` now normalizes/revalidates outputs and applies the specified 12 m² cutoff. Both building counts exactly match the spike. Seam areas: northern fragment 1313.251819 m², southern fragment 926.691524 m², merged 1423.418662 m²; one simple output ring.

Fixture inventory: `tiles/14-8681-4764.pbf` **207705 B**, `14-8681-4765.pbf` **330609 B**, `14-8681-4766.pbf` **199109 B**, `tilejson.json` **29088 B**; `terrain/grunerlokka.json` **45683 B**, `terrain/bjorvika.json` **45171 B**. Total source fixture payload: **857365 B** (README files excluded). Both fixture folders have README files with exact source URLs, snapshot/API version, UTC fetch time and licence notices. No geocoder/city-owned fixtures were changed.

Code review (same implementer using the code-reviewer role, not an independent review): fixed a concave clipping failure where an overlapping boundary bridge caused all parts to be discarded; Turf self-union now handles collinear bridges and repeated touching vertices after `unkinkPolygon`, with simple-ring validation. Added area-preserving disconnected-clip and repeated-touch regressions. Corrected clipping when callers pass an origin different from the frame centre. A preliminary typecheck also caught the Node fixture helper's missing type reference; fixed locally without changing tsconfig/dependencies. A C5 test caught Göteborg inside an overly broad DK bbox; splitting Jutland/Zealand/Bornholm fixes all nine quick-pick cities. Cancellation, policy failures and malformed source data are tested; no remaining blocker was found in the scoped review.

Deviations / limits / follow-up:

- No React, Three.js, scene, component or app dependencies in production importer modules. No UI was changed, so screenshot capture is not applicable. The app still does not import this library.
- The browser-only `createImageBitmap`/`OffscreenCanvas` adapter is intentionally untested, as permitted by C5; pure pixel decoding/interpolation is tested. Browser integration must verify it in P3/P5. Terrarium is coarser/source-dependent; pixel interpolation clamps at tile edges and does not classify sea nodes. Kartverket is the only provider supplying explicit water classification.
- Country bounding boxes are deliberately approximate, with documented overlap precedence; border areas can have the wrong zone/coverage classification. An all-null grid in the Oslo/NO classification fails; outside it, the next provider is tried. Partial grids over the 5% estimation cap fail rather than becoming flat. Network/provider failures can fall through; only exhaustion yields a labelled unmeasured flat grid.
- Source checksum is SHA-256 of raw tile bytes plus normalized terrain samples, since the provider interface does not expose terrain HTTP bytes. Optional source metadata preserves licence and datum when supplied. Create a fresh `openFreeMapSource()` per import to obtain one TileJSON snapshot for that import. HTTP requests have a 30-second timeout; retry/backoff is not added to this bounded library work order.
- The required illustrative 18 m / 4 m constraints remain labelled `Illustrative design constraint — not planning advice`; absent-real-constraint schema is deferred. Outer rings omit courtyards, raised parts remain grounded, and sloped roofs remain flat. Land-cover overlap deduplication is outside C4's required road dedupe and remains deferred.
- The returned object is an in-memory `SitePackage`. Manifest asset names mirror C3; this task does not write files or generate thumbnail/attribution assets. Persistence/export and browser entry points belong to subsequent work orders.
- The visually reported P1 fan artifact was not reproduced as an invalid saved footprint. No claim is made that renderer behaviour was fixed; the geometry repair contract is tested independently. Licence release verification remains with D23.

`dataStatus` consumers and producers (repository-wide search, no UI edits):

- `src/features/sites/manifest.ts`: type, parser validation and returned value (updated); `src/features/sites/manifest.test.ts`: new acceptance/rejection tests.
- `src/components/studio/Inspector.tsx:352`: two-way label currently renders every non-curated value as “Licensed source”; Claude must add the import label before integration.
- `src/features/sites/siteCatalog.ts`: curated-only catalogue type and two curated entries; `siteCatalog.test.ts`: checks curated statuses (left unchanged).
- `src/features/import/assemble.ts` and `assemble.test.ts`: new writer and assertion for `user-import`.
- `public/sites/{compact-infill,sloped-edge}/manifest.json`: curated static data (unchanged).
- `scripts/build_site_packages.py` and `scripts/spike-import.mjs`: existing curated-status writers (unchanged; spike compatibility value remains historical).
- Documentation contracts: `Terraform_Comprehensive_PRD_v1.md` and `docs/data/site-package-spec.md` still show the original two-value union; ADR-0006 authorizes this extension. Site-import plan and C3/C4-C5 handoffs mention the status transition. These files are outside this work order's edit ownership.

Final validation (2026-10-28):

- `npm run lint`: passed.
- `npm run typecheck`: passed, including the final typecheck invoked by `npm run build`.
- `npm run test`: **45 files / 396 tests passed**. C4/C5 adds **82 tests in 10 files** (seven C4 modules, terrain, assembly and manifest); the 18 pre-existing geocoder/city tests remain unchanged.
- `npm run build`: passed. Existing Three.js vendor chunk >500 kB warning remains; the isolated importer adds no app bundle entry. The full test run also reports the existing Three.js CommonJS deprecation warning.
- `npm run test:e2e`: attempted because Chromium is installed, but the sandbox prevents browser launch: `bootstrap_check_in ... MachPortRendezvousServer ... Permission denied (1100)`. Five launch failures, five tests not run; **no browser assertions executed**. No permission escalation or sandbox workaround was attempted. Browser testing remains unverified in this run.
- Production importer import scan: no React/Three.js/scene/component/app imports, no `any` or type assertions. No app imports of the new importer. `git diff --check` passed; index is empty. No stage/commit operations performed.

C4/C5 implementation and required library checks are complete. Files changed/added are the nine importer modules, their nine test files, a Node-only fixture helper, the tile/terrain fixtures and READMEs, the manifest union/parser plus its tests, and this appended result. The browser PNG adapter and P1 visual artifact need the explicitly deferred browser/visual follow-up; this is not a claim that the M6 UI or release gate is complete.

## P2 C4/C5 — Claude review (2026-10-28)

**Accepted.** Renderer-free (no React/Three/scene imports), no `any`, manifest change limited to the `user-import` enum. Seam merge is tested on a real recorded building (MVT id 9090116012, tiles 14/8681/4765–4766). Offline imports reproduce the spike (202 / 52 buildings; Bjørvika 54 water / 2 estimated). Suite: lint, typecheck, 396 tests, build pass.

Notes for follow-up:
- Codex could not reproduce the P1 "fan" building as an invalid footprint, so the artefact is likely in scene triangulation of a valid but awkward outline (collinear/near-duplicate vertices) → Claude to check in `createContextGeometry` when the import UI lands.
- Formatting in `src/features/import/` is denser than the rest of the codebase; not enforced by lint. Normalise when touched next.
- The browser PNG adapter for terrain tiles is untested by design until the `/new` route exists (D24 e2e).
- Studio labels for `dataStatus: 'user-import'` (Inspector) remain for Claude's integration (plan T4).
