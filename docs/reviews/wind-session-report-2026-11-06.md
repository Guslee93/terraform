# Wind — autonomous session report (2026-11-06)

**Plan:** `docs/plans/wind-finish-plan.md` (all phases A–F done). **Who:** Claude, alone. Codex was out of credits (resets 21:02) and MiniMax needs the owner to start it.

## What was done

| Phase | Result |
|---|---|
| A — e2e flakes | `m3-rendering` and the massing Esc-drag test exceeded the 30 s test limit under parallel load (software-GL canvas work). Marked `test.slow()`. Full suite **57/57** on a clean run. |
| B — C23 test gaps | Fake-Worker freshness test (a result for older inputs can't become a baseline). Particle clipping extracted to a pure `particleSegment` with edge tests. |
| C1 — tall roofs | One extra top slice just above the tallest building when it exceeds 35 m (capped at 120 m). Curated sites keep the standard four heights. |
| D1 — a11y | New `e2e/wind-a11y.spec.ts`: every Wind panel control is named and has a ≥ 24 px target. |
| D2 — reduced motion | **Real bug found and fixed:** pressing Play demo with reduced motion on crashed the whole studio. The first animation-frame time can be slightly before `performance.now()`, so `t < 0` → `directions[-1]` → NaN → render error. `demoFrame` now clamps time, with unit + e2e regression tests. |
| E — performance | Opt-in probe (`WIND_PERF=1`, headless software GL, a pessimistic floor): wind off 13.8 fps, particles 14.0 fps (no extra cost), 3D streamlines 6.6 → **9.0 fps** after drawing 4 m segments. The analysis circle is now memoised so roofs and the heatmap don't rebuild on unrelated renders. |
| C2 — large site | 2 000 buildings: full slice stack **4.7 s**; main-thread view build **2.6 ms** per update. |
| C3 — direction sweep | Both curated sites × 8 directions: all values finite. Compact Infill ≤ 5.2 % of the circle above 1.3× in every direction. **Sloped Edge 12–28 % in six directions** — see the known limit below. |
| D3 — phone | 390 × 844: no horizontal scroll; the Wind panel stacks and all controls are usable. |
| D4 — keyboard | Covered by the name/target check, the keyboard circle placement (arrows + Enter, verified earlier) and the existing studio focus test. |
| F — docs | README wind section, validation-note sweep table, case-study limit paragraph, progress/agent log, AGENTS status. |

## Known limit found, recorded (not fixed)

On Sloped Edge the scattered low houses act as one porous block in a 2D slice. At ground level the wind cannot go over them, so it speeds up round the cluster (1.3–1.7×) when it comes from N, NE, E, SE, S or NW. Neither a wider domain nor time-averaging changed this, so it is the 2D model itself. The two remedies are owner decisions:

1. a **canopy-drag term**: low buildings as porous drag at pedestrian level instead of solid walls (medium; needs an ADR and validation cases), or
2. the **true 3D run (W6)** (large).

## Evidence

- Gate at the end of the session: lint ✅ · 986 unit tests ✅ · build ✅ · full e2e **55 passed / 12 skipped / 1 failed**. The failure was `m4-recovery` QA-14 (storage-full message). That spec (scenario export/import, not wind) is flaky only under parallel load: run serially, all 6 of its tests pass (`npx playwright test e2e/m4-recovery.spec.ts --workers=1`). An earlier clean full run today was 57/57. Suggested follow-up: mark `m4-recovery` serial or give it its own worker.
- Screenshots: `docs/screenshots/wind-*.png` (recaptured after the units fix).
- Reviews: `docs/reviews/wind-code-review.md` (C23 + resolution), `docs/reviews/wind-3d-visual-review.md`, this file.

## Needs the owner

1. **Push / deploy.** The repo has **no git remote configured**. Create a GitHub repo, add the remote and push, then deploy (`vercel.json` exists). Nothing was pushed or deployed.
2. **Sloped Edge low-rise limit:** choose canopy drag, W6, or leave it documented.
3. **Annual Lawson comfort:** needs a free MET Norway Frost client ID.
4. **Codex** (credits back at 21:02) and **MiniMax**: no work is pending for them. Good next candidates if you want them: canopy drag (Codex, after an ADR) and an a11y/visual pass on imported sites (MiniMax).
5. Uncommitted, untouched on purpose: 103 deleted screenshots under `docs/screenshots` and `docs/design/ux-assessment`, and the `References images UX UI/` folder (your earlier call: leave them out).
