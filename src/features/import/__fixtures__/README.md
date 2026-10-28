# Site-import fixtures

Recorded responses used by offline tests and mocked playback (no live network in tests).
Captured with `node scripts/record-import-fixtures.mjs` on **2026-10-28 UTC** with
the User-Agent `TerraformPortfolio/0.1 (D22 site-import fixture recorder; architectural study prototype)`. Files are raw, unmodified API responses.

| File | Endpoint | Bytes | Licence |
|---|---|---|---|
| `photon-grunerlokka.json` | <https://photon.komoot.io/api/?q=Gr%C3%BCnerl%C3%B8kka%20Oslo&limit=5> | 3248 | [ODbL 1.0 — data © OpenStreetMap contributors](https://opendatacommons.org/licenses/odbl/1-0/) |
| `photon-sodermalm.json` | <https://photon.komoot.io/api/?q=S%C3%B6dermalm%20Stockholm&limit=5> | 3461 | [ODbL 1.0 — data © OpenStreetMap contributors](https://opendatacommons.org/licenses/odbl/1-0/) |
| `kartverket-adresse.json` | <https://ws.geonorge.no/adresser/v1/sok?sok=Thorvald%20Meyers%20gate%2040%20Oslo&treffPerSide=5> | 3191 | [CC BY 4.0 — © Kartverket](https://creativecommons.org/licenses/by/4.0/) |
| `kartverket-hoyde.json` | <https://ws.geonorge.no/hoydedata/v1/punkt?koordsys=4326&punkter=%5B%5B10.7589%2C59.9219%5D%2C%5B10.7595%2C59.9219%5D%2C%5B10.7601%2C59.9219%5D%2C%5B10.7589%2C59.9225%5D%2C%5B10.7595%2C59.9225%5D%2C%5B10.7601%2C59.9225%5D%2C%5B10.7589%2C59.9231%5D%2C%5B10.7595%2C59.9231%5D%2C%5B10.7601%2C59.9231%5D%5D> | 1252 | [CC BY 4.0 — © Kartverket](https://creativecommons.org/licenses/by/4.0/) |

- Photon (komoot) serves OpenStreetMap-derived data under the Open Database
  Licence (ODbL 1.0); attribution for derived work: "© OpenStreetMap contributors".
- Kartverket høydedata and Adresse-API are CC BY 4.0; attribution: "© Kartverket".
- Do not re-record except when these endpoints change; keep the date column honest.
