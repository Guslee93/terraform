# 09 — Foundation verification (final focused investigation)

**Date:** 2026-11-15 · **Baseline:** `2089fd4` (production, tag `pre-feasibility`) · **Branch:** `feasibility/audit`
**Isolation:** all code is under `feasibility/scratch/`. Production code, packages and deployment are untouched (`git diff pre-feasibility -- src public` is empty).

Five questions, each answered with evidence. Raw outputs are in `feasibility/scratch/evidence/`.

---

## 1. Can terrain, parcels and an environmental dataset be registered and shown together in Terraform's 3D frame?

**Yes. Demonstrated in an isolated three.js viewer** (`feasibility/scratch/registration/`). It uses the same local ENU convention as the app (x = East, y = Up, z = −North; ADR-0002) and the app's own projection formula (`projection.ts`).

| Layer | Source | How it enters the frame |
|---|---|---|
| Terrain | Kartverket DTM1 WCS, 1 m → 2 m mesh | every vertex: EPSG:25833 → WGS84 → app ENU; z = DTM − originElevation (20.28 m) |
| Environmental | Statens vegvesen strategic road noise **Lden 2021**: **104 vector polygons** via WFS GeoJSON (`norstoy_1_0:Strategiskstoykart_lden`) | rasterised to the terrain's own grid, so UV = grid index (exact) |
| Parcels | Kartverket matrikkel teig WFS: 328 parcels, 343 rings | ENU per vertex, draped at DTM + 0.25 m |
| Reference | App's curated OSM buildings and major roads | already ENU |

**Screenshots:**
- `evidence/registration-top.png`
- `evidence/registration-oblique.png`

| Registration check | Result | Reading |
|---|---|---|
| Naive shortcut (UTM offsets used as ENU) | **27.2 m** error at tile corners; UTM north is **−3.67°** in the app frame | Per-vertex reprojection is **mandatory** |
| OSM building vertices → nearest parcel boundary | median **0.59 m** at zero shift; 1.07–1.15 m at ±1 m; 1.94–2.06 m at ±2 m | clear minimum at zero, so parcels and buildings register **< 1 m** |
| Major-road centreline inside the ≥ 65 dB polygons | **95.6 %** at zero shift; 82.8–95.2 % at ±8 m | consistent; the band is wide, so this is coarse |
| Noise polygons leave holes exactly at building footprints | visible in both screenshots | independent confirmation of horizontal alignment |
| App terrain grid vs DTM1 (from 04 §2.1) | RMSE **0.039 m** | vertical registration holds |
| Building base vs DTM at centroid | median −0.61 m, p90 \|Δ\| 1.04 m | expected: the base is the lowest ground under the outline |

**Not covered:** live-tile streaming, level of detail, performance with the overlay inside the production renderer, and phone devices. The prototype draws one 300 × 300 vertex mesh plus about 400 extrusions in a single static frame.

## 2. Can the official noise dataset replace the existing heuristic?

**Yes, as the default noise layer, with three conditions.** It's better data, openly licensed, and covers every urban test place. But it *cannot* react to a drawn block.

| Question | Evidence | Answer |
|---|---|---|
| Accuracy vs the heuristic | Same 5 dB band at only 46.9 % of 32 points; the heuristic reads −5.7 dB on average where mapped (04 §2.3) | the heuristic is not a credible dB value |
| What it is | CNOSSOS-EU via NorStøy 3.4; road source only (`STØYKILDE V`); `BEREGNETÅR 2021`, computed 2022-11-28; bands from 50 dB in 5 dB steps; buildings are holes | strategic noise map (EU noise directive), not T-1442 planning zones, not façade levels |
| Geographic coverage (11 places, 600 m tiles) | **Present:** three Oslo areas (Grünerløkka 104 polygons, Nordstrand 21, Holmenkollen 17), Bærum, Bergen, Trondheim, Stavanger, Kristiansand, Lillehammer, Tromsø. **Absent:** rural E6 Dombås (only the 2040 forecast map, `Stoyvarselkart`) | urban Norway yes; outside the big-city areas only major roads (AADT > 8 200) are mapped |
| Formats | WMS + **WFS GeoJSON** (1.0 MB per 600 m tile), CORS `*`, no key | vector at build time; no runtime dependency needed |
| Licence | Geonorge metadata: **open data, NLOD 1.0**; service caps `AccessConstraints NONE`, `Fees NONE` | commercial use allowed with attribution |
| **Use limitation** (metadata, verbatim) | *"Datasettet skal ikke brukes til å vurdere behov for tiltak på enkeltbygg. Det må utføres egne beregninger for dette."* (T-1442 dataset: *"…ikke brukes til detaljvurdering av enkeltboliger…"*) | the product must say it isn't for assessing individual buildings |
| Rail / aircraft | Bane NOR zones open ("no conditions apply"), none at the site; Avinor not tested | add rail later as a separate layer |
| Old municipality codes | `KOMM` 3024 (Bærum), 4601 (Bergen) | data predate the 2024 county reform; harmless but shows age |

**Conditions for replacing the heuristic:**
1. **It is static.** It describes 2021 traffic around existing buildings. A user's added block does **not** change it. The card must stop implying reactivity, and the heuristic must not stay as a silent fallback.
2. **Wording:** "Road noise, Lden 2021 (Statens vegvesen strategic noise map, CNOSSOS-EU). 5 dB bands. Not for assessing individual buildings." Show bands, never a single peak number like "61 dB".
3. **Coverage state:** where the WFS returns nothing, say "No strategic noise map here", never "quiet".

### 2a. Usage restrictions: exact wording and what they mean for Terraform

Verified 2026-11-15 in the **authoritative ISO 19115 records** (Geonorge CSW `GetRecordById`, saved as `evidence/csw-<uuid>.xml`) and the Geonorge metadata API (`evidence/meta-<uuid>.json`). English renderings are mine, not official.

| Record (owner, uuid) | Field | Exact wording (Norwegian, verbatim) | English rendering |
|---|---|---|---|
| **Støy Veg WMS** (Statens vegvesen, `4bbae38e-4718-481d-9827-237cd5e115c8`): the service carrying `Strategiskstoykart_lden/_lnight` | `useLimitation` | «Datasettet skal ikke brukes til å vurdere behov for tiltak på enkeltbygg. Det må utføres egne beregninger for dette.» | The dataset must not be used to assess the need for measures on individual buildings. Separate calculations must be made for that. |
| same | `specificUsage` (extract) | «Det skal alltid gjøres mer nøyaktige støyberegninger dersom det er aktuelt med utbygging av støyømfintlig bebyggelse innenfor støysonene.» | More accurate noise calculations must always be made when noise-sensitive development within the noise zones is in question. |
| same | `specificUsage` (extract) | «De strategiske støykartene viser støysituasjonen fra vegtrafikk ved årsskiftet 2016/2017 …» | The strategic maps show the road-traffic noise situation at the turn of 2016/2017 … |
| same | licence / access | «Åpne data» · «Norsk lisens for offentlige data (NLOD)» | Open data, NLOD 1.0 |
| **Støykartlegging veg etter T-1442** (Statens vegvesen, `d6db9f39-9725-4630-909e-5e62f09a0766`) | `useLimitation` | «Kartene skal ikke brukes til detaljvurdering av enkeltboliger, til det er usikkerheten i inngangsdata for stor» | The maps must not be used for detailed assessment of individual dwellings; the uncertainty in the input data is too large for that. |
| **Støykart – strategisk støykartlegging** (Miljødirektoratet, `93a154a7-…`) | `useLimitation` | *(empty)*; usage «Rapportering til EUs støydirektiv» | Reporting under the EU Environmental Noise Directive |

**Metadata vs data disagreement:** the WMS record's prose says 2016/2017, while every feature fetched carries `BEREGNETÅR = 2021` and `BEREGNINGSDATO = 20221128`. **The feature attributes win.** Terraform must display the year read from the data, never from catalogue prose.

**Implications for Terraform (binding on the design phase):**

1. **No per-building noise numbers.** No façade value, no "your block: 63 dB", no click-a-building readout, no per-dwelling report. The noise view shows **area bands only**.
2. **Drawn blocks:** when a user's block lies in a mapped band, Terraform must not say whether it's acceptable. It may say: *"Noise-sensitive development here requires a detailed noise calculation (Statens vegvesen; T-1442)."*
3. **Not a planning zone map.** The strategic Lden/Lnight map is EU-directive reporting, not the T-1442 red/yellow zones municipalities use in planning. The label must say "strategic noise map" and never "støysone".
4. **Static context.** The layer describes 2021 traffic around existing buildings. It doesn't respond to new geometry, and the UI must not animate it as if it did.
5. **Exports carry the terms.** Image and video export (ADR-0019) must burn in the attribution and a short form of the limitation, because NLOD attribution travels with the content.
6. **Attribution text:** "Contains data under the Norwegian licence for Open Government data (NLOD) distributed by Statens vegvesen" + licence link + source link, with the calculation year from the data.

## 3. Best practical method for replacing inaccurate OSM building heights

**Recommendation: run the app's existing DOM roof fit (`src/features/import/roofFit.ts`, ADR-0022) over the curated sites at package-build time.** It's already tested, needs no new dependency, uses open CC BY 4.0 data, and the import path already uses it in production.

| Option | Access | Tested here | Verdict |
|---|---|---|---|
| **A. DOM roof fit (existing `roofFit.ts`)** | Kartverket NHM DOM WCS, open ("no conditions"; dataset DOM1 CC BY 4.0) | **Yes:** 336 of 337 curated buildings measured (194 gabled, 98 flat, 44 complex, 1 unmeasured) | **Use** |
| B. nDSM percentile per footprint (DOM − DTM, p90) | same | yes (04 §2.2) | simpler, no roof shape; superseded by A |
| C. OSM `building:levels` × 3.2 + 0.4 m (today) | ODbL | **yes: all 520 curated heights are this estimate** | replace |
| D. FKB-Bygning (Geovekst, roof edges/ridges) | **Norge digitalt restricted** | no | authoritative but needs an agreement |
| E. Matrikkel bygningspunkt (open) | open | **failed:** server error `relation "matrikkelenbygning.sefrakident" does not exist` (2026-11-15) | point data only; no heights expected |
| F. Municipal 3D city model | Trondheim has an open one; **none found for Oslo** | no | city-specific |
| G. LiDAR point clouds (høydedata) | open | no | highest fidelity, heavier pipeline; same epoch as DOM |

**Measured effect** (`height-bench.test.ts`, app code unchanged):
- **Height difference:** measured − estimated height has a median of **+1.2 m** (p10 −3.8, p90 +4.6). Mean \|Δ\| is 2.95 m, and only **56 %** are within 3 m.
- **Sun hours** in the default r = 100 m circle:
  - 21 June: **14.6 %** of ground cells change by ≥ 1 h (mean \|Δ\| 0.46 h); façade median goes from 3.75 to 3.0 h.
  - 20 March: 5.9 % of ground cells change by ≥ 1 h (mean \|Δ\| 0.32 h).

**Limits to state:**
- Lidar epoch ≠ map epoch, so new or demolished buildings fall out as "not measured".
- Trees overhanging roofs can bias the fit.
- The analyses still use one flat height per building (ADR-0022).
- No independent open ground truth exists for Oslo: FKB is restricted. Agreement with DOM is measurement, not survey.

**Licensing of the result:**
- **Separate layer:** keep measured heights in a **separate file keyed by OSM id** (CC BY 4.0, "© Kartverket"), not merged into the ODbL footprint file. CC BY 4.0's no-additional-restrictions clause and ODbL share-alike are cleanest kept apart.
- **Footprints:** if footprint and height are merged and distributed, the merged database must be ODbL.
- This is a legal reading, not legal advice.

## 4. Licences and attribution for the proposed first-release features

Source: Geonorge metadata API (`kartkatalog.geonorge.no/api/getdata/{uuid}`), retrieved 2026-11-15 (`evidence/licence-metadata-2026-11-15.json`), plus the publishers' terms pages.

| Feature | Dataset (owner) | Access · licence (metadata) | Use limitation (metadata) | Attribution to show |
|---|---|---|---|---|
| Terrain | NHM DTM 25833 WCS (Kartverket) | open; "no conditions apply" | — | **"© Kartverket"** (Kartverket terms: CC BY 4.0 for free products, link where possible; commercial use allowed) |
| Building heights | NHM DOM 25833 WCS; dataset Høyde DOM1 | open; **CC BY 4.0** | — | "© Kartverket" |
| Parcels | Matrikkelen Eiendomskart Teig (+ WFS) | open; **CC BY 4.0** | "Ingen begrensninger på bruk er oppgitt" | "© Kartverket"; label "eiendomskart, not a surveyed boundary" |
| Road noise | SVV Støy veg (WMS/WFS) | open; **NLOD 1.0** | not for measures on individual buildings (§2) | NLOD default: "Contains data under the Norwegian licence for Open Government data (NLOD) distributed by Statens vegvesen" + licence link |
| Flood zones | NVE Flomsoner | open; **NLOD** | none stated | "Kilde: NVE" (product sheet) + NLOD link |
| Flood susceptibility | NVE Flom aktsomhetsområder | open; NLOD | none stated | "Kilde: NVE" |
| Quick-clay susceptibility | NVE Aktsomhetskart kvikkleireskred | open; NLOD | — | "Kilde: NVE" |
| Storm surge | Kartverket Stormflo og havnivå | open; **NLOD** | modelled areas "ikke tilpasset detaljerte studier eller … avgjørelser på detaljnivå" | "© Kartverket" / NLOD link; show the limitation |
| Rail noise (later) | Bane NOR støysoner | open; no conditions | none stated | "Bane NOR" |
| Footprints, roads, trees | OpenStreetMap | **ODbL 1.0** | share-alike on derived databases | "© OpenStreetMap contributors" with a link to the copyright page (already in the app) |

**Traps found:**
- **Restricted terrain service:** "Høyde DTM Sømløs WCS" is **Norge digitalt restricted**. Use only the NHM WCS services (open), as the app does today.
- **Kartverket WMS caches:** Kartverket's terms say WMS/cache services at zoom 12–20 contain Geovekst data, and use "beyond normal service use" needs permission. Take parcels from the **WFS dataset (CC BY 4.0)**, not by copying matrikkelkart WMS tiles.
- **NLOD attribution:** NLOD requires naming the licensor, referencing the licence, and linking to the licence and the source where practical. A single "Data sources" panel with per-layer lines and links satisfies all of the above.
- **PVGIS:** not in the first release. Its commercial terms remain unconfirmed (02).

## 5. Existing visualisations that need clearer limitations or revised labels

Reviewed from the running production build (`evidence/labels-*.png`, `labels-text.json`) and the source.

| Where | Current label / behaviour | Problem | Recommended change |
|---|---|---|---|
| Noise card headline | **"61 dB · peak · secondary road"** | a heuristic shown as a precise level; the official band at the origin is 55–60, and 60–75 along the streets around the square | **Replace** with the official Lden bands (§2); no single-number headline |
| Noise map | study area painted 55–65 dB | under-reads the official map by about 6 dB; reacts to blocks, which implies a propagation model | retire the heuristic layer (or rename it "relative road proximity", no dB) |
| Noise disclaimer | "Indicative road-noise screening — not a noise survey" | true but not enough | add source/year and the NLOD use limitation |
| Wind comfort legend | Lawson classes incl. **"Unsafe (> 15 m/s)"** | a safety class from a 2D laminar solve at one chosen speed | remove the safety class; rename the view "Indicative wind speed classes at the chosen wind" |
| Wind card headline | "3 % · worst Walking" | reads like a comfort result | "Share of open ground ≥ 4 m/s at W 6 m/s (your input)" |
| Wind resolution note | "about 1.8 m resolution" | can be read as accuracy | "grid spacing 1.8 m (not accuracy)" |
| 8-direction worst case | equal weights (already stated) | fine, but users will read it as climate | keep the note; add a climate-weighted rose later (06 2.2) |
| Downwash rule | "A rule, not simulated" | good | keep |
| 3D streamline rise | "visual rule" | good | keep |
| Sun card headline | "8.8 h median ground" | 0.1 h precision while heights move 14.6 % of cells by ≥ 1 h | round to 0.5 h until heights are measured; then keep 0.5 h |
| Sun disclaimer | "geometric, clear sky, buildings only" | does not say heights are estimated or that terrain and trees cast no shade | "…buildings only (heights estimated from storeys); terrain and trees do not shade" → after §3: "heights from Kartverket surface model" |
| Roof solar | "clear sky … upper bound … not a yield estimate" | good; PVGIS shows ×1.28 | add "about 30 % above typical measured weather" |
| VSC | "early massing screening, not a daylight assessment" | good | keep |
| Trees layer | curated trees are mapped OSM trees; imports may be **illustrative** | the curated legend does not say trees are display-only in the analyses | add "Trees are shown, not analysed" |
| Panel footer | "Indicative screening — not planning advice" | good | keep |
| Site attribution | "© OpenStreetMap contributors · © Kartverket" | will need NVE/SVV/NLOD lines when overlays arrive | per-layer source lines (§4) |
