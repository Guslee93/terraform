# Run 9 — progress ledger

Continuation of Run 7/8 on `run7/identity-lab` (draft PR #29, base `run1/foundations`). Same hard
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
- **Branch:** `run7/identity-lab`, merged `origin/build/foundation` (look spec + reference images).
- **Production chunk baseline (gzip):** `/tmp/run9-baseline-chunks.txt`.

## Tasks

| # | Task | Status | Commit(s) | Checks (last lines) | Open items |
|---|---|---|---|---|---|
| T1 | Measure honestly first (30 fps cap, GPU, tier) | done | a33956a | typecheck 0 · lint 0 · baseline recorded (Metal, tier high) | 30 fps cap = background-tab throttling; fixed with bringToFront + throttle flags |
| T2 | Atmosphere: haze, aerial perspective, vignette | done | 8977d53 | typecheck 0 · lint 0 · unit 1280 / 4 skip / 1 todo · build OK · chunk 0 · VISUAL=1 5/5 | hazeAmount/hazeRange pure + mirrored GLSL; VignetteEffect identity-only |
| T3 | Exposure and palette (ground/water/buildings/contours) | todo | — | — | — |
| T4 | Real relief: draw terrain from the 1 m tile | todo | — | — | — |
| T5 | Trees: tree shapes with speckled crowns | todo | — | — | — |
| T6 | Lab panel fixes and new controls | todo | — | — | — |
| T7 | Previews for the owner | todo | — | — | — |
| T8 | Stretch: TF-VIS-021 fat lines (Lab only) | todo | — | — | — |
| T9 | Final checks | todo | — | — | — |

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

## Questions for the owner

_(Only real decisions, added as they arise.)_

## Session notes

- 2026-11-19 — T2 **done** (`8977d53`). Aerial-perspective haze (mix toward #262E2A) + identity
  vignette; NORDIC byte-identical, safety net 5/5.
- 2026-11-19 — T1 **done** (`a33956a`). 30 fps cap diagnosed (background throttling) and the perf
  harness fixed (GPU + tier + bringToFront + throttle flags). Baseline: NORDIC 59.4 fps, B 58.6 fps,
  C 65.4 fps (all Metal, tier high).
- 2026-11-19 — Setup. Merged `origin/build/foundation` (identity-look-spec.md + 6 reference images +
  orthophoto-source.md). Recorded the production chunk baseline. Started T1.
