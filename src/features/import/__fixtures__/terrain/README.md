# C5 recorded terrain grids

Live Kartverket høydedata responses, recorded on 2026-10-28:

| File | UTC fetch completed | Bytes | Frame centre [lat, lon] |
|---|---|---:|---|
| grunerlokka.json | 14:25:24.226 | 45683 | [59.9225, 10.7595] |
| bjorvika.json | 14:25:26.606 | 45171 | [59.9075, 10.7530] |

Both frames are 400 m squares. Points follow the C3 13 × 13 row-major grid, south to north and west to east, rounded to eight decimal places in longitude/latitude. Each fixture records the requested points, the exact four request URLs (49/49/49/22 points), and unmodified parsed JSON responses. Tests read these files locally; they never call the API.

Endpoint: https://ws.geonorge.no/hoydedata/v1/punkt?koordsys=4326&punkter=... . API schema: https://ws.geonorge.no/hoydedata/v1/openapi.json (1.1.1 when checked). Request-specific URLs are stored in `batches[].url`.

© Kartverket, CC BY 4.0. Terms: https://www.kartverket.no/api-og-data/vilkar-for-bruk/ ; licence: https://creativecommons.org/licenses/by/4.0/ . The data includes `dtm1`, `dybdekurver` and nulls. Raw sea-floor values are retained in these source fixtures; the importer models `Havflate` or `dybdekurver` samples as 0 m NN2000 water surface before recentring, not bathymetry. Bjørvika reproduces 113 measured, 54 water and two nearest-neighbour estimates; Grünerløkka has 169 measured nodes.

Terrarium tests use synthetic RGBA arrays to check decoding and interpolation; no live Terrarium imagery is needed for the offline suite. Its small browser PNG adapter is deliberately untested here and needs browser integration validation in P3/P5.
