# Run 10 — progress ledger

Continuation of Run 7–9 on `run7/identity-lab` (draft PR #29, base `run1/foundations`). Same hard
rules. One task per commit; update this file at the start and end of every task and push. Statuses:
`todo`, `in progress`, `done`, `partial`, `blocked`.

All work attributed as **DeepSeek V4 Pro (Cline)** in commit trailers, `docs/agent-log.md`,
`progress.md` and this ledger. Claude Opus 5.5 reviews this run; the owner judges the look.

## Run summary

_(Filled at the end of the run.)_

## Environment

- **Machine / OS:** Apple MacBook, macOS 15.7.3 (Build 24G419), arm64.
- **Node:** v22.23.1 · npm 10.9.8.
- **Browser:** Google Chrome via Playwright Chromium. Headed GPU: `ANGLE (Apple, ANGLE Metal
  Renderer: Apple M1 Pro)` → the pixel safety net is available.
- **Branch:** `run7/identity-lab` @ Run 9 tip `3c33605`.
- **Production chunk baseline (gzip):** `/tmp/run10-baseline-chunks.txt`.

## Tasks

| # | Task | Status | Commit(s) | Checks (last lines) | Open items |
|---|---|---|---|---|---|
| T1 | Objective edge test (IDENTITY_EDGE e2e) | done | 70e9411 (DeepSeek); sampling fixed by Claude | edge test: canvas-only capture, outline at ground height, building pixels skipped, ring-median profile | — |
| T2 | Make the haze recede, not glow | done | 06dbf64 (DeepSeek: linear haze colour); Claude: background = haze = far haze `#262E2A`, vignette 0.35, exposure 1.35 | IDENTITY_EDGE 2 passed: edge mean 0.57 / 0.48, p95 2.72 / 2.64, max rise 0 / 0 | provisional values, owner tunes |
| T3 | Trees receive the haze | done | 93a463e (DeepSeek); Claude: building crease lines hazed too (they floated as white wire outlines) | edge test p95 52 → 2.7 after the crease fix | — |
| T4 | Fix and move the raster helpers | done | 138c5c8 (DeepSeek) | terrainTools.ts identical to run1/foundations | — |
| T5 | Contours: smooth lines on hills only | done | 3090064 (DeepSeek) | unit pass | owner judges in the Lab |
| T6 | Keep identity code out of production | partial (decision) | DeepSeek: rasterTerrain lazy; Claude: edge-test hook mounted for identity only | studio chunks vs Run 8: StudioPage +1.3 kB, SceneComposer +0.5 kB | Not split further: under D23 the identity becomes the production look at V7, so this code will not stay dead; 1.8 kB is inside the 15 kB/gate budget (04 §7) |
| T7 | Measure the finished identity scene | done (Claude) | this commit; docs/perf/run10-identity.json | M1 Pro Metal, Chromium 156, 3 runs each; stage C vs NORDIC: p95 25.1 vs 24.6 (+2 %), p99 26.0 vs 25.5 (+2 %) Compact Infill; 25.0 vs 24.4, 25.3 vs 25.1 Sloped Edge | draw calls 97 vs 86 (+11, one over the +10 budget); first run discarded (other browser windows open) |
| T8 | Previews and final checks | todo | — | — | — |

## Decisions I made

_(Provisional values and implementation choices are listed here as they are made, with the reason.)_

## Questions for the owner

_(Only real decisions, added as they arise.)_

## Session notes

- 2026-11-19 — Setup. Branch @ `3c33605`, clean (only untracked pixel-baseline snapshots). Recorded the
  production chunk baseline. Started T1.
- 2026-11-19 — **DeepSeek stopped by the owner after T5 (commits unpushed); Claude Opus 5.5 took over** (visuals-first plan, D23). Reviewed T1–T5, fixed the edge test (it captured the whole page incl. the Lab panel, projected the outline at height 0, and counted buildings), set background = haze colour, hazed the building crease lines, mounted the edge-test hook for identity only. NORDIC safety net 5/5; unit 1292 pass.
- 2026-11-19 — Visuals plan V2a (Claude): local aerial-photo preview in the Lab — git-ignored public/local-ortho/, greyed and draped on the terrain, alignment sliders remembered per browser, credit line; build check fails if a photo reaches dist/, and .vercelignore excludes the folder. Placement verified with a footprint test image (removed afterwards).
