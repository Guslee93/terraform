# ADR-0021 — Sun analyses: ground sun hours, roof solar, façade sun hours, VSC

- **Status:** Accepted (owner brief, 2026-11-10)
- **Brief:** `docs/plans/sun-analyses-deepseek-prompt.md`
- **Related:** ADR-0002 (ENU), ADR-0013 (screening layers), ADR-0016 (dock/panel layout), ADR-0020 (search → analyse → export)
- **Dependencies:** none added. `suncalc`, `three` and React are already in the app.

## Context

The sun placed light and cast shadows, but no analysis answered "how much sun does this ground,
roof or wall get?" The owner asked for four screening layers that react to the blocks a user draws.
The product is an architectural portfolio prototype: results must be useful for comparing massing,
must never imply planning compliance, measured daylight or a yield estimate, and must stay
renderer-free in the domain layer.

Embodied carbon was deliberately excluded: the app has no material quantities or emission factors,
so any carbon number would be invented (AGENTS.md guardrail 2).

## Decision

1. Four analyses share one exact shadow-ray test in `src/features/analysis/shadowRay.ts`:
   - **Ground sun hours** (`sunHours.ts`): direct sun per 10 m ground cell for the selected date.
   - **Roof solar** (`roofSolar.ts`): mean annual clear-sky irradiation per flat roof.
   - **Façade sun hours** (`facadeSun.ts`): direct sun per sample on user-drawn blocks.
   - **VSC** (`vsc.ts`): Vertical Sky Component per sample on user-drawn blocks.
2. The sun dock card gets a labelled segmented control `Shadows | Sun hours | Roof solar | Façade | VSC`
   (`SunAnalysisSwitch` in `SunPanel.tsx`, `aria-pressed` buttons, keyboard reachable). Ground hours
   reuse the existing `ClimateLayer`; roofs and façades use new scene layers.
3. Every layer carries its disclaimer in the dock card and beside the legend. Bands are descriptive.
4. No new runtime dependency. Domain code imports no React and no Three.js.

## Models and constants

### Shadow ray (`shadowRay.ts`)

- Buildings are vertical extrusions of their footprint from local ground to `height`.
- The sun ray is exact for extruded footprints; it is not stepped. For each building the first
  footprint crossing is the only one that can block, because the ray rises monotonically and the
  building has one height.
- A building blocks when `p.z + t·tan(elevation) < height` at entry distance `t`.
- A sun at or below the horizon always blocks direct sun.
- Heights passed to the test are relative to local ground: 0 for ground cells, sample height for
  façades, roof height for roofs. Terrain therefore does not cast shade (limitation).
- A 20 m uniform grid over building bounding boxes (`prepareScene`) gives each ray only the cells it
  crosses (Amanatides–Woo). A `Uint32` stamp de-duplicates candidates per ray. This is an exact
  candidate superset, not an approximation.
- `daySunSamples(date, location, stepMin = 15)` builds the day's above-horizon directions once in
  local wall-clock time. Sun hours = unblocked samples × `stepMin / 60`.

### Ground sun hours (`sunHours.ts`)

- `computeSunHours(studyArea, buildings, samples, cellM = 10, stepMin = 15)`.
- Cells inside a building have `hours: null` and no band, as noise does.
- Bands are shares of the day's possible sun (sampled sunrise→sunset): `<20 %`, `20–40 %`, `40–60 %`, `60–80 %`, `80 %+`. Fixed hour bands topping out at 8 h painted all open ground one colour on a ~19 h Oslo summer day. The dock still reports median hours.

### Roof solar (`roofSolar.ts`)

- Each roof is the top face of a building or mass tier, assumed flat.
- Roof footprint sampled at 2 m; a roof under 4 m² (or too narrow for the grid) uses its centroid.
- Test points at `height + 0.05`; the roof's own building is skipped, so an upper tier shades the
  tier below but a roof does not shade itself.
- Representative days: the 15th of each month, 30-minute steps, weighted by days in the month
  (`31, 28, …`, total 365).
- Clear-sky direct normal irradiance, Meinel:
  `DNI = 1353 × 0.7^(AM^0.678)` (Meinel; 1353 W/m² is the solar constant — the first version used 1000 and under-read by ~26 %), `AM = 1 / sin(elevation)`.
- Horizontal beam = `DNI × sin(elevation)` when unblocked.
- Diffuse = `0.1 × DNI × sin(elevation)`, always added even when shaded. This is a deliberately
  crude constant, named in the UI text.
- Sum to kWh/m²·yr; a roof's value is the mean over its samples.
- Optional readout: `kWh/yr if fully covered at 20 % panel efficiency, 0.8 performance ratio`
  (`PANEL_EFFICIENCY`, `PERFORMANCE_RATIO`).
- Bands: `0–300`, `300–600`, `600–900`, `900–1200`, `1200+` kWh/m²·yr.
- Measured unshaded Oslo roof: **1239.3 kWh/m²·yr** (above Oslo's real cloudy total of roughly 850–950, as an upper bound must be; a test enforces > 1000) (59.9° N). This is an upper bound, not a weather
  or yield estimate.
- The exact 2 m computation over the compact site (137 roofs, 9,633 samples) is **≈1.1 s** in Node.
  It runs in `roofSolarWorker.ts` via `useRoofSolar`; the main thread only receives the result. A
  250 ms debounce and a cache keyed by the building array prevent work during drags and on mode
  switches.

### Façade sun hours (`facadeSamples.ts`, `facadeSun.ts`)

- Only **user-drawn masses** are sampled; existing city context would multiply the point count
  without changing a design decision.
- Each tier's footprint is normalised counter-clockwise. Exterior edges are walked at 3 m spacing;
  the outward normal for edge `(dx, dy)` is `(dy, −dx)`.
- Samples at mid-storey heights every 3 m between the tier base and top, then moved 0.1 m outward.
- A sample is sunlit when `dot(normal, sunHorizontal) > 0` and the ray is not blocked. The façades'
  own building is **not** skipped: another wing can shade it.
- Same 15-minute day samples and same 0–2 / 2–4 / … / 8+ hour bands as ground hours.
- At 60° N the 21 June north façade still catches long grazing morning/evening sun; the decisive
  north/south fixture therefore uses 21 December, where the north façade receives 0 h.

### VSC (`vsc.ts`)

- Fixed hemisphere grid: azimuth −90°…+90° about the façade normal and elevation 0°…90°, 5° steps
  (midpoints 2.5°, 7.5°, …).
- CIE standard overcast sky luminance ∝ `(1 + 2 sin θ) / 3`, where θ is elevation.
- Vertical-plane weight = luminance × `cos(angle to normal)` × solid angle. With
  `dΩ = cos θ dθ dφ` this is `L · cos²θ · cos φ · ΔθΔφ`.
- Horizontal reference = `2π Σ L sin θ cos θ Δθ` (the full 360° sky). Integrating the reference over
  only the half-hemisphere would double every result.
- `VSC % = 100 × Σ unblocked vertical weights / horizontal reference`.
- Fixture: unobstructed vertical façade = **39.6 % ± 0.5** for all four orientations.
- Bands (`< 15 %`, `15–27 %`, `27 %+`) are descriptive only. No pass/fail against BRE or any
  guideline.

## Claim wording (exact)

- Sun hours and façade sun: `Indicative sun hours — geometric, clear sky, buildings only. Not a daylight assessment.`
- Roof solar: `Indicative clear-sky irradiation — upper bound, no weather or cloud data. Not a yield estimate.`
- VSC: `Indicative Vertical Sky Component — early massing screening, not a daylight assessment.`

Never: "compliant", "verified", "meets BRE", "planning compliant", or any pass/fail.

## Performance

| Analysis | Where | Measured (Node, compact site) | Budget |
|---|---|---|---|
| Ground sun hours | main thread, memoised | **21.9 ms** · 456 cells · 137 buildings · 75 samples | ≤ 150 ms |
| Roof solar | worker | **≈1.1 s** · 137 roofs · 9,633 samples | off main thread; result only |
| Façade sun hours | main thread, active only | proportional to user masses (196 samples for a 20 × 20 × 20 m block) | interactive |
| VSC | main thread, active only | **20.7 ms** · 196 samples (5° grid) | interactive |

The spatial index cut ground hours from 59 ms to 22 ms and roof solar from ~3.0 s to ~1.1 s. Roof
solar still exceeds the 150 ms main-thread budget by design, so it is the one analysis that moved to
a worker (per the brief's instruction). Façade and VSC stay on the main thread because sampling is
restricted to user masses and both are measured in tens of milliseconds for a typical block.
If a future scenario draws many blocks, the same `sweepWorker` pattern can move them without
changing the domain functions.

## Limitations (documented, not fixed)

- **Terrain does not cast shade.** Point heights are relative to local ground, so sloped sites show
  more sun than there really is.
- Trees are ignored.
- Clear sky only: no cloud, weather data, horizon haze or reflections.
- Roofs are treated as flat; roof solar's diffuse term is a constant 10 % of the horizontal beam.
- Façade sun-hours and VSC samples cover user masses only, not the existing city buildings.
- VSC is a CIE overcast-sky geometric measure on a 5° grid; it is not a daylight factor,
  climate-based daylight autonomy, or a BRE compliance check.
- Results are session-only with the blocks; there is no persistence.

## Consequences

- Sun analyses now react to drawing, moving, resizing and deleting user blocks.
- The domain layer remains testable without React or Three.js; the scene layers consume colours
  chosen by the analysis modules, so no component hard-codes a palette.
- The existing wind, noise and export paths are untouched; the analysis overlay export group gains
  the roof and façade layers when they are active.

