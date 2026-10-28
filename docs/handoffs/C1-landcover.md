# C1 — Land cover data: parks, grass, woods and water (Codex work order)

Role: implementer. Project: Terraform v1, an architectural portfolio prototype. Read `AGENTS.md`, then `docs/decisions/ADR-0005-scene-look.md` §5 and `docs/data/site-package-spec.md`. Follow how `roads.json` / `trees.json` were added in commit `3266547` — this task mirrors it for polygons.

## Goal

Make the offline site packages carry OSM land cover polygons so the scene can draw parks green and water blue. **Data and loading only. Rendering is not your job.**

## Do not touch

- Anything under `src/scene/`, `src/components/`, `src/app/`, `e2e/`.
- `public/sites/*/terrain.json`, `buildings.json`, `study-area.json`, `roads.json`, `trees.json` must stay byte-identical after the rebuild (`git diff --stat public/sites` may only show `manifest.json`, `attribution.md` and the new `landcover.json`).
- No new dependencies. No network: rebuild with `python3 scripts/build_site_packages.py --offline`.
- Do not commit. Leave the changes in the working tree.

## Spec

### 1. Builder (`scripts/build_site_packages.py`)

- New function `parse_osm_landcover(path, origin, extent) -> list[dict]` reading the cached `data/raw/<site>.osm`.
- Classify with this table (anything else is skipped):

| `kind` | OSM tags |
|---|---|
| `water` | `natural=water`, `waterway=riverbank`, `landuse=reservoir`, `landuse=basin` |
| `wood` | `natural=wood`, `landuse=forest` |
| `park` | `leisure=park`, `leisure=garden`, `landuse=recreation_ground`, `leisure=playground` |
| `grass` | `landuse=grass`, `landuse=meadow`, `landuse=village_green`, `natural=grassland`, `landuse=flowerbed` |

- Sources: closed ways, **and** `type=multipolygon` relations (assemble `outer` member ways into rings by joining ways end-to-end; ignore `inner` rings — record that simplification in `attribution.md` and the manifest `simplified` list). Skip rings that do not close.
- Project with the existing `project()`, clip each ring to the terrain extent with Sutherland–Hodgman (new helper `clip_ring(points, extent)`), drop results with area < 4 m², simplify with the existing `simplify()` at 0.5 m. Output rings open (first point not repeated), counter-clockwise.
- Write `landcover.json`: `{"schemaVersion": 1, "siteId": ..., "areas": [{"id": "<osm type>/<id>", "kind": "...", "ring": [[e, n], ...]}]}`, sorted by id. Add `"landcover": "landcover.json"` to `assetPaths`, a `simplified` line, and a short "Land cover" section to `attribution.md` (ODbL, which tags, inner rings ignored, polygons are illustrative ground tints).
- Extend `scripts/test_build_site_packages.py` with asserts for `clip_ring` (inside unchanged, half-outside cut, fully outside → empty) and the multipolygon ring joining (two ways that meet end-to-end, one reversed, form one ring).

### 2. Types and loading (`src/features/sites/`)

- `manifest.ts`: optional `assetPaths.landcover?: string`, parsed exactly like `roads`/`trees`.
- `package.ts`: `export type LandCoverKind = 'water' | 'park' | 'grass' | 'wood'`; `LandCoverArea = { id: string; kind: LandCoverKind; ring: Vec2Tuple[] }`; `LandCoverData`; `parseLandCover(value: unknown): LandCoverData` — rejects unknown kinds, rings with < 3 points, non-finite coordinates, zero area, > 5000 areas. `SitePackage` gains `landcover: LandCoverArea[]` (empty when the manifest has no path). `loadSitePackage` fetches it only when listed, and checks its `siteId`.
- Update `useSitePackage.test.tsx`'s sample package and the fake fetch in `fetchJson.test.ts` for the new file (same way roads/trees were added).
- Tests in `package.test.ts` / `fetchJson.test.ts`: both packaged files parse; a manifest without the path loads with `landcover: []` and never requests it; each rejection rule.

### 3. Docs

- `docs/data/site-package-spec.md`: layout line + validation checklist line, like roads/trees.

## Done when

- `python3 scripts/test_build_site_packages.py` prints ok.
- `npm run lint && npm run test && npm run build` pass.
- The offline rebuild leaves the protected files byte-identical.
- Print a short report: files changed, area counts per site and kind, tests added, anything you could not do.
