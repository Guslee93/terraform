# ADR-0017 — Rendering spec (10 Nov 2026), Phase 1 base look

- **Status:** Accepted
- **Date:** 2026-11-10
- **References:** "Terraform Rendering Spec" (10 Nov 2026), ADR-0005, design contract §8

## Context

The rendering spec asks for a Phase 1 "base look": HDRI lighting, sun shadows tied to the sun-path tile, filmic tone mapping, SMAA, and materials per its style rules. Most of this already shipped under ADR-0005 and M3.

## Gap check

| Spec item | State | Decision |
|---|---|---|
| Sun shadows from real sun position | Done (M3: `sunPosition()` from the same `SunDirection` as the Sun tile; PCF, 4096/2048 fitted map) | Keep |
| Ambient occlusion (spec Phase 2) | Done (N8AO via `postprocessing`, ADR-0005) | Keep |
| Image-based lighting | **Missing** | **Added** (below) |
| Tone mapping AgX/ACES | Neutral | **Keep Neutral.** ADR-0005 §1: ACES/AgX grey the white-model albedo; the white-model look is the accepted design. |
| SMAA | MSAA (`antialias` + composer `multisampling: 4`) | **Keep MSAA.** It resolves geometry edges better than SMAA; SMAA is only worth it for a Low tier that drops MSAA (Phase 2 tiers). |
| Context "a few steps darker, desaturated" | Near-white `#FAF9F6`; massing is the only tinted object | **Keep.** Design contract §8 (white model, Hektar match) already makes the proposal read first by hue. Revisit only with the owner. |
| Dark UI / light scene | Already light scene | Keep |

## Decision: image-based fill

`EnvironmentLight` in `src/scene/ViewportCanvas.tsx` bakes three's built-in `RoomEnvironment` once into a PMREM and sets `scene.environment`. No HDRI file, no download, no new dependency (it ships in `three/examples`). The background stays the flat viewport colour.

The fill was rebalanced so walls still read by their angle to the sun (`lightRig`, tested): day ambient 0.28 → 0.08, hemisphere 1.75 → 1.35, environment 0.22. At 0.5 the room washed out the shade faces; 0.22 keeps contrast and adds soft directional variation.

Bundle: no change to the composer chunk (95.98 kB gzip); `RoomEnvironment` is a few kB in the studio chunk.

## Not done (later phases)

Spec quality tiers (Medium = half-res AO) and auto-downgrade, selective bloom on an emissive layer, edge-outline pass, pass export. A real HDRI asset would need a licence note and size budget here first.
