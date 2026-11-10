# ADR-0019 — Rendering spec Phase 3: image passes and clip export

- **Status:** Accepted
- **Date:** 2026-11-10
- **Supersedes in part:** ADR-0012 (PNG export dropped from v1)
- **References:** "Terraform Rendering Spec" (10 Nov 2026) Phase 3 and "Marketing renders", ADR-0017, ADR-0018

## Context

ADR-0012 (2 Nov) dropped PNG export. The owner's rendering spec (10 Nov) asks for a one-click export of a 4K still, a 5–10 s loop, a depth pass and a plain-white massing pass, so marketing images can be enhanced offline by AI tools while the app itself stays honest. The newer owner document wins; this ADR reverses ADR-0012 for these passes only. ADR-0012's caption strip and design-sheet PNG remain out of scope.

## Gap check

| Spec item | Decision |
|---|---|
| Edge outlines (depth/normal pass) | **Not built.** Context buildings already draw 30° crease edges and masses draw outlines and storey bands (ADR-0005). A screen-space edge pass would double every line. |
| Streamlines | **Already built** (wind Streamlines toggle, ADR-0014). |
| 4K still, depth, white passes | **Built.** |
| Loop | **Built** as a 6 s clip of the live viewport. |
| Wind layer for compositing back | **Built** as a fourth pass (the spec's "keep the wind honest" step). |

## Decision

View group → **Export visuals**:

- **Image passes** (`PassExporter`, `renderPasses` in `src/scene/exportPasses.ts`). The canvas pixel ratio is raised so it is 3840 px wide (capped at the GPU texture limit), held for 4 frames, then captured right after a rendered frame (`addAfterEffect`), so the still includes AO at the current tier. Then, at the same size:
  - `depth`: linear view depth, white at half the camera-to-target distance, black at twice it. Instancing-aware shader.
  - `white`: everything in one matte white material, sun shadows kept, analysis layers hidden.
  - `analysis` (only when a wind or noise layer is on): the analysis layers alone on a transparent background, hidden behind buildings via a depth-only pre-pass.
  Fat lines (drei `Line`/`Edges`) are hidden during the override passes. The pixel ratio and all scene state are restored. Files: `terraform-<site>-<pass>.png`.
- **Record 6 s clip**: `MediaRecorder` on `canvas.captureStream(30)`, VP9 WebM, WebM or MP4, whichever the browser supports. At screen resolution, not 4K.

The helper text tells users to label enhanced images as visualisations. No new dependency.

## Evidence (2026-11-10, M1 Pro, dev build)

- Compact Infill with wind on: four 3840×2498 PNGs (still 5.7 MB) plus a 3.4 MB WebM; the analysis pass is ~90% transparent. Low tier (no composer) also exports correctly. The scene renders normally afterwards.
- Unit tests: pixel ratio and cap, file names, video type choice.

## Risks

- 4K post-processing targets need a few hundred MB of GPU memory; a weak integrated GPU may lose the WebGL context. The error is reported in the status line; the viewport's error boundary handles a lost context.
- Several downloads at once: Chrome asks once to allow multiple downloads.
