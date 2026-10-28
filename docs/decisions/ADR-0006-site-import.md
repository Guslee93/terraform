# ADR-0006 — Site import from open Nordic map data

- **Status:** Proposed (awaiting owner decision, plan §2)
- **Date:** 2026-10-28
- **Deciders:** Project owner, `engineering-software-architect`
- **References:** `docs/plans/site-import-plan.md`; PRD §35, §324, §538; M6 item 6; ADR-0002 (coordinates), ADR-0005 (scene look)

## Context

The owner wants Hektar-like site loading: find any place in a Nordic city, frame it, and get buildings, streets, green space, water and terrain in 3D. The PRD keeps v1 free of live GIS (§35) and reserves MapLibre for later (§324, M6 item 6). Research (plan §3) found a keyless, CORS-enabled stack: OpenFreeMap vector tiles for buildings and context, Kartverket høydedata or AWS Terrain Tiles for terrain, Photon and the Kartverket Adresse-API for search. Overpass was unavailable (502 on three servers) during research.

## Decision (proposed)

1. **Placement:** import is an **M6 track** (plan option A). A spike and a renderer-free importer library may start before the M5 gate because they do not touch the demo path. The UI ships after M5.
2. **Output contract:** the importer produces a standard `SitePackage` validated by the existing parsers; the studio stays unchanged. New manifest `dataStatus: 'user-import'`.
3. **Sources:** OpenFreeMap z14 tiles (buildings, transportation, park, landcover, landuse, water); Kartverket høydedata inside Norway, AWS Terrarium elsewhere; Photon + Kartverket Adresse-API; Overpass only for optional trees. Each sits behind a provider interface.
4. **Coordinates:** same local tangent-plane projection as `build_site_packages.py`, ported to TypeScript with a parity test; frames ≤ 800 m keep the error far below a centimetre per metre.
5. **Storage:** imported packages live in IndexedDB (Dexie, already a dependency) with schema version and migrations; curated packages stay immutable static files.
6. **Dependencies:** `maplibre-gl`, `@mapbox/vector-tile`, `pbf`, pinned, lazy-loaded on `/new` only; bundle sizes recorded when added.
7. **Honesty:** OSM heights labelled as partly estimated; no parcels, plans or hazard layers without an authoritative licensed source (P6, separate ADR).

## Consequences

- The demo stays reliable: curated sites remain default and offline-capable.
- Large new surface (map UI, network failure states). Each phase has its own gate.
- Authoritative Nordic data (FKB, Lantmäteriet buildings, Dataforsyningen) needs keys, agreements or a backend, so it is out of scope until P6.
