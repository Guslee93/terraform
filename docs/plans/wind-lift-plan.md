# Plan — Lift the wind analysis through its height slices

**Status:** accepted; Phases 1–4 done (2026-11-13), Phase 5 open · **Date:** 2026-11-13 · **Decision record:** ADR-0028 (accepted) · **Builds on:** ADR-0014, ADR-0015, ADR-0026, `docs/plans/wind-3d-plan.md` §3A

## 1. What the owner asked for

- The wind disc lies on the terrain as today. A **red lift handle** on the disc raises it.
- The disc stops only at **solved heights above terrain**: **2, 5, 10, 15, 20, 25, 30 m**, plus the existing **extra top slice** just above the tallest building when it is taller than 30 m.
- Heights are measured **from the terrain**, so on a slope the disc keeps its shape relative to the ground instead of staying flat.
- While the disc is lifted, the other heights show as dashed rings; buildings lower than the disc fade, because at that height they no longer block the wind.

Concept sketch shown to the owner on 2026-11-13 (conversation widget `wind_slice_lift_terrain_following`).

## 2. What already exists (read before building)

| Piece | Where | State today |
|---|---|---|
| Slice heights | `src/features/analysis/windProfile.ts` | `SLICE_HEIGHTS_M = [2, 10, 20, 35]`; `sliceHeightsFor` adds a top slice above 35 m (cap 120 m) |
| Obstacles per slice | `sliceObstacles(buildings, z)` | building blocks the slice if `height > z`. Height is already above the building's own ground, so the rule is terrain-relative already |
| Solving the stack | `src/features/analysis/flowRunner.ts` | 2 m solved live on the full grid; upper slices solved afterwards on a coarser grid (`UPPER_SLICE_RESOLUTION = 80`), warm-started from the slice below, cached (8 entries) |
| Heatmap | `src/scene/WindHeatmap.tsx` + `buildClimateView` in `climateView.ts` | always draws `flow.velocity` (the 2 m field), draped at `heightAt(x, y) + 0.5` |
| Streamlines at one height | `src/scene/WindStreamlines.tsx` + "Streamline height" select in `ClimatePanel.tsx` | already drawn at `heightAt(x, y) + slice.z` — terrain-following already |
| Roof wind | `src/scene/RoofWind.tsx` | picks the first slice at or above each roof (`roofSlice`) |
| Progress | `ClimatePanel.tsx` | "Upper heights computing… n/m ready" |

So the solver side and terrain-following drawing exist. The new work is: more heights, the heatmap at a chosen height, the handle, and the fading.

## 3. Phases

### Phase 1 — Seven heights plus the top slice (domain, renderer-free)

- `SLICE_HEIGHTS_M = [2, 5, 10, 15, 20, 25, 30]`; `sliceHeightsFor` adds the top slice when the tallest building is over **30 m** (same rounding and 120 m cap).
- Update the pinned tests: `windProfile.test.ts`, `flowRunner.test.ts` (lines 73, 177, 205), `flowWorker.test.ts` (lines 23, 42).
- `RoofWind` needs no change; more slices make its roof colours closer to the real roof height.
- **Measure the cost** (ADR-0023 §8): upper work goes from 3 (or 4) slices to 6 (or 7). Time the full stack on both curated packages and one dense import, cold and cached, and record it in `findings.md`. Budget: the full stack ready in ≤ 2× today's time; if not, solve upper slices nearest the requested height first (see §5).

**Done when:** tests pass with the new heights; timings recorded.

**Done (2026-11-13).** Heights and the 30 m top-slice threshold are in `windProfile.ts`; the pinned tests now read `SLICE_HEIGHTS_M` or look slices up by height instead of by position. Benchmark (`WIND_BENCHMARK=1`, Node 22, 4-core container, two runs each):

| Site | Stack before (4 slices) | Stack after (7 slices) | Ratio | Upper slices before → after |
|---|---|---|---|---|
| Compact Infill | 11.2–11.4 s | 13.1–13.3 s | 1.17× | 3.3 s → 5.8 s (1.75×) |
| Sloped Edge | 5.8 s | 6.5 s | 1.11× | 1.2 s → 2.2 s (1.8×) |

Within the 2× budget, so the requested-height-first reordering (§5.1) is not needed. A cached direction returns all seven slices without stepping (`flowRunner.test.ts`). Not measured: a dense import site — no offline import fixture with buildings over 30 m; measure on the first live one.

### Phase 2 — The wind map at a chosen height (domain + scene)

- Add `heightM` (default 2) to `WindSettings`. One height drives the heatmap, the flat streamlines and the particles, replacing the separate "Streamline height" select. The 3D streamlines stay a separate on/off option.
- `buildClimateView` samples the slice whose `z === heightM` instead of `flow.velocity`. At 2 m the field keeps the downwash boost; upper slices are unboosted (as today).
- **Legend by height:** the activity/comfort classes are pedestrian criteria, valid only at 2 m. Above 2 m the map shows **speed in m/s** with the same ramp, and the legend says so. Delta (compare) works at any height where both runs have that slice.
- `heatmapGeometry` takes a lift: `heightAt(x, y) + heightM` (plus the existing 0.5 m clearance at 2 m). Do the same in `AnalysisCircle` for the disc rim.
- Cells inside buildings that are **lower** than the slice now carry values (the slice has no obstacle there), so the disc passes over low roofs; taller buildings still cut holes.

**Done when:** unit tests cover slice selection, the legend switch above 2 m and the lift offset; the panel shows the right legend at each height.

**Done (2026-11-13).** `WindSettings.heightM` (default 2) and `streamlines3d` replace `streamlineHeight`. `flowAtHeight` gives the 2 m field as solved (downwash included) or the slice at that height, and null while it is still computing: nothing is interpolated. `displayAt` turns Comfort into m/s above 2 m, and `windDrawLift` draws the map, circle and particles at terrain + height (2 m stays draped on the ground). Delta compares the baseline's slice at the same height. The panel has a "Height above terrain" select, the stepped slider and scene handle being Phase 3. Comfort is disabled above 2 m, with the reason given, and the worst case returns to 2 m and locks the height. The old streamline height select is now a "Follow buildings in 3D" checkbox. The card's comfort figure stays at 2 m. Screenshots: `docs/screenshots/wind-lift-2m-1440x900.png`, `docs/screenshots/wind-lift-20m-1440x900.png`.

### Phase 3 — Lift handle and height control (scene + UI)

- **Panel control:** a stepped slider "Height above terrain" with one stop per available slice, `aria-valuetext` "20 metres above terrain", stops still computing disabled and labelled. This is the keyboard path and is required.
- **Scene handle:** red arrow handle at the disc edge (the edge point nearest the camera when the circle is placed). Vertical pointer drag moves the disc continuously; the disc shows the nearest solved slice and **snaps on release**. `Esc` returns to the height at drag start. Height is a view setting, not a model edit, so it does not create an undo entry (ADR-0026 treats the analysis card state the same way).
- **Ghost rings:** while the disc is above 2 m or being dragged, draw each other solved height as a dashed rim draped at `heightAt + z`.
- **Fading:** buildings in the analysed set whose height is ≤ the current slice are drawn at reduced opacity. Spike first: find how the analysed buildings are rendered (merged vs individual meshes) and pick the cheapest way — a per-building opacity attribute or a second material. Context buildings outside the circle are not faded.
- Reduced motion: no eased glide; the disc jumps to the snapped height.

**Done when:** the handle and the slider move the same state; Esc cancels; keyboard reaches every height; screenshots at 2, 10, 30 m and the top slice on both curated sites.

**Done (2026-11-13).** The rules are in `src/features/analysis/windLift.ts`: `nearestHeight`, `clampLift`, `stepHeight`, `liftAnchor`, `ghostHeights`, `fadedBuildings` and `heightText`, with 10 tests. The scene parts are in `src/scene/WindLiftHandle.tsx`:
- **The handle** is an HTML slider positioned in the scene, like the roof handle. A pointer drag uses a vertical plane through the handle, facing the camera: the disc follows the pointer, the map shows the nearest solved slice, and the disc snaps on release. `Esc` restores the starting height without reaching the studio's own `Esc` handlers. Arrows, Home and End step the height.
- **The rings** are dashed at every other solved height while the disc is lifted or being dragged.
- **The fading:** the context buildings were one merged mesh, so the ones inside the circle no taller than the slice now go into a second translucent mesh. It is rebuilt at most once per height step.
- **The panel slider** has one stop per height. Computing stops are greyed, and moving onto one lands on the highest solved height. It drives the same `heightM` as the handle.

The e2e test lifts to 20 m with the slider, steps to 25 m with the keyboard on the handle, drags, cancels with Esc and returns home. Screenshots: `docs/screenshots/wind-lift-{compact-infill,sloped-edge}-{2m,10m,30m}-1440x900.png` and `docs/screenshots/wind-lift-compact-infill-top-1440x900.png` (65 m: Compact Infill has a tower over 30 m).

Not done:
- **Drawn masses are not faded,** only context buildings. The user's own blocks stay solid while being designed.
- **The handle's edge point is fixed** when the circle is placed; it does not follow the camera as it orbits.

### Phase 4 — Claims and labels

- The caption names the height: "Wind at 20 m above terrain — 2D flow, not engineering".
- The note that the model ignores slope stays visible whenever terrain relief inside the circle is non-trivial (existing `terrainReliefM`). Following the terrain is a drawing choice; the solver still treats each slice as flat.
- No comfort or "safe/unsafe" wording above 2 m.

**Done (2026-11-13).**
- **The map caption** is `windCaption(h)`: "Indicative wind screening at 20 m above terrain — 2D flow, not engineering". At 2 m it is the unchanged claim.
- **The steep-site note** adds `LIFT_SLOPE_NOTE` while the map is lifted: the map is drawn following the ground, but each height is solved flat.
- **No comfort wording above 2 m.**
  - The map shows m/s and Comfort is disabled (Phase 2).
  - Roof colours now follow the shown scale. They were still in comfort colours beside an m/s map, which was visible in the Phase 3 screenshots.
  - The wind card's figure says "at 2 m" while the map shows another height.
- **Tests:** the D34 disclaimer e2e and the lift e2e, which now checks the caption, both pass.

### Phase 5 — Evidence and gates

- `npm run lint && npm run test && npm run build`.
- Playwright: place circle → lift to 20 m via the slider → legend switches to m/s → back to 2 m.
- Fixed-view screenshots into `docs/screenshots/wind-lift-*.png`, including one sloped import site.
- G1 code review record in `docs/reviews/`; G3 visual pass on the handle and ghost rings.
- `docs/agent-log.md`, `progress.md`, AGENTS.md §10 updated.

## 4. Order and size

| Phase | Owner role | Size |
|---|---|---|
| 1 Heights + measurement | senior-developer | ½ day |
| 2 Map at height | senior-developer + gis-3d-scene-developer | 1 day |
| 3 Handle, rings, fading | gis-3d-scene-developer + frontend-developer | 1–1½ days |
| 4 Labels | technical-writer | ½ hour |
| 5 Evidence + gates | code-reviewer, ui-finish-gate-reviewer | ½ day |

Phases run in order; 2 depends on 1, 3 depends on 2.

## 5. Risks and open questions

1. **Solve time.** Twice as many upper slices. If the measurement in Phase 1 misses the budget, reorder the upper queue so the height the user asked for is solved next (the runner already solves one slice at a time).
2. **Coarse upper grid.** Upper slices are solved at ≤ 80 cells across and upsampled. Lifted to 20 m they may look blockier than the 2 m map. Check in the Phase 3 screenshots; smoothing is a display fix, not a solver change.
3. **Building fading cost** depends on how buildings are drawn — Phase 3 spike.
4. **Slope.** A building on a slope has one height, though its downhill wall is taller. Accepted approximation; documented in ADR-0028.
5. **Worst-direction sweep** stays at 2 m only (it is a pedestrian comfort screen). The height control is hidden or disabled while the sweep is shown.
