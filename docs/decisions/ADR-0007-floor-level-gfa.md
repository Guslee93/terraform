# ADR-0007 — Floor-level concept GFA

- **Status:** Accepted (owner, 2026-10-29)
- **Date:** 2026-10-29
- **Deciders:** Project owner, `engineering-software-architect`, `engineering-senior-developer`
- **PRD references:** FR-050, FR-051, FR-053, FR-055, §6.1 line 403
- **Supersedes:** ADR-0004 §2 "gfa = Σ tier.gfa" for scenario and volume totals

## Context

ADR-0004 defines GFA as Σ(footprint area × storeys) per tier. That is correct for stacked tiers whose footprints do not overlap at the same elevation, and it is what M2 shows. PRD FR-051 forbids the general case: for stepped or overlapping forms, GFA must be the sum of *occupied slices* per storey level, with no double-counted slab area. PRD line 403 requires explicit floor levels or level-indexed occupied polygons before FR-051 ships, and forbids inferring floors from mesh overlap. `docs/qa/fixtures.md` §2 requires that the stepped fixture's shared slab at 9.6 m is not counted twice.

## Decision

### 1. Floor plates and levels

- Every tier contributes **one floor plate per storey**, at elevation `baseElevation + k × storeyHeight` for `k = 0 … storeys − 1`, with the tier's footprint as its outline. The plate is the floor of that storey; the roof is not a plate.
- Plates are sorted by elevation. Consecutive plates whose elevation differs from the **first plate of the group** by less than `LEVEL_TOLERANCE_M = 0.1 m` form one **level**. The level's elevation is that first plate's.
- A level's area is the **planar union** of its plates (ENU metres, polyclip via turf; never geodesic).
- **Concept GFA = Σ level areas.**

### 2. Scopes

| Scope | Plates grouped from | Field |
|---|---|---|
| Volume (one building) | the volume's tiers | `VolumeMetrics.gfaM2`, `storeys[]` |
| Scenario | every tier of every volume | `ScenarioMetrics.gfaM2` |
| Scenario, additive | Σ volume GFA | `ScenarioMetrics.gfaByBuildingM2` |

`gfaM2` and `gfaByBuildingM2` differ only when two buildings interpenetrate at the same level. The UI shows `gfaM2`; the difference, when non-zero, is a modelling hint, not an error.

### 3. Consequences of the rule

- Stepped fixture: plates at 0, 3.2, 6.4 (200 m²) and 9.6, 12.8 (80 m²) → 760 m². The 9.6 m slab is the upper tier's floor only; the lower tier's roof is not a plate.
- Two tiers overlapping at the same base: one level, union area (150 m² for two half-overlapping 10 × 10 m tiers), not 200 m².
- **Mixed storey heights** (3.0 m and 3.2 m tiers side by side): plates at 3.0 and 3.2 are separate levels and each counts fully. For non-overlapping tiers this is exact. For *overlapping* tiers with staggered floors it over-counts relative to a true slice model; that is a modelling error the author can see (the storey list shows both elevations) and is out of scope for v1.
- Storey count per building = number of levels. For the stepped fixture that is 5.
- `buildingCount` = number of volumes in the document (hidden volumes included; the UI passes the document it displays).
- Volume (m³) stays Σ tier volume (ADR-0004), since tiers are solids; overlapping tiers over-count volume the same way they over-count area, and the same hint applies.
- Ground footprint stays the planar union of all tier footprints.

### 4. Naming and claims

The number is **Concept GFA** and `Concept GFA ratio` = GFA / parcel area (FR-055). It is not BRA, BYA, %-BRA or any statutory utilisation figure, and the UI must say so where the number appears.

## Module

`src/features/massing/metrics.ts`: `floorLevels`, `volumeMetrics`, `scenarioLevelGfa`, `parcelCoverage`, `scenarioMetrics`. Planar booleans live in `src/lib/clip.ts`. `aggregate.ts` keeps the per-tier helpers and the simple sums, which the M2 inspector still uses for single tiers.

## Tests

`src/features/massing/metrics.test.ts` covers fixtures §2 (rectangle, L-shape, stepped), same-level overlap, the tolerance boundary, mixed storey heights, interpenetrating buildings and empty scenarios.

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| Keep Σ(footprint × storeys) | Double-counts overlapping tiers; violates FR-051. |
| Slice the solids at every distinct plate elevation and union the cross-sections | Correct for staggered overlaps, but counts a tier's interior at *another* tier's level, inventing floors the author did not draw; contradicts line 403 ("do not infer floor count from vertical overlaps"). |
| Explicit `floorLevels[]` on each tier | Richer model, but a schema change (v2 migration) for a case v1 does not need; revisit if staggered overlapping tiers become a real workflow. |
| Tolerance 0 | Floating-point drift from drags (ADR-0003 previews re-apply from the base, but imported data may carry 1e-9 noise). |

## Revisit triggers

Authors stacking staggered, overlapping tiers on purpose; a need for statutory floor-area definitions; schema v2.
