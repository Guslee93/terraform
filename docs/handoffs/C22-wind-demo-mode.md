# C22 — "Play wind demo" (Codex work order)

Goal: a one-button sequence the owner can screen-record for the portfolio. ADR-0012 dropped export, so recording the screen is the export path. Reference: `docs/research/forma-wind-notes.md` §4.

Read first: `AGENTS.md` §1, `src/components/studio/{ClimatePanel,StudioShell}.tsx`, `src/scene/{ViewportCanvas,WindStreamlines,WindParticles}.tsx`, `src/features/analysis/climateView.ts`, and the camera presets / `cameraNonce` handling in `ViewportCanvas`.

## HARD RULE
Edit only: `ClimatePanel.tsx` (+ test), `StudioShell.tsx`, `ViewportCanvas.tsx`, and a new `src/features/analysis/windDemo.ts` (+ test). Do NOT touch `e2e/**`, `docs/**`, `lbm.ts`, `comfort.ts`, `flowRunner.ts`, `streamlines.ts` or `*validation*`. Another agent owns `e2e/` and `docs/case-study/`. No new dependencies. Do not commit.

## Items
1. **Timeline (domain).** `windDemo.ts`, pure: `demoFrame(tSeconds)` returns `{ from: number; orbitDeg: number; streamlines: boolean; done: boolean }` for a 20 s script:
   - 0–3 s: particles only, wind from 270°.
   - 3–15 s: the direction sweeps 270° → 360°+90° in 15° steps, one step every 1.5 s, so each step settles visibly.
   - 15–20 s: streamlines on.
   - Orbit: 0 → 40° across the whole run, eased in and out.
   - `done` at 20 s.
2. **Button.** "Play demo" in the Wind panel (aria-pressed while playing). Playing drives `wind.from` and the streamlines toggle, and rotates the orbit camera azimuth about its target. Restore the user's settings when it ends.
3. **Stop rules.** Any pointer-down on the canvas, any key, or a second click stops it and restores settings. Under `prefers-reduced-motion`: no orbit and no sweep animation. Step through 4 directions, holding each for 3 s.
4. **Recording aid.** While playing, add `data-demo="playing"` on the studio root and hide the inspector scrollbar. Nothing else changes in the layout.
5. **Tests:** `demoFrame` at 0, 3, 4.5, 15 and 20 s (hand-computed); the button toggles and calls restore; reduced motion means orbitDeg is always 0.

## Done when
`npm run lint`, `npm run test`, `npm run build` pass. Summary: files changed, tests, commands and results, anything stopped.
