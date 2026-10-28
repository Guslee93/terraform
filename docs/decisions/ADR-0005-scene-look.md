# ADR-0005 — Scene look: white model, ambient occlusion, OSM roads and trees

- **Status:** Accepted
- **Date:** 2026-10-28
- **Deciders:** Project owner, `gis-3d-scene-developer`, `design-ui-designer`
- **References:** `docs/design/scene-look-plan.md`, design contract §8, PRD guardrails 3, 5, 8, 9

## Context

The project owner wants the viewport to read like the reference site-analysis tools and white architectural models: one near-white material, strong sun-and-shadow contrast, contact darkening, thin linework, colour only on the proposal. Phase 1 (palette, light rig, edges, grid gating) landed in `9783035` without new dependencies. The rest needs one new runtime dependency pair and an additive change to the site packages.

## Decision

### 1. Palette and light

Design contract §8 is the source of truth. Context is a single matte `#F3F2EE` with 30° crease edges; ground near-white; the proposal mass is the only tinted object. `NeutralToneMapping` (ACES greys albedo whites to ~215/255). Low ambient + cool hemisphere fill + one sun. The default sun (SW, 35°) stands in until M3 drives it from `suncalc`; the light position always comes from `sunPosition()`.

### 2. Shadows

`shadows="percentage"` (PCF) with `shadow-radius` softening — three r186 removed `PCFSoftShadowMap`. The shadow camera is fitted to the study extent plus the longest shadow at the current sun elevation (`fitShadowCamera`, pure and tested), not a fixed ±520 m box. Context meshes cast **and** receive shadows.

### 3. Ambient occlusion — new dependencies

| Package | Version (pinned) | Licence | Unpacked | Why |
|---|---|---|---|---|
| `postprocessing` | 6.39.5 | Zlib | 2.8 MB (tree-shaken; only `EffectComposer`, `RenderPass`, `EffectPass`, `ToneMappingEffect` imported) | Composer for the AO pass; peer range `three >=0.168 <0.187` covers 0.186.1 |
| `n8ao` | 2.0.1 | ISC | 0.8 MB | Screen-space AO tuned for architectural scenes; `N8AOPostPass` |

`@react-three/postprocessing` is **not** used: it adds `maath` and a React layer for what a ~50-line component does. Both packages go in the lazy `three-vendor` chunk so the landing page never loads them. The gzip delta is recorded in `progress.md` when it lands.

AO is a quality setting, not a claim: it is on by default on desktop, off when the canvas is narrower than 640 px, and the scene renders identically (minus AO) if the composer fails to initialise. Fallback considered and rejected for now: baked vertex AO (no dependency, but no courtyard or ground contact).

### 4. Terrain contours

Computed at runtime from the existing DTM grid by marching squares (`createContourSegments`, pure and tested). No package change. Interval 1 m minor / 5 m major, only drawn when the terrain relief is at least 2 m, so flat sites stay clean.

### 5. Roads and trees from cached OSM

The cached raw sources (`data/raw/*.osm`, checksummed in `SHA256SUMS`) already contain `highway` ways and `natural=tree` nodes. `scripts/build_site_packages.py` emits two **additive** files per site, `roads.json` and `trees.json`, and the manifest gains optional `assetPaths.roads` / `assetPaths.trees`. Existing package files (`terrain.json`, `buildings.json`, `study-area.json`) must stay byte-identical — verified by `git diff --stat` after the offline rebuild. Packages without the optional files still validate (older packages keep working).

- Roads: centreline + a width by `highway` class (documented table, labelled as simplified); rendered as flat terrain-draped ribbons, one value step darker than ground.
- Trees: point positions only; one instanced low-poly canopy at a fixed illustrative size, muted green. No species, height or canopy data is implied.
- Attribution: OSM ODbL notice extended in each `attribution.md`.

### 6. Storey bands

Proposed masses draw a thin line at each storey height derived from the tier's `storeys` × `storeyHeight` — real model data, no fake façade detail (no windows, rooftop units, chimneys).

## Consequences

- Two new runtime dependencies (pinned, licences above); bundle impact measured and logged.
- Post-processing owns the frame: any future effect goes through the same composer.
- The site package format gains optional fields; the validator and spec (`docs/data/`) are updated with tests for both present and absent cases.
- M3 replaces the default sun with the solar model and keeps every other part of this ADR.
