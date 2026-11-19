# Run 8 — progress ledger

Continuation of Run 7 on `run7/identity-lab` (draft PR #29, base `run1/foundations`). Same hard
rules as Run 7. One task per commit; update this file at the start and end of every task and push.
Statuses: `todo`, `in progress`, `done`, `partial`, `blocked`.

All work attributed as **DeepSeek V4 Pro (Cline)** in commit trailers, `docs/agent-log.md`,
`progress.md` and this ledger. Claude Opus 5.5 reviewed Run 7 and will review this run.

## Run summary

_(Filled at the end of the run.)_

## Environment

- **Machine / OS:** Apple MacBook, macOS 15.7.3 (Build 24G419), arm64.
- **Node:** v22.23.1 · npm 10.9.8.
- **Browser:** Google Chrome via Playwright Chromium. Headed GPU: `ANGLE (Apple, ANGLE Metal
  Renderer: Apple M1 Pro)` → the pixel safety net is available.
- **Branch:** `run7/identity-lab` @ `94b4832` (Run 7 head), clean except the untracked local
  `e2e/visual-reference.spec.ts-snapshots/` (kept, not committed).
- **Production chunk baseline (gzip)** at `94b4832`: recorded in `/tmp/run8-baseline-chunks.txt`
  and copied into T3's row.

## Tasks

| # | Task | Status | Commit(s) | Checks (last lines) | Open items |
|---|---|---|---|---|---|
| T1 | Dissolve: every edge fades, the site never does (TF-VIS-02A fix) | done | 61d59fd | typecheck 0 · lint 0 · unit 1269 / 4 skip / 1 todo · build OK · chunk 0 · VISUAL=1 4/4 deterministic (wind flaky, fails on Run 7 tip too) | fadeWidth 160 m both sites (provisional); overview preset added |
| T2 | Point-cloud trees that read as airy canopies (TF-VIS-029 tuning) | done | bacca4e, a9f2008 | typecheck 0 · lint 0 · unit 1271 / 4 skip / 1 todo · build OK · stage C renders | screen-stable 2.5 px (1.5–4 px) points, shell-biased, #D4DED4 (1.64:1); perf p95 C/B = 1.01×, draw calls 26 vs 84 |
| T3 | Keep the 1 m contour worker out of production | done | e1a391f | typecheck 0 · lint 0 · unit 1271 / 4 skip / 1 todo · build OK · chunk 0 · VISUAL=1 5/5 | worker reachable only via lazy RasterContours chunk; studio never requests it |
| T4 | Lab tuning controls for the owner (Lab only) | done | 1da6f9b | typecheck 0 · lint 0 · unit 1276 / 4 skip / 1 todo · build OK · chunk 0 · 13 sliders + Copy/Reset render | applyTuning pure + tested; ?tuning= URL round-trip |
| T5 | Make the stale-result spec reliable or narrow it (TF-VIS-046) | todo | — | — | — |
| T6 | Stretch: TF-VIS-021 fat lines (Lab only) | todo | — | — | — |

## Decisions I made

- **T1 — dissolve is edge-distance (rounded rectangle), not radial.** `dissolveAmount(east, north,
  params)` is a rounded-rectangle signed distance mirrored in the shader. `fadeWidth` = 160 m on
  both curated sites (capped by `MAX_FADE_WIDTH_M`; the crisp zone holds study area + `SITE_MARGIN_M`
  40 m and the analysis circle + 40 m). Provisional.
- **T1 — fade applied everywhere that reaches the edge.** Terrain, contours (minor keeps its zoom
  fade too), context buildings (combined with the wind-lift discard), roads, water and point
  vegetation all fade to transparent at the tile boundary.
- **T1 — `applySceneFades` extracted to `src/scene/sceneFades.ts`** so ViewportCanvas and
  PointVegetation share one shader chunk; the GLSL had to avoid the reserved word `half` (renamed
  `halfSize`).
- **T1 — pixel safety net wind view is flaky.** The animated wind particles are timing-dependent;
  the wind test fails on the untouched Run 7 tip too. The four deterministic views (neutral, sun,
  noise, water) pass, so NORDIC is pixel-identical.
- **T2 — point size is screen-stable.** `sizeAttenuation: false` with a constant 2.5 CSS px size
  (clamped 1.5–4 px, DPR-scaled), instead of the Run 7 0.9 m world size that vanished at distance.
  LOD thresholds moved to 600 m / 1200 m so the isometric preset (≈516 m) shows the full set.
- **T2 — canopy is shell-biased.** Points sample the outer ~20 % of the canopy ellipsoid (porous,
  sparse interior), so a tree reads as a delicate cluster, not a solid lump.
- **T2 — vegetation colour #D4DED4.** The Run 7 tinted ground is mid-grey (~#AEACA7 vertex /
  ~#808080 rendered — the Run 7 "dark #2A2F2C" estimate was wrong because `tintGroundColour` halves
  lightness in three.js's *linear* colour space). #D4DED4 (a pale muted green-grey) gives 1.64:1
  against the lightest ground; the owner can tune both via the T4 controls.
- **T2 — perf.** Stage C p95 34.2 ms vs stage B 33.8 ms (1.01×, within the 1.10× budget); draw calls
  26 vs 84. `docs/perf/run8-lab-points.json`.
- **T3 — 1 m contours are lazy.** The worker/loader moved into a `React.lazy` `RasterContours`
  component (+ `rasterContourGeometry.ts`), so Vite emits them as a separate chunk the studio never
  requests. Verified no studio chunk references the worker; the Lab still fetches the raster chunks
  for the identity style. The worker chunk stays in `dist/assets/` (Vite always emits lazy chunks)
  but is not part of the studio's load path.
- **T4 — tuning via `applyTuning`.** The Lab panel gains 13 sliders (ground sat/light, road/water
  lightness, contour opacities, minor fade distance, point size min/max, tree colour/density,
  dissolve site margin/max width) + "Copy values" (tuned IDENTITY object literal + URL) and "Reset".
  `applyTuning(IDENTITY, tuning)` is pure and carries the runtime params on `style.tuning`, which
  ViewportCanvas/PointVegetation/dissolveRange read. IDENTITY's committed defaults are untouched.

## Questions for the owner

_(Only real decisions, added as they arise.)_

## Session notes

- 2026-11-19 — T4 **done** (`1da6f9b`). Lab "Identity tuning" sliders + Copy/Reset + `?tuning=`
  URL; `applyTuning` is pure and threaded to the dissolve/fade/point runtime.
- 2026-11-19 — T3 **done** (`e1a391f`). 1 m contour worker/loader moved behind `React.lazy`
  `RasterContours`; the studio no longer bundles or requests it. Safety net 5/5.
- 2026-11-19 — T2 **done** (`bacca4e`, `a9f2008`). Screen-stable shell-biased points, pale green-grey
  #D4DED4 (1.64:1 contrast), LOD thresholds so isometric shows the full set. Perf: stage C p95 1.01×
  stage B, draw calls 26 vs 84.
- 2026-11-19 — T1 **done** (`61d59fd`). Edge-distance dissolve (all four edges fade) + Lab overview
  camera. Wind safety-net test is timing-flaky (fails on Run 7 tip too); deterministic views 4/4.
- 2026-11-19 — Setup. Worktree verified clean on `run7/identity-lab` @ `94b4832`; `git fetch` +
  `git pull --ff-only` clean. Recorded the production chunk baseline. Started T1.
