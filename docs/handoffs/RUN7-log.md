# Run 7 — progress ledger

The run book is the owner's "Run 7" prompt. One task per commit. Update this file at the start and
end of every task, and push it. Statuses: `todo`, `in progress`, `done`, `partial`, `blocked`.

All work attributed as **DeepSeek V4 Pro (Cline)** in commit trailers, `docs/agent-log.md`,
`progress.md` and this ledger.

## Run summary

_(Filled at the end of the run.)_

## Environment

- **Machine / OS:** Apple MacBook, macOS 15.7.3 (Build 24G419), arm64.
- **Node:** v22.23.1 · npm 10.9.8.
- **Browser:** Google Chrome (system) via Playwright Chromium.
- **GPU (headed):** `ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version)` — a
  hardware GPU, so the **pixel safety net is available** and baselines can be created locally.
- **GPU (headless):** SwiftShader (`ANGLE (Google, Vulkan … SwiftShader Device …)`).
- **Remote:** `origin` = `https://github.com/Guslee93/terraform.git`; `gh` authenticated as
  `Guslee93` (`repo`, `workflow`, `gist`, `read:org` scopes).
- **Base:** `origin/run1/foundations` @ `fe43015` (matches the local remote-tracking ref).

## Tasks

| # | Task | Status | Commit(s) | Checks (last lines) | Open items |
|---|---|---|---|---|---|
| T1 | Fix the Visual Lab's blank first view (TF-VIS-015 follow-up) | in progress | — | — | — |
| T2 | TF-VIS-020 stage A: the `IDENTITY` style (Lab only) | todo | — | — | — |
| T3 | TF-VIS-053: contours from the 1 m tile, selected by style | todo | — | — | — |
| T4 | TF-VIS-02A: atmospheric terrain dissolve (Lab only) | todo | — | — | — |
| T5 | TF-VIS-040 part B: `MapLegend` component (Lab only) | todo | — | — | — |
| T6 | TF-VIS-029: airy point-cloud vegetation (Lab only) | todo | — | — | — |
| T7 | Lab stage picker A/B/C + reproducible URLs | todo | — | — | — |
| T8 | Stretch: TF-VIS-046 stale-result / rapid-change tests | todo | — | — | — |
| T9 | Stretch: TF-VIS-021 fat-line system (Lab only) | todo | — | — | — |

## Decisions I made

_(Provisional values and implementation choices are listed here as they are made, with the reason.)_

## Questions for the owner

_(Only real decisions, added as they arise.)_

## Session notes

- 2026-11-19 — Setup. Worktree `../Terraform-run7` created on `run7/identity-lab` (base
  `origin/run1/foundations` @ `fe43015`). `npm ci` clean (487 packages). Environment verified:
  headed Chromium uses the Metal GPU, so the pixel safety net is available. Started T1.
