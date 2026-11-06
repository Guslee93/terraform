# X4 — Wind e2e spec + portfolio case study (MiniMax work order)

Repo: `/Users/gustavekamanzi/Downloads/2026/Terraform`. Read: `AGENTS.md` §1, §2 and §7; `e2e/` (copy the style of an existing studio spec, including how it opens a curated site and the storageState it uses); `src/components/studio/ClimatePanel.tsx` (labels and button names); `docs/plans/wind-simulator-prd.md`; `docs/research/{forma-wind-notes,wind-validation-note}.md`; `progress.md` (the Wind sections).

## HARD RULE
Create ONLY `e2e/wind.spec.ts` and `docs/case-study/wind.md`. Edit nothing else; another agent is editing the studio UI. No new dependencies. Do not commit.

## 1. `e2e/wind.spec.ts` (Playwright, Chromium)
Open `/studio/compact-infill`. Use role/label queries only, never CSS classes. Steps:
- Click **Wind**. Expect the text `Indicative wind screening — 2D flow, not engineering` within 15 s, and a legend list to appear.
- **Comfort** is pressed by default; click **Direction**, then expect it pressed.
- Change the **Analysis circle** slider to 150. Expect `r = 150 m`.
- Click **Move circle**, press Escape, and expect the button back to `Move circle`.
- Check **Streamlines**, then expect it checked.
- Wait until **Set baseline** is enabled (max 30 s), click it, and expect a **Delta** button. Click Delta and expect a legend containing `No change`.
- Click **Clear baseline**, and expect no Delta button.
Run it: `npx playwright test e2e/wind.spec.ts`. If browsers are missing or the port is blocked, say so — do not fake a pass.

## 2. `docs/case-study/wind.md` (portfolio write-up, ≤ 120 lines)
Sections:
1. The problem: wind is checked late.
2. What Terraform does: a live 2D flow inside a movable analysis circle, Forma-inspired.
3. How it works: lattice-Boltzmann solver in a worker, rotating the site into the grid frame, about 1.8 m cells.
4. The bug that taught the most: density build-up at the outlet (see `progress.md`).
5. Honesty: the validation table and the slab limit (link the note). Downwash is a rule, not simulated.
6. What I'd do next.

Leave placeholders `![…](../screenshots/wind-*.png)` for: the gap jet, streamlines, comfort at 6 m/s, delta. Use only claims the repo supports. Claim policy: AGENTS.md §7 (never "accurate", "verified" or "CFD-grade").

## Done when
The spec passes, or you report exactly why it can't run. The doc is written. Report: commands and results, plus any UI label that didn't match the brief.
