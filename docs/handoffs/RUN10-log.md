# Run 10 — progress ledger

Continuation of Run 7–9 on `run7/identity-lab` (draft PR #29, base `run1/foundations`). Same hard
rules. One task per commit; update this file at the start and end of every task and push. Statuses:
`todo`, `in progress`, `done`, `partial`, `blocked`.

All work attributed as **DeepSeek V4 Pro (Cline)** in commit trailers, `docs/agent-log.md`,
`progress.md` and this ledger. Claude Opus 5.5 reviews this run; the owner judges the look.

## Run summary

**T1–T5 and T7 done; T6 partial (a recorded decision); T8 done, with one open owner decision.** Previews are
in `docs/screenshots/vis/run10/` (aerial photo switched off). NORDIC pixel safety net 5/5, so production
pixels are unchanged. The identity edge test fails on compact-infill since the D41 fix (`0887e00`): edge
mean 3.15 (limit 3) and p95 15.0 (limit 8). Reverting that one line makes it pass again (2.05 / 8.00). The
fix and the tile-edge dissolve pull against each other (see the questions below). lint 0 · unit 1310
passed / 0 failed · build OK.

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
| T8 | Previews and final checks | done (Claude) | `8674904`, `62e918b` (pending Lab work committed), this commit (previews + ledger) | NORDIC safety net 5 passed (headed, Metal); IDENTITY_EDGE: compact-infill **failed** 3.15 / 15.0 / maxAway 0.78, sloped-edge passed 1.30 / 4.72 / 0.64; lint 0; unit 1310/0; build OK | the edge regression from the D41 fix → owner question 1 |

## Decisions I made

- **The previews are captured with the aerial photo switched off.** The Kartverket photo must not be
  committed (D13). Photo-on captures exist only on the owner's machine.
- **The D41 fix is kept for now, not reverted.** It is what makes the sloped-edge houses visible, which the
  owner asked for. The cost is recorded rather than silently undone.
- **The pending changes were committed per author:**
  - `8674904` is the previous Claude session's light-grey mist and edge-test rewrite (owner, 2026-11-24);
  - `62e918b` is the full-colour photo default and the streets hidden under the photo.

## Questions for the owner

1. **Should buildings fade with the ground at the tile edge?** The look spec (D22) says yes: terrain,
   trees *and buildings* fade together.
   - **The conflict:** the D41 fix (`0887e00`, DeepSeek V4 Pro via Cline) takes the white massing off
     the haze, so the sloped-edge houses no longer vanish into the mist. Now the outer boxes stand crisp
     in the mist (see `sloped-edge-overview.png`), and the edge test fails on compact-infill.
   - **The real cause:** the crisp zone is sized from the study area (sloped-edge hazeStart 249 m),
     while the photo and tile reach ±395 m. Part of the tile is already in the mist, where photo roofs
     stay readable but white boxes on light mist do not.
   - **Option A (keeps D22, recommended):** revert to `haze={haze}` and widen the crisp zone to the
     tile, for example by sizing hazeStart from the tile edge minus the fade width instead of from the
     study area. Then everything on the photo is crisp and only the outer ring dissolves.
   - **Option B:** keep the boxes crisp everywhere, drop D22's "buildings fade too", and relax the edge
     test to skip massing.
2. **Should the aerial photo stay full colour by default?** It is now 1 instead of the look spec's ≈ 20 %
   colour. The owner asked for a sharper, more visible photo on 2026-11-24.

## Session notes

- 2026-11-19 — Setup. Branch @ `3c33605`, clean (only untracked pixel-baseline snapshots). Recorded the
  production chunk baseline. Started T1.
- 2026-11-19 — **DeepSeek stopped by the owner after T5 (commits unpushed); Claude Opus 5.5 took over** (visuals-first plan, D23). Reviewed T1–T5, fixed the edge test (it captured the whole page incl. the Lab panel, projected the outline at height 0, and counted buildings), set background = haze colour, hazed the building crease lines, mounted the edge-test hook for identity only. NORDIC safety net 5/5; unit 1292 pass.
- 2026-11-19 — Visuals plan V2a (Claude): local aerial-photo preview in the Lab — git-ignored public/local-ortho/, greyed and draped on the terrain, alignment sliders remembered per browser, credit line; build check fails if a photo reaches dist/, and .vercelignore excludes the folder. Placement verified with a footprint test image (removed afterwards).
- 2026-11-24 — **D41 (DeepSeek V4 Pro via Cline): the sloped-edge houses that showed in the aerial photo had no white
  volume.** The cause: the territory haze painted 32 context buildings the background colour. The fix
  (`0887e00`) takes the massing off the haze and adds a regression test. Claude reviewed it: correct for the
  symptom; the commit lacks the Run 10 attribution trailer; it causes the edge regression in owner question 1.
- 2026-11-24 — Aerial photo (Claude, local only): the 1247 px screenshots were replaced by
  0.165 m/px single-viewer captures, warped to ENU true north (3.67° meridian convergence, affine error
  ≤ 0.2 px) at 3480 × 4096 (compact-infill) and 3381 × 4096 (sloped-edge). They are git-ignored and not
  published.
- 2026-11-24 — T8 (Claude): committed the pending Lab work in two author-scoped commits; captured the five
  run 9 views headed on Metal with the photo off; ran the checks (see the T8 row); filled in this ledger.
- 2026-11-24 — **After Run 10: ADR-0041 (Claude, at the owner's request).** It answers owner question 1
  (option A, by a different route).
  - **Free Sentinel-2 ground:** Kartverket's cloudless mosaic, open data, CC BY 4.0, 10 m. The Ground
    card offers the local photo, Sentinel-2 or the map colours.
  - **Screen-space mist vignette:** the edges blur and mix into the mist. It replaces the darkening
    vignette.
  - **World haze only at the tile edge:** the aerial band now starts at the tile corner.
  - **Massing back on the haze:** the D41 line is reverted, so buildings fade with their ground. D22 holds.
  - **Checks:**
    - IDENTITY_EDGE passes again: compact-infill 2.12 / 8.00 / 0.50, sloped-edge 0.83 / 2.00 / 1.07;
    - NORDIC safety net 5/5; lint 0; unit 1313/0; build OK;
    - previews in `docs/screenshots/vis/adr-0041/`.
