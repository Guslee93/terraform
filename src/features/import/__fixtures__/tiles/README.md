# C4 recorded vector tiles

Fetched 2026-10-28, 14:22:28 UTC from OpenFreeMap. `tilejson.json` is the complete TileJSON response (schema version 3.0.0); the snapshot/template is `https://tiles.openfreemap.org/planet/20261025_080012_pt/{z}/{x}/{y}.pbf`.

| File | Bytes | URL / use |
|---|---:|---|
| 14-8681-4764.pbf | 207705 | https://tiles.openfreemap.org/planet/20261025_080012_pt/14/8681/4764.pbf — Grünerløkka north |
| 14-8681-4765.pbf | 330609 | https://tiles.openfreemap.org/planet/20261025_080012_pt/14/8681/4765.pbf — Grünerløkka south; seam north |
| 14-8681-4766.pbf | 199109 | https://tiles.openfreemap.org/planet/20261025_080012_pt/14/8681/4766.pbf — Bjørvika; seam south |

Seam regression: MVT building id **9090116012**, east of Oslo S, around longitude 10.7536 and latitude 59.91097597079679 (the y=4766 northern tile boundary). The test uses a 200 m frame centred on that seam, verifies fragments exist on both tiles, and verifies the repaired union is one simple ring larger than either tile's portion. This reuses the Oslo frame tiles; no extra tiles are retained.

© OpenMapTiles, © OpenStreetMap contributors, tiles by OpenFreeMap. Derived OSM data: ODbL 1.0, https://opendatacommons.org/licenses/odbl/1-0/ and https://www.openstreetmap.org/copyright . TileJSON URL: https://tiles.openfreemap.org/planet . The pinned snapshot makes offline tests repeatable. These are context buildings, not surveyed or cadastral data.
