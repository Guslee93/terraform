# 02 — Data source register

**Test date:** 2026-11-15 (all live responses below are from that date) · **Test site:** Compact Infill, origin 59.9235 N 10.758 E = EUREF89 UTM33 E 262 952.9 N 6 650 490.4 · **Machine:** MacBook Pro M1 Pro (MacBookPro18,1)
**Evidence folder:** `feasibility/scratch/evidence/` (raw responses, JSON summaries). Re-run with `feasibility/scratch/probe_services.py`.

Status words used below:

- **Tested** — a live request returned data at or near the test site on the test date.
- **Answered, no data at site** — the service works, but nothing is mapped at the test site. *Absence of a mapped hazard is not evidence of safety.*
- **Blocked** — the request was refused (401) or the service is restricted.
- **Researched** — documentation only, no live request.

> **Licences confirmed later** from Geonorge metadata for every first-release layer: see 09 §4. That supersedes the "to verify" notes below for Statens vegvesen (NLOD, with a use limitation), Bane NOR (no conditions) and Kartverket storm surge (NLOD).

A WMS that draws a hazard is **data delivery, not a computation**. No service below is a callable engineering simulation.

---

## 1. Summary table

| # | Source (authority) | Dataset / service | Status at test site | Format · auth | Browser CORS | Licence (per metadata) | Module |
|---|---|---|---|---|---|---|---|
| 1 | Kartverket | Height API `ws.geonorge.no/hoydedata/v1/punkt` | **Tested**: z = 20.42 m, `datakilde: dtm1`, terrain `BymessigBebyggelse` | JSON · none | `*` | CC BY 4.0 | E, D, all |
| 2 | Kartverket | DTM1 WCS `wcs.geonorge.no/skwms1/wcs.hoyde-dtm-nhm-25833`, coverage `nhm_dtm_topo_25833` | **Tested**: 600 × 600 m GeoTIFF at 1 m, 1.6 MB, 1.9 s; 1.30–32.24 m | GeoTIFF float32, EPSG:25833 · none; caps: `fees free`, `accessConstraints None` | `*` | CC BY 4.0 | E, D, B, F |
| 3 | Kartverket | DOM (surface) WCS `wcs.hoyde-dom-nhm-25833`, `nhm_dom_topo_25833` | **Tested**: same tile; used for building registration | GeoTIFF · none | `*` (same host) | CC BY 4.0 | A, B, E |
| 4 | Kartverket | Matrikkel teig WFS `wfs.geonorge.no/skwms1/wfs.matrikkelen-eiendomskart-teig` | **Tested**: parcel teig 291468076 (0301-228/255), polygon 465.1 m², data capture 1995-11-30, updated 2020-06-16; > 200 parcels in a 600 m box | GML 3.2 · none | `*` | Catalogue: "no restrictions"; Kartverket free products CC BY 4.0 | G, E |
| 5 | Kartverket | Eiendom REST `api.kartverket.no/eiendom/v1/punkt` | **Tested**: 0301-228/255, `nøyaktighetsklasseteig: "Gult"` | JSON · none | `*` | as above | G |
| 6 | Kartverket | Matrikkelkart WMS `wms.geonorge.no/skwms1/wms.matrikkelkart` | **Tested**: feature info returns boundary `objid 17206790` | WMS · none (caps say `Fees: Norge digital`) | `*` | as above; the `Fees` field needs clarifying | G |
| 7 | Kartverket | Stormflo og havnivå WFS/WMS (`wfs.stormflo_havniva`, `wms.stormflo_havniva`) | **Answered**: storm-surge polygons (200/1000-yr, 2100, upper estimate) intersect the **600 m bbox**; nothing at the origin point | GML / WMS · none | `*` | "no restrictions" | D |
| 8 | NVE | Flomsoner WMS `kart.nve.no/enterprise/services/Flomsoner2/MapServer/WMSServer` and WFS `wfs.geonorge.no/skwms1/wfs.flomsoner` | **Answered, no data at site**: 0 `FlomAreal` features in 600 m bbox; "No features found" at origin for 20/200/500/1000-yr and climate layers | WMS 1.3 / WFS 2.0 · none | NVE echoes the origin; Geonorge `*` | NLOD; attribution "Kilde: NVE" (product sheet) | D |
| 9 | NVE | Flomaktsomhet WMS `.../Flomaktsomhet/MapServer/WMSServer` | **Tested**: coverage layer `FlomAktsomhet_Dekning` covers the site; `Flom_aktsomhetsomrade` empty at origin | WMS · none | origin echoed | NLOD | D |
| 10 | NVE | Kvikkleire (quick clay) WFS + aktsomhet WFS | **Tested**: 5 `AktsomhetsOmrKvikkleireskred` features in the 600 m bbox; 0 mapped hazard zones (`KvikkleireFaresoneAvgr`) | GML · none | `*` | NLOD | D, E |
| 11 | NVE | Old WMS host `nve.geodataonline.no/.../Flomsoner1` | **Failed** (connection, 2026-11-15). Geonorge says it was retired and NVE has moved services to `kart.nve.no/enterprise` | — | — | — | D |
| 12 | Statens vegvesen | Strategic noise map WMS `www.vegvesen.no/kart/ogc/norstoy_1_0/ows`, layers `Strategiskstoykart_lden`, `_lnight`, `Stoyvarselkart` | **Tested**: origin lies in band **Lden 55** (55–59.9 dB), Lnight 50; method "NorStøy 3.4, Cnossos"; source "ERF roads with AADT > 8200; in major urban areas all ERF and municipal roads with AADT > 500"; `BEREGNETÅR = 2021`, `DATAFANGSTDATO = 2022-11-28`, `KOMM = 301` | WMS 1.3 · none; caps `AccessConstraints NONE`, `Fees NONE` | `*` | Licence not stated in caps; to verify (catalogue says "no restrictions") | C |
| 13 | Statens vegvesen | T-1442 road noise zones WFS `wfs.geonorge.no/skwms1/wfs.stoy_veg` | **Answered, no data at site**: 0 features in 600 m bbox (national/county roads only; Oslo municipal roads are not in it) | GML · none | `*` | "no restrictions" | C |
| 14 | Bane NOR | Railway noise zones WMS `wms.geonorge.no/skwms1/wms.stoysonerjernbanenett` | **Answered, no data at site** (point query) | WMS · none | `*` | "no restrictions" | C |
| 15 | Avinor | Airport noise zones (dataset) | Researched only; Oslo Airport is ~35 km from the site | download | — | "no restrictions" | C |
| 16 | DiBK | NAP zoning WMS `nap.ft.dibk.no/services/wms/reguleringsplaner/` (54 queryable layers, vn1–vn5) | **Answered, no data in Oslo**: nothing at either Oslo test point. **Control:** returns plans in Bergen, Trondheim and Lillestrøm; nothing in Drammen | WMS · none (caps `Fees none`) | origin echoed | © DiBK 2025; dataset itself flagged "norway digital restricted" | G |
| 17 | DiBK | NAP OGC API Features `nap.ft.dibk.no/services/rest/reguleringsplaner/vn1` | **Blocked: HTTP 401**. Download also restricted to Norge digitalt partners | OGC API · restricted | — | Norge digitalt | G |
| 18 | Geonorge | `wms.geonorge.no/skwms1/wms.reguleringsplaner` | **Failed: HTTP 500** on GetCapabilities | — | — | — | G |
| 19 | Oslo kommune PBE | Planinnsyn `od2.pbe.oslo.kommune.no/kart/` | Web viewer answers 200; MapServer backend needs an internal `map` parameter; **no documented open API found** | HTML app | — | Unknown. Not reverse-engineered on purpose | G |
| 20 | Geonorge | Kartkatalog search API `kartkatalog.geonorge.no/api/search` | **Tested**: used to find every service above | JSON · none | — | — | all |
| 21 | MET Norway | Frost `frost.met.no` (observations, sources) | **Blocked: HTTP 401** without client ID (expected). Registration: e-mail only, gives client ID + secret | JSON-LD · client ID (Basic auth) | not tested | Error body cites CC BY 3.0 NO; MET open data generally NLOD / CC BY 4.0, credit "MET Norway" | B, F |
| 22 | MET Norway | Locationforecast 2.0 `api.met.no/weatherapi/locationforecast/2.0/compact` | **Tested**: 200 at site (forecast only, not climate) | JSON · identifying User-Agent required by terms | `*` | NLOD / CC BY 4.0 | (B, context) |
| 23 | EU JRC | PVGIS 5.3 `re.jrc.ec.europa.eu/api/v5_3/MRcalc`, `/tmy` | **Tested**: horizontal irradiation 2014–2023 mean **965 kWh/m²·yr** (910–1062); TMY hourly incl. `WS10m`, `WD10m` (8760 h); `radiation_db PVGIS-SARAH3`, `meteo_db ERA5` | JSON · none; 30 calls/s per IP | **No CORS header** → proxy or precompute | JRC reuse "authorised provided the source is acknowledged" (catalogue notice); API-specific commercial terms **not found** | A, B, F |
| 24 | MET / NVE | seNorge 1 km snow (SWE, depth) via THREDDS | Researched only | NetCDF/OPeNDAP | — | MET datasets NLOD/CC BY 4.0; NVE snow licence not confirmed | F |
| 25 | Norsk klimaservicesenter | Climate profiles (county, 2025; municipal profiles rolling out), IDF curves, climate allowance | Researched only. Oslo/Akershus profile (2017) proposes **≥ 40 % climate allowance** for showers < 3 h; updated profiles from Oct 2025. **No IDF API found** | PDF / web | — | — | D, F |
| 26 | Copernicus | ERA5 via CDS | Researched only; needs CDS account | NetCDF / GRIB | — | Copernicus licence (attribution) | B |
| 27 | OpenStreetMap / OpenFreeMap / Photon | Already used by the app (footprints, roads, water, geocoding) | **Tested by the app's own pipeline**; registration result in 04 §2 | — | — | ODbL 1.0 (share-alike on derived databases) | all |
| 28 | Miljødirektoratet / Oslo kommune | Strategic noise mapping (Støydirektivet), Oslo action plan | Researched only. Oslo's pages use Lden 55/65 thresholds; newest figures found are for 2021 | — | — | — | C |

---

## 2. Site findings that matter for the modules

1. **Flood (D).** NVE has **not mapped flood zones** at Compact Infill: 0 `FlomAreal` features within ±300 m, although Akerselva runs through the tile. The coarse flood-susceptibility map *covers* the area but marks no susceptibility polygon at the origin. Storm-surge polygons reach into the 600 m box (not checked against the site footprint). Quick-clay *susceptibility* polygons are present in the box. The product must say "not mapped by NVE" and never "no flood risk".
2. **Noise (C).** The official strategic map exists at the site, with Lden and Lnight from CNOSSOS-EU (2021 traffic, computed 2022). It is a **strategic** map in 5 dB bands. The assessment height isn't in the service attributes; 4 m is the EU noise-directive convention and should be verified. It is **not** a T-1442 planning zone map, and not a façade calculation.
3. **Planning (G).** Parcel geometry is open (Kartverket). **Oslo's zoning plans are not available through any open machine interface we found.** The national NAP open WMS returns nothing in Oslo, but does return plans in other municipalities, so coverage depends on the municipality. The structured API is restricted to Norge digitalt partners (HTTP 401).
4. **Terrain (E).** DTM1 is available at 1 m with no key, and is free to use with attribution. The height API and the WCS agree within RMSE 0.053 m over 25 points. Both come from DTM1, so this checks consistency, not accuracy.
5. **Climate inputs (A, B, F).** PVGIS gives keyless hourly irradiance and 10 m wind at roughly 30 km (ERA5 grid) resolution. It has no CORS header and no explicit commercial terms. Frost (station observations, e.g. Oslo-Blindern SN18700) needs a free client ID, which the owner can supply later.

## 3. Licence and attribution obligations (to carry into the product)

| Source | Obligation recorded | Confidence |
|---|---|---|
| Kartverket (DTM/DOM/matrikkel) | Credit "© Kartverket" (CC BY 4.0) | High: already in app per M1 research and Kartverket terms |
| NVE | NLOD; credit text "Kilde: NVE" | High (product sheet) |
| Statens vegvesen, Bane NOR | Catalogue "no restrictions"; licence text not seen in service caps | **Medium: verify licence page before release** |
| DiBK NAP | Open WMS shows © DiBK; dataset restricted to Norge digitalt partners | Medium |
| MET Norway | NLOD or CC BY 4.0; credit "MET Norway"; identifying User-Agent for api.met.no | High (MET licensing page) |
| PVGIS / JRC | Acknowledge source; **commercial use of API output not confirmed** | **Low: verify before any SaaS use** |
| OpenStreetMap | ODbL 1.0 attribution; share-alike on derived databases | High |

## 4. What changes outside Oslo

- **Norway:** Kartverket terrain/parcels and NVE hazard data are national and uniform. Zoning-plan availability varies by municipality: NAP open WMS works for Bergen, Trondheim and Lillestrøm, but not for Oslo or Drammen in this test. Noise maps exist only where Statens vegvesen or the municipality has mapped them.
- **Sweden/Denmark/Finland:** different authorities (Lantmäteriet, SDFI, MML), terms and keys. The app already falls back to AWS Terrarium terrain outside Norway (its resolution in the Nordics was not checked here). None of the Norwegian hazard, noise or planning services apply.
- **International:** only global sources carry over (OSM, ERA5, PVGIS for Europe/Africa/Asia). Every regulatory overlay needs its own register row.
