# M3 — Live analysis

- **Status:** Pending
- **PRD gate:** Calculations match known fixtures; sunlight orientation verified against independent reference values; disclaimers visible (§13)
- **Lead agent:** `engineering-senior-developer`
- **Specialists:** `research-synthesist` (independent sun reference), `gis-qa-engineer` (geometry QA), `gis-3d-scene-developer` (shadows)
- **Gate:** `engineering-code-reviewer` + `gis-qa-engineer`

## Goal

Make every visible number and status derive from the edited geometry, and make solar behaviour truthful for Oslo coordinates, dates and times.

## Deliverables

1. **Metrics** — concept GFA, ground footprint, coverage, max height, total volume, building count, storey aggregation per building and scenario.
2. **Method disclosure** — tooltips/labels state units, assumptions and the difference between GFA, footprint and site coverage.
3. **Solar** — SunCalc (or validated equivalent) with site latitude/longitude, `Europe/Oslo`, correct DST; azimuth/altitude converted into local ENU and Three.js lighting.
4. **Shadows** — user masses and context cast; terrain receives; quality profiles; below-horizon state disables direct sun and shows `Sun below horizon`.
5. **Time controls** — 00:00–23:59 scrubber, morning/noon/evening presets, date presets for equinoxes/solstices, play/pause with speed, displayed elevation and direction.
6. **Demo constraints** — parcel boundary, setback polygon, max-height reference plane; statuses `Within demo envelope`, `Exceeds demo envelope`, `Not evaluated`; clickable warnings identify the offending mass.
7. **Disclaimers** — `Illustrative constraint — not planning advice` in tooltips, inspector and exports.
8. **Optional heatmap** — qualitative sampled ground insolation only if P1 remains in scope; resolution and method visible.

## Required tests

- Area/volume/coverage fixtures from `docs/qa/fixtures.md`.
- Repeated calculation at the same lat/lon/timestamp is deterministic after reload (QA-10).
- Winter/no-sun state does not imply verified sun hours (QA-11).
- DST transition timestamps resolve correctly in `Europe/Oslo`.
- Sun azimuth/altitude compared against an independent reference at recorded Oslo timestamps; tolerance documented.
- Footprint crossing boundary flags the correct mass and area (QA-06).
- Night state, below-horizon state and no-WebGL fallback.

## Agent sequence

1. `research-synthesist` records independent reference values and sources before implementation.
2. `senior-developer` implements metrics, solar conversion and constraints with fixtures.
3. `3d-scene-developer` implements lighting/shadows and visual warning highlights.
4. `gis-qa-engineer` validates geometry and orientation; `code-reviewer` closes the gate.

## Out of scope

Certified daylight factor, EN 17037 compliance, cumulative insolation to a regulatory standard, atmospheric/tree-canopy modelling, structural analysis.

## Evidence

- Fixture table with expected vs actual.
- Sun reference comparison table (time, azimuth, altitude, source).
- Screenshots: morning/noon/evening, winter/summer, below-horizon, envelope violation.
- QA-06, QA-10, QA-11 results.

## Risks

- Azimuth convention inversion — verify against north arrow and a known bearing.
- Double-counting tier floor slabs — aggregate by explicit floor levels.
- Misleading labels — never show "verified sunlight hours" without a specified sampling/occlusion method.
