# ADR-0036 — Mapped hazards as presence facts, and a source health check

- **Status:** Accepted (2026-11-16, build/foundation WP-6; plan `docs/plans/fable-build-plan.md`)
- **Relates to:** ADR-0032 (layer provenance), feasibility 02 rows 7–10, 08 §1 and R1/R7/R8/R11,
  deferred test IT-4
- **Dependencies:** none added.

## Context

Feasibility found four open hazard maps that answer for the Oslo test site: NVE's flood zones
(none mapped there), NVE's flood susceptibility areas, NVE's quick-clay susceptibility areas, and
Kartverket's storm-surge areas. They are authority data: the studio may say where they are mapped
and where they are not. It may not derive a depth, a return period, a safety class or a "safe"
(08 R1, R11). The same study recorded how these services move: an NVE host was retired, a Geonorge
WMS answered 500, a WFS failed server-side (08 R7).

## Decision

1. **Four maps, as presence facts** (`src/features/analysis/hazards.ts`, renderer-free):

| Kind | Owner | Service (Geonorge WFS) · feature type |
|---|---|---|
| Flood zones | NVE | `wfs.flomsoner` · `app:FlomAreal` |
| Flood susceptibility areas | NVE | `wfs.flomaktsomhetsomrader` · `app:FlomAktsomhetOmr` |
| Quick-clay susceptibility areas | NVE | `wfs.aktsomhetskartforkvikkleireskred` · `app:AktsomhetsOmrKvikkleireskred` |
| Storm surge, 200-year level in the 2100 climate | Kartverket | `wfs.stormflo_havniva` · `app:Stormflo200År_KlimaÅr2100` |

   Flood susceptibility comes from the WFS, not from point `GetFeatureInfo` on NVE's WMS: a fact
   about an area needs the polygons in the extent.
2. **Three statements, plus one for a failure.** For the study area:
   - **Mapped here:** a mapped area reaches the study area.
   - **Mapped nearby (within the site extent):** mapped areas exist in the package extent, none in
     the study area.
   - **Not mapped by NVE / Kartverket:** the service answered with no area in the extent.
   - **Not checked: the service did not answer** (imports only): never shown as "not mapped".

   Each fact carries its source, the retrieval date and the newest update date among the features
   in the extent. The panel ends with: "“Not mapped” means the authority has no mapped area here.
   It is not a statement that the site is safe."
3. **Data.** Curated: `scripts/site-assets/hazards.build.ts`, raw GML cached in `data/raw/` with
   checksum and request, `hazards.json` `{ retrieved, layers: { kind, updated, polygons }[] }`,
   polygons clipped to the extent (so "mapped" always means an area inside it) and simplified at
   1 m. Imports: the same converter live (`geonorgeHazards`), the four services asked together.
   WGS84 from the WFS, the app's projection per vertex, as for noise and parcels (`gml.ts`).
4. **Provenance.** One `layers` entry per map (`flood-zones`, `flood-susceptibility`,
   `quick-clay`, `storm-surge`), NLOD 1.0; "Kilde: NVE" as NVE's product sheets ask, the NLOD
   default wording for Kartverket; `dataYear` from the features' update dates; the map's own caveat
   as the use limitation (storm surge: "not suited to detailed studies or decisions at detail
   level"). The facts are always in the Site group, so their sources are always in Data
   attribution. They are not burned into exports: the hazard maps are not in the picture.
5. **Panel.** Site → "Mapped hazards · study area": the four facts. Polygons are not draped (the
   plan made that optional); the facts are text.
6. **Health check** (`scripts/check-sources.mjs`, IT-4). Every raw response a site-asset step
   fetched has a `.retrieved` file with its date and exact request. The script repeats each request
   and reports HTTP status and whether the *data* still match the cached response. It ignores what
   changes without the data changing: the request timestamp a WFS writes into every answer, and the
   feature ids Statens vegvesen's noise layers generate per request (both found on the first runs,
   when every source read as changed). It is read-only and also verifies the cache against
   `SHA256SUMS`. `--strict` exits 1 on a failed service.

## Owner decision: a schedule

**No CI workflow was added or changed.** Proposal for the owner: run
`node scripts/check-sources.mjs --strict` weekly in GitHub Actions (a scheduled workflow with no
secrets; 16 requests, about 10 s), and open an issue on a failure or a drift. A drift is not an
error: it means a publisher updated the data, and the asset should be rebuilt on purpose
(`REFRESH=1` with the build step), reviewed and committed.

## Consequences

- The four requests add up to about 20 s to an import in the worst case measured (the flood
  susceptibility service took 20 s once and 0.8 s later); they run together, after the terrain.
- "Not mapped" is decided by the extent's answer, not by the services' own coverage layers
  (`…Dekning`). Where a coverage layer says an area was never surveyed, the studio still says "Not
  mapped by NVE", which is true but less informative. A follow-up could read the coverage layers.
- The health check covers the sources added by ADR-0033 to ADR-0036. The older OpenStreetMap and
  elevation caches have no recorded request and are not re-queried.

## Verification (2026-11-16)

- **Done-when:** Compact Infill reports flood zones "Not mapped by NVE" and quick-clay
  susceptibility "Mapped here", each with source and dates (unit test on the shipped asset, and read
  in the production build). Sloped Edge: flood zones and flood susceptibility "Not mapped by NVE",
  quick clay "Mapped here", storm surge "Not mapped by Kartverket".
- `hazards.test.ts`: status (reaching, inside, covering, elsewhere, in a hole, empty, unanswered);
  wording (order, sources, dates; no "safe", depth or class outside the disclaimer); the panel;
  parser; converter (clipping, newest date, empty answer, truncated or foreign answer); request URLs.
- Health check: 16 sources, 16 unchanged, 0 failed.
- Capture: `docs/screenshots/build-hazards-panel.png`.
- Not verified: a live import in the browser with hazard facts (converter and import path are
  unit-tested; the noise layer was checked live on the same path).
