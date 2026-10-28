# Site import — "pick any Nordic city block and get it in 3D"

**Status:** Option A chosen (2026-10-28): M6 track, P1 spike running · ADR: `docs/decisions/ADR-0006-site-import.md` (Accepted)
**Inspired by:** Hektar's site loading. We copy the *function* (find a place, frame it, get the city in 3D), not their UI.

---

## 1. What Hektar does, and what we learned

What the user sees (from Hektar's public pages and the owner's screenshots):

- You pick a site and *"Get the surrounding city in 3D the moment you pick a site"*; *"existing buildings, terrain and property boundaries load automatically."* Navigation is a map with a "Site Finder"; projects are named after the place (the screenshot header reads *Bydel Grünerløkka, Oslo · Scenario 2*), and scenarios live under the site.
- Layers beyond 3D context: property boundaries, detail plans, flood, noise, soil, heritage. For Sweden they list **13 layers from 6 agencies** (Lantmäteriet, SGU, MSB, Riksantikvarieämbetet, SMHI, SCB), pulled as WMS / OGC API, *"authenticated APIs where required."* They connect *"directly to the issuing agency"* rather than to aggregators. Coverage is deepest in Sweden and the Netherlands, with Norway and Denmark via "equivalent" sources, and shallower elsewhere.
- Free tier includes property regions, cadastral data and administrative boundaries; exports are .3dm / .obj / PDF / CSV.

What their public material does **not** show: the exact picking interaction (frame vs parcel click), site size limits, or the 3D building source. To see that, the owner can record a 2-minute screen capture of Hektar's "new project" flow; we will not create accounts ourselves.

**Takeaway.** Hektar's moat is *authoritative national data behind a backend* (keys, agreements, paid FKB in Norway, approval-gated Lantmäteriet buildings). Terraform is a static, backend-free portfolio app. We can deliver the same *experience* for 3D context from **open, keyless, CORS-enabled** sources, and leave authoritative layers (parcels, plans) to a later backend phase.

## 2. Scope decision (owner)

The PRD forbids depending on live GIS for v1 (§35 "does not depend on fragile live GIS services"; §324 MapLibre "optional later"; M6 item 6 "More sites / MapLibre context"). Two honest options:

| Option | What happens | Risk to the v1 demo |
|---|---|---|
| **A. M6 track (recommended)** | Build after the M5 gate. Allowed now: a time-boxed **spike** (P1) and the **renderer-free importer library** (P2), which never touch the demo path. | None. Curated sites stay the default; import is an extra entry. |
| B. Pull into v1 | Treat import as a v1 feature now, ADR to amend PRD §35. | High. Live services showed outages during research (§3); the 3-minute demo could fail on stage. |

Either way: **curated Oslo packages remain the default and work offline**; import never blocks the demo.

## 3. Data sources — verified 2026-10-28

CORS was tested from a browser origin with `curl -H Origin`. Licences still need the D23 verification pass before release.

| Need | Source | Coverage | Key? | CORS | Licence / attribution | Notes |
|---|---|---|---|---|---|---|
| Basemap for picking | **OpenFreeMap** vector tiles + Positron style, rendered with MapLibre GL | Global | No | ✅ `*` | © OpenMapTiles, © OpenStreetMap (ODbL) | Free, no SLA. Fallback: self-hosted PMTiles. |
| Buildings with heights | **OpenFreeMap z14 `building` layer** (`render_height`, `render_min_height`, `hide_3d`) | Global (OSM) | No | ✅ | ODbL | CDN-cached tiles, so no query server to overload. Heights are OSM-tagged or estimated; we must label them. |
| Streets / green / water | Same tiles: `transportation`, `park`, `landcover`, `landuse`, `water`, `waterway` | Global | No | ✅ | ODbL | Replaces the Python builder's Overpass parsing. |
| Trees (optional) | Overpass `natural=tree` | Global | No | ✅ | ODbL | **At capacity on 3 servers during research (502).** Optional enrichment only, with backoff; skipped silently with a note. |
| Terrain, Norway | **Kartverket høydedata** `punkt` / `punkter` | Norway | No | ✅ `*` | CC BY 4.0 | Already used by our builder (DTM1). |
| Terrain, elsewhere | **AWS Terrain Tiles** (Terrarium PNG) | Global | No | ✅ `*` | Mixed sources; attribution list required | Coarser than national DTMs; label resolution. |
| Address search, Norway | **Kartverket Adresse-API** `ws.geonorge.no/adresser/v1/sok` | Norway | No | ✅ `*` | CC BY 4.0 | Authoritative addresses. |
| Address / place search, Nordics | **Photon** (komoot, OSM) | Global | No | ✅ `*` | ODbL; fair use | Suitable for type-ahead. Nominatim also has CORS but its policy forbids autocomplete. |
| Denmark | Dataforsyningen (GSearch, DHM, GeoDanmark) | DK | **Token** | ✅ (reflects origin) | Free, attribution | Needs a token, so it belongs to the backend phase (P6). |
| Sweden buildings | Lantmäteriet Byggnad (open since 2025) | SE | Download needs **approval** | — | CC BY 4.0 (to verify) | Backend phase (P6). |
| Norway buildings | Kartverket FKB-Bygning | NO | **Norge digitalt licence / reseller** | — | Restricted | Not usable in an open app. |

Conclusion: **the tiles + Kartverket + AWS terrain + Photon** stack is keyless, browser-callable and Nordic-wide, and reproduces what our curated Python pipeline already does, but live and in the browser.

## 4. The experience we will build (our version)

1. **Landing → "Start from any address"** card next to the two curated sites (curated stay first).
2. **Find** (`/new`): full-bleed map in the white-model style; search box (type-ahead via Photon, with Kartverket results ranked first for Norway); quick picks for Oslo, Bergen, Trondheim, Stockholm, Göteborg, Malmö, Copenhagen, Aarhus and Helsinki.
3. **Frame**: a square site frame centred on the map with size presets **200 / 400 / 600 m** (max 800 m), drag to move. Live readouts: area, estimated building count from tiles already on screen, and the place name from reverse geocoding (e.g. "Grünerløkka, Oslo"). Optional: draw your own **study boundary** polygon inside the frame (default: frame inset by 15 %).
4. **Load in 3D**: a step list with honest progress (buildings → streets → green & water → terrain → trees), each with a status and source name; **Cancel** anytime. Partial failure is allowed: e.g. terrain unavailable → flat terrain + warning chip; trees unavailable → skipped with a note.
5. **Open in studio**: the result is a normal `SitePackage`, validated by the existing parsers, saved locally (IndexedDB) under **My sites** with source, fetch date and licences, and opened at `/studio/import/<id>`. Everything in the studio (massing, grade, trees, shadows) works unchanged.
6. **Honesty labels** (claim policy): `OpenStreetMap context · heights partly estimated · not survey data`, `Study area — not a cadastral parcel`, and a per-site "Data notes" panel listing each source, licence and fetch time. No parcels, plans or flood layers are shown until P6 brings authoritative sources.

What we deliberately do **not** copy: their agent sidebar, credits/pricing, regulatory layers without a source we can legally use, or any wording implying official data.

## 5. Architecture

- **Renderer-free importer** in `src/features/import/` (testable without React/Three; AGENTS guardrail 3):
  - `geocode.ts` — Photon + Kartverket clients, abortable, with timeouts.
  - `tiles.ts` — bbox → z14 tile cover; fetch `.pbf`; decode MVT; tile-local → lon/lat → **local ENU metres** (same tangent-plane formula as `build_site_packages.py`'s `project`, ported and cross-tested against Python output; ADR-0002 unchanged).
  - `buildings.ts` — merge building fragments split across tile edges (by feature id, union with `@turf/turf`, already a dependency), drop `hide_3d`, height = `render_height − render_min_height`, record `heightSource: 'tagged' | 'estimated'` where derivable.
  - `context.ts` — roads (class → width table shared with the Python builder), land cover (park/grass/wood/water).
  - `terrain.ts` — provider interface; `kartverketProvider` (inside Norway) and `terrariumProvider` (elsewhere; decode PNG via `OffscreenCanvas`); 25 × 25 grid.
  - `assemble.ts` — build manifest + assets → run existing `parseSiteManifest` / `parseTerrain` / `parseBuildings` / … → `SitePackage`. `dataStatus: 'user-import'` (new enum value).
  - `store.ts` — Dexie (already a dependency, unused so far) table `importedSites` with schema version and migration hook.
- **UI**: lazy route `/new` (MapLibre loads only here, never on the demo path); studio route accepts `import/<id>` and loads from the store.
- **Budgets**: ≤ 9 tiles, ≤ 2 500 buildings, import < 8 s on broadband, package < 3 MB; studio FPS budget unchanged.
- **New dependencies (ADR-0006)**: `maplibre-gl` (BSD-3; lazy chunk), `@mapbox/vector-tile` + `pbf` (BSD-3 / BSD-3; small). Pinned, bundle sizes recorded.

## 6. Phases, gates and owners

| Phase | Outcome | Gate | Lead |
|---|---|---|---|
| **P0 Decide** | Owner picks option A or B; ADR-0006 accepted | Written decision | Owner + Claude |
| **P1 Spike** | Node script fetches one Oslo frame (Grünerløkka) live → `SitePackage` JSON → opens in today's studio | Loads and looks right; timings and sizes measured; findings in ADR | Codex (C3) + Claude review |
| **P2 Importer library** | `src/features/import/*` with recorded-fixture tests; no UI | All modules tested offline; projection matches Python within 1 cm | Codex (C4, C5) + DeepSeek (D21–D23) |
| **P3 Find & frame UX** | `/new` map, search, quick picks, frame, step-list loader | Keyboard reachable; cancel works; e2e with mocked network | Claude (UX spec + review) + Codex (C6) + DeepSeek (D24, D26) |
| **P4 My sites** | IndexedDB store, list on landing, studio route `import/<id>`, delete | Survives reload; schema-versioned; DeepSeek e2e | Codex (C7) + DeepSeek (D25) |
| **P5 Harden** | Failure states, rate limiting/backoff, attribution panel, a11y, perf | Offline/outage drills pass; G3 visual gate | Claude + DeepSeek (D27) |
| **P6 Authoritative layers** (later, needs backend) | Parcels (Kartverket matrikkel / Lantmäteriet / Datafordeler), plans, DK token, SE buildings | Separate ADR; licences verified | Future |

## 7. Task list

### Claude (design, decisions, review: keep this small)
- [ ] **T1** ADR-0006 to Accepted after the owner's P0 decision; PRD deviation note if option B.
- [ ] **T2** UX spec for `/new` (layout, frame interaction, loader states, empty/error copy) in `docs/design/site-import-ux.md`, in the white-model style.
- [ ] **T3** Review every Codex/DeepSeek delivery against its work order; merge or send back.
- [ ] **T4** Studio integration of imported packages (`import/<id>` route, data-notes panel copy) and the final visual gate with screenshots.

### Codex (well-specified engineering, run via `npx @openai/codex@0.164.0 exec`)
- [ ] **C3 Spike** — `scripts/spike-import.mjs`: bbox → tiles → buildings/roads/land cover → Kartverket terrain → `SitePackage` JSON in `tmp/`; print timings, counts and sizes. No app code.
- [ ] **C4 Tiles and buildings** — `tiles.ts`, `buildings.ts`, `context.ts` with recorded fixture tiles; cross-tile merge tests; projection parity test against the Python `project()` output.
- [ ] **C5 Terrain and assembly** — `terrain.ts` (both providers), `assemble.ts` (reuses the existing parsers), `dataStatus: 'user-import'` in the manifest schema with tests.
- [ ] **C6 Find & frame UI** — `/new` route per T2 spec; MapLibre lazy chunk; frame interaction; step-list loader wired to the importer; cancel.
- [ ] **C7 Store and routes** — Dexie store + migration, landing "My sites", `studio/import/<id>`.

### DeepSeek (bounded, low-risk, parallel)
- [ ] **D21 Geocoders** — `geocode.ts` Photon + Kartverket clients (abort, timeout, result normalising), tests on recorded JSON.
- [ ] **D22 Fixture recorder** — `scripts/record-import-fixtures.mjs` saves 4 z14 tiles, 2 geocoder responses and one terrain response for Grünerløkka and Södermalm into `src/features/import/__fixtures__/` with a README of sources and dates.
- [ ] **D23 Licence verification** — `docs/data/import-sources.md`: for every row in §3, the exact licence text link, attribution string, usage policy (Photon fair use, OpenFreeMap terms, AWS terrain attribution list, Kartverket CC BY 4.0, Overpass policy) and a "safe to ship?" verdict. No code.
- [ ] **D24 E2E with mocked network** — Playwright `e2e/import.spec.ts` intercepting tiles/geocoder/terrain with D22 fixtures: search → frame → load → studio shows buildings; plus terrain-failure path shows the warning chip.
- [ ] **D25 My sites list UI** — per T2 spec: list, open, delete with confirm, empty state.
- [ ] **D26 City quick picks** — `src/features/import/cities.ts`: 9 Nordic cities with centre coordinates and a default frame size; test that each lies within its country bbox.
- [ ] **D27 Failure drills** — documented manual drill and an automated test for each outage (tiles 5xx, geocoder timeout, terrain 4xx, Overpass 502), asserting the user-facing message.

## 8. Risks

| Risk | Mitigation |
|---|---|
| Live services fail during a demo | Curated sites stay default and offline; imports are cached locally once loaded; outage drills (D27). |
| OSM heights are often estimated | Label them; show share of buildings with tagged heights in Data notes. |
| Overpass overloaded (seen during research) | Trees are optional; the core path uses CDN tiles, not Overpass. |
| OpenFreeMap has no SLA | Provider interface; fallback to self-hosted PMTiles (static file, no backend). |
| ODbL share-alike on exported data | Attribution everywhere; exports of imported context carry ODbL notice (D23 to confirm). |
| Tile clipping splits buildings | Merge by feature id plus union (C4 tests). |
| Scope creep into a GIS product | P6 needs its own ADR; no parcels/plans without an authoritative, licensed source. |

## 9. Sources (research, 2026-10-28)

- Hektar product page — https://www.hektar.ai/
- Hektar FAQ — https://www.hektar.ai/faq
- Hektar, "The Swedish Data Layers in Hektar" — https://www.hektar.ai/post/sweden-data-layers-in-hektar-lantmateriet-sgu-msb-raa
- Hektar, "Why Data Layers Matter…" — https://www.hektar.ai/post/why-data-layers-matter-in-early-stage-real-estate-feasibility
- Hektar, "Hektar vs Autodesk Forma" — https://www.hektar.ai/post/hektar-vs-autodesk-forma
- Kartverket FKB-Bygning product sheet (Norge digitalt licence) — https://dokument.geonorge.no/produktark/fkb-bygning/2025-01-07/fkb-bygning.pdf
- Lantmäteriet open data — https://lantmateriet.se/en/geodata/geodata-products/open-data ; OSM Sweden building import notes — https://wiki.openstreetmap.org/wiki/Import/Catalogue/Sweden_Building_Import
- Dataforsyningen overview — https://atlas.co/data-portals/dataforsyningen/
- OpenFreeMap TileJSON (schema checked live) — https://tiles.openfreemap.org/planet
- Live CORS checks: Kartverket høydedata + adresser, Photon, Nominatim, AWS Terrain Tiles, OpenFreeMap, Dataforsyningen, Overpass (+2 mirrors at capacity)
