# 04 — Architecture and experiments

**Status:** design proposal. Paths are on `build/foundation` @ `68f15f1` (01). Nothing is implemented.

## 1. Shape of the change

The plan adds four small seams to the existing renderer. It does not replace the renderer, the workers or the domain modules.

```text
                         ┌──────────────────────────────────────────┐
 features/analysis/*     │ domain (renderer-free, tested)           │
  runoff, circleSunHours │   results: typed arrays, cells, polygons │
  climateView, officialNoise, terrainTools                          │
                         └───────────────┬──────────────────────────┘
                                         │ unchanged contracts
            ┌────────────────────────────▼───────────────────────────┐
 NEW (§4)   │ features/analysis/graphics.ts   (renderer-free)        │
            │   ramp + band registry, output class, legend model     │
            └───────────────┬────────────────────────┬───────────────┘
                            │                        │
 NEW (§3)   ┌───────────────▼────────┐   ┌───────────▼──────────────┐
            │ scene/style.ts          │   │ components/studio/       │
            │  SceneStyle object      │   │   MapLegend.tsx (NEW)    │
            │  (palette, lines, light │   └──────────────────────────┘
            │   atmosphere, quality)  │
            └───────────────┬────────┘
                            │ read by
            ┌───────────────▼──────────────────────────────────────┐
            │ scene/ViewportCanvas.tsx and layer components         │
            │  + scene/overlayFade.ts (NEW, §4.3)                   │
            │  + camera controller (§5, after Gate 3 decision)      │
            └───────────────┬──────────────────────────────────────┘
                            │ same SceneStyle, quality = 'export'
            ┌───────────────▼──────────────────────────────────────┐
            │ scene/PassExporter.tsx, exportPasses.ts (§6)          │
            └──────────────────────────────────────────────────────┘

 NEW (§2)   app/LabPage.tsx  → mounts ViewportCanvas with a Lab style
                               and a tweak panel; reuses useSitePackage
                               and the real hooks. Never in production nav.
```

What does not change: the ENU contract (I1), the worker request and response types (I3, I4), the history and interaction reducers (I5), the depth pass (I6), provenance (I7, I8).

## 2. The Visual Lab

### 2.1 Purpose

A place to compare styles, line systems, lighting atmospheres, camera behaviour and overlay grammar **on real site packages and real worker results**, without changing what visitors see.

### 2.2 Isolation

| Option | Pros | Cons | Decision |
|---|---|---|---|
| Separate branch with a forked renderer | Total isolation | Diverges from production within days; comparisons stop being fair | Rejected |
| Separate Vite app in the repo | Isolated build | Duplicates config, fonts, packages loader | Rejected |
| **Route `/lab/:siteId` in the same app, lazy-loaded, excluded from production builds** | Same renderer, same data, same hooks; the Lab's style object is the only difference | Needs a build flag | **Chosen** |

Mechanics:

- `src/app/LabPage.tsx`, lazy, registered in `App.tsx` only when `import.meta.env.DEV || import.meta.env.VITE_LAB === '1'`. The production build has neither, so the route and its chunk are tree-shaken out. A unit test asserts the route is absent when the flag is off; a build check asserts no `LabPage` chunk in `dist/` (07 §2).
- Vercel previews may set `VITE_LAB=1` (owner decision, 08 Q5) so the owner can review the Lab on a phone without a local checkout.
- The Lab mounts the real `ViewportCanvas` with props built the same way `StudioShell` builds them. To avoid copying `StudioShell`'s 738 lines, the Lab supports a **fixed set of states** (03 §7: neutral, sun hours, wind, noise, water, slope, one mass) with the real hooks (`useCircleSunHours`, `useWindFlow`, `useRunoff`). It has no editor UI beyond loading a fixed demo mass.
- No scientific computation is copied into the Lab. If a Lab state needs a value, it calls the same hook or domain function.
- The tweak panel is plain HTML using `src/components/ui/controls.ts`. No GUI library (02 §4).
- The Lab never writes to IndexedDB and never adds a link from the production UI.

### 2.3 What prototypes must prove

| Prototype | Shader feasible? | Fits the renderer? (the question that matters) |
|---|---|---|
| Fat lines | Yes, three ships it | Cost with 520 merged buildings; export resolution update; behaviour in the white pass |
| Hatch for screening | Yes, a screen-space or world-space stripe in the fragment shader | Works on the draped terrain copy without z-fighting; reads at 4K; does not alias at 1× |
| Hillshade | Yes, a baked texture | Registration to the 16 m drawn terrain; memory for 600 × 600 m at 1 m |
| Atmospheres | Yes, light parameters only | Sun direction provably untouched (test); shadows readable under Overcast when Sun is active |
| Sky gradient (Direction C) | Yes | Fog, export background and the analysis pass's transparent background |
| Camera arcs | Yes | Editor and lift-handle drag contracts; preset tests; reduced motion |

## 3. Scene style module

### 3.1 Contract

`src/scene/style.ts` (new). One typed object; every scene colour, line weight and light value is read from it.

```ts
export type LineStyle = { readonly color: string; readonly widthPx: number; readonly opacity: number }
export type SceneStyle = {
  readonly id: 'nordic' | 'diagram' | 'atmospheric'
  readonly background: string
  readonly ground: string
  readonly context: { readonly color: string; readonly roughness: number }
  readonly road: string
  readonly water: string
  readonly skirt: string
  readonly lines: {
    readonly crease: LineStyle
    readonly silhouette: LineStyle | null
    readonly contourMinor: LineStyle
    readonly contourMajor: LineStyle
    readonly parcel: LineStyle
    readonly section: LineStyle
  }
  readonly ao: { readonly intensity: number; readonly radiusM: number; readonly color: string }
  readonly analysisFocus: { readonly edgeOpacityScale: number; readonly landcoverSaturation: number }
}
export const NORDIC: SceneStyle = { /* today's values, exactly */ }
```

Rules:

- **TF-VIS-013 moves today's constants into `NORDIC` with no change in any value.** Its acceptance is pixel identity of the reference captures (07 §3), not "looks the same".
- Light values stay in `lighting.ts`'s `lightRig()`, which gains an `atmosphere` argument in TF-VIS-025. `lightRig()` stays pure and tested.
- The style is passed down as a prop or a React context created in `ViewportCanvas`. It is not a Zustand store: it changes rarely, and a context keeps the Lab and the studio independent.
- `design-contract.md` §8 is regenerated from `NORDIC` (TF-VIS-055), so the documentation cannot drift again.

### 3.2 Fat lines (TF-VIS-021)

- Context edges: `EdgesGeometry` output converted once to `LineSegmentsGeometry`; one `LineSegments2` per site. Contours likewise.
- `LineMaterial.resolution` set from the drawing-buffer size every time it changes, including during `PassExporter`'s pixel-ratio change. Width is specified in CSS pixels and multiplied by the pixel ratio, so a 0.75 px line in the viewport is 0.75 CSS px of a 3 840 px still scaled to the viewport's width. (Exact convention to be fixed in the prototype; the acceptance in 02 §2.2 is what counts.)
- `exportPasses.ts` hides fat lines in override passes (`isFatLine`). The prototype must decide: the white pass either keeps its edges (render the line objects after the override pass, without the override) or stays edge-free as today. This is a visible change to an export pass and needs the owner's view (08 Q8).
- Fallback: if the draw cost fails the budget, keep GL lines for the context and use fat lines only for contours, parcels and the section.

## 4. Shared analysis graphics

### 4.1 Ramp and band registry

`src/features/analysis/graphics.ts` (new, renderer-free).

```ts
export type OutputClass = 'mapped' | 'calculated' | 'screening' | 'illustrative'
export type Band = { readonly id: string; readonly label: string; readonly colour: string; readonly below: number }
export type Ramp = { readonly stops: readonly { readonly at: number; readonly colour: string }[] }
export type AnalysisGraphic = {
  readonly id: 'sun-hours' | 'roof-solar' | 'vsc' | 'wind-speed' | 'wind-comfort' | 'wind-delta' | 'noise' | 'slope' | 'runoff'
  readonly outputClass: OutputClass
  readonly scale: { readonly kind: 'ramp'; readonly ramp: Ramp; readonly unit: string } | { readonly kind: 'bands'; readonly bands: readonly Band[] }
}
export const GRAPHICS: Readonly<Record<AnalysisGraphic['id'], AnalysisGraphic>>
```

- TF-VIS-014 **moves** the existing constants (`SUN_HOURS_RAMP`, `SPEED_BANDS`, `WIND_RAMP`, `DELTA_BANDS`, `ACTIVITY_BANDS`, `SLOPE_BANDS`, `RUNOFF_LEGEND`, `bandColour`) into the registry and re-exports the old names from their old modules, so no import site and no pixel changes. Labels that include computed thresholds (runoff, activity speeds) stay generated from the domain constants.
- A unit test enforces the rules in 03 §5.2: no hex value used by two analyses for different meanings; banded scales have at most seven bands; every analysis has a class.
- Colour changes happen later, one analysis at a time, in Gates 4–5.

### 4.2 Legend model and component

- `legendFor(graphic, context)` in `graphics.ts` returns a plain object: title, class badge text, swatches or ramp stops, claim sentence, source lines, state (`ready | computing | not-mapped | unavailable-on-import`). Pure and tested.
- `src/components/studio/MapLegend.tsx` (new) renders it. It replaces the four caption blocks in `ViewportCanvas.tsx:636–661`, `WindRampBar` and `SunHoursRampBar`. Panels keep their detailed legends for now; Gate 5 decides whether panel legends also use the model.
- Claim sentences come from the existing domain functions (`windCaption`, `sunHoursDisclaimer`, runoff and noise captions). The legend does not author claims.

### 4.3 Overlay transitions

`src/scene/overlayFade.ts` (new):

- A hook `useOverlayOpacity(target, { reduced })` that eases a number towards a target in `useFrame` (no React state per frame). Default 160 ms; instant under reduced motion.
- Layers receive an `opacity` multiplier. On close, the layer stays mounted until its opacity reaches 0, then unmounts.
- Result replacement: keep the previous texture or geometry mounted for one fade period, cross-fade, then dispose. Applies to draped textures (noise, slope, runoff), heatmap meshes (wind, sun ground) and the sun roof texture.
- "Computing" is a state of the legend and a reduced overlay opacity (e.g. 0.6 of target), driven by the hooks' existing `computing` flags. Hooks are not changed.
- Wind particles and streamlines keep their own lifecycle; only their group opacity follows.

### 4.4 Output-class grammar on the GPU

- **Mapped:** draped texture, opaque-ish (0.75–0.85), nearest filtering on band edges. Existing `DrapedTexture`.
- **Calculated:** linear filtering, ramp.
- **Screening:** a hatch: a second texture channel or a procedural stripe in the draped material (world-space so it does not crawl when orbiting; spacing in metres chosen so it reads at the default zoom). Proposed as one extra `onBeforeCompile` patch on `DrapedTexture`'s material, behind the style's `analysisFocus`.
- **Illustrative:** existing particles and streamlines.
- **Runoff paths as lines (Water pilot, optional):** trace connected cells of the main and secondary path classes from the `Runoff` result into polylines. This is a re-drawing of cells the model already classified, not new hydrology; it lives in a renderer-free module (`runoffPaths.ts`) with tests that every traced vertex is a cell centre of a path cell. If tracing proves fiddly, keep the raster and change only colours and the hatch.

### 4.5 One active analysis

`ViewportCanvas` derives `focus = anyAnalysisOpen` and applies `style.analysisFocus` to context edge opacity and land-cover saturation. Land cover is a canvas texture; changing its saturation means a second texture or a uniform. Prefer a uniform in the terrain material (one `onBeforeCompile`), measured in the Lab.

## 5. Camera and input

### 5.1 Decision path

TF-VIS-031 compares (A) `OrbitControls` with `zoomToCursor` plus a cancellable arc tween in `CameraRig`, and (B) drei `CameraControls`. The cheaper option wins if it meets the criteria in 02 §2.1. Either way the public surface becomes one small interface so the rest of the scene stops reaching into OrbitControls:

```ts
export type CameraHandle = {
  getTarget(out: Vector3): Vector3
  setEnabled(enabled: boolean): void
  moveTo(preset: CameraPreset, opts: { animate: boolean }): void
  cancelMove(): void
}
```

Consumers today: `CameraRig`, `WindDemoCamera`, `HudProbe`, `PassExporter`, `MassLayer` (`usePlaneDrag`), `WindLiftHandle`. TF-VIS-032 moves them to `CameraHandle` in one change, with the characterisation tests of TF-VIS-030 passing before and after.

### 5.2 Arc transitions

Interpolate the camera's offset from the target in spherical coordinates (radius, polar, azimuth along the shortest arc) while lerping the target. Duration from angular distance, clamped 0.5–0.9 s. Any `pointerdown` or `wheel` on the canvas calls `cancelMove()`. Reduced motion snaps.

### 5.3 Orthographic plan

A true plan needs an `OrthographicCamera`. R3F supports swapping cameras, but every consumer that assumes a `fov` must handle `zoom`: `HudProbe` (scale bar), `metresPerPixel` in `WindParticles` (already handles orthographic), `PassExporter` depth range. This is an amendment to the camera preset contract and the M1 compass/scale behaviour: ADR required (ADR-0043, TF-VIS-033). Defer until after the controller decision.

### 5.4 Ground-click arbitration

Move the decision in `ViewportCanvas.tsx:621` into a pure function `groundClickIntent(state) → 'pick-point' | 'pick-parcel+deselect' | 'draw-vertex' | 'deselect' | 'none'` with a table test. No behaviour change. This makes later input work reviewable.

## 6. Export

### 6.1 Same style, different quality

`PassExporter` gains a `quality: 'export'` path that raises ambient-occlusion samples (`aoSamples`, `denoiseSamples` exist in n8ao 2.0.1) and forces the 4 096 shadow map for the capture, then restores. Live rendering never uses it. Acceptance in 02 §2.3.

### 6.2 Deterministic clips (Gate 6)

1. A clip is defined by a camera path: 2–4 keyframes (presets or the current view), a duration, and optionally the sun time if the Sun card's playback is the subject. The path is data and testable.
2. Render loop: R3F `frameloop="demand"` during the render; for frame *i*, set the camera from the path at `t = i / fps`, `invalidate()`, wait for the after-effect, copy the canvas with credits (existing `drawCredits`), hand the frame to the encoder.
3. Encoder: mediabunny (02 §2.6) behind an ADR, lazy-loaded; `MediaRecorder` remains the fallback and the only path where WebCodecs is missing.
4. Wind particles are a simulation in real time; a deterministic clip must step them with a fixed delta. `WindParticles` already advances by `delta`; the clip renderer passes a fixed delta. Verify in the prototype.

### 6.3 Invariants checked by tests (07 §2)

- Depth pass: no credit band, identical bytes to the Gate 1 baseline for the same camera when nothing in the scene changed.
- Still, white, analysis, every clip frame: credit band present, text equals `exportCreditLines()` for the visible layers.
- An atmosphere other than the default adds its line to the credits.

## 7. Performance budgets

Measured on the reference machine (Apple M1 Pro, headed Chromium, 1440 × 900 at device scale 2, High tier forced), with the harness of TF-VIS-011. **Baseline values are whatever Gate 1 measures; none are assumed here.**

| Metric | Budget for any visual change |
|---|---|
| Orbit frame time p95 | ≤ baseline × 1.10 |
| Orbit frame time p99 | ≤ baseline × 1.15 |
| Long tasks > 50 ms during idle and orbit | no new ones |
| Draw calls, neutral scene | ≤ baseline + 10 |
| Time from navigation to first rendered frame with the site | ≤ baseline × 1.10 |
| Pointer-down to first changed frame, mass drag | ≤ baseline + 1 frame |
| Studio chunk gzip | ≤ baseline + 15 kB per gate |
| Landing chunk gzip | no change (I10) |
| 4K still export time | ≤ baseline × 1.5 |
| JS heap after 10 min orbit with wind on | no upward trend (MP-3) |

On software rendering (CI) only correctness is asserted; budgets apply to the reference machine.

## 8. Experiments register

| ID | Question | Method | Pass | Task |
|---|---|---|---|---|
| EX-1 | Do fat lines keep weight across pixel ratios at acceptable cost? | Lab, Compact Infill | 02 §2.2 criteria | TF-VIS-021 |
| EX-2 | Is `zoomToCursor` plus a cancellable tween enough? | Lab A/B | 02 §2.1 criteria | TF-VIS-031 |
| EX-3 | Does a world-space hatch read as "screening" without noise at 1× and 4K? | Lab, runoff and wind map | Owner judges legible; no visible crawl while orbiting | TF-VIS-042 |
| EX-4 | Do atmospheres leave the sun untouched? | Unit test on `lightRig` + capture comparison of shadow positions | Shadow edges identical in position across atmospheres | TF-VIS-025 |
| EX-5 | Does reversing the sun-hours ramp improve legibility? | Greyscale and CVD checks; owner side-by-side | Passes 03 §2.3 items 7–8 | TF-VIS-050 |
| EX-6 | Does hillshade help Sloped Edge without implying sun? | Lab | Owner judges; legend states it is cartographic | TF-VIS-023 |
| EX-7 | Is a deterministic MP4 within size and support budgets? | Lab export | 02 §2.6 criteria | TF-VIS-062 |
| EX-8 | Does Terraform's runoff agree with WhiteboxTools? | Offline comparison | IT-7: ≥ 95 % on main paths | TF-VIS-007 |

## 9. Decision records this plan expects

| ADR | Subject | Raised by |
|---|---|---|
| ADR-0040 | Visual Lab route and build flag | TF-VIS-015 |
| ADR-0041 | Scene style module, line system, analysis graphic grammar (output classes) | TF-VIS-013/021/042 |
| ADR-0042 | Display-only lighting ~~atmospheres~~ — *18 Nov: HDRI ambient, sky hidden, sun untouched* | TF-VIS-025 |
| ADR-0043 | Camera controller and orthographic plan | TF-VIS-032/033 |
| ADR-0044 | Deterministic clip export (and mediabunny, if adopted) | TF-VIS-062 |
| ~~Amendment to ADR-0017~~ | ~~Only if Direction C is chosen~~ — replaced by ADR-0045 (18 Nov) | — |
| ADR-0045 | Identity scene: dark ground, orthophoto layer and source, atmospheric dissolve, point vegetation; supersedes ADR-0017 for the working view | TF-VIS-026/028/029 (09) |
| ADR-0046 | Horizontal analysis toolbar; amends ADR-0026 (and ADR-0016 tokens for the charcoal theme) | TF-VIS-047/048 (09) |

*18 Nov:* experiments EX-9 (orthophoto registration and cost, TF-VIS-028), EX-10 (point vegetation cost and airiness, TF-VIS-029) and EX-11 (dissolve never inside the halo, TF-VIS-02A) are defined in `09-VISUAL-IDENTITY-INTEGRATION.md` §4 and §7. EX-5's pale-ground premise no longer holds (TF-VIS-050 revised).

Numbers are provisional: the next free number at the time of writing is used, in order.
