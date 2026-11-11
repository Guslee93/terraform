# Site-import data sources — licence and usage verification (D23)

Prepared 2026-10-28 for the M6-track site import (ADR-0006, plan §3). Every row gives
the official licence, the exact attribution string to display, the usage policy that
matters for a static browser app, and a verdict. This pass verifies the plan §3 table;
anything that contradicts or refines it is flagged in §2.

Verdicts: **Ship** — usable keyless from the browser today ·
**Ship with conditions** — usable but with limits/attribution obligations ·
**Do not ship (needs backend or agreement)** — key, account or contract required.

---

## 1. Source-by-source verification

### 1.1 OpenFreeMap vector tiles + Positron style — Ship with conditions

- **Licence / terms:** [openfreemap.org](https://openfreemap.org/) · Terms of Service linked from the site footer. Project code is MIT; map data is OpenStreetMap (ODbL).
- **Attribution to display:** `© OpenMapTiles · Data from OpenStreetMap` (the required part of their string; the "OpenFreeMap" part is optional).
- **Usage policy:** Public instance is "completely free: there are no limits on the number of map views or requests", no registration, no API keys, no cookies. Commercial use explicitly allowed. Offline/bulk downloads are capped: "each download is at most 3,000 tiles or 50 MB, uses at most 4 parallel requests, and sends a unique User-Agent". No SLA ("I don't offer SLA guarantees or personalized support").
- **Verdict:** Ship (browser), with the attribution string and a fallback path (self-hosted PMTiles) because there is no SLA.
- **vs plan §3:** Plan's "Free, no SLA" and "© OpenMapTiles, © OpenStreetMap (ODbL)" confirmed. Refinement: the provider's own recommended string is `OpenFreeMap © OpenMapTiles · Data from OpenStreetMap`; the OpenFreeMap credit may be omitted.

### 1.2 OpenMapTiles schema — Ship (attribution required)

- **Licence:** [openmaptiles/openmaptiles LICENSE.md](https://raw.githubusercontent.com/openmaptiles/openmaptiles/master/LICENSE.md) — code BSD 3-Clause; cartography/design CC BY 4.0; the tile data itself is OSM (ODbL).
- **Attribution to display:** `© OpenMapTiles` (link to `http://openmaptiles.org/`) together with `© OpenStreetMap contributors` (link to the OSM copyright page). The licence's own example: `[© OpenMapTiles](http://openmaptiles.org/) [© OpenStreetMap contributors](http://www.openstreetmap.org/copyright)`.
- **Usage policy:** "Products or services using maps derived from OpenMapTiles schema need to visibly credit 'OpenMapTiles.org' or reference 'OpenMapTiles'". No usage limiting; the schema is open source. CC BY 4.0 on the design means derived styles carry attribution (not share-alike).
- **Verdict:** Ship. Attribution string required in the map/import UI.
- **vs plan §3:** Confirmed. Plan's "ODbL" shorthand applies to the data layer (OSM), not the schema code.

### 1.3 OpenStreetMap data (OSM extract / geocoders / tiles) — Ship (ODbL obligations)

- **Licence:** [OpenStreetMap copyright page](https://www.openstreetmap.org/copyright) — Open Data Commons Open Database License (ODbL) 1.0 via OSMF.
- **Attribution to display:** `© OpenStreetMap contributors` with a link to `https://www.openstreetmap.org/copyright` and a statement that the data is ODbL.
- **Usage policy:** Two obligations: credit the contributors and "make clear that the data is available under the Open Database License". Derivative datasets must be distributed under ODbL (share-alike) — imported context exported from the app must carry the ODbL notice; visible attribution is mandatory. "We cannot provide a free-of-charge map API or map tiles for third-parties" — we do not use OSM's tile/API servers; we use OSM-derived services below.
- **Verdict:** Ship, with the existing ODbL attribution and share-alike notice on exported imported data.
- **vs plan §3:** Confirmed (plan's ODbL note in the risk table is correct).

### 1.4 Kartverket høydedata (DTM1 `/punkt`) — Ship

- **Licence:** [kartverket.no/api-og-data](https://kartverket.no/api-og-data/) ("Kartverkets terrengdata er gratis og tilgjengeleg både for nedlasting og gjennom API") · CC BY 4.0 ([licence text](https://creativecommons.org/licenses/by/4.0/)). The Tilezen joerd attribution page also records it: [attribution.md](https://raw.githubusercontent.com/tilezen/joerd/master/docs/attribution.md) (data.kartverket.no Digital terrengmodell, CC BY 4.0, statement "© Kartverket").
- **Attribution to display:** `© Kartverket`.
- **Usage policy:** Free, keyless, per-request batches (we use 9–49 points per call). No documented rate limit or caching restriction; the API is a public geonorge service. Keep per-minute volume modest and cache responses locally for offline/repeat use.
- **Verdict:** Ship (already the M1 pipeline source).
- **vs plan §3:** Confirmed (CC BY 4.0, no key, CORS `*`).
### 1.5 Kartverket Adresse-API (`/adresser/v1/sok`) — Ship

- **Licence:** Same Kartverket terms as above — [kartverket.no/api-og-data](https://kartverket.no/api-og-data/), CC BY 4.0.
- **Attribution to display:** `© Kartverket`.
- **Usage policy:** Keyless, CORS-open (verified in plan §3 and by the D22 recording). No published hard rate limit; the API is intended for lookups. For a type-ahead picker, debounce and cache queries client-side; treat it as a per-user, per-keystroke (few requests per session) use.
- **Verdict:** Ship.
- **vs plan §3:** Confirmed.

### 1.6 AWS Terrain Tiles (Terrarium PNG, non-Norway terrain) — Ship with conditions

- **Licence:** [Registry of Open Data on AWS — Terrain Tiles](https://registry.opendata.aws/terrain-tiles/) → licence is the [Tilezen joerd attribution.md](https://raw.githubusercontent.com/tilezen/joerd/master/docs/attribution.md).
- **Attribution to display:** the required list, including at minimum the sources a tile can draw on. For Nordic use the relevant lines are `Norway terrain data © Kartverket;` and the USGS/3DEP + SRTM line for global fallback; the registry's required block also includes ArcticDEM, Geoscience Australia, Austria, Canada, EU-DEM, ETOPO1, Mexico, New Zealand, UK Environment Agency.
- **Usage policy:** Free public S3 bucket, no key (`--no-sign-request`), static PNG tiles; no documented request limit. Attribution is mandatory ("Attribution is required for many terrain tile data providers").
- **Verdict:** Ship with conditions — display the attribution list (or the subset actually served) in the imported-site data notes, and label resolution (coarser than national DTMs) as planned.
- **vs plan §3:** Confirmed ("Mixed sources; attribution list required"); this pass pins down the exact list.

### 1.7 Photon (komoot) — Ship with conditions

- **Licence / terms:** [photon.komoot.io](https://photon.komoot.io/) — "An OpenStreetMap project run by komoot"; data ODbL.
- **Attribution to display:** `© OpenStreetMap contributors` (ODbL) for derived results/imports.
- **Usage policy:** "You can use the API for your project, but please be fair - extensive usage will be throttled. We do not guarantee for the availability." CORS-enabled (verified in plan §3 and the D22 recording). No caching restriction; suitable for type-ahead with debounce.
- **Verdict:** Ship for type-ahead, with the 8 s timeout + abort already in `geocode.ts`, a fair request volume, and ODbL attribution.
- **vs plan §3:** Confirmed ("ODbL; fair use").

### 1.8 Nominatim (OSMF) — Ship with conditions (NOT for autocomplete)

- **Licence / policy:** [OSMF Nominatim Usage Policy](https://operations.osmfoundation.org/policies/nominatim/); data ODbL.
- **Attribution to display:** `© OpenStreetMap contributors` with ODbL link, per medium.
- **Usage policy:** "No heavy uses (an absolute maximum of 1 request per second)"; a valid Referer or User-Agent identifying the app is required. Strictly forbidden: "Auto-complete search … you must not implement such a service on the client side using the API"; systematic/bulk queries; reselling. End-user-triggered single lookups are ok for moderate user numbers; "set up a proxy and also enable caching of requests" where possible.
- **Verdict:** Ship with conditions — use only for occasional reverse-geocode lookups (single, end-user-triggered requests, ≤1 req/s, cache results). Do **not** use it for type-ahead; Photon covers autocomplete.
- **vs plan §3:** Confirmed — "its policy forbids autocomplete" is exactly right.

### 1.9 Overpass API — Ship with conditions (optional enrichment only)

- **Licence / terms:** [overpass-api.de](https://overpass-api.de/) (usage policy page linked from there; service status known to fluctuate) · [OSM wiki — Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API); data ODbL, engine AGPL.
- **Attribution to display:** `© OpenStreetMap contributors` (ODbL).
- **Usage policy:** Free read-only query service on donated hardware; heavy or repeated queries are throttled/blocked, operators ask users to coordinate large deployments. Plan §3 research and the D26 lookups both hit 502/400 responses during this pass.
- **Verdict:** Ship with conditions — trees/optional enrichment only, with backoff and a silent skip + note (exactly the plan's §3 row). Never on the core import path.
- **vs plan §3:** Confirmed ("At capacity on 3 servers during research").
- **As implemented:** the tree query is a POST with a URL-encoded body (a simple request, so no CORS preflight and no URL length limit). A throttled instance is answered by the next planet instance rather than by an immediate retry, so every endpoint is tried once before any endpoint is tried again, with a 500 ms backoff between attempts. The whole step is bounded by a 15 s budget, so a throttled or unreachable endpoint cannot hold the import open. If every endpoint fails the import continues with illustrative trees and says so in the import notes.

### 1.10 Dataforsyningen (DK — GSearch, DHM, GeoDanmark) — Do not ship (needs backend or agreement)

- **Licence / terms:** [dataforsyningen.dk](https://dataforsyningen.dk/) (self-service portal and terms, JS-rendered; `mitt.dataforsyningen.dk` issues tokens) — Danish public-data services, free for Danish public sector and broadly licensed for other use, but every call requires a **token** from the portal. Attribution per dataset (Kortforsyningen/GeoDanmark).
- **Attribution to display:** dataset-specific; e.g. `© SDFI` / `GeoDanmark` as stated per dataset.
- **Usage policy:** Token-gated; terms and rate limits are set at the portal. Not keyless.
- **Verdict:** Do not ship from a static browser app — belongs to the backend/agreement phase (plan P6), as planned. Exact current terms must be re-verified at that point.
- **vs plan §3:** Confirmed ("Token … needs a token, so it belongs to the backend phase").

### 1.11 Lantmäteriet Byggnad (SE buildings) — Do not ship (needs backend or agreement)

- **Licence:** [OSM wiki — Sweden Building Import](https://wiki.openstreetmap.org/wiki/Import/Catalogue/Sweden_Building_Import) (source page: Lantmäteriet product page linked there) — the building-footprint dataset is **CC BY 4.0** under the EU High-Value Dataset directive, but "Explicit permission obtained by each individual user by application to Lantmäteriet" is required to download/use it, and ODbL compliance for OSM re-use is still "pending".
- **Attribution to display:** link to Lantmäteriet, e.g. `© Lantmäteriet` + product link.
- **Usage policy:** Download requires registration/approval; no keyless browser access exists today.
- **Verdict:** Do not ship (needs backend or agreement) — stays in the P6 backend phase.
- **vs plan §3:** Plan said "CC BY 4.0 (to verify)" and "Download needs approval" — now verified: licence is indeed CC BY 4.0, access is approval-gated. Plan is consistent; this closes the "(to verify)".

### 1.12 Kartverket FKB-Bygning (NO buildings) — Do not ship

- **Licence / product sheet:** [FKB-Bygning produktark](https://dokument.geonorge.no/produktark/fkb-bygning/2025-01-07/fkb-bygning.pdf) — FKB is distributed under the **Norge digitalt** licensing framework (restricted; data owner Kartverket); it is not an open dataset.
- **Attribution to display:** n/a (not usable).
- **Usage policy:** Requires a Norge digitalt agreement / reseller; prohibited in an open, keyless, browser app.
- **Verdict:** Do not ship (needs backend or agreement).
- **vs plan §3:** Confirmed ("Restricted … Not usable in an open app").

---

## 2. Plan §3 contradictions and refinements

No row in plan §3 turned out to be wrong. Two refinements worth recording:

1. **OpenFreeMap attribution string (plan §3, row "Basemap")** — the provider requires the string `OpenFreeMap © OpenMapTiles · Data from OpenStreetMap` (the OpenFreeMap part is optional). Plan's `© OpenMapTiles, © OpenStreetMap (ODbL)` stays correct as the semantic core; the UI should use the provider's wording.
2. **Lantmäteriet Byggnad (plan §3, row "Sweden buildings")** — plan marked the licence "CC BY 4.0 (to verify)"; this pass verifies CC BY 4.0 (EU HVD release, Feb 2025) **and** confirms access is approval-gated per user, keeping the "backend phase" verdict.
3. **AWS Terrain attribution (plan §3, row "Terrain, elsewhere")** — "attribution list required" is confirmed with the exact list in §1.6.

Operational note: during this pass, both Overpass endpoints required retries, the Kartverket FKB PDF is binary (product sheet cited from plan §9), and Nominatim/Dataforsyningen pages are partly JS-rendered — all consistent with plan §8 risk rows.

---

## 3. What the import app must show

- Map basemap attribution: `© OpenMapTiles · Data from OpenStreetMap` (OpenFreeMap), ODbL notice.
- Imported site data notes: `© OpenStreetMap contributors` (ODbL) for buildings/context; `© Kartverket` (CC BY 4.0) for Norway terrain and addresses; AWS Terrain Tiles attribution list when non-Norway terrain is used.
- Exports carrying imported context must include the ODbL notice and share-alike statement (plan §8 risk row).