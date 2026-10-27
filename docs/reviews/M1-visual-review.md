# M1 visual review

- **Date:** 2026-10-27
- **Reviewer:** Lead visual pass (no formal M1 finish gate; M0/M5 own the hard gates)
- **Evidence:** `docs/screenshots/m1-{compact-infill,sloped-edge}-{1440x900,1280x800,1920x1080,390x844}.png` and top views
- **Decision:** **Pass with follow-ups**

## What works

- **Compact Infill isometric** reads as a dense urban study area: terrain, merged context, dashed study boundary, strong shadow direction and a clear open infill centre.
- **Sloped Edge isometric** makes the 31 m relief legible through the mesh grid, terrain shading and solid edge skirt. Context sits along the higher edge, leaving a believable sloping study area.
- **Top views** show the full boundary and context without cropping at 1280/1440/1920.
- **Camera presets** (Iso/Top/N/S/Eye) are visible, keyboard-labelled and deterministic; the top preset was exercised in Playwright.
- **Compass, scale bar and study-boundary legend** are visible without competing with the model. The scale bar is derived from camera–target distance.
- **Layer toggles** for Terrain, Context buildings and Study boundary are clear and functional.
- **Provenance** is visible in the Inspector and footer; the About page links OSM ODbL and Kartverket CC BY 4.0.
- **Mobile** shows a coherent read-only preview with the compass moved below the status pills.

## Follow-ups

1. Some adjacent OSM footprints still produce subtle vertical z-fighting/shadow stripes on façades. A future pass can merge/union overlapping footprints or use a stronger facade offset.
2. Mobile framing crops the site more aggressively than desktop; add an aspect-aware camera multiplier after M2 editing is stable.
3. The compass becomes ambiguous at eye-level when looking along north; hide it below a near-horizon threshold.
4. The terrain is intentionally coarse at 13 × 13; revisit resolution when massing clearance checks need finer grade.
5. Capture hover/focus and layer-off states in the M5 evidence set.
