# ADR-0010 — Studio editor layout (draft 4)

- **Status:** Proposed (owner to accept)
- **Date:** 2026-11-02
- **Deciders:** Project owner, `design-ux-architect`
- **Related:** ADR-0009, `docs/design/ui-redesign-spec.md` §7, `docs/design/ux-assessment.md`, image `docs/design/ux-assessment/06-proposed-dashboard-v4.png`

## Context

Round 2 implemented the spec's §7 dashboard: a 5-column grid with tabs swapping panel 02, five insight tiles and a drawer for editing. The UX assessment found it read as a report rather than an editor: the actionable result (checks) was below the fold at 1440×900, the largest element (coverage gauge) had no limit to aim for, two different heights were shown side by side, the drawer hid results while editing, and the colour coding disagreed between scene and charts. The owner chose the editor layout and approved draft 4.

## Decision

1. **Two columns, one screen at ≥ 1024 px:** canvas (flex) and one always-visible right panel (392 px). Below 1024 px they stack and the page scrolls; below 640 px the studio stays read-only.
2. **No tabs, no drawer, no insight tiles.** The panel is ordered by the user's questions: design check → scenario figures → buildings (list; the selected mass is a solid accent row with its fields below) → collapsible groups (Sun, Layers and render quality, Site and sources, Assumptions, About these numbers).
3. **Canvas chrome is text:** toolbar (Select, Draw building, Undo, Redo, Layers), views (3D, Plan, North, South, Street), a compact compass, one legend pill with the scale, and a sun band under the scene with the day barcode as the `Local time` slider and Play.
4. **One height everywhere:** the envelope reference (grade or datum) for the design check, Tallest, the building list and the scene labels.
5. **Colour roles, in small marks:** blue = selection (solid selected mass, its row, the "now" marker); amber = attention; green = pass; sun orange = sun only. Scene tints keep their hues at 60 % saturation (`src/scene/palette.ts`, `soften`).
6. **Flat surfaces:** ground `#E4E4E1`, panels `#F1F1EF`, 10 px card radius, 4 px chip radius, hairlines, no shadows or blur.

## Consequences

- Spec §7.1–§7.8 (grid, tabs, gauge, tiles 03–07, drawer) and contract §5 layout are superseded; the contract carries a draft-4 section.
- Removed components: `InsightTiles`, `Card`, `Metric`/`MetricRow`/`CheckRow`. `ConstraintsPanel`, `MetricsPanel`, `SunPanel`, `Inspector`, `ToolRail`, `CameraPresets`, `StudioTopBar` were rewritten in place.
- Accessible names changed (no tabs; "Draw building", "3D"/"Plan"/"Street", "Layers"); e2e specs were migrated accordingly.
- Spec round 3 (motion) needs re-scoping: its mount timings were written for the tile grid.
