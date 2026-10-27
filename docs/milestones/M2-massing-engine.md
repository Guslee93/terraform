# M2 — Massing engine

- **Status:** Pending
- **PRD gate:** QA-03–08 pass; model survives repetitive edits; derived geometry is correct for simple and stepped forms (§13)
- **Lead agent:** `engineering-software-architect` (domain model) + `engineering-senior-developer` (implementation)
- **Specialists:** `gis-3d-scene-developer` (gizmos/raycasting), `gis-bim-specialist` (one terminology check)
- **Gates:** `engineering-code-reviewer`; fixes via `engineering-minimal-change-engineer`

## Goal

Make conceptual massing genuinely editable: create, select, transform, draw, extrude, stack tiers, edit numerically, validate, and undo/redo with transactional precision.

## Deliverables

1. **Immutable domain model** — `MassVolume`, `Footprint`, `Scenario`, ids, units, assumptions, schema version. No Three.js types.
2. **Factories and validation** — rectangle prism, polygon extrusion, minimum area/edge, self-intersection, winding, storey limits (1–40).
3. **Tools** — add mass at point, draw footprint (click/Enter/Backspace/Esc), move on XY, rotate about pivot, scale footprint, roof-handle height, vertex edit.
4. **Tier volumes** — independently editable upper volume attached to a parent building; aggregation avoids double-counting shared floor levels.
5. **Numeric inspector** — width/depth, area, rotation, base elevation, total height, storey count, storey height, use, name, palette, lock/visibility.
6. **Interaction state machine** — navigation vs edit mode, pointer capture, ghost preview with dimensions, commit on release, `Esc` reverts whole drag.
7. **Undo/redo** — one command per committed edit, duplicate/delete/rotate included; selection restoration.
8. **Snapping** — grid P0; parcel edge/vertex/other footprint P1.
9. **Clearance feedback** — footprint crossing sloped terrain is flagged; no hidden auto-warp.

## Required tests

- Rectangle 18×12 at 3 storeys × 3.2 m → 9.6 m height, 216 m² footprint, 648 m² GFA, 2 073.6 m³.
- Stepped mass fixture from `docs/qa/fixtures.md` → correct GFA, volume, max height.
- Self-intersecting polygon rejected without mutation.
- Drag begin → preview → commit is one history entry; `Esc` produces zero entries.
- Undo/redo restores exact geometry and selection after duplicate/delete/rotate.
- Numeric input rejects negative/NaN and preserves the prior valid value (QA-16).
- Serialization round-trip after M4 schema lands.

## Agent sequence

1. `software-architect` writes the domain model and command contracts as an ADR addendum.
2. `senior-developer` implements domain + tests before any gizmo work.
3. `3d-scene-developer` implements scene adapters and pointer interactions.
4. `frontend-developer` implements inspector controls and validation states.
5. `code-reviewer` reviews; `minimal-change-engineer` fixes defects.

## Out of scope

NURBS/solid modelling, CSG courtyards (P1), IFC/Revit interoperability, terrain-conforming floors, collaborative editing.

## Evidence

- Unit tests with fixtures and a short interaction recording.
- Screenshots of flat, L-shaped and stepped masses.
- QA-03–08 checklist with pass/fail and known limitations.
- `docs/reviews/M2-code-review.md`.

## Risks

- Editor controls fighting camera controls — enforce the tool-state machine before adding tools.
- Area semantics: name GFA/ground footprint/coverage explicitly and test storey-level unions.
- Gizmo instability at zoom — fixed screen-space sizes and depth handling.
