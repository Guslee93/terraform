# X5 — Wind evidence screenshots (MiniMax work order)

Repo: `/Users/gustavekamanzi/Downloads/2026/Terraform`. Copy the pattern of `e2e/m3-evidence.spec.ts`: opt-in via `SHOT_EVIDENCE=1`, 1440×900 viewport, render quality High. Labels come from `src/components/studio/ClimatePanel.tsx`. Your own `e2e/wind.spec.ts` shows working selectors.

## HARD RULE
Create ONLY `e2e/wind-evidence.spec.ts`, and the 4 PNGs it writes to `docs/screenshots/`. Edit nothing else. Do not commit.

## Shots (do NOT use reducedMotion here: particles must move; use `reducedMotion: 'no-preference'`)
For each shot, wait until **Set baseline** is enabled (the flow has settled, max 30 s), then wait 1.5 s for the particles.
1. `wind-gap-jet.png` — `/studio/compact-infill`, Wind, **Direction** tab, isometric view.
2. `wind-streamlines.png` — same site, **Streamlines** checked, **Top view**.
3. `wind-comfort-6ms.png` — `/studio/sloped-edge`, Wind, **Comfort** tab (default), wind speed 6 m/s (default), isometric.
4. `wind-delta.png` — `/studio/sloped-edge`, Wind:
   - Click **Set baseline**, then **Test a building**, then **Draw building**.
   - Click 4 ground points inside the circle on its upwind (west) side, then press Enter.
   - Set the **Storeys** field to 12 and press Enter.
   - Wait until settled, click **Delta**, and capture.
   - Then delete the mass (**Delete** button) so the stored project is clean.
   - Use a fresh `storageState` for this test so nothing leaks into other specs.
   - If the clicks miss the ground, pick points from the canvas bounding box. Report what you used.

Use `page.locator('main').screenshot(...)` or a full-page shot, the same as m3-evidence. Run it: `SHOT_EVIDENCE=1 npx playwright test e2e/wind-evidence.spec.ts`. Open each PNG and check by eye that it shows what its name says. Report any that don't.

## Done when
4 PNGs exist and show the right thing; the spec skips when `SHOT_EVIDENCE` is unset. Report: commands and results, file sizes, and one line per image describing what it shows.
