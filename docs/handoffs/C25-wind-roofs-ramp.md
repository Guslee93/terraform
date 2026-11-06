# C25 — W5b: roof heatmap, smooth heatmap, m/s ramp, streamline controls (Codex work order)

Read first: `AGENTS.md` §1, `docs/plans/wind-3d-plan.md` §3A/§3D, the reference images described in its §1, `src/features/analysis/{flowRunner,windProfile,climateView}.ts`, `src/scene/{ClimateLayer,ViewportCanvas}.tsx`, `src/components/studio/{ClimatePanel,StudioShell}.tsx`.

## HARD RULE
Edit only: `climateView.ts`, `flowWorker.ts`, `ClimatePanel.tsx`, `StudioShell.tsx`, `ViewportCanvas.tsx` (and their tests), plus new `src/scene/WindHeatmap.tsx`, `src/scene/RoofWind.tsx` and `src/scene/WindRampBar.tsx`. Do NOT edit `WindStreamlines.tsx` or anything named `streamlines*` (Claude owns those in parallel), `lbm.ts`, `comfort.ts` or `flowRunner.ts`. No new dependencies. Do not commit.

## Contract with Claude's part
Render `<WindStreamlines flow={windFlow} circle={…} heightAt={…} heightM={…} opacity={…} />`:
- `heightM: number | null`. `null` means "3D: follows buildings"; a number means draw at that slice height.
- `opacity: number` in 0–1.

Claude adds those props to `WindStreamlines.tsx`. Until then, pass them anyway; a TypeScript error there is expected and fine to report.

## Items
1. **Slices on.** `StudioShell` calls `useWindFlow(..., slices = true)` whenever Wind is on. In `flowWorker.ts`, post only when the ground field changed or the slice stack just completed. No re-posting of an unchanged field while upper slices solve.
2. **Settings.** `WindSettings` gains `streamlineHeight: number | null` (default `null` = 3D) and `streamlineOpacity` (default 0.8). In the panel, under the Streamlines checkbox, add a labelled select: "3D (follows buildings)", then 2, 10, 20 and 35 m. Add a labelled opacity slider (0.2–1). Both are disabled with the caption "Upper heights computing…" until `flow.slices` exists.
3. **Direction view → m/s.** Direction shows a continuous speed, ratio × reference speed, on a Forma-like ramp: 0 white `#F5F7FB` → 2 `#BFD3F2` → 4 `#5B8DEF` → 6 `#2F49D1` → 8 `#7B2FD1` → 10+ `#C21FB3`. Interpolate between stops. The reference-speed slider shows in Direction as well as Comfort. Comfort (Lawson) and Delta are unchanged. The particle colours may keep the ratio bands.
4. **Smooth heatmap.** `WindHeatmap.tsx`: build one mesh from the wind view's regular lattice of cell centres. Triangulate neighbouring lattice points and use vertex colours, so colours blend instead of showing 4 m squares. Drape it on the terrain via `heightAt` and give it a hard edge at the circle (as Forma does). Noise keeps `ClimateLayer`.
5. **Roofs.** `RoofWind.tsx`: for each building whose footprint centroid is inside the circle, sample a 3 m lattice inside the footprint. Use the slice with the smallest `z` ≥ the roof height, or the top slice for taller buildings. Colour with the active view's colour function and draw at roof height + 0.3 m (roof height is the building height above terrain at the centroid). Draw only once slices exist.
6. **Ramp bar.** `WindRampBar.tsx`: a bottom-centre viewport overlay, shown only in Direction view. It's a gradient with ticks at 0, 2, 4, 6, 8 and 10 and the unit "m/s". It must not overlap the wind claim (bottom-right) or the scale legend (bottom-left).
7. **Tests:**
   - ramp interpolation at stops and midpoints
   - roof slice choice (8 m roof → 10 m slice; 50 m → 35 m)
   - controls are disabled before slices exist
   - default settings
   - the worker does not re-post an unchanged field (unit-test the decision function)

## Done when
`npm run lint`, `npm run test`, `npm run build` pass, apart from the expected `WindStreamlines` prop error if Claude's part hasn't landed yet. Report every file changed, the tests, the commands and results.
