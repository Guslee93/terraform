# 01 — Codebase audit

**Audit date:** 2026-11-16. **Mode:** read-only. No application code, manifest or deployment was changed. Commands run: `git` inspection, `gh` queries, `curl` against the public site, `npx vitest run` and `npm run lint` in the `build/foundation` worktree (neither writes tracked files; `git status` was clean afterwards).

**Evidence labels used below**

- **[code]** read in the source at the stated path on `build/foundation` @ `68f15f1`
- **[run]** output of a command run during this audit
- **[doc]** stated in a project document, not re-verified
- **[inferred]** follows from the code but not observed running

**Which tree was audited.** The session's working directory (`/Users/gustavekamanzi/Downloads/2026/Terraform`) is on branch `ci/github-actions` @ `874062d`, which predates all wind-lift and foundation work and has only 27 ADRs. It is **not** the source of truth. Every path below refers to the worktree `/Users/gustavekamanzi/Downloads/2026/Terraform-build` (branch `build/foundation`).

## 1. Branch, pull request and deployment state

| Item | State | Evidence |
|---|---|---|
| `origin/main` | `2089fd4` — "fix(wind): no dashed lines on the lifted map…" (#17) | [run] `git branch -a -vv` |
| Local `main` | `4aa6ea4`, **31 commits behind** `origin/main` | [run] |
| `build/foundation` | `68f15f1`, **15 ahead, 0 behind** `origin/main` | [run] `git rev-list --left-right --count` |
| PR #18 | Open, **draft**, mergeable, +76 525 / −528, 245 files | [run] `gh pr view 18` |
| CI on PR #18 | Green: lint/test/build, 3 Playwright shards, Vercel preview — run 43866312742, 2026-11-16 12:24 UTC | [run] |
| Unit tests | **1 196 passed, 4 skipped**, 25.7 s | [run] this audit |
| Lint | 0 problems | [run] this audit |
| Playwright | 49 passed, 12 opt-in skipped | [doc] build report §11; CI shards green [run]; not re-run locally |
| Preview deployment | `…597hvyzvz…vercel.app/studio/compact-infill` → **200** | [run] `curl` |
| Production `/` | **200**, bundle `index-CGMY84U2.js` | [run] |
| Production `/studio/compact-infill` | **404** (plain text, 79 bytes) | [run] |
| Production `/about` | **404** | [run] |
| Production `/sites/compact-infill/manifest.json` | **404** | [run] |
| Worktrees | 17, of which 11 marked prunable. Owner asked to leave them | [run], memory note |

### 1.1 The production defect is not explained by the branch gap

The project report says production lacks the site packages because `main` is behind the branch. That is not the whole story. `origin/main` **contains** `vercel.json` with the SPA rewrite and contains `public/sites/compact-infill/` and `public/sites/sloped-edge/` ([run] `git ls-tree origin/main`). A correct build of `origin/main` would serve `/about` and `/studio/compact-infill`. Production returns 404 for both.

So the production alias points at a deployment that is not a correct build of `origin/main`: an older deployment, a build with a different root or output directory, or one that ignored `vercel.json`. `origin/main` also has a `.vercelignore` that was not read in this audit. **The cause is unverified.** Merging PR #18 might fix it by triggering a fresh deployment, or might not. Diagnose first (TF-VIS-001):

```bash
vercel ls terraform-studio --prod
```

```bash
vercel inspect terraform-studio.vercel.app
```

```bash
git show origin/main:.vercelignore
```

### 1.2 Differences from the project report

| Report says | Audit finds |
|---|---|
| `main` is 13 commits behind the branch | 15 (the report's own two commits were added after it counted) |
| Production lacks the features because `main` is behind | True for the foundation features; the 404s have a separate, unverified cause (§1.1) |
| 1 196 unit tests pass | Confirmed [run] |
| 39 ADRs | Confirmed: ADR-0001 to ADR-0039 on the branch |
| Idle 65–73 fps on M1 Pro | **Not re-measured.** The build report itself warns that the 10 fps gain over its baseline is machine pacing, not the code. Treat as indicative only |

## 2. 3D scene architecture

All in `src/scene/` (4 309 lines without tests). One `<Canvas>`, one scene, one composer.

### 2.1 Canvas and render loop — `ViewportCanvas.tsx` (785 lines) [code]

- `dpr={[1, 1.75]}`, `antialias: true`, `NeutralToneMapping`, shadows `'percentage'` (PCF; three r186 removed the soft variant), fog from 600 m to 1 400 m scaled by `viewScale`.
- The component takes **35 props** and mounts every layer. It is the integration point for nearly every task in this plan, which makes it the main file-ownership constraint (05 §"File ownership").
- Scene colours are **module constants at the top of this file** (`VIEWPORT_BACKGROUND`, `GROUND_COLOR`, `CONTEXT_COLOR`, `EDGE_COLOR`, `EDGE_OPACITY`, `ROAD_COLOR`, contour opacities inline in JSX). `src/scene/palette.ts` holds only a `soften()` helper. There is no single style object.
- `key={manifest.id}` remounts the whole canvas when the site changes.

### 2.2 Camera — `CameraRig.tsx`, drei `OrbitControls` [code]

- `OrbitControls` with damping 0.075, distance 20 to 1 100 m, polar limit just above the horizon. `zoomToCursor` is not set, so the wheel zooms towards the orbit target, not the pointer.
- Five presets per site in the manifest: `isometric`, `top`, `north`, `south`, `eyeLevel` (`components/studio/CameraPresets.tsx`). All are perspective; "Plan" is a perspective camera looking down, not an orthographic plan.
- `CameraRig` tweens position and target **linearly** over 0.75 s with ease-out-cubic. Consequences [inferred]: (a) the path is a straight chord, so 3D → Street can pass through buildings; (b) the tween keeps running while the visitor drags, so input and tween fight until it ends; (c) there is no cancel.
- Reduced motion snaps, correctly.
- `WindDemoCamera` rotates the camera about the target for the wind demo and restores it afterwards.
- `HudProbe` computes compass bearing and scale-bar length every 100 ms from the camera and writes them to a small Zustand store (`hudStore.ts`). Its scale maths assumes a perspective camera with a `fov`.

### 2.3 Lighting — `lighting.ts`, `SiteLights` [code]

- One directional sun, an ambient light, a hemisphere light, and a procedural `RoomEnvironment` baked to a PMREM (ADR-0017).
- **The displayed sun is the Sun card's time.** `StudioShell.tsx:101–109` holds `sunTime` (default 21 June, 15:00), converts it with `sunState()` and passes it to the viewport as `sun`. The light direction, shadow direction and the Sun card readout are one value. Any "lighting atmosphere" that moved the light would make the on-screen shadows disagree with the Sun card. This is the central constraint for 03 §4 and ADR-0042.
- The sun-hours analysis does not depend on the light: it uses `sunSamples` for the card's date in a worker.
- Below the horizon the rig switches to a night fill with no sun.
- The shadow frustum is fitted to the site (`fitShadowFrustum`, pure and tested).

### 2.4 Post-processing — `SceneComposer.tsx` (73 lines) [code]

RenderPass → N8AO (Medium, radius 4 m, intensity 1.6, tint `#2B3138`, half resolution on Balanced) → neutral tone mapping. Half-float targets, 4× MSAA. Lazy-loaded chunk of about 96 kB gzip [doc]. Ambient occlusion is switched off during a mass drag and fades back over 0.3 s. Mounted only when the canvas is at least 640 px wide and the profile allows it.

### 2.5 Quality tiers — `renderQuality.ts`, `rendererTier.ts` [code]

High / Balanced / Low (ADR-0018). Auto chooses High unless the renderer name is a software rasteriser, then drops one tier each time a 3 s window averages over 33 ms. There is no capability probe beyond the renderer name, and no pixel-ratio scaling.

### 2.6 Geometry and materials [code]

| Element | Implementation | File |
|---|---|---|
| Terrain | One mesh from the 16 m grid, vertex colours by elevation, land cover as a 2 048 px canvas texture on planar UVs; a skirt; contours by marching squares as GL lines | `ViewportCanvas.tsx` `TerrainMesh`, `siteGeometry.ts`, `features/sites/contours.ts` |
| Context buildings | **One merged geometry** for all buildings, flat-shaded `MeshStandardMaterial`; `EdgesGeometry` at a 30° crease as one-device-pixel GL lines; a per-vertex `faded` attribute and two `onBeforeCompile` materials for buildings under the lifted wind disc | `ViewportCanvas.tsx` `ContextBuildings` |
| Measured roofs | Gables from the heights layer | `roofGeometry.ts`, `features/sites/roof.ts` |
| Roads | One draped ribbon mesh | `siteGeometry.ts` |
| Water | A flat mesh of its own; the terrain is carved beneath it (ADR-0025) | `waterGeometry.ts`, `features/sites/waterSurface.ts` |
| Trees | Two instanced meshes (canopy, branches), casting shadows | `Trees.tsx`, `foliage.ts` |
| Masses | Per-volume meshes with drei `Edges`, `Html` labels, handles | `MassLayer.tsx` |
| Floor | Ground disc plus two drei `Grid`s | `ViewportCanvas.tsx` `FloorGrid` |

Draw calls: 90 idle, 99–102 with wind [doc]. Not re-measured.

**Line weight is tied to device pixels** [inferred]. Context edges and contours use `lineBasicMaterial`, which is one device pixel wide. The viewport runs at up to 1.75×; the still export raises the pixel ratio until the canvas is 3 840 px wide. The same edge is therefore relatively thinner in the export than on screen. Confirm in the Gate 1 captures (TF-VIS-010).

**The drawn ground is the 16 m grid.** Only the slope overlay, the section and the runoff read the 1 m tile [doc, build report §7].

### 2.7 Documentation drift in the design contract

`docs/design/design-contract.md` §8 says "Scene colours are TypeScript constants … they are the single source" and then lists values that no longer match the code: background `#F4F2EE` (code: `#F1F1EF`), ambient 0.28 (code: 0.08), hemisphere 1.75 (code: 1.35), AO intensity 1 (code: 1.6), grid colours. The contract's scene table is stale [code vs doc].

## 3. Analyses: domain, workers and data contracts

`src/features/analysis/` — 4 852 lines without tests. No domain module imports React or three.js [doc; spot-checked in `runoff.ts`, `climateView.ts`, `circleSunHours.ts`].

| Analysis | Domain modules | Worker | Hook | Request → response | Stale-result guard |
|---|---|---|---|---|---|
| Sun hours | `circleSunHours.ts`, `shadowRay.ts`, `sun.ts`, `time.ts` | `circleSunWorker.ts` | `useCircleSunHours.ts` | `{buildings, circle, samples}` → `{result: CircleSunHours}` | 250 ms debounce; a new worker per request; the old one is terminated; result kept with the inputs it was computed for; `computing` is true when they differ from the current inputs |
| Roof solar | `roofSolar.ts` | `roofSolarWorker.ts` | `useRoofSolar.ts` | per-roof values | not read in this audit |
| Wind flow | `lbm.ts`, `flowRunner.ts`, `grid.ts`, `windProfile.ts`, `windLift.ts`, `climateView.ts` | `flowWorker.ts` | `useWindFlow.ts` | `FlowRequest {id, frame, buildings, reset, downwash, slices}` → `FlowResult` (velocity and solid buffers transferred) | One long-lived worker; 80 ms throttle; a revision counter; `isCurrent(flow)` compares `flow.id`; the worker keeps only the newest pending request |
| Wind sweep | `directionSweep.ts` | `sweepWorker.ts` | `useWindSweep.ts` | 8 directions → cells and worst index | not read in this audit |
| Runoff | `runoff.ts`, `terrainTools.ts` | `runoffWorker.ts` | `useRunoff.ts` | `{raster, footprints}` → `{runoff: Runoff}` (three typed arrays transferred) | 250 ms debounce; new worker per request; identity check on raster and footprints |
| Noise | `officialNoise.ts` | none (static polygons) | — | Polygons from the package or import | not applicable |
| Snow | `snowClimate.ts` | none (build-time data) | — | `snow.json` in the package | not applicable |
| Slope, section | `terrainTools.ts` (`hornSlopeDeg`, `terrainProfile`) | none, main thread | — | 1 m raster → `Float32Array` | computed once in `StudioShell` |

Observations:

- The three worker hooks implement the same "keep the previous result, mark it computing" behaviour three times with small differences. A shared transition and loading vocabulary (04 §4) can sit on top of this without touching the workers.
- `hornSlopeDeg` over the full 1 m raster runs on the main thread inside a `useMemo` (`StudioShell.tsx:347`). No long task was reported [doc], but it was not measured with Slope switched on [doc, build report §4].
- The wind's Lawson activity names are still in the legend (`ACTIVITY_BANDS`, `climateView.ts:154`), an open owner decision.

## 4. Overlays, legends and loading states

| Overlay | Driven by | How it is drawn | File |
|---|---|---|---|
| Sun hours | `CircleSunHours` from the worker | Ground: vertex-coloured mesh clipped to the circle. Roofs: a `DataTexture`. Façades: quads | `SunHoursLayer.tsx`, `FacadeSun.tsx` |
| Roof solar | per-roof values | coloured roof meshes | `RoofSolar.tsx` |
| Wind map | `ClimateOverlay` cells derived from `FlowResult` | vertex-coloured mesh, corner colours averaged, circular clip in the fragment shader | `WindHeatmap.tsx` |
| Wind trails | `FlowResult` velocity | up to 4 000 CPU-advected ribbons of 16 points, with its own 3 ms budget and zoom-dependent density; traced once and static under reduced motion | `WindParticles.tsx`, `features/analysis/particles.ts` |
| Streamlines | `FlowResult` (2D or slices) | drei `Line` segments, blue to violet | `WindStreamlines.tsx` |
| Worst-case arrows | sweep result | arrows | `WorstArrows.tsx` |
| Roof wind | flow slices | roof colours | `RoofWind.tsx` |
| Noise bands | official polygons | filled into a 2 048 px canvas (even-odd), draped on a **copy** of the terrain mesh | `NoiseBands.tsx` (`DrapedTexture`) |
| Slope | Horn slope per 1 m cell | one pixel per cell, draped; the gentlest band is transparent | `SlopeOverlay.tsx` |
| Runoff | `Runoff` | one pixel per cell: depressions as a fill at alpha 170, paths as lines, main paths three cells wide; draped at opacity 0.8 | `RunoffOverlay.tsx` |
| Parcels, section | package parcels; picked points | drei `Line` | `ParcelLines.tsx` |
| Analysis circle | circle | white halo and dark ring, no depth test | `AnalysisCircle.tsx` |

Every overlay draws real output. The only visualisation-only steps are: averaging colours at shared corners, filling two rings of cells under walls so the colour reaches the façade (`WIND_FILL`), widening main runoff paths to three cells, and the particle advection itself (particles illustrate the solved field; they are not solver output).

**Gaps relevant to the plan** [code]:

1. **Colour ramps live in six places** in the domain layer: `SUN_HOURS_RAMP` (`circleSunHours.ts:217`), `SPEED_BANDS`, `WIND_RAMP`, `DELTA_BANDS`, `ACTIVITY_BANDS` (`climateView.ts:100–161`), `SLOPE_BANDS` (`terrainTools.ts:139`), `RUNOFF_LEGEND` (`runoff.ts:214`), `bandColour` (`officialNoise.ts`), plus streamline colours in `WindStreamlines.tsx:10`. Several share hex values by coincidence (`#E6DC9C`, `#E39A4C`, `#3B6EA8`, `#1E3A8A`), so slope, wind and water use the same colours for unrelated meanings.
2. **No shared legend.** The viewport has four copies of the same caption block (`ViewportCanvas.tsx:636–661`), two separate ramp-bar components, and each panel builds its own legend.
3. **No transitions.** Overlays mount and unmount with their card. A result swap is an instant texture or geometry replacement.
4. **No visual difference between output classes.** Feasibility 07 requires that mapped authority data, calculated results, screening and illustrative motion "must never look the same". Today noise, slope and runoff share one draped-texture path and differ only in colour and opacity.
5. **Each draped overlay rebuilds a terrain geometry** (`DrapedTexture` calls `createTerrainGeometry`). Cheap on a 16 m grid, but it is the place a shared overlay surface would go.

## 5. Editor input pipeline

`src/features/editor/` (699 lines) and `src/scene/MassLayer.tsx` [code].

- `interaction.ts` is a pure reducer: `reduceEditor(state, event)` with interaction kinds `idle`, `dragging`, `drawing`. `displayedDocument()` returns the preview during a gesture. `cameraLocked()` is true while a gesture holds the pointer.
- `history.ts` is snapshot-based: `beginPreview`, `updatePreview`, `cancelPreview`, `commitPreview`, `execute`, `undo`, `redo`. One drag commits one entry.
- `MassLayer.tsx` `usePlaneDrag` starts a drag on pointer-down, sets `controlsRef.current.enabled = false` imperatively and restores it on release. `ViewportCanvas` also passes `enabled={!cameraLocked(editor)}`. `WindLiftHandle.tsx` uses the same pattern. Two mechanisms guard the same thing; a camera library swap must keep both working or replace both together.
- Ground clicks are filtered by a 4 px travel tolerance so an orbit drag is not a click (`CLICK_TOLERANCE_PX`).
- The ground click has four competing meanings in one handler (`ViewportCanvas.tsx:621`): pick a point (circle or section), pick a parcel, place a drawing vertex, deselect. The priority order is in code, and the build review already found one conflict here (finding 2).
- There is no hover state on context buildings, and no keyboard control of the camera. The wind lift handle is keyboard-operable.

## 6. Data pipeline and provenance

- **Curated packages:** `public/sites/{compact-infill,sloped-edge}/` — 15 files each: manifest, terrain, buildings, study area, roads, trees, land cover, heights, noise, parcels, hazards, snow, `terrain1m.{json,bin}`, attribution [run `ls`].
- **Builders:** `scripts/build_site_packages.py` (base package from cached OSM and Kartverket data, checksummed in `data/raw/`) and `scripts/site-assets/*.build.ts` (heights, noise, parcels, hazards, snow, 1 m terrain).
- **Import path:** `src/features/import/` (2 617 lines): geocode, frame, tiles, OSM, terrain sampling on a 13 × 13 grid, roof fit, noise, parcels, hazards. Imports have no 1 m tile and no snow; the Water and Snow cards say so [doc].
- **Loading:** `features/sites/useSitePackage.ts`, validated by `manifest.ts` and `package.ts`.
- **Provenance:** `features/sites/provenance.ts` — a typed contract per layer. The panel lists the sources of visible layers; `exportCreditLines()` feeds the export.
- **Source health:** `scripts/check-sources.mjs` (20 sources, all unchanged at the last run [doc]). Not scheduled in CI — an open owner decision.

## 7. Export pipeline

`src/scene/PassExporter.tsx`, `src/scene/exportPasses.ts`, `src/components/studio/ExportVisuals.tsx` [code].

| Pass | How | Credits |
|---|---|---|
| `still` | Pixel ratio raised so the canvas is 3 840 px wide (capped by max texture size); 4 settle frames; the composer's frame is copied | burned in |
| `depth` | Override `ShaderMaterial`, linear view depth, white at half the focus distance, black at twice it; fog, background and overlays off; fat lines hidden | **none** — `capture([])` |
| `white` | Override white `MeshStandardMaterial`, shadows kept, overlays off, fat lines hidden | burned in |
| `analysis` | Depth-only pre-pass, then the `analysis-overlay` group alone on transparent | burned in |
| clip | `MediaRecorder` on `canvas.captureStream(30)`, 6 s, 12 Mbit/s; with credits it records a 2D copy redrawn every animation frame | burned in on every frame |

Properties to protect:

- The depth pass never receives credits, legends or post-processing. `renderPasses` restores every piece of scene state in a `finally` block.
- An export without its credits throws rather than saving.

Limits [code, inferred]:

- The clip is the live viewport: screen resolution, real-time frame pacing, WebM in Chrome, no camera path. The credit band was never played back in a browser [doc, build report §7].
- `ExportVisuals` finds the canvas with `document.querySelector('section[aria-label="Studio viewport"] canvas')`, which a second canvas (a Lab) would have to respect.
- The white and depth passes render through `gl.render` directly, without the composer, so they have no ambient occlusion. The still has it. That difference is by design but is not documented in ADR-0019.
- Only objects inside the `analysis-overlay` group appear in the analysis pass. Parcel lines and the section line are outside it.

## 8. Tests and benchmarks

| Kind | Where | State |
|---|---|---|
| Unit and component | 124 `*.test.ts(x)` files beside the source | 1 196 pass [run] |
| E2E | `e2e/*.spec.ts`, 15 specs, Chromium only | 49 pass, 12 opt-in [doc]; green in CI [run] |
| CI | `.github/workflows/ci.yml` — lint, test, build, 3 e2e shards against the built app | green [run] |
| E2E time budgets | `e2e/budget.ts` — a 4× multiplier on CI because runners software-render | [code] |
| Frame-rate probes | `scripts/measure-fps.mjs`, `measure-fps-headed.mjs`, `measure-fps-masses.mjs`, `measure-load.mjs`; `feasibility/scratch/perf.mjs` (orbit p95, long tasks, draw calls) | exist; the richest one lives in a scratch folder |
| Reference captures | `scripts/capture*.mjs` → `docs/screenshots/` (125 images [doc]) | compared by eye |
| Sun reference | `docs/qa/sun-reference/` (NREL SPA) | present |
| Fixtures | `docs/qa/fixtures.md`, QA-01 to QA-18 | present [doc] |

Missing or stale:

1. **No pixel comparison** anywhere (`toHaveScreenshot`, `pixelmatch`: no matches).
2. **No frame-time p99, input latency, GPU memory or export-time measurement.** The reported figures are fps and p95 only.
3. **No real phone, no Safari, no Firefox** [doc].
4. **Performance with Slope, Parcels or Water on was never measured** [doc].
5. **`docs/reviews/M5-perf.md` is dated 2026-02-11** and predates the current scene.
6. **Runoff has no independent reference** (IT-7), and **sun hours have no Ladybug/Radiance point** (IT-6) [doc, feasibility 06].

## 9. Design system

- **Tokens:** `src/styles/tokens.css` (62 lines) — surfaces, ink, lines, one accent (`#1f3bd6`), sun marks, status colours, v3 card tokens, two shadows, one easing curve. Mapped to Tailwind 4 theme names in `src/styles/global.css` with a type scale as utilities (`text-figure`, `text-stat`, `text-eyebrow`, `text-label` …).
- **Type:** Geist and Geist Mono, self-hosted variable fonts.
- **Primitives:** `src/components/ui/` — `Button`, `IconButton`, `Icon`, `ConfirmDialog`, `Figure`, `controls.ts` (class strings), `useTween.ts`.
- **Motion:** the contract (§7) allows CSS keyframes and `requestAnimationFrame` only, "no animation library", and says "keep motion under 200 ms except the intentional site-entry camera".
- **Scene tokens:** none. ADR-0009 deleted the `--scene-*` CSS variables; scene colours are constants in `ViewportCanvas.tsx` (§2.1).
- **Responsive:** the inspector is a focus-managed panel; ambient occlusion is disabled below 640 px; the legend pill hides on small screens.
- **Accessibility:** WCAG 2.2 AA target for HTML UI; `e2e/m5-a11y.spec.ts`, `wind-a11y.spec.ts`, `keyboard.spec.ts`. The viewport has an `aria-label` describing the mouse gestures.
- **Landing** (`src/app/LandingPage.tsx`, 74 lines): a blurred lime and grey wash, a search card and chips. Its eyebrow reads "Wind · Sun · Noise" — it does not mention Water, Snow or terrain, and shows no image of the product.
- **About** (`src/app/AboutPage.tsx:24`): still says "Noise uses road class and distance, with a fixed reduction behind buildings", the heuristic ADR-0034 deleted. The same page, line 16, correctly describes the official map. The page contradicts itself.

## 10. Conventions and governance

- **AGENTS.md** is the operating guide: guardrails, a role roster, gates G0–G4, a standard brief, a definition of done and a claim policy.
- **ADRs:** `docs/decisions/ADR-0001…0039`. The next free number is **ADR-0040**.
- **Handoffs:** `docs/handoffs/` with prefixes by agent (`C*` Codex, `D*` DeepSeek, `X*` MiniMax). **Reviews:** `docs/reviews/` with `REVIEW-TEMPLATE.md`. **Logs:** `docs/agent-log.md`, `progress.md`, `task_plan.md`, `findings.md`.
- **Agent pipeline:** `.github/workflows/agent-minimax.yml`, `agent-round.yml`, `agent-talk.yml` — an issue-triggered pipeline in which `MiniMax-M3.1-Flash` builds on a runner with a read-only token and `claude-opus-5-5` reviews without running repository code [code]. This is the one delegation path whose model names are verified in the repository.
- **Deployment:** Vercel's Git integration deploys `main` to production; other branches get previews [memory note, consistent with the PR checks].

### 10.1 Conflicts between documents

| Conflict | Where | Handling |
|---|---|---|
| AGENTS.md §10 "Current state" stops at ADR-0027 and names context-fidelity Phase B as next | `AGENTS.md` | Stale. Update in TF-VIS-005 |
| AGENTS.md §1.11 and the standard brief list "live GIS, MapLibre" as out of scope | `AGENTS.md` | Superseded by ADR-0006 and the import path. Update in TF-VIS-005 |
| AGENTS.md §3 repository map omits `features/import`, workers, `scripts/site-assets` | `AGENTS.md` | Update in TF-VIS-005 |
| Design contract §8 scene table does not match the code | `docs/design/design-contract.md` | Regenerate from the style module (TF-VIS-013) |
| Milestone briefs show M2–M5 pending; `docs/status-report.md` is dated 27 October | `docs/milestones/`, `docs/status-report.md` | Update in TF-VIS-005 |
| The build plan the branch's ADRs cite is uncommitted in another worktree | `Terraform-feasibility/docs/plans/fable-build-plan.md` | Owner decision 9 on PR #18 |

No ADR is overridden by this plan. Where a proposal would change one, 08 lists it as an ADR change proposal.

## 11. Invariants this plan must not break

| # | Invariant | Where it is enforced |
|---|---|---|
| I1 | Mesh vertices are local ENU metres; one conversion (`enuToThreeXyz`) | `src/lib/coordinates.ts`, ADR-0002 |
| I2 | Domain modules import neither React nor three.js | `src/features/analysis/`, `features/sites/`, `features/massing/`, `features/editor/` |
| I3 | Heavy computation runs in a worker | the five workers in §3 |
| I4 | A shown result is either current or marked computing | the three hooks in §3 |
| I5 | One drag is one undo entry; Escape cancels; release commits | `history.ts`, `interaction.ts`, `e2e/massing.spec.ts` |
| I6 | The depth pass carries no credits, legends or post-processing | `exportPasses.ts` `renderPasses` |
| I7 | Still, white, analysis and clip carry the credits of the visible layers | `exportPasses.ts`, `provenance.ts` |
| I8 | Every layer has typed provenance; "not mapped" is never shown as "safe" | `provenance.ts`, `hazards.ts` |
| I9 | No snow load, flood depth, comfort or safety class, or per-building noise claim | ADR-0034, 0038, 0039; claim tests |
| I10 | The landing chunk does not load three.js, MapLibre or the composer | lazy routes in `App.tsx`, lazy `SceneComposer` |
| I11 | Reduced motion removes loops, camera tweens and particle animation | `CameraRig.tsx`, `WindParticles.tsx`, `useTween.ts` |

## 12. Not verified in this audit

| Item | Why | Command or step |
|---|---|---|
| Cause of the production 404s | Needs Vercel access | §1.1 |
| Frame-time figures | A headed run takes the machine; out of scope for a read-only pass | TF-VIS-011 |
| Playwright suite locally | Long; CI is green | `npm run build && CI=true npm run test:e2e` |
| `useRoofSolar.ts`, `useWindSweep.ts`, `SunPanel.tsx`, `ClimatePanel.tsx`, `MassLayer.tsx` in full | Read by outline only | Read before editing |
| Whether Codex, DeepSeek, Kimi or Cline are available to the owner today | Not checkable from here | Owner confirms (08, Q3) |
| Safari, Firefox, phones | No device | TF-VIS-072 |
