# ADR-0035 — Parcel layer from the eiendomskart

- **Status:** Accepted (2026-11-15, build/foundation WP-5; plan `docs/plans/fable-build-plan.md`)
- **Relates to:** ADR-0032 (layer provenance), ADR-0002 (local ENU), feasibility 09 §1 and §4, 07
  (Oslo zoning access), 08 R5, deferred test IT-5
- **Dependencies:** none added.

## Context

The studio's study boundary is authored, "not a cadastral parcel". Feasibility showed that
Kartverket's eiendomskart (matrikkel teig) is open (CC BY 4.0), available as a WFS dataset, and
registers with the curated buildings to 0.59 m (median). Oslo's zoning plans are not open: the
national service has none for Oslo and the structured API answers 401.

## Decision

1. **Data: the WFS dataset**, `wfs.matrikkelen-eiendomskart-teig`, `app:Teig`, GML 3.2. Never the
   matrikkelkart WMS tiles: those carry Geovekst rights (09 §4).
   - **Curated sites:** build step `scripts/site-assets/parcels.build.ts`; the raw GML is cached in
     `data/raw/` with checksum and request; `parcels.json` holds `{ id, matrikkel, updated, rings }`
     per parcel in local ENU, and the manifest gets a `parcels` layer (© Kartverket, CC BY 4.0).
   - **Imports:** the same converter live (`kartverketParcels`), stored with the package.
2. **Registration.** The WFS is asked for WGS84 (`urn:ogc:def:crs:EPSG::4326`, latitude first) and
   every vertex goes through the app's own projection. No UTM offset is used as ENU.
3. **One request for the whole extent, lookups client-side** (IT-5). A box of a few metres around a
   point returned no feature where a 25 m box returned the parcel, so the studio never asks for "the
   parcel at this point": it asks once for the extent and finds the parcel in the answer
   (`parcelAt`). An answer that reaches the 5 000-feature limit is refused as possibly incomplete.
4. **Parcels are kept whole**, never clipped to the extent: the area shown must be the area of the
   registered outline. A parcel is kept when its outline touches the extent.
5. **Domain** (`src/features/analysis/parcels.ts`, renderer-free): `parcelAt` (even-odd over the
   outline and its holes; the smallest parcel where two overlap) and `parcelArea` (shoelace in ENU,
   outline minus holes): a deterministic calculation from the polygon (08 §1).
6. **Scene** (`src/scene/ParcelLines.tsx`): one line geometry for all outlines, draped 0.25 m above
   the terrain and stepped every 4 m along an edge; the selected parcel is drawn again in the accent
   colour. The lines are drawn over the model: in a built-up block the ground lines would be hidden
   under the buildings they describe.
7. **Panel.** A Parcels row in Layers, **off by default** (several hundred outlines are context, not
   the first thing to read), with the note "Eiendomskart — not a surveyed boundary". With the layer
   on, a ground click selects the parcel under it, and the Layers group shows: property number
   (`0301-228/255`, or "No property number registered"), area from the polygon, the register's
   update date, the caveat, and for Oslo parcels a **link out** to Oslo Planinnsyn. No plan data is
   reused, and the studio makes no statement about what a plan allows.

## Consequences

- The click that selects a parcel is the same ground click the editor uses to clear a block
  selection; while a footprint is being drawn the click places a corner and selects no parcel.
- `parcels.json`: 104 kB (Compact Infill, 375 parcels), 51 kB (Sloped Edge, 160 parcels).
- The WFS answers WGS84 with six decimals (about 0.1 m). The area of the reference parcel comes out
  at 464.4 m² against the register's stored 464.6 m² and the feasibility figure 465.1 m² (from
  UTM coordinates).
- Parcel accuracy classes (`noyaktighetsklasseTeig`) are not shown yet; the caveat is general.
- Line weight and colour are for the design phase. In a perspective view the ground lines shift
  against the roofs (parallax); that is the geometry, not a registration error.

## Verification (2026-11-15)

- `parcels.test.ts`: area with a hole and a triangle; lookup (hole, overlap, open ground); parser;
  converter (latitude-first axis order, register number and date, holes, whole parcels, a parcel
  without a number, the feature limit); the whole-extent request; shipped layers' provenance; the
  draped line positions.
- **Done-when:** the shipped Compact Infill parcel at the origin is `0301-228/255`, 464.4 m² from
  the polygon (unit test), and clicking it in the production build shows "0301-228/255 · 464 m² ·
  register updated 2020-06-16" with the caveat and the Planinnsyn link (browser check, no page errors).
- Captures: `docs/screenshots/build-parcels-plan.png`, `build-parcels-3d.png`.
- Not verified: a live import with parcels in the browser (covered by the converter's unit tests and
  the shared import path; the noise layer was checked live on the same path).
