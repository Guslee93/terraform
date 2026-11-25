# ADR-0039 — Snow: winter climate context

- **Status:** Accepted (2026-11-16, owner request: "make sure you also do the snow … analysis")
- **Amends:** the build plan's out-of-scope list, for climate context only. Snowdrift and snow loads
  stay out.
- **Relates to:** ADR-0032 (layer provenance), ADR-0026 (analysis cards), feasibility 03 §F, 07
  (Tier 2 "snow-climate context"; Tier 3 "quantitative snowdrift, snow loads"), 08 §3 and R10
- **Dependencies:** none added.

## Context

The owner's feasibility summary reads: "Winter climate data can potentially be visualized.
Snowdrift, accumulation and snow-load simulations need more research." Feasibility left snow at
"researched only": no series had been pulled and the licence was not confirmed. The plan therefore
listed snow as out of scope. The owner has now asked for it.

## What was verified first (2026-11-16)

- **A source that answers without credentials.** NVE's grid time-series API
  (`gts.nve.no/api/GridTimeSeries/{x}/{y}/{from}/{to}/sd.json`, coordinates in EPSG:25833) returns
  daily snow depth in cm for the model cell at a point, back to 1957, with the cell's altitude.
  MET's Frost was not used: it needs a client ID the project does not have.
- **Licence, read from the publisher's pages.** The API documentation page and NVE's open-data
  page both state: «Data som ligger på api.nve.no er lisensiert under Norsk lisens for offentlige
  data (NLOD) som er kompatibel med CC Navngivelse 3.0 Norge (CC BY 3.0).» and «Når du bruker data
  skal du så langt det lar seg gjøre lenke til den aktuelle tjenesten.» and «Data som ligger på
  tjenestelaget er "som den er". Den kan inneholde feil og utelatelser.»
  - The statement names `api.nve.no`; the service itself is on `gts.nve.no` and is documented on
    `api.nve.no`. I read the statement as covering it. **Owner: confirm with NVE before any
    commercial use.**
  - NVE does not state an NLOD version. The provenance contract gains the licence value `NLOD`
    (no version) so the studio does not claim one. The hazard layers of ADR-0036, which I had
    labelled "NLOD 1.0", are corrected to `NLOD` for the same reason.
- **No CORS header** on the API. It can be read at build time, not from a browser.

## Decision

1. **Data.** For each curated site, the daily snow depth of the model cell at the site origin for
   the winters 1990/91 to 2019/20 (the 1991–2020 normal period), fetched at build time
   (`scripts/site-assets/snow.build.ts`), cached raw with checksum and request, summarised into
   `snow.json` and registered with its provenance ("Kilde: NVE", NLOD, link to the service
   documentation). The site origin is converted to EPSG:25833 only to address the API
   (`scripts/site-assets/utm33.ts`, checked against the feasibility origin to 0.1 m); nothing in the
   app is placed with it.
2. **Statistics** (`src/features/analysis/snowClimate.ts`, renderer-free), per winter from
   1 September: days with at least 5 cm of snow, and the deepest snow. Over the period: the median
   and the extremes of both, and the mean depth by month, October to May. A winter cut short or with
   more than 10 missing days is dropped, not summarised from part of a season.
3. **A Snow card.** Headline: days with snow on the ground in a median winter. Body: the five
   figures, a bar per winter of its deepest snow, the model cell's altitude beside the site's, the
   period, and the limits. No map layer: one 1 km cell says nothing about where on a site snow lies.
4. **Claims.** "Winter climate context from a 1 km snow model for open terrain — not a measurement
   at the site. A street, a courtyard or a roof will differ." And: "Not snowdrift, not snow
   accumulating on or around buildings, and not a snow load. Those need a specialist study."
5. **Never used:** the same API offers a `snowload` theme. A snow load is an engineering value
   (NS-EN 1991-1-3; feasibility 08 §3). The build step reads `sd` only and says why.

## Results

| Site | Model cell altitude | Snow days, median (fewest–most) | Deepest snow, median (range) | Snowiest month on average |
|---|---|---|---|---|
| Compact Infill | 22 m | 30 (0–131) | 16 cm (5–56 cm) | February, 8 cm |
| Sloped Edge | 139 m | 52 (1–138) | 20 cm (5–61 cm) | February, 12 cm |

The extremes are the winters one would expect: 1993/94 the snowiest, 2019/20 nearly bare.

## Consequences and limits

- **Curated sites only.** An imported site has no snow context (no CORS); its card says so.
- The model is for open terrain on a 1 km grid; a city centre is warmer and its snow is cleared.
  The figures describe the neighbourhood's winters, not the site's surfaces.
- I describe the source as "NVE's snow model on the seNorge grid": the API documentation names the
  seNorge grid cells; it does not name the model version behind the `sd` theme.
- The period ends in 2020. Recent winters are not in it.
- Snowdrift, accumulation and snow loads remain Tier 3, as the owner's own summary says.

## Verification (2026-11-16)

- `snowClimate.test.ts`: day counts and maxima per winter on constructed series; median and
  extremes; monthly means; dropped partial and gappy winters; the parser; the card wording (no load,
  pressure, kN or kg/m² anywhere); the shipped assets (30 winters each, NVE, NLOD, the limitation);
  the higher site has more snow than the city-centre one.
- The build step checks the answer's theme, unit, resolution and first day before using it.
- Browser, production build: both curated sites. Captures:
  `docs/screenshots/build-snow-{compact-infill,sloped-edge}.png`.
