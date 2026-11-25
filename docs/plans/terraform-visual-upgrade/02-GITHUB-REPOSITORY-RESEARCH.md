# 02 — GitHub repository research

**Checked:** 2026-11-16. **Method:** `gh api repos/<owner>/<repo>` for licence, last push, stars and archive state; `npm view <package>` for version, licence, unpacked size and peer dependencies; `node_modules` in the `build/foundation` worktree for what is already installed. Nothing was installed.

**What "verified" means here.** Licence, activity, package version, size and peer ranges were read from GitHub and npm on the date above. API behaviour described from library documentation that I did not open in this session is marked **(API unverified)**: confirm it in the proof-of-concept before relying on it. No benchmark figure in this file is measured; every performance statement is a hypothesis with a test attached.

**Rule that applies to all of this** (AGENTS.md §1.8, §9): a new runtime dependency needs an ADR with bundle-size and licence notes. Packages that drei already installs are not new entries in `package.json`, but adopting them still changes behaviour and still gets an ADR.

## 1. Summary of dispositions

| # | Candidate | Disposition | One-line reason |
|---|---|---|---|
| 1 | camera-controls | **Prototype** (likely adopt) | Already installed through drei; gives interruptible transitions and cursor-centred dolly |
| 2 | drei | **Already used** — use more of it | `CameraControls`, `Bvh`, `StatsGl` are present and unused |
| 3 | three.js `Line2` / `LineSegments2` | **Prototype** (likely adopt) | Pixel-true line weights for edges and contours, no new dependency |
| 4 | postprocessing (built-in effects) | **Already used** — prototype two effects | SMAA and tilt-shift are in the installed package |
| 5 | n8ao | **Already used** — tune | `aoSamples` and `denoiseSamples` are settable; an export-only quality mode is possible |
| 6 | Playwright `toHaveScreenshot` | **Adopt** (dev only) | Visual baseline with no new dependency |
| 7 | WhiteboxTools | **Reference only** (offline) | Independent hydrology check for IT-7 |
| 8 | RichDEM | **Reference only** (offline, GPL) | Second hydrology reference; never copied or bundled |
| 9 | mediabunny | **Prototype** (Gate 6) | Frame-accurate MP4 export; MPL-2.0 needs an ADR note |
| 10 | three-mesh-bvh | **Prototype if measured need** | Installed through drei; only if pointer latency is a measured problem |
| 11 | meshline | **Reference only** | Unmaintained since 2024-06; `Line2` covers the need |
| 12 | three-geospatial | **Reference only** | 36 MB package; requires the wrapper ADR-0005 rejected |
| 13 | react-postprocessing | **Reject** | ADR-0005 already decided this; a 73-line composer does the job |
| 14 | deck.gl | **Reference only** | A second renderer; ideas only |
| 15 | GeoLibre | **Reference only** | Layer and provenance UX patterns |
| 16 | building-sunlight-simulator | **Reference only** | UX reference; no algorithm Terraform lacks |
| 17 | lattice-boltzmann-simulator | **Reference only** | Unclear licence, stale; visual reference only |
| 18 | THREE-CustomShaderMaterial | **Reference only** | Two small `onBeforeCompile` patches do not justify it yet |
| 19 | geotiff.js | **Reject** (runtime) | Curated tiles are prebuilt; imports have no raster path |
| 20 | FlatGeobuf | **Reject** | Site packages total 3.4 MB; no indexing problem exists |
| 21 | loaders.gl | **Reject** | No import format needs it |
| 22 | sunrise-sunset-js | **Reject** | SunCalc is already checked against NREL SPA |
| 23 | geojson-shadow-generator | **Reject** | No licence; 2D shadows only |
| 24 | CFDSolve | **Reject** | No adoption, nothing the tested solver lacks |
| 25 | motion, theatre.js, leva, r3f-perf, detect-gpu, astronomy-engine | **Reject** | See §4 |
| 26 | Turf | **Already used** | Two modules; no consolidation needed |
| 27 | SunCalc | **Already used** | One module; validated |

## 2. Top candidates in detail

### 2.1 camera-controls — Prototype

| | |
|---|---|
| Repository | https://github.com/yomotsu/camera-controls — MIT, last push 2026-10-21, 2 452 stars, not archived |
| Package | `camera-controls` 3.1.2, peer `three >=0.126.1`, 367 kB unpacked |
| In Terraform | **Already in `node_modules`** as a dependency of `@react-three/drei` 10.7.9, which exports a `<CameraControls>` component. No `package.json` change |
| Replaces | drei `OrbitControls` in `src/scene/ViewportCanvas.tsx:767` and the hand-written tween in `src/scene/CameraRig.tsx` |
| Touches | Everything that reads `controlsRef.current.target` or sets `.enabled`: `CameraRig.tsx`, `ViewportCanvas.tsx` (`WindDemoCamera`), `HudProbe.tsx`, `PassExporter.tsx`, `MassLayer.tsx`, `WindLiftHandle.tsx` |
| Expected gain | Transitions the visitor can interrupt; dolly towards the pointer; smooth-time damping; fit-to-bounds; a boundary box so the camera cannot leave the site. `smoothTime`, `dollyToCursor`, `setLookAt` and `setBoundary` are present in the installed `dist/index.d.ts`; the drei wrapper is `core/CameraControls.d.ts` |
| Overlap | Replaces OrbitControls. It does not add to it |
| Risks | A different API from OrbitControls (`getTarget()` rather than a `target` vector, its own `enabled` semantics, its own update loop). The massing editor disables the controls imperatively during a drag; that contract must survive. Mouse-button and touch mappings must be set to match today's (drag orbit, middle-drag pan, wheel zoom) |
| Cheaper alternative | three's `OrbitControls` has a `zoomToCursor` flag (verified in the installed r186 source, line 306; default `false`). Setting it and making `CameraRig` cancel on pointer input may deliver most of the gain with a ten-line change. **The proof-of-concept must test this first** |

**Proof-of-concept (TF-VIS-031).** In the Visual Lab only: option A is `OrbitControls` with `zoomToCursor` and a cancellable tween; option B is drei `CameraControls`. Same site, same presets.

**Success criteria.** (1) A preset transition stops within one frame of a pointer-down or wheel event. (2) Wheel zoom keeps the point under the cursor within 2 px over a 10-step zoom. (3) All existing massing e2e specs (`e2e/massing.spec.ts`, `e2e/keyboard.spec.ts`) pass unchanged. (4) One drag is still one undo entry while a transition is running. (5) Orbit frame p95 is within 10 % of the Gate 1 baseline. If A meets 1–5, adopt A and stop.

### 2.2 three.js fat lines (`Line2`, `LineSegments2`, `LineMaterial`) — Prototype

| | |
|---|---|
| Source | `three/examples/jsm/lines/*` in the installed `three` 0.186.1 (MIT). drei's `Line` and `Edges`, already used in `AnalysisCircle.tsx`, `WindStreamlines.tsx` and `MassLayer.tsx`, wrap the same technique |
| Replaces | `lineSegments` + `lineBasicMaterial` for context edges and contours in `ViewportCanvas.tsx:232–240, 295–297` |
| Problem it solves | WebGL lines are one **device** pixel wide. The live viewport runs at a pixel ratio of at most 1.75; the export raises it until the canvas is 3 840 px wide. A one-pixel edge is therefore a different visual weight on a laptop, on a retina display and in an exported still. This is inferred from the code and must be confirmed in the Gate 1 captures |
| Expected gain | A real line-weight hierarchy (silhouette, crease, major contour, minor contour) that looks the same in the viewport and in the 4K still |
| Risks | Fat lines are instanced quads: one instance per segment. The merged context mesh of 520 buildings yields many edge segments, so draw cost must be measured. `exportPasses.ts` hides fat lines during the depth and white passes (`isFatLine`); the white pass would then lose its edges, which changes that pass and needs a decision. `LineMaterial` needs its `resolution` updated when the pixel ratio changes during export |

**Proof-of-concept (TF-VIS-021).** In the Lab, render context edges and contours with `LineSegments2` at fixed CSS-pixel widths.

**Success criteria.** (1) Edge width measured in the 1440-wide viewport capture and in the 3 840-wide still differs by less than 15 % when both are scaled to the same size. (2) Orbit frame p95 within 10 % of baseline on Compact Infill. (3) The depth pass is byte-identical to the baseline depth pass for the same camera.

### 2.3 postprocessing and n8ao — Already used, tune

| | |
|---|---|
| Repositories | https://github.com/pmndrs/postprocessing — Zlib, last push 2026-11-01. https://github.com/N8python/n8ao — repository licence CC0-1.0, npm licence ISC, last push 2026-11-15 |
| Installed | `postprocessing` 6.39.5 (latest 6.39.6, peer `three >=0.168 <0.188`); `n8ao` 2.0.1 (latest 2.1.0) |
| In Terraform | `src/scene/SceneComposer.tsx` — RenderPass → N8AO → tone mapping, lazy-loaded, about 96 kB gzip |
| Opportunity | (a) An **export-only** AO quality mode with more samples, used by `PassExporter` and never by the live loop. (b) `TiltShiftEffect` or a mild depth of field for stills, to give the "architectural model photograph" reading, export only. (c) `SMAAEffect` for the Low tier, which ADR-0017 already names as the one case where SMAA is worth it |
| Constraint | ADR-0018 removed bloom after testing. That stands. ADR-0017 keeps neutral tone mapping. Neither changes without an ADR |
| Licence note | The repository and the npm package of n8ao state different licences (CC0-1.0 and ISC). Both are permissive. ADR-0005 records ISC; add the discrepancy to `findings.md` |
| Version note | Upgrading `three` past 0.187 breaks postprocessing's peer range. Do not upgrade `three` inside this plan |

**Proof-of-concept (TF-VIS-024).** Lab toggle "export quality": AO samples raised, shadow map at 4 096, captured through the existing `PassExporter`.

**Success criteria.** (1) Visible noise in AO at 4K is lower than the live setting in a side-by-side crop, judged by the owner. (2) Export time is at most 1.5 × the Gate 1 baseline. (3) No WebGL context loss on the M1 Pro at 3 840 px.

### 2.4 Playwright screenshot comparison — Adopt (dev only)

| | |
|---|---|
| Source | `@playwright/test` 1.64.1, already a devDependency. `expect(page).toHaveScreenshot()` is built in |
| Gap it fills | The repository has no pixel comparison at all (`grep toHaveScreenshot\|pixelmatch e2e scripts` returns nothing). 125 reference screenshots exist but are compared by eye |
| Risk | GPU output differs between machines; CI software-renders. So: baselines are per machine, the spec is **opt-in** (like the 12 opt-in specs today) and runs locally on the reference machine with a tolerance, not as a CI gate |
| Not needed | `pixelmatch` as a separate package (ISC, 36 kB): Playwright already contains a comparator |

**Success criterion.** Two consecutive runs of the reference capture on the same machine differ by less than the chosen threshold on every view (this also measures how deterministic the scene is; wind particles must be frozen through reduced motion).

### 2.5 WhiteboxTools and RichDEM — Reference only, offline

| | WhiteboxTools | RichDEM |
|---|---|---|
| Repository | https://github.com/jblindsay/whitebox-tools | https://github.com/r-barnes/richdem |
| Licence | MIT | **GPL-3.0** |
| Activity | last push 2026-05-26, 1 227 stars | last push 2024-06-24, 326 stars |
| Role | First reference for feasibility test IT-7 | Second reference; its author published the Priority-Flood algorithm Terraform ports |
| Use | Run on a developer machine against the same 1 m tile with the same buildings burned in; write the resulting rasters as fixtures | Same |
| Status caveat | The relationship between this open repository and the vendor's commercial "Whitebox Workflows" product is **unverified**. Check the README before citing a tool version | Looks dormant. If it does not build, drop it; one reference is enough for IT-7 |

**GPL handling for RichDEM.** It is run as a separate program. Its output (a raster of numbers) is data, not a derivative work of its code. Do not read its source while editing `runoff.ts`, do not copy any of it, do not add it to `package.json` or to the repository. Record the version and command used.

**Tools to compare against** (names from WhiteboxTools documentation, **API unverified**): `FillDepressions` or `BreachDepressions`, `D8Pointer`, `D8FlowAccumulation`.

**Success criterion** (from `docs/feasibility/06_RECOMMENDED_ROADMAP.md`, IT-7): at least 95 % cell agreement on main flow paths, on the same tile with the same fill and D8 rules. Where the two differ, the difference is explained in writing (flat resolution and tie-breaking are the expected causes), not tuned away.

### 2.6 mediabunny — Prototype (Gate 6)

| | |
|---|---|
| Repository | https://github.com/Vanilagy/mediabunny — **MPL-2.0**, last push 2026-11-16, 7 509 stars |
| Package | `mediabunny` 1.66.0, 11.6 MB unpacked (tree-shaken size **unverified** — measure in the proof-of-concept) |
| Problem it solves | `recordCanvas` in `src/scene/exportPasses.ts:233` records the live canvas with `MediaRecorder` at 30 fps and screen resolution. The clip inherits every dropped frame, is WebM in Chrome, and cannot be 4K |
| Expected gain | Render frame *n* at a fixed time step, encode it with WebCodecs, mux to MP4. The clip is smooth regardless of live frame rate and can be rendered at export resolution |
| Risks | MPL-2.0 is file-level copyleft: using the unmodified package is compatible with a closed or MIT application, but the ADR must say so and the licence text must ship. WebCodecs support in Safari and Firefox must be checked at the time of the prototype; the current `MediaRecorder` path stays as the fallback. A new chunk must be lazy-loaded and stay out of the studio chunk |
| Alternative | `mp4-muxer` 5.2.2 (MIT, 152 kB, same author, last npm publish 2025-07). Smaller, but whether it is still maintained alongside mediabunny is **unverified** |

**Success criteria (TF-VIS-062).** (1) A 6 s, 1080p, 30 fps MP4 of a camera orbit plays in QuickTime and Chrome with no duplicated or dropped frame (frame count = 180). (2) Lazy chunk at most 60 kB gzip, or the prototype is rejected. (3) Credits are present on every frame. (4) On a browser without WebCodecs the existing recorder still works.

### 2.7 three-mesh-bvh — Prototype only if measured

https://github.com/gkjohnson/three-mesh-bvh — MIT, last push 2026-11-13. Version 0.8.3 is installed through drei, which exports `<Bvh>`. It speeds up raycasts against large meshes. Terraform raycasts the 16 m terrain grid (small) and mass meshes (few); the merged context mesh is not raycast today. **Adopt only if** hover on context buildings is added and the Gate 1 pointer-latency measurement shows a problem. The domain sun code (`shadowRay.ts`) is renderer-free and must not take a three.js dependency.

## 3. The remaining shortlist

### three-geospatial — Reference only

https://github.com/takram-design-engineering/three-geospatial — MIT, last push 2026-05-27, 1 771 stars. Packages: `@takram/three-atmosphere` 0.19.1, `@takram/three-clouds` 0.7.6, `@takram/three-geospatial` 0.9.1.

- **Size:** `three-atmosphere` is **36 MB unpacked** (precomputed scattering data). Terraform's whole `public/sites/` is 3.4 MB.
- **Peers:** `three-atmosphere` requires `@react-three/postprocessing >=3.0.4`. ADR-0005 §3 rejected that wrapper in favour of the hand-written composer. Adopting the atmosphere means reversing ADR-0005 or running two composers.
- **Fit:** it renders a physically based sky around an ellipsoid. Terraform's scene has a flat background by decision (ADR-0017), a local ENU frame and a near-white model. A physical sky also brings aerial perspective that would tint the white model.
- **No release in six months** as of the check date.
- Whether a WebGPU migration is under way upstream is **unverified**.

Use it as a reference for sky-colour values at given sun elevations. If the owner chooses the atmospheric direction (03, Direction C), the sky is a 20-line vertical gradient driven by sun elevation, tested in the Lab first.

### react-postprocessing — Reject

https://github.com/pmndrs/react-postprocessing — MIT, 3.2.2, active. ADR-0005 already decided against it: it adds a React layer and `maath` for what `SceneComposer.tsx` does in 73 lines. Nothing has changed.

### meshline — Reference only

https://github.com/pmndrs/meshline — MIT, **last push 2024-06-03**, 3.3.1 (installed through drei). Offers tapering and dashes. Wind trails are already custom ribbons with a frame-time guard (`WindParticles.tsx`); contours and edges are covered by `Line2`. An unmaintained dependency for a taper effect is not worth it. If runoff paths need tapering by accumulation (03 §5.3), build the ribbon the way `WindParticles` does.

### deck.gl — Reference only

https://github.com/visgl/deck.gl — MIT, very active. It is a renderer. Running it beside R3F means two WebGL contexts or an interleaving bridge, and breaks the single export pipeline. Ideas worth reading: trail fading in `TripsLayer`, line joins in `PathLayer`, iso-band generation in `ContourLayer`.

### geotiff.js — Reject at runtime

https://github.com/geotiffjs/geotiff.js — MIT, 3.0.5, 3.7 MB unpacked. The curated 1 m tiles are built offline into `terrain1m.bin` (`scripts/site-assets/terrain1m.build.ts`). The import path has no raster terrain by design (build report §6, deviation 10). There is no runtime raster to parse. Revisit only if 1 m terrain on import becomes an approved feature.

### FlatGeobuf — Reject

https://github.com/flatgeobuf/flatgeobuf — repository BSD-2-Clause, npm states BSD-3-Clause (note the mismatch), 4.6.1. Spatial indexing pays off on large files queried by window. A site package is a 600 m tile of a few hundred features.

### loaders.gl — Reject

https://github.com/visgl/loaders.gl — GitHub reports no single licence (multi-package repository; individual licences **unverified**). No current import format needs it: OSM XML, vector tiles (`@mapbox/vector-tile` + `pbf`), GML and JSON are all handled in `src/features/import/`.

### sunrise-sunset-js — Reject

https://github.com/udivankin/sunrise-sunset-js — GitHub detects no licence file; npm states ISC; 3.3.1. Terraform's sun direction comes from `suncalc` in one module (`src/features/analysis/sun.ts`) and is checked against NREL SPA to within 0.5° (`docs/qa/sun-reference/`, 199 cases per feasibility 07). A second solar library adds nothing a visitor can see. If higher precision is ever needed, the reference to beat is NREL SPA, not another approximation.

### building-sunlight-simulator — Reference only

https://github.com/SeanWong17/building-sunlight-simulator — MIT, last push 2026-09-23, 489 stars. A front-end sunlight tool for housing estates. Worth reading for its time-scrubbing UX. Its sampling approach was not read in this session (**unverified**); Terraform's per-surface sun hours (ADR-0031) already run in a worker with tested analytic cases.

### geojson-shadow-generator — Reject

https://github.com/gislayer/geojson-shadow-generator — **no licence**, 8 stars, last push 2025-05. Code without a licence cannot be used. It produces 2D shadow polygons, which Terraform's 3D ray tests supersede.

### lattice-boltzmann-simulator — Reference only

https://github.com/randerka/lattice-boltzmann-simulator — licence not detected, last push 2023-03, 22 stars. A WebGL2 LBM. Read for visual ideas (dye advection, vorticity colouring). Do not port code: the licence is unclear and Terraform's solver is tested (`lbm.ts`, ADR-0014) and validated numerically (Strouhal 0.153 at Re 100, feasibility 07).

### CFDSolve — Reject

https://github.com/nabilkhondaker/CFDSolve — MIT, 0 stars, last push 2026-09. No evidence of use or validation.

### GeoLibre — Reference only

https://github.com/opengeos/GeoLibre — MIT, very active, 8 677 stars. A general GIS application. Read its layer panel and attribution patterns; Terraform's per-layer provenance contract (ADR-0032) is already stricter than a typical GIS layer list.

### Turf — Already used

https://github.com/Turfjs/turf — MIT, `@turf/turf` 7.4.0. Used in `src/features/import/geometry.ts` (`simplify`, `union`, `unkinkPolygon`) and `src/lib/clip.ts` (`difference`, `intersect`, `union`). Two call sites, both on the import or editing path. The umbrella package is imported by name, so the bundler tree-shakes it. No consolidation task is justified.

### SunCalc — Already used

https://github.com/mourner/suncalc — BSD-2-Clause, installed 2.1.1, latest 2.1.4. One import, in `sun.ts`. Validated as above. Leave it pinned.

## 4. Additional repositories considered

| Repository | Facts (2026-11-16) | Disposition |
|---|---|---|
| THREE-CustomShaderMaterial — https://github.com/FarazzShaikh/THREE-CustomShaderMaterial | MIT, 6.4.0, 142 kB, last push 2025-10 | **Reference only.** Terraform patches two materials through `onBeforeCompile` (`fadeShader`, the wind circle clip). If the shared overlay material in 04 §4 grows past three patches, write one small `ShaderMaterial` (overlays are unlit) before reaching for a library |
| motion — https://github.com/motiondivision/motion | MIT, 14.14.0, 994 kB unpacked | **Reject.** Design contract §7 says "no animation library". CSS transitions and the existing `useTween` cover panel and figure motion. Revisit only with a named interaction CSS cannot do |
| theatre.js — https://github.com/theatre-js/theatre | Apache-2.0, last push 2024-08 | **Reject.** Dormant. Clip camera paths are three or four keyframes (04 §6) |
| leva — https://github.com/pmndrs/leva | MIT, last push 2025-11; React 19 compatibility **unverified** | **Reject.** The Lab's tweak panel is plain HTML inputs using `src/components/ui/controls.ts` |
| r3f-perf — https://github.com/utsuboco/r3f-perf | MIT, last publish 2024-11; R3F 9 compatibility **unverified** | **Reject.** `gl.info`, the existing `scripts/measure-fps*.mjs`, and drei's `StatsGl` (installed) cover it |
| detect-gpu — https://github.com/pmndrs/detect-gpu | MIT, 5.0.70, installed through drei | **Reject for now.** Its bundle contains the address `unpkg.com/detect-gpu@5.0.70/dist/benchmarks`: it fetches benchmark tables from a CDN at runtime, which adds a third-party request to a tool that is otherwise self-hosted. ADR-0018's measured frame budget is the better signal |
| astronomy-engine — https://github.com/cosinekitty/astronomy | MIT, last publish 2023-12 | **Reject.** No user-visible gain over a validated SunCalc |
| mp4-muxer — https://github.com/Vanilagy/mp4-muxer | MIT, 5.2.2, 152 kB | **Fallback candidate** for §2.6 if mediabunny's chunk is too large |

## 5. Recommended set

Ranked by benefit per unit of risk:

1. **drei `CameraControls` or `OrbitControls.zoomToCursor`** — the largest interaction gain; no new package.
2. **three.js `Line2`** — the largest still-image gain; no new package.
3. **Playwright `toHaveScreenshot`** — makes every later visual claim checkable; no new package.
4. **postprocessing / n8ao export tuning** — better stills from what is installed.
5. **WhiteboxTools (offline)** — closes the oldest open scientific gap.
6. **mediabunny** — the only candidate that would add a runtime dependency; gated behind Gate 6 and an ADR.

Five of the six add nothing to `package.json`.

## 6. Follow-up verification commands

```bash
gh api repos/yomotsu/camera-controls --jq '.pushed_at, .license.spdx_id'
```

```bash
npm view mediabunny version license dist.unpackedSize
```

```bash
npm view postprocessing peerDependencies
```

```bash
grep -n "zoomToCursor" node_modules/three/examples/jsm/controls/OrbitControls.js
```

```bash
grep -n "CameraControls" node_modules/@react-three/drei/index.d.ts
```
