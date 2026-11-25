# Orthophoto source and licence (TF-VIS-028a)

**Date:** 2026-11-19 · **Researcher:** Claude Opus 5.5 · **Decision owner:** the owner (decision D13)
**Question:** may Terraform — a public, portfolio web app that is not a Norge digitalt member — show Norwegian orthophotos on its terrain, stored in a static site package and burned into exported stills and clips?

**Short answer: not Norge i bilder, without written permission.** The service and the dataset are restricted to Norge digitalt members; the public may use the viewer, and screenshots with credit. Copying the imagery into a package, or using the WMS/WMTS services in our own system, needs permission from the licensees. No orthophoto has been fetched or committed.

## Evidence

| Source | Finding |
|---|---|
| Geonorge catalogue, *Norge i bilder* (metadata `e7cd5f9b-20e1-4f59-b379-64828cd38062`, via `kartkatalog.geonorge.no/api/getdata/…`) | Distribution format "Webapplikasjon"; AccessConstraints "Åpne data"; no conditions. This record is the **viewer**, not the imagery |
| Geonorge, *Norge i bilder WMTS (Euref89 UTM32)* (`9f4fa948-a841-4194-b63f-c052cf7ff90b`) | AccessConstraints **"Norge digitalt begrenset"**; UseConstraints "Lisens"; licence "Norge digitalt-lisens" |
| Geonorge, *Digitale ortofoto* (`d5b180dd-0cef-4c4a-9174-ba5af69c3551`, owner Kartverket) | AccessConstraints **"Norge digitalt begrenset"**; licence "Norge digitalt-lisens"; formats TIFF/ECW/PNG/JPEG/GeoTIFF |
| Kartverket, *Terms of use* (`kartverket.no/en/api-and-data/terms-of-use`, read 2026-11-19) | Free products are CC BY 4.0 with "©Kartverket". Aerial photos on norgeskart.no / norgeibilder.no are described as **licensed products, not free products**; screenshots of maps and aerial photos may be used freely with credit to the site; Geovekst data (WMS and cache services, zoom 12–20) needs special permission from the licensees to be copied or used in other ways; contact post@kartverket.no |
| Kartverket news, *Norge i bilder er oppgradert* (July 2026) | Everyone can explore orthophotos in the viewer; Norge digitalt members have extended rights, including WMS/WMTS in their own systems |
| Web search summary (secondary, not relied on) | The WMS and WMTS services use token access (GeoID); the old WMS endpoint is being retired in favour of services.norgeibilder.no. Not verified first-hand |

### Update 2026-11-24 — a free Norway-wide source exists (ADR-0041)

| Source | Finding |
|---|---|
| Geonorge, *Satellittdata - Sentinel-2 - Skyfri mosaikk WMS* (`38a52b73-2ffb-47cc-9ecd-147ee18f62be`), `https://wms.geonorge.no/skwms1/wms.sentinel2`, layer `sentinel2` | Access "Åpne data", no restrictions; EPSG:3857 among its projections; `access-control-allow-origin: *` |
| Geonorge, *Skyfritt opptak Norge 2015-2017 … 2025* (e.g. 2025: `a4b61196-c2a3-4b19-834a-07aef20377f2`) | Access "Åpne data", licence **CC BY 4.0**; the required credit is a Norwegian sentence naming the year, Copernicus (EU), Kartverket, CESBIO and CNES |

| Copernicus Data Space, *Optical VHR coverage over Europe 2021* (`dataspace.copernicus.eu/node/1308`) and the CSCDA/ESA User Licence (`cscda_esa_user_license.pdf`, read 2026-11-24) | 2–4 m, covering EEA-39. The **general public may only VIEW it** (download is limited to Copernicus services, EU institutions, EU research projects and public authorities). Licence §3.4.2: a VIEW user may not use the products "through any means other than those provided in the VIEW Service". Publishing on websites and in web mapping (§3.5.1.6) is a DOWNLOAD-service right. **Not usable in Terraform** without being an eligible user. The EEA's 2 m CLMS mosaic of the same data is "WMS only … due to licence restrictions"; its own terms could not be read (the EEA and land.copernicus.eu hosts did not answer) |

The Sentinel-2 WMS serves 10 m per pixel: soft, but free to show on the public site, and it covers all of Norway.
The Visual Lab uses it as the default ground image when no local photo exists (ADR-0041). It does not
replace the request for Norge i bilder (option A); it removes the need to wait for one.

## What this rules out

- Fetching tiles from the Norge i bilder WMS/WMTS (needs membership and a token).
- Saving viewer tiles or crops into `public/sites/*/` (copying, needs permission).
- Treating "screenshots are allowed" as permission to drape imagery on a 3D terrain and redistribute it in a package and in exports. That reading stretches the wording; do not rely on it without Kartverket's confirmation.

## Options

| Option | Fit | Effort | Status |
|---|---|---|---|
| **A. Ask permission** for the two curated sites (static package, public portfolio display, exported stills/clips, with credit) | Best look; exactly the references | One email; answer time unknown | **Recommended.** Draft below; the owner sends it |
| B. Sentinel-2 (Copernicus, free and open with attribution) | 10 m pixels: ≈ 64 px across a 640 m tile — useless near the site, usable only far away | Medium | Fallback for the far haze zone only |
| C. Commercial basemaps (Esri, Mapbox, Google) | Terms restrict caching/offline packaging and need accounts/keys | — | Not recommended (AGENTS.md §1.11 scope, licences) |
| D. Improve the land-cover fallback to the look spec palette, with relief shading from the 1 m tile | No imagery; reads as a stylised map, not a photo | Medium | Stand-in while A is pending |

## Draft permission request (for the owner to send to post@kartverket.no)

> **Emne:** Forespørsel om bruk av ortofoto (Norge i bilder) i et ikke-kommersielt porteføljeprosjekt
>
> Hei,
>
> Jeg er arkitekt og utvikler et ikke-kommersielt porteføljeprosjekt, «Terraform», en nettleserbasert 3D-studie av sol, vind, støy og avrenning for to små områder i Oslo (ca. 640 × 750 m hver). Jeg ønsker å bruke ortofoto som tekstur på terrengmodellen for disse to områdene.
>
> Bruken vil være: et statisk utklipp per område (ca. 0,25–0,5 m oppløsning), lagret i prosjektets datapakke og vist på et offentlig nettsted, samt i eksporterte stillbilder og korte videoer fra verktøyet. Bildene blir nedtonet (avmettet) og alltid kreditert «© Norge i bilder / Geovekst» (eller den kreditering dere ønsker). Ingen videredistribusjon av bildedataene, ingen kommersiell bruk.
>
> Er dette tillatt, og i så fall på hvilke vilkår og med hvilken kreditering? Hvis det krever en egen avtale, setter jeg pris på å høre hvem jeg bør kontakte.
>
> Med vennlig hilsen,
> [navn]

(The owner fills in name and any project link; nothing is sent automatically.)

## Recommendation

1. Owner sends the request (option A). Record the answer here verbatim, with its date.
2. Meanwhile, keep the land-cover fallback (option D) as the Lab stand-in and build the pipeline so a permitted image drops in without code changes (TF-VIS-028 can be built and tested on a synthetic or self-made texture).
3. If permission is refused or conditional in a way we cannot meet, choose between D as the shipped look and a different licensed source; that is a new decision (D13 stays open until then).
