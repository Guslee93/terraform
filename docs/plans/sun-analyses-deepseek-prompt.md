# Brief: sun analyses (sun hours, roof solar, façade sun, VSC)

Role: engineering-senior-developer
Project: Terraform v1, an architectural portfolio prototype (3D Oslo site study in the browser).
Model: DeepSeek V4 Flash. Work in phases. Stop at the end of each phase and report before you start the next one.

## Read first, in this order

1. `AGENTS.md` (guardrails §1, claim policy §7)
2. `docs/decisions/ADR-0020-simplify-search-analyse-export.md` (current product scope)
3. `src/features/analysis/sun.ts`: sun direction in local ENU metres. **Reuse `sunDirection` / `sunDirectionEnu`.**
4. `src/features/analysis/grid.ts`: `sampleGrid`, `insideAnyBuilding`, `FootprintBuilding`. **Reuse these.**
5. `src/features/analysis/noise.ts`: the pattern to copy. It is a pure grid analysis with bands, a disclaimer and a `compute*` function.
6. `src/features/analysis/climateView.ts`: `ClimateMode` and `buildClimateView`, which turn cells into the ground overlay and legend.
7. `src/components/studio/StudioShell.tsx`, lines 60–160 and 240–310: `sunTime`, `solar`, `analysisBuildings`, `studyArea`, `noiseCells`, and the dock cards.
8. `src/scene/ClimateLayer.tsx` (ground cells) and `src/scene/RoofWind.tsx` (per-roof colouring). Use these as the patterns for the scene layers.
9. `src/features/analysis/sweepWorker.ts` and `useWindSweep.ts`. These are the worker pattern. Use them only if a phase's performance budget needs it.
10. `src/lib/polygon.ts` (`segmentsIntersect`, `pointInPolygon`).

## Goal

Today the sun only places light and shadows. Turn it into real screening analyses that react to the blocks the user draws:

1. **Ground sun hours**: hours of direct sun per ground cell for the selected date.
2. **Roof solar potential**: indicative clear-sky annual irradiation per roof.
3. **Façade sun hours**: hours of direct sun on the façades of user-drawn blocks for the selected date.
4. **Daylight potential (VSC)**: Vertical Sky Component on the façades of user-drawn blocks.

**Out of scope:** embodied carbon. There is no material data, so any number would be invented (guardrail 2). Also out of scope: auth, backend, live GIS, new dependencies, refactoring wind or noise, and terrain-aware shading (see Limitations).

## Hard constraints

- TypeScript strict. No `any`, no unchecked `as`.
- All domain maths lives in `src/features/analysis/`, as pure functions with no React or Three.js imports, so it can be tested in Vitest without a renderer.
- Coordinates are local ENU metres (x = east, y = north, z = up). Never use lat/lon as geometry. `sitePackage.manifest.location` provides lat/lon/timeZone, and they are used **only** to get the sun direction.
- Time: reuse `localDayMinuteToInstant` (see `time.ts` / StudioShell) to convert local minutes to instants in the site's time zone.
- No new runtime dependencies. `suncalc`, `three` and React are enough.
- **Claim policy (mandatory).** Every analysis shows its disclaimer next to the legend, the same way noise does:
  - Sun hours: `Indicative sun hours — geometric, clear sky, buildings only. Not a daylight assessment.`
  - Roof solar: `Indicative clear-sky irradiation — upper bound, no weather or cloud data. Not a yield estimate.`
  - Façade sun: same wording as sun hours.
  - VSC: `Indicative Vertical Sky Component — early massing screening, not a daylight assessment.`
  - Never write "compliant", "verified", "meets BRE", or any pass/fail against a guideline. Bands are descriptive only.
- Update the comment at the top of `sun.ts`. It currently says nothing there is a sunlight-hours statement. Make it point to the new modules and their disclaimers.
- Write `docs/decisions/ADR-0021-sun-analyses.md` covering: what each analysis computes, the models and constants, the claim wording, limitations, performance budget, and "no new dependencies".

## Shared core: the shadow ray test (Phase 1, reused by all phases)

Create `src/features/analysis/shadowRay.ts`:

```ts
/** True when the ray from p toward the sun hits a building before rising above it. */
export function blockedTowardSun(p: Vec3, sunEnu: Vec3, buildings: readonly FootprintBuilding[], skip?: FootprintBuilding): boolean
```

Algorithm. It must be exact for extruded footprints, so do not step along the ray:

- If `sunEnu[2] <= 0`, return true: the sun is below the horizon.
- Let h = the horizontal part of `sunEnu`, normalised, and `tanElev = sunEnu[2] / |horizontal part|`.
- For each building with `height > p[2]` (and not `skip`): intersect the 2D ray `p.xy + t·h, t > 1e-6` with every footprint edge, and keep the smallest `t` (the entry point). The building blocks if `p[2] + t·tanElev < building.height`. Only the first crossing matters, because the ray's height only increases with `t`.
- Prefilter: skip a building if its 2D bounding box is entirely behind the ray, or farther than `(maxHeight - p[2]) / tanElev`.
- Building `height` is relative to its own ground and terrain is ignored in this version (documented limitation). So test points use `z` relative to ground: 0 for ground cells, the façade sample height for façades, and the roof height for roofs.

Also export a helper that builds the day's sun samples once and reuses them for every point:

```ts
export function daySunSamples(date: LocalDate, location: {latitude; longitude; timeZone}, stepMin = 15): { minute: number; enu: Vec3; elevationDeg: number }[]
```

Return only samples with elevation > 0. Sun hours = `count(unblocked samples) × stepMin / 60`.

## Phase 1: Ground sun hours

- `src/features/analysis/sunHours.ts`: `computeSunHours(studyArea, buildings, samples, cellM = 10): SunHoursCell[]`. Cells inside a building get `hours: null`, as noise does. Bands: `0–2 h`, `2–4 h`, `4–6 h`, `6–8 h`, `8+ h`, plus `SUN_HOURS_DISCLAIMER`.
- `climateView.ts`: add `'sun-hours'` to `ClimateMode` and a branch in `buildClimateView` with a legend and disclaimer. Use a sequential palette from `src/scene/palette.ts` if a suitable one exists. Otherwise add one with tokens and do not hard-code colours in components.
- UI: inside the Sun dock card (`SunDetails` / `SunBand`), add a labelled segmented control: `Shadows | Sun hours` (Phase 3 adds `Façade`, Phase 4 adds `VSC`). Use the date from `sunTime.date`. The time slider does not affect the sun hours result. "Sun hours" shows the ground overlay through the existing ClimateLayer. Keyboard reachable, with visible focus and `aria-pressed` or radio semantics.
- The dock stat for the sun card: when sun hours is active, show the study-area **median** hours and the date.
- Recompute when `analysisBuildings` or the date changes (useMemo). Budget: ≤ 150 ms on the main thread for a 10 m grid. Measure with `performance.now()` in a test or dev log. If it is over budget, move the work into a worker using the `sweepWorker.ts` / `useWindSweep.ts` pattern.

**Tests (`shadowRay.test.ts`, `sunHours.test.ts`), with fixtures:**
1. No buildings: hours equal the day length from `suncalc.getTimes` sunrise→sunset, within ±stepMin, for 21 Jun and 21 Dec in Oslo.
2. A 20 m × 20 m × 30 m box whose south face is 5 m north of the point: on 21 Dec in Oslo, a point just north of the box gets 0 h, and a point 5 m south of it gets the full day.
3. Ray test: the sun at 45° due south, a 10 m-tall wall 5 m south of the point → blocked. The same wall 12 m away → not blocked.
4. A sun direction below the horizon → blocked.
5. A non-convex (L-shaped) footprint: entry-crossing logic holds.

## Phase 2: Roof solar potential

- `src/features/analysis/roofSolar.ts`. Each roof is the top face of a building or mass tier, assumed flat. Sample its footprint with `sampleGrid` at 2 m, or use the centroid if the roof is under 4 m². Test points sit at `z = height + 0.05`, skipping the roof's own building.
- Annual clear-sky irradiation on a horizontal plane:
  - Representative days: the 15th of each month, sampled at `stepMin = 30`. Weight each day by the number of days in its month.
  - Per unblocked sample: `DNI = 1000 × 0.7^(AM^0.678)` with `AM = 1 / sin(elev)` (Meinel clear-sky). Horizontal beam = `DNI × sin(elev)`. Diffuse = `0.1 × DNI × sin(elev)`, always added, even when shaded. Document this as a crude constant.
  - Sum to kWh/m²·yr. The result per roof is the mean over its samples, and the scene shows that mean.
- Optional secondary readout: `≈ kWh/yr if fully covered at 20 % panel efficiency, 0.8 performance ratio`. Show these constants in the UI text. Keep the "upper bound" disclaimer next to it.
- Scene: colour roofs as `RoofWind.tsx` does, with a legend in kWh/m²·yr bands. Add `Roof solar` to the sun segmented control.
- Recompute only when the buildings change. The result does not depend on date or time. Run it in a worker if it goes over 150 ms.

**Tests:** an unshaded roof in Oslo (59.9° N) returns a value within a stated plausible clear-sky range; compute it once, write the number into the test, and note the model in the test. A roof beside a much taller block to its south returns a lower value. Monthly weights add up to 365.

## Phase 3: Façade sun hours (user-drawn blocks only)

- `src/features/analysis/facadeSamples.ts`: for each **user mass** (not context buildings, to keep the count small), walk each exterior footprint edge:
  - Samples every ~3 m along the edge, at mid-storey heights every 3 m up to the tier height.
  - Each sample moves 0.1 m outward along the edge's outward normal. Check ring orientation with the signed area, and use `normalizeRing` if that is what the rest of the code uses. For a CCW ring the outward normal of edge (dx, dy) is (dy, −dx).
  - Output: `{ p: Vec3, normal: Vec2, massId, tierIndex }`.
- `facadeSun.ts`: hours per sample. A time sample counts only if `dot(normal, sunHorizontal) > 0` **and** the ray is not blocked. Here the test does **not** skip the façade's own building: its other wings can shade it.
- Scene layer `src/scene/FacadeSun.tsx`: one `InstancedMesh` of small quads facing outward, coloured with the sun-hours bands. Add `Façade` to the segmented control.

**Tests:** a single box on 21 Jun in Oslo: the north façade gets far fewer hours than the south façade, and the south façade's hours are no more than the day length. An inside corner of an L block is shaded by the other wing at a known time.

## Phase 4: VSC on façades (user-drawn blocks only)

- `src/features/analysis/vsc.ts`, reusing the Phase 3 samples. Integrate over the hemisphere in front of the façade on a fixed grid: azimuth −90°…+90° relative to the normal, elevation 0…90°, about 5° steps.
  - CIE standard overcast sky luminance ∝ `(1 + 2 sin θ) / 3`, where θ is elevation.
  - Weight = luminance × cos(angle between the direction and the façade normal) × solid angle (`cos θ · Δθ · Δφ`).
  - A direction contributes only if `blockedTowardSun(p, dir, buildings)` is false. The function works for any direction vector. Rename it or add an alias `blockedAlong` if clearer.
  - `VSC % = 100 × Σ unblocked vertical-plane weights / Σ full-hemisphere horizontal-plane weights` (the horizontal reference uses `sin θ` instead of the cos-to-normal term).
- Bands are descriptive (`< 15 %`, `15–27 %`, `27 %+`). No pass/fail wording.
- Scene: the same `FacadeSun` layer with a VSC palette. Add `VSC` to the control.

**Tests (key fixture):** an unobstructed vertical façade gives **39.6 % ± 0.5**. A façade facing a wall that subtends 25° gives clearly less. The result is the same for every façade orientation when nothing blocks it.

## Each phase ends with

- `npm run lint && npm run test && npm run build`, all passing. Paste the summary lines.
- Screenshots at 1440×900 of the Grünerløkka and sloped site isometric views with the new layer on, saved to `docs/screenshots/sun-<phase>-<site>-1440x900.png` (`npm run capture` or the existing Playwright setup).
- An entry each in `docs/agent-log.md` and `progress.md`. The ADR is written in Phase 1 and extended each phase.
- A report: files changed, tests added, the measured compute time per analysis, failures, limitations, open questions.

## Limitations to document (do not fix in this brief)

- Terrain does not cast shade and point heights are relative to local ground, so sloped sites get less shade than they should.
- Trees are ignored.
- Clear sky only: no cloud, weather data or reflections.
- Roofs are treated as flat. Façade and VSC samples cover user masses only.

## Done when

All four analyses work on both sites, react to drawing, moving and deleting a block, and show their disclaimers. The fixtures above pass, lint/test/build pass, the ADR-0021 and screenshots exist, and nothing in wind, noise or export has changed.
