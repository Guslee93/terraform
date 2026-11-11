# Context fidelity visual gate — city context density (ADR-0023)

- **Date:** 2026-11-11
- **Reviewer:** the implementer (self-review). The `design-ui-finish-gate-reviewer` pass is still
  outstanding — this record is the evidence set, not the gate decision.
- **Scope:** the Hektar-accuracy context change — tree placement, vegetation taxonomy, the 200 m
  halo, and the density it brings.
- **Evidence:** `docs/screenshots/context-landing-1440x900.png`,
  `docs/screenshots/context-compact-infill-1440x900.png`,
  `docs/screenshots/context-compact-infill-1440x900-top.png`,
  `docs/screenshots/context-sloped-edge-1440x900.png`,
  `docs/screenshots/context-sloped-edge-1440x900-top.png`,
  `docs/screenshots/context-mass-1440x900.png`,
  `docs/screenshots/context-import-grunerlokka-1440x900.png`,
  `docs/screenshots/context-import-kampen-1440x900.png`
- **Related:** `docs/decisions/ADR-0023-city-context.md`, `docs/plans/context-fidelity-plan.md`

## Decision: **PASS for the density change; the design gate is still open**

The scene now reads as a place rather than a model on a table: individual buildings with their own
footprints and heights, street trees in rows, and a neighbourhood that continues past the study
area. The comparison the work order was written against (Hektar's city block) is now met on
placement and vegetation. No visual regression was found in the areas the change touched.

## Evidence

| Contract area | Observation | Result |
|---|---|---|
| Context reads as a place | Compact Infill shows a continuous city block in the 3D view; buildings continue to the horizon of the halo and the terrain edge is no longer a hard cut | Pass |
| Individual buildings | 520 buildings in Compact Infill and 230 in Sloped Edge, each with its own footprint and height, not one merged mass | Pass |
| Tree placement | Street trees follow the mapped rows (`natural=tree_row` at 8 m); the canopy follows the streets and the park edge rather than a lattice | Pass |
| Vegetation | Park, grass, wood, field, pitch, water and bare ground read as distinct tints in plan; the park and the water body in Compact Infill are legible | Pass |
| Study area still reads as the subject | The dashed study rectangle and the orange analysis tint stay distinct from the context around it | Pass |
| Scale and north | Scale bar (50 m / 100 m) and compass present and consistent between the 3D and plan views | Pass |
| Disclaimers | "Indicative road-noise screening — not a noise survey" and "Illustrative screening — not planning advice" are visible in the studio | Pass |
| Empty/derived data is not presented as measured | Trees, land-cover kinds and building heights are not labelled as survey data anywhere on screen; the site footer keeps "Curated Oslo demo" wording | Pass |
| Selected mass in context | `context-mass-1440x900.png`: a drawn block (3 storeys, 9.6 m) sits in the neighbourhood with its storeys and height in the inspector | Pass |
| Sloped site | Sloped Edge keeps its 31 m relief with buildings seated on the slope and the forest area read as wood, not grass | Pass |
| Import path | Grünerløkka and Kampen imported from live OpenFreeMap tiles and Kartverket terrain: individual buildings, pitched roofs, park trees, and the land-cover tints (park, grass, wood) | Pass |

## Keep

- The white-model language for context buildings: the neighbourhood is context, the drawn mass is
  the subject, and the selected mass is the only blue thing in the scene.
- The plan view as the place where the context pays off — the tree rows and the block structure are
  what Hektar's plan screenshots show.

## Follow-ups (not blocking this change)

1. The `design-ui-finish-gate-reviewer` pass over the same screenshots is still open.
2. Building **parts** are still missing — the curated builder reads building ways only, so a
   building drawn as a multipolygon relation, or with `building:part`, still arrives as one plain
   volume (Phase B).
3. Tree shadows are off in the Low tier and the sun note still does not mention canopy shading.
   ADR-0021's limitation wording is only accurate while trees do not shade (Phase A6).
