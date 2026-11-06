# C20 — Wind analysis circle (Codex work order)

Goal (wow factor): like Autodesk Forma's wind tool, the user places a **circular analysis zone** on the site and the flow is computed only there, at much finer resolution. Sharper wakes and vortices, faster settling, and a clear "this is the area I'm studying" moment.

Read first: `AGENTS.md` §1, `docs/plans/wind-simulator-prd.md`, `src/features/analysis/{lbm,flowRunner,useWindFlow,climateView}.ts`, `src/scene/{WindParticles,ClimateLayer,ViewportCanvas}.tsx`, `src/components/studio/{ClimatePanel,StudioShell}.tsx`.

## HARD RULE
Edit only the files listed above, plus new `src/scene/AnalysisCircle.tsx` and tests. Do not edit `comfort.ts`, `noise.ts` or site packages. No new dependencies. Local ENU metres only. Do not commit.

## Items
1. **Circle state.** `WindSettings` gains `circle: { centre: Vec2; radius: number } | null`. Default: the study-area centroid, radius 120 m. Panel: radius slider 60–250 m (step 10) and a "Place circle" button. While placing, the next ground click sets the centre (reuse the terrain `onGroundClick` path; analysis mode is not editable, so add a separate placing flag). `Esc` cancels placing.
2. **Solver domain.** Build the flow frame from the circle (a 48-gon) instead of the study area: `flowFrame(circlePolygon, from, 160, 160, 1.4)`. A 120 m circle then gives dx ≈ 2 m instead of ≈ 3–4 m. Buildings outside the frame are skipped by `rasterize` already.
3. **Clip outputs to the circle.** Heatmap cells only inside the circle (use `sampleGrid(circlePolygon, 3)`, 3 m cells). Fade alpha over the outer 10 % of the radius. Particles spawn and live only inside the circle, and respawn when they leave it.
4. **Circle visual.** `AnalysisCircle.tsx`: a thin ring on the terrain (follow `heightAt`, about 96 segments), a centre handle and a radius label. It must not raycast while you orbit.
5. **Legend shares** are computed over the circle cells. Add a caption: "Analysis circle r = 120 m".
6. Tests: the circle polygon area is ≈ πr² (±1 %), a cell outside the circle is excluded from the view, a radius change produces a new frame (reset), and Esc cancels placing.

## Done when
`npm run lint`, `npm run test`, `npm run build` pass. On Compact Infill a 120 m circle settles in ≤ 3 s with visibly sharper wakes than the full-site run. Summary: files changed, tests, commands and results.
