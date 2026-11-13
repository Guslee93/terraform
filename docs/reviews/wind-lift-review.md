# Wind lift (ADR-0028) — code review and visual check

**Date:** 2026-11-13 · **Scope:** Phases 1–4 (#7, #8, #9, #10), diff `d57010c..feat/wind-lift-phase4-sap5ec` · **Fixes:** Phase 5 branch (`feat/wind-lift-phase5-sap5ec`)

## G1 — code review

Run with the repository's `code-review` skill (medium) over the whole ADR-0028 change, not phase by
phase, so interactions between phases were in view. The reviewer had not written the code. Ten findings;
each was checked against the code before acting.

| # | Finding | Verdict | Resolution |
|---|---|---|---|
| 1 | A lifted map goes blank while its slice re-solves (new direction, edit) and the caption still names the height; flat streamlines fall back to the 2 m field drawn at 1.5 m; if the top slice disappears, the map stays blank | **Confirmed** (`WindStreamlines` falls back to `flow` when the slice is missing) | Caption says "Computing the wind at N m above terrain…" while the field is missing; flat streamlines are not drawn without their slice; a height that no longer exists once the stack completes moves to the nearest one |
| 2 | Mid-edit the panel's stops fell back to the standard list with only 2 m ready; the thumb sat at 0 and any key reset the height to 2 m | **Confirmed** | Heights now come from the flow the map draws (`windFlow`), not only the fresh one |
| 3 | The lift handle wrote `heightM` directly, bypassing the demo's "an edit stops the demo" path | **Confirmed** | Goes through `windDemo.stopWith` while the demo plays, like every panel edit |
| 4 | Unmounting the handle mid-drag left `liftDrag` set: the disc stayed at the drag height and rings showed at 2 m | **Confirmed** | Unmount ends the drag (`onDrag(null)`) |
| 5 | The handle vanished during edits because it used fresh heights only | **Confirmed**, same cause as 2 | Fixed with 2 |
| 6 | Every height step rebuilt the merged context mesh and its edges | **Confirmed and measured:** 65–100 ms per rebuild on Compact Infill (520 buildings, 4-core container) | Built once; a per-vertex `faded` attribute is written in place and two materials discard the other half (`createContextGeometry` now records each building's vertex range) |
| 7 | Fading tested footprint corners only, so a long low building crossing the rim did not fade; drawn masses never fade | **Confirmed** for the geometry; masses are by design | `footprintTouchesCircle` (corner inside, edge within the radius, or centre inside), with tests. Masses stay solid: they are what the user is designing — recorded in the plan |
| 8 | Faded buildings still cast full shadows | **Kept, by design** | The buildings still stand and still shade the ground; they only stop blocking the wind at that height. Sun shadows are a separate analysis |
| 9 | Delta at a height the baseline has no slice for (a new top slice) showed an empty map with no reason | **Confirmed** | The panel says the baseline has no slice at that height and how to compare |
| 10 | A right or middle click on the handle started a drag | **Confirmed** | Primary button only |

Verification after the fixes: `npm run lint`, `npm run test` (see the PR), `npm run build`; the wind,
wind-a11y and layers e2e specs on the production build (11/11); new unit tests for findings 1 (caption),
6 (vertex ranges) and 7 (footprint and circle).

## G3 — visual check (engineer's pass)

Screenshots at fixed views, both curated sites: `docs/screenshots/wind-lift-*.png` (2, 10, 30 m;
Compact Infill also its 65 m top slice). Checked by eye:

- The handle sits on the circle edge nearest the camera and reads as a control (red, white ring, arrow glyph, 24 px).
- Dashed rings mark the other solved heights while lifted; none at rest on 2 m.
- Buildings below the disc fade; taller ones stay solid; at 2 m nothing fades.
- The legend, the map, the ramp bar and the roofs share one scale above 2 m (m/s); the caption names the height.
- On Sloped Edge the disc follows the hill.

Open: the formal `design-ui-finish-gate-reviewer` pass (AGENTS.md §5.4 G3) over these screenshots. This
check was done by the engineer who built the feature, so it does not replace that gate.
