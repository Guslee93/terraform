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
| T2 | Point-cloud trees that read as airy canopies (TF-VIS-029 tuning) | todo | — | — | — |
| T3 | Keep the 1 m contour worker out of production | todo | — | — | — |
| T4 | Lab tuning controls for the owner (Lab only) | todo | — | — | — |
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

## Questions for the owner

_(Only real decisions, added as they arise.)_

## Session notes

- 2026-11-19 — T1 **done** (`61d59fd`). Edge-distance dissolve (all four edges fade) + Lab overview
  camera. Wind safety-net test is timing-flaky (fails on Run 7 tip too); deterministic views 4/4.
- 2026-11-19 — Setup. Worktree verified clean on `run7/identity-lab` @ `94b4832`; `git fetch` +
  `git pull --ff-only` clean. Recorded the production chunk baseline. Started T1.
