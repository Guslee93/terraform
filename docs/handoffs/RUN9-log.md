# Run 9 — progress ledger

Continuation of Run 7/8 on `run7/identity-lab` (draft PR #29, base `run1/foundations`). Same hard
rules. One task per commit; update this file at the start and end of every task and push. Statuses:
`todo`, `in progress`, `done`, `partial`, `blocked`.

All work attributed as **DeepSeek V4 Pro (Cline)** in commit trailers, `docs/agent-log.md`,
`progress.md` and this ledger. Claude Opus 5.5 reviews this run; the owner judges the look.

## Run summary

_(Filled at the end of the run.)_

**T1–T7 done; T8 not attempted (stretch); T9 partial.** Everything is on `run7/identity-lab` (draft
PR #29) and reachable only through the `IDENTITY` style in the Visual Lab. Production (`NORDIC`) stayed
pixel-identical — the headed Metal safety net passed 5/5 after every scene change.

**What to look at** (`cd ../Terraform-run7 && npm run dev`):

- `/lab/compact-infill?style=identity&stage=C&preset=overview` — haze, vignette, real 1 m relief and
  speckled trees from a whole-tile camera.
- `/lab/compact-infill?style=identity&stage=C` — the speckled see-through tree crowns.
- Previews: `docs/screenshots/vis/run9/` (5 screenshots + README with the exact URLs).

**The 30 fps cap turned out to be background-tab throttling** (the headed window was not focused);
the fixed harness runs the Lab at ~60 fps on the Metal GPU, tier `high`
(`docs/perf/run9-lab-baseline.json`: NORDIC 59.4 fps, stage B 58.6 fps, stage C 65.4 fps — but stage C
now renders speckled trees, so re-measure before comparing).

**Production bundle grew ~1.9 kB** (StudioPage +1.3 kB, SceneComposer +0.5 kB) over the Run 9 baseline
because the identity code (haze/palette/relief/speckle) lives in the shared scene modules, not a lazy
chunk like Run 8's contour worker. NORDIC pixels are unchanged; the 0.2 kB budget is not met — see
"Questions".

**Blocked/partial:** T8 fat lines not attempted (stretch). T9 partial (chunk budget). T5 deferred the
sun-facing speckle shader and the speckled/points/mesh perf table.

## Environment

- **Machine / OS:** Apple MacBook, macOS 15.7.3 (Build 24G419), arm64.
- **Node:** v22.23.1 · npm 10.9.8.
- **Browser:** Google Chrome via Playwright Chromium. Headed GPU: `ANGLE (Apple, ANGLE Metal
  Renderer: Apple M1 Pro)` → the pixel safety net is available.
- **Branch:** `run7/identity-lab`, merged `origin/build/foundation` (look spec + reference images).
- **Production chunk baseline (gzip):** `/tmp/run9-baseline-chunks.txt`.

## Tasks

| # | Task | Status | Commit(s) | Checks (last lines) | Open items |
|---|---|---|---|---|---|
| T1 | Measure honestly first (30 fps cap, GPU, tier) | done | a33956a | typecheck 0 · lint 0 · baseline recorded (Metal, tier high) | 30 fps cap = background-tab throttling; fixed with bringToFront + throttle flags |
| T2 | Atmosphere: haze, aerial perspective, vignette | done | 8977d53 | typecheck 0 · lint 0 · unit 1280 / 4 skip / 1 todo · build OK · chunk 0 · VISUAL=1 5/5 | hazeAmount/hazeRange pure + mirrored GLSL; VignetteEffect identity-only |
| T3 | Exposure and palette (ground/water/buildings/contours) | done | dcb8f93, 1659458 | typecheck 0 · lint 0 · unit 1280 / 4 skip / 1 todo · build OK · VISUAL=1 5/5 | land-cover palette + exposure + warm buildings + slate water + slope-only contours |
| T4 | Real relief: draw terrain from the 1 m tile | done | 6079f13 | typecheck 0 · lint 0 · unit 1284 / 4 skip / 1 todo · build OK · VISUAL=1 5/5 | 2 m decimated mesh + shared heightAt + identity building skirt |
| T5 | Trees: tree shapes with speckled crowns | done | 42c0021 | typecheck 0 · lint 0 · unit 1285 / 4 skip / 1 todo · build OK · VISUAL=1 5/5 | alphaHash + speckle map + birch archetype; sun-side speckle + perf table deferred |
| T6 | Lab panel fixes and new controls | done | 06b02cc | typecheck 0 · lint 0 · unit 1285 / 4 skip / 1 todo · build OK · 14 sliders render | label/value layout fixed; exposure/vignette/water/slope controls wired |
| T7 | Previews for the owner | done | 91e5aaa | — | 5 screenshots (< 1 MB each) + README; comparison left to owner (no image input) |
| T8 | Stretch: TF-VIS-021 fat lines (Lab only) | blocked | — | — | Not attempted: stretch, after T1–T7 the session budget was spent; needs LineSegments2/LineMaterial + DPR/4K width handling |
| T9 | Final checks | partial | — | typecheck 0 · lint 0 · unit 1285 / 4 skip / 1 todo · build OK · chunk 0 · VISUAL=1 5/5 | production +~1.9 kB (identity code in shared modules), over the 0.2 kB budget |

## Decisions I made

- **T1 — the Run 8 30 fps cap was background-tab throttling.** The headed window was not focused, so
  Chromium throttled `requestAnimationFrame` to 30 fps. With `page.bringToFront()` + the
  `--disable-background-*` launch flags the Lab runs at ~60 fps (display refresh), Metal GPU, tier
  `high`. The reviewer's finding (c) is therefore resolved: the old JSON's `"gpu": null` and 33.3 ms
  median were measurement artefacts, not a product defect.
- **T2 — haze is an opaque colour mix, not a fade to transparent.** A shared `hazeAmount` (edge fade
  + horizontal aerial perspective) mixes every material's output colour toward `#262E2A` after fog,
  so buildings reach the same haze as the ground. The background is the frame-edge green `#1C2320`,
  and an identity-only `VignetteEffect` darkens the frame edges. Haze colour/start and vignette
  strength are provisional and Lab-tunable in T6.
- **T2 — I cannot view the reference images** (this run's model has no image input), so the visual
  match is judged from the look spec's prose + sampled palette, not by eye.
- **T3 — the ground is the land-cover palette now, not a tint.** IDENTITY_LANDCOVER maps each
  land-cover kind to the spec's forest/field/rock/plaza colours, `groundTint` is null, and the
  terrain vertex colours stay near-white so the palette reads through. Exposure is applied on the
  composer's ToneMappingEffect uniform (the renderer's tone mapping is bypassed); NORDIC stays 1.0.
  Contour slope fade thresholds 3° / 12° provisional.
- **T3 — water sheen is static** (ADR-0025 geometry unchanged): lower roughness 0.25 + envMapIntensity
  0.6 on the existing Room environment, no animation, no reflections of buildings.
- **T4 — the terrain mesh is now the 1 m tile (2 m decimation).** `rasterToTerrainData` + the existing
  `createTerrainGeometry` reuse one code path, so water, roads, trees and contours all sample the same
  drawn surface via one `heightAt`. Buildings keep their package base elevations and gain a 4 m skirt
  (identity only). The 2 m decimation has a ~half-cell horizontal offset (step 2 has no centre cell);
  all consumers share the grid, so it is imperceptible. Build time not yet measured off the main
  thread — a one-time ~200 ms hitch on switching to identity (recorded, could move to a worker).
- **T5 — speckled trees.** `alphaHash` + a code-generated speckle alpha map make the crown
  stochastically see-through (no alpha sorting); muted-green instance tints (#2E352D–#3A4034) replace
  the white point blobs; a sparse 'birch' archetype joins round/tall only in the identity mode.
  Deferred: the sun-facing lighter-speckle shader (T5.2) and the speckled/points/mesh perf table
  (T5.9) — the T1 harness is ready to record them.
- **T6 — panel layout fixed.** Each slider is one row (label left, value right-aligned + unit, slider
  below), resolving the reviewer's finding (b). New controls for exposure, vignette, water sheen and
  contour slope thresholds are wired through `applyTuning`/`style.tuning` and URL-round-trip.

## Questions for the owner

1. **The production bundle grew ~1.9 kB** because the identity code (haze, palette, relief, speckle)
   lives in the shared scene modules (`style.ts`, `sceneFades.ts`, `ViewportCanvas.tsx`, `Trees.tsx`).
   NORDIC pixels are unchanged, but the 0.2 kB budget is not met. Should a follow-up run split the
   identity renderer into a lazy chunk, or is ~1.9 kB of dead code acceptable?
2. **Trees are speckled but the sun-facing lighter speckle is deferred** (T5.2), and the
   speckled/points/mesh perf comparison is not yet recorded. Fine as a follow-up?
3. **T8 (fat lines) not attempted** — stretch. Worth its own run?

## Session notes

- 2026-11-19 — T9 **partial**. Full checks + safety net 5/5; production +~1.9 kB (identity code in
  shared modules) over the 0.2 kB budget.
- 2026-11-19 — T7 **done** (`91e5aaa`). 5 preview screenshots + README.
- 2026-11-19 — T6 **done** (`06b02cc`). Panel label/value layout fixed; exposure/vignette/water/slope
  controls wired and URL round-tripped.
- 2026-11-19 — T5 **done** (`42c0021`). Speckled see-through tree crowns (alphaHash + speckle map +
  birch archetype); sun-side speckle + perf table deferred. NORDIC unchanged, safety net 5/5.
- 2026-11-19 — T4 **done** (`6079f13`). Terrain drawn from the 1 m tile (2 m decimation) with one
  shared height function + identity building skirt; NORDIC unchanged, safety net 5/5.
- 2026-11-19 — T3 **done** (`dcb8f93`, `1659458`). Exposure + land-cover palette + warm buildings +
  slate water + slope-only contours; safety net 5/5.
- 2026-11-19 — T2 **done** (`8977d53`). Aerial-perspective haze (mix toward #262E2A) + identity
  vignette; NORDIC byte-identical, safety net 5/5.
- 2026-11-19 — T1 **done** (`a33956a`). 30 fps cap diagnosed (background throttling) and the perf
  harness fixed (GPU + tier + bringToFront + throttle flags). Baseline: NORDIC 59.4 fps, B 58.6 fps,
  C 65.4 fps (all Metal, tier high).
- 2026-11-19 — Setup. Merged `origin/build/foundation` (identity-look-spec.md + 6 reference images +
  orthophoto-source.md). Recorded the production chunk baseline. Started T1.
