# ADR-0008 — Height reference for the demo envelope

- **Status:** Accepted (owner, 2026-10-29)
- **Date:** 2026-10-29
- **Deciders:** Project owner, `engineering-software-architect`, `engineering-senior-developer`
- **PRD references:** FR-070–FR-075, §7.3 claim policy
- **Related:** ADR-0002 (local ENU, `up` relative to the site origin elevation), ADR-0004 §4 (clearance is a warning, not validation)

## Context

FR-073 requires the configured maximum height to be checked against an *explicitly defined* reference elevation and the UI to state whether grade or datum is used. Site packages declare `constraints.maxHeightMeters` and `setbackMeters` with the label `Illustrative design constraint`; they do not declare a reference. Masses carry an explicit `baseElevation` and may float above or cut into terrain (ADR-0002 §7), so "height" is ambiguous on the sloped-edge site, where terrain spans 31 m.

## Decision

1. **Two references, named in the output.** `EnvelopeConstraints.heightReference` is `'grade'` or `'datum'`; `EnvelopeResult.heightReference` echoes it and every per-mass result carries `referenceElevationM` so the inspector can say *"16.0 m above grade (−1.0 m)"*.
2. **`datum`** = the site origin elevation (ENU `up = 0`, i.e. the package's `originElevation`). Height = highest tier top.
3. **`grade`** = the **lowest terrain sample under the tiers that meet the ground** (the tiers at the mass's lowest `baseElevation`), using the same sample set as the clearance check (`footprintSamplePoints`: corners, edge points, interior grid). Height = highest tier top − that elevation. This measures the tallest exposed face, so it is the conservative reading on a slope.
4. **Default is `grade`.** `constraintsFromManifest(manifest, reference = 'grade')` builds the constraints block; the UI may offer the switch (FR-076 override panel is P1).
5. **Tolerances.** Excess below 1 mm is not a violation; footprint parts outside the setback or boundary below 0.01 m² are slivers, not violations.
6. **Setback polygon** = planar inward offset of the study boundary by `setbackMeters` (`insetPolygon`: boundary minus every point within the distance; round joins at reflex corners approximated by a 48-gon). It may be several polygons or empty.
7. **Claims.** Statuses are `Within demo envelope`, `Exceeds demo envelope`, `Not evaluated`. Every result carries `Illustrative constraint — not planning advice`. The study boundary is not a cadastral parcel and no regulation is implied; `grade` here is not the statutory "planert terreng" definition.

## Consequences

- A mass whose base is cut into a slope reads taller from grade than from datum by the cut depth; one whose base floats reads taller by the gap. Both are what a viewer of the model sees.
- `grade` depends on the terrain sampler, so the same mass can change status when the terrain layer changes; `datum` does not.
- The sample grid is deterministic for a given footprint, so results are reproducible (QA-10 spirit).

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| Mean terrain under the footprint | Closer to common regulatory practice, but hides the tallest face and depends on sampling density; would also invite the "planert terreng" reading we must not claim. |
| Terrain at the footprint centroid | One sample; wrong for any footprint longer than the terrain cell. |
| Mass `baseElevation` as reference | Lets a floating mass pass a height check; FR-073 wants an *external* reference. |
| Reference per tier | Over-specified for concept massing; upper tiers sit on tiers below. |

## Revisit triggers

A site with a declared formal height datum; FR-076 override panel; statutory definitions becoming in scope (they are not for v1).
