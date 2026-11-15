# ADR-0032 — Layer provenance

- **Status:** Accepted (2026-11-15, build/foundation WP-2; plan `docs/plans/fable-build-plan.md`)
- **Relates to:** ADR-0019 (image and video export), ADR-0020 (search → analyse → export), feasibility
  09 §4 (licences), 08 §1 (output classes), 08 R6/R8
- **Dependencies:** none added.

## Context

The studio credited its data with one sentence: the `attribution` strings of `manifest.sources`,
joined. That was enough for two sources. The foundation layers add Statens vegvesen, NVE and more
Kartverket datasets, under three licences (CC BY 4.0, NLOD 1.0, ODbL 1.0), some with a publisher's
use limitation and all with a data year that the catalogue prose can get wrong (feasibility 09 §2a:
the noise record says 2016/2017, every feature says 2021). NLOD and ODbL attribution travels with the
content, so an exported image must carry it too.

## Decision

1. **One record per layer** (`src/features/sites/provenance.ts`, renderer-free):
   `LayerProvenance { id, owner, dataset, datasetUuid?, url, licence, licenceUrl, attribution,
   retrieved, dataYear?, useLimitation? }`.
   - `id` is the layer: `terrain`, `buildings`, `heights`, `roads`, `trees`, `landcover`, `noise`,
     `parcels`, `hazards`, `terrain1m`. `heights` is its own layer so measured heights stay a separate
     CC BY 4.0 record beside the ODbL footprints (ADR-0033).
   - `licence` is one of the four verified in 09 §4: `CC BY 4.0`, `NLOD 1.0`, `ODbL 1.0`,
     `no conditions`. Anything else is a parse error: a new licence is a decision, not a string.
   - `dataYear` is read from the data. `useLimitation` is the publisher's wording.
   - The parser is strict: unknown layer, unknown or missing licence, a non-https link, a date that is
     not `YYYY-MM-DD`, or the same layer twice all fail the package.
2. **The manifest gains `layers?: LayerProvenance[]`.** Backward compatible: a package without it
   (both curated packages today, every stored import) gets its entries synthesised from `sources`
   (`layersFromSources`): the OpenStreetMap source stands for buildings, roads, trees and land cover,
   a terrain source for terrain, a surface-model source for heights. A declared layer wins over a
   synthesised one. A source the contract cannot express (the Terrarium fallback terrain, with
   "multiple source licences") is kept as `unlisted` and shown as written, so no credit is lost.
3. **The panel lists what is on screen.** Site → Data attribution has one line per distinct source
   among the *visible* layers: attribution (linked to the source), dataset and data year, licence
   (linked), retrieval date, and the use limitation where there is one. Switching a layer off removes
   its line; the package's attribution file still lists everything.
4. **Exports carry the credits.** The still, the white-model pass, the analysis pass and every frame
   of the clip get the visible layers' credit lines in a band along the bottom edge
   (`creditLayout`, `drawCredits`, `creditedPng`, `recordCanvas`). An export that cannot draw its
   credits fails instead of saving an uncredited image.
   - The **depth pass stays clean**: it is a depth signal for image tools, and a text band would
     corrupt it. It is saved beside the credited still.
   - The clip is recorded from a 2D copy of the viewport, redrawn each frame with the band.

## Consequences

- WP-3 to WP-6 add one `layers` entry each and their credit appears in the panel and the exports with
  no further UI work.
- Text width in the band is estimated from the character count, not measured (marked `ponytail:` in
  the code). Long credits wrap between words.
- The band covers the bottom 2–4 % of an exported image.
- Stored imports are not migrated: their layers are synthesised on every load.

## Verification

- `provenance.test.ts`: valid entry; missing licence; unknown licence; unknown layer, bad year, bad
  date, non-https link; duplicate layer; synthesis from the curated `sources`; an inexpressible source
  kept; visible-layer credits and export lines.
- `exportPasses.test.ts`: band layout at 3840 × 2160, wrapping at 400 px, nothing without lines, and
  every line drawn into a recording context.
- `Inspector.test.tsx`: one line per visible source with year, licence link and limitation.
- Not verified: the recorded clip in Safari (MP4 path).
