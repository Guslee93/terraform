# C28 — Simplify the studio (Codex work order)

Read first: `AGENTS.md` §1 and §7, `docs/decisions/ADR-0020-simplify-search-analyse-export.md`, `docs/plans/simplify-plan.md`, then `src/components/studio/**`, `src/scene/**`, `src/features/{scenarios,analysis,editor,massing}/**` as needed.

## HARD RULE
- Do NOT touch `src/app/LandingPage.tsx`, `src/app/NewSitePage.tsx`, `src/app/App.tsx`, `src/app/AboutPage.tsx`, `src/components/marketing/**`, or their tests. Claude is rebuilding the main page in parallel; ignore test failures in those files.
- Do NOT change wind, sun, noise or export behaviour. That means `src/features/analysis/**` domain code, the wind/sun/noise panels and `ExportVisuals`: only remove props or wiring that point at removed features.
- No new dependencies. Do not commit.

## Remove (UI and dead code, with their tests)
1. **Scenarios:** Concept A/B menu (`ScenarioMenu`), "Saved"/autosave status, `ProjectRecovery`, `ScenarioNotes`/Notes, `useScenarioProject` wiring, **Compare** (`ComparePanel` + top-bar link). Keep any `src/features/scenarios/**` module that something still imports (e.g. `NewSitePage` imports `StoreError`). Delete only what becomes unused.
2. **Studio guide** (`StudioGuide` and its storage key).
3. **Export project / import project** (JSON) and **Data notes**. Keep the data attribution line ("Buildings © OpenStreetMap contributors … Terrain © Kartverket").
4. **Design check:** `ConstraintsPanel`, envelope evaluation and warnings, the "Needs attention" mass status and `checks.ts`, if unused after the cut.
5. **Layers:** study boundary, setback, height limit (`ConstraintLayer`, `StudyBoundary` and their layer toggles). Terrain, context buildings, streets and trees stay.
6. **Study-area facts** (`SiteFactsPanel`) and the **Area/GFA** dock tile and metrics.
7. **Massing detail:** tiers (Add tier), use, storey height, base elevation, name field, duplicate and rotate.
8. **Render controls:** the render-quality select and the View S/M/L size switch. Keep the automatic tiers (ADR-0018) running at their defaults.

## Keep and simplify
- **"Add a block"** replaces the "Test a building" switch (same top-bar position and behaviour: when on, the Draw/Select/Delete/Undo/Redo tools show). The selected-block card shows **Storeys** (number input) with the derived height, plus **Delete**. One drag = one undo entry; Esc cancels. Blocks still feed wind/sun/noise (`analysisBuildings`). Blocks are session-only: no persistence.
- **Top bar:** Back · site name · Add a block · Export · Fit site · About.
- **Dock tiles:** Sun · Wind · Noise (plus a "Blocks: n" tile only while Add a block is on).
- **Inspector:** Sun, Wind and noise, Layers (terrain / buildings / streets / trees), Export (image passes, clip), Site (attribution).

## Tests
- Delete tests for removed features.
- Update the remaining unit tests and these e2e specs: `wind.spec.ts`, `wind-a11y.spec.ts`, `layers.spec.ts`, `massing.spec.ts` (reduced to the minimal block: draw, storeys, delete, undo, Esc), `m3-*` where still relevant.
- Delete `m4-*` specs and the guide/compare/constraint specs.
- Add one e2e: open `/studio/compact-infill` → Wind on → Add a block → draw → the wind field updates → Export shows its image and clip actions.

## Done when
`npm run lint`, `npm run test`, `npm run build` pass, apart from failures in the Claude-owned landing files. Report every file deleted or changed, the tests removed or added, the commands and results, and anything you were unsure about removing.
