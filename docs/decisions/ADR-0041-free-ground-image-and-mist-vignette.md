# ADR-0041 — A free Sentinel-2 ground image and a misty, blurred vignette (Visual Lab)

**Status:** Accepted (owner request, 2026-11-24) · **Scope:** Visual Lab, IDENTITY style only
**Relates to:** ADR-0040 (Visual Lab), D13 (orthophoto licence), D22 (look spec), D41 (missing volumes)

## Context

1. **Ground image.** The sharp aerial photo (Norge i bilder, about 0.17 m per pixel) stays local until
   Kartverket answers the licence request (D13). The owner asked for a free ground image in the
   meantime; it does not have to be as sharp.
2. **Haze.** The owner wants the haze to read as a misty, blurred vignette around the view. Today it
   is an aerial-perspective band measured from the study area, plus the tile-edge dissolve:
   - On sloped-edge the band starts 249 m out while the tile reaches ±395 m, so ground and massing
     inside the photo are already in the mist.
   - The D41 fix took the massing off the haze to keep the houses visible. The cost: crisp boxes
     float in the mist, the edge test fails on compact-infill, and D22 ("buildings fade too") is broken.

## Decision

### 1. Kartverket's Sentinel-2 cloudless mosaic as the free ground image

**Verified 2026-11-24 in the Geonorge catalogue** (`kartkatalog.geonorge.no/api`):

| Item | Value |
|---|---|
| Service | "Satellittdata - Sentinel-2 - Skyfri mosaikk WMS" (`38a52b73-…`), `https://wms.geonorge.no/skwms1/wms.sentinel2`, layer `sentinel2` |
| Access | "Åpne data", no restrictions. The Norge i bilder services are listed as "Norge digitalt begrenset" |
| Datasets | "Skyfritt opptak Norge 2015-2017 … 2025", each Åpne data, **CC BY 4.0** |
| Projections | EPSG:3857 among others |
| CORS | `access-control-allow-origin: *`, so the image can be drawn on a canvas |

The required credit is the Norwegian line in `SENTINEL_CREDIT` (the year is left out, because the
WMS does not say which yearly mosaic it serves).

**Resolution:** 10 m per pixel. It is fetched at 5 m per pixel and smoothed by the GPU's bilinear
filtering, so it reads as a soft, painterly ground rather than as pixels. The drawn street ribbons
stay on top (10 m cannot show streets); with the local photo they stay hidden, as before.

**How it is fetched:**
- one WMS `GetMap` per site, live, whose bounding box is the terrain tile;
- ENU → latitude/longitude uses the builder's own `unproject`, then Web Mercator;
- Web Mercator is north-up, so no rotation is needed, and the nonlinearity over 800 m is under 0.1 m;
- nothing is committed. CC BY would allow committing, but the image is not needed in git.

**The Ground card offers three choices:**
- *Aerial photo (local, Kartverket)*, offered only when the file exists;
- *Sentinel-2 (free)*;
- *Map colours*.

The default is the local photo when it exists, otherwise Sentinel-2.

### 2. The haze becomes a screen-space mist vignette, plus the tile-edge dissolve only

**Mist vignette.** A postprocessing effect, `MistVignetteEffect` (no new dependency; `postprocessing`
is already installed):
- it runs after tone mapping and replaces the darkening `VignetteEffect` in IDENTITY;
- the centre of the view stays sharp;
- toward the frame edges the image is blurred (a 16-tap golden-angle disc whose radius grows with
  the distance from the centre) and mixed into the mist colour (`IDENTITY.hazeColour`).

**Lab tuning:**

| Setting | Was | Range |
|---|---|---|
| Mist strength | `vignetteStrength`, kept | 0–1 |
| Mist blur | new | px at the corners |
| Clear centre | new | 0–1 |

**Export passes:** as with the old vignette, only the composer applies it, so the export passes
never see it.

**World haze.**
- The aerial-perspective band now starts at the tile corner (`hazeRange`), so it never acts inside
  the tile.
- The tile-edge dissolve is unchanged, so the tile still melts into the background at its edges.
- The massing gets the haze again (the D41 line is reverted). Buildings therefore fade exactly where
  the ground under them fades, at the tile edge, and stay crisp everywhere on the ground image.
  D22 holds.

### 3. Optional sharp source: MapTiler satellite tiles with the owner's key (addendum, 2026-11-24)

The owner asked to try a free commercial tier while waiting for Kartverket. Copernicus VHR 2021 (2 m)
was ruled out: the general public is a view-only user under the CSCDA/ESA licence
(`docs/data/orthophoto-source.md`).

**MapTiler Cloud terms, read 2026-11-24 (`maptiler.com/terms/cloud/`):**
- the free plan is "limited to non-commercial use";
- attribution "is required to be shown on screen while the map is displayed";
- only documented APIs may be used;
- tiles may sit only in a temporary end-user cache (the browser's);
- it is prohibited to store or redistribute map content "by using a screenshot or other static image";
- bulk download is prohibited.

**What this ADR adds:**
- a fourth Ground choice, *MapTiler*: satellite-v2 tiles at the coarsest zoom at or under 0.3 m per
  pixel (z17 for 512 px tiles at 60° N, about 30 tiles per site load);
- the tiles are fetched by the browser, stitched and cropped to the terrain tile, longest side ≤ 4096;
- the drawn streets are hidden under it, as under the local photo;
- "© MapTiler" with a link is shown in the Ground card.

**Key handling:**
- the key is read from `VITE_MAPTILER_KEY` in `.env.local` (git-ignored), and the owner adds it by hand;
- with no key the choice is disabled;
- the key ends up in the Lab bundle, so restrict it to the Lab's origins in the MapTiler dashboard.

**Never committed:** captures that show MapTiler imagery stay local, like the Kartverket photo.

**Measured 2026-11-24 with the owner's key:**
- 30 tiles per site at z17;
- one sloped-edge tile timed out once, so each tile is retried twice (0.8 s, then 1.6 s) before the
  card reports a failure;
- headed on Metal, both curated sites load and the massing sits on its roofs at 0 m offset.

## Consequences

**Good:**
- The Lab shows a real, legally usable ground image anywhere in Norway, so the same route serves
  the import path later.
- The haze matches the owner's picture and no longer hides the subject.
- The D41 conflict and the edge-test failure go away together.

**Limits:**
- 10 m imagery is soft: roofs and streets are colour blobs. The white massing and drawn streets
  carry the detail.
- The image is live, so offline or a WMS outage falls back to the map colours, with a note.
- The mist blur is screen-space, so it also blurs the frame edges of UI-free exports if a future
  export pass uses the composer. Today none does.

## Not decided here

- Shipping either piece outside the Lab: that waits for Gate 2 (TF-VIS-027) and the owner's look
  decision.
- The import path (any address): it reuses `sentinelRequest` once the identity ships.
