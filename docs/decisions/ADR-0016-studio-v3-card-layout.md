# ADR-0016 — Studio v3: card layout, analysis dock, floor grid

- **Status:** Accepted · 2026-11-10 · §4 (analysis dock) superseded by ADR-0026 (2026-11-13)
- **Supersedes:** design contract §0 (draft 4, ADR-0010) for the studio screen only. Landing, About and /new are unchanged.
- **References:** owner brief with two reference images (3D assembly-steps app for layout; grey metric cards for the card style).

## Decision

1. **Layout.** Warm grey canvas (`--canvas #EEEEEE`). The viewport, a 300 px **Parameters** panel and a full-width **analysis dock** are separate cards (`rounded-panel` 16 px, 1 px `--card-line`, `--shadow-card`), 12 px apart. Top bar: Back · site · scenario menu + save status left; a floating pill toolbar centre; Test a building / Compare / Guide / Fit site / About right.
2. **Shadows and blur are allowed** for cards and floating controls (`--shadow-card`, `--shadow-float`, `--frost` + `backdrop-blur`). This reverses the draft 4 "no shadows, no blur" rule for the studio.
3. **Pill toolbar.** Select, Draw building, Delete selected mass, Undo, Redo, and one accent primary action, **Export** (the existing project JSON export). Shown only while Test a building is on. No "add box" or "push/pull" tool: neither exists in the editor, and an inert control would break guardrail 2.
4. **Analysis dock.** *(Superseded by ADR-0026: the dock is gone and its cards live in the Parameters panel, one per analysis.)* Cards DRAW · SUN · WIND · NOISE · AREA (DRAW and AREA only while Test a building is on). Exactly one is active (`aria-pressed`); the active card drives the one climate layer (Wind → wind, Noise → noise, others → off). S / M / L size toggle: S = label + figure, M = figure + secondary line + disclaimer (default), L = M + the active card's full controls. Clicking a card at M opens L. Card values are pure functions in `dockValues.ts` over the existing analysis output; anything not computable shows "—" and a hint.
5. **Parameters panel.** Collapsible groups: Selected mass (mass list + MassFields), Design check (or Study area facts in analysis-only), Site, View (camera presets, ground grid, render quality), Notes. Layer switches moved to a **Layers** card at the viewport's top left (show/hide toggle).
6. **Floor grid.** drei `Grid` (already installed; no new dependency) at the base of the terrain skirt (lowest terrain sample − 2 m), cells 1 m / sections 10 m on whole ENU metres, fading from the site origin; a fogged ground plane 0.6 m lower. Neither shares a depth with the terrain, so no z-fighting. Toggle in View.
7. **Selection** is a thin bright accent outline (`Edges`, 2.25 px) over the normal mass fill, replacing the solid blue fill.
8. **Compass** on a frosted disc, bottom centre. The scale/legend pill moved to the top right.

## Not done (and why)

- **"Hours of shadow on the plot"** on the SUN card: no such analysis exists; computing it is new analysis maths (out of scope). The card shows altitude, azimuth and local time.
- **Façade dB** on the NOISE card: the noise model samples ground cells, not façades. The card shows the peak ground level in the study area and the loudest mapped road class.
- **"Prevailing direction"** on the WIND card: there is no wind climate data; the direction is the user's setting and the card says "W 270° at 6 m/s", not "prevailing".
- **Notes as multiple cards** with delete and "Add note +": scenario notes are one persisted string. Splitting them needs a schema migration; the existing single note is styled as a card.
- **Contact shadow** (drei `ContactShadows`): a planar shadow at one height floats or clips on sloped terrain. The directional shadow map and N8AO already darken wall bases.

## Consequences

- e2e specs that use the old names (`complementary 'Inspector'`, `summary 'Layers and render quality'`, `Sun` summary, toolbar `Layers`) need updating before the next e2e gate. Unit tests are updated.
- Contrast: card labels use `--ink-secondary` (5.6:1 on `--card`, 5.2:1 on `--canvas`); the light unit grey `--ink-unit` (3.2:1 on `--card`) is used only after figures ≥ 24 px (AA large text).

## Revision 2 — 2026-11-10 (owner review: "cramped, should feel minimal")

- **Dock = summary + most-used control only.** Compact 172 px cards (label, figure, one line) and, beside them, the active analysis's quick controls: Sun → time-of-day band and Play; Wind → direction and 10 m speed sliders; Noise → share bar; Draw → hint and Draw another; Area → its claim. The L "full controls" area is gone. S = figures only, M = + line + quick controls (default), L = + each card's note. One dock-wide claim: "Indicative screening — not planning advice"; the active card's own claim sits under its quick controls.
- **Parameters panel (340 px) hosts everything else.** Its first group is the active analysis (Sun details and sun path; Wind map mode, legend, all directions, circle, streamlines, baseline, downwash rule; Noise legend; Area figures and method notes), followed by Selected mass, Design check, Site, View, Notes.
- **Quieter controls.** Shared `segmentClass` (grey track, raised white chip), `pillButtonClass` (hairline pill, accent when pressed — no black fills), 2 px hairline range track with a small white thumb.
- **Grid.** Two layers: 10 m lines (`#D8D8D3`) fading around the site origin; 1 m lines drawn only within ~140 m of the camera, so they appear when zoomed in and never alias into dots at overview distance.
