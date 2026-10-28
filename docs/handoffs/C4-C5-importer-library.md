# C4 + C5 — Renderer-free importer library (Codex work order)

Role: implementer (spatial data / senior developer). Project: Terraform v1, M6 track per `docs/decisions/ADR-0006-site-import.md` (Accepted, option A). Read, in order: `AGENTS.md`; `docs/plans/site-import-plan.md` §3 and §5; `docs/plans/spike-findings.md` (all of it, including "What must change for P2" and the "P1 gate" section); `scripts/spike-import.mjs` (the working reference you are productionising); `src/features/sites/{manifest,package}.ts`.

Do **C4 first, then C5**, in this one run. Do not commit or stage anything.

## Goal

Turn the spike into a tested, renderer-free TypeScript library in `src/features/import/` that, given a centre point and frame size, returns a validated `SitePackage`. No React, no Three.js, no UI. The app does not import it yet.

## You own (create or edit only these)

- `src/features/import/**` (new folder), except the files owned by DeepSeek round 4: `geocode.ts`, `geocode.test.ts`, `cities.ts`, `cities.test.ts`, `__fixtures__/photon-*.json`, `__fixtures__/kartverket-*.json`. Do not create or edit those; DeepSeek works on them in parallel in another worktree.
- `src/features/import/__fixtures__/tiles/**` (your recorded tile fixtures) and `src/features/import/__fixtures__/terrain/**`.
- `src/features/sites/manifest.ts` and its tests: **only** the `dataStatus` change in C5.
- `docs/plans/spike-findings.md`: append a short "P2 C4/C5 result" section at the end.

## Do not touch

`src/scene/**`, `src/components/**`, `src/app/**`, `e2e/**`, `public/**`, `scripts/**` (leave `spike-import.mjs` as the reference), `package.json` (`@mapbox/vector-tile@3.0.0` and `pbf@5.1.2` are already runtime dependencies; `@turf/turf` is available). No new dependencies.

## C4 — tiles, geometry, buildings, context

Modules (each with a `.test.ts`; tests run offline on recorded fixtures, with no live network):

- `projection.ts`: `metresPerDegree`, `project`, `unproject` ported exactly from `scripts/build_site_packages.py`; parity test at the three points the spike checked (≤ 1e-9 m).
- `frame.ts`: `type ImportFrame = { latitude; longitude; sizeMetres; id; title }`; validation (size 100–800 m; latitude 54–71.5, longitude 4–32 for the Nordic scope); `frameBounds()` in lon/lat and ENU.
- `tiles.ts`: `tileCover(bounds, zoom)`; a `TileSource` interface `{ name; attribution; fetchTile(z, x, y, signal): Promise<ArrayBuffer> }`; `openFreeMapSource()` that reads the TileJSON once per import and caches the template; `decodeTile(buffer, z, x, y)` → typed features `{ layer; id?: number; properties: Record<string, string | number | boolean>; geometry: GeoJSON Polygon | MultiPolygon | LineString | MultiLineString | Point }` (validate property types; no `any`).
- `geometry.ts`: `clipRing` (Sutherland–Hodgman), `clipPolyline` (Liang–Barsky), `simplifyRing`, `ringArea`, and **`repairRing`**, which turns a self-intersecting ring into valid simple ring(s), keeping parts ≥ 12 m² (use `@turf/turf` `unkinkPolygon`, then validate with `isSimpleRing` from `src/lib/polygon.ts`). This fixes the fan-triangulated building from the P1 gate.
- `buildings.ts`: `extractBuildings(features, frame, origin)` → building drafts (footprint ENU ring, `height`, `minHeight`, `sourceId`). Same rules as the spike (skip `hide_3d`; height = `render_height − render_min_height`, min 2.5 m; outer rings; clip; union same `id` across **and within** tiles; simplify 0.3 m; drop < 12 m²; `repairRing` every output). Base elevation is assigned in C5 (needs terrain).
- `context.ts`: `extractRoads` (OpenMapTiles class → width table shared with the spike; skip tunnels; **deduplicate** overlapping fragments from tile buffers, i.e. drop a run whose every vertex lies within 0.5 m of an already-kept run of the same class) and `extractLandCover` (park → park, landcover grass/wood → grass/wood, water → water; clipped; repaired).
- **Fixtures** (you have network for recording only): record into `__fixtures__/tiles/` the z14 tiles for the Grünerløkka and Bjørvika frames, **plus a pair of adjacent tiles where at least one building crosses the seam** (find one in central Oslo and say which). README with URLs, TileJSON version, fetch date (UTC), licence (© OpenMapTiles, © OpenStreetMap contributors, ODbL). Keep fixtures small: only the tiles needed.
- Tests must cover: cross-tile seam merge (a real recorded case), within-tile same-id merge, self-intersection repair (a synthetic bow-tie + the real Grünerløkka case if you can isolate it), clipping concave rings, road dedupe, land-cover mapping, malformed properties dropped.

## C5 — terrain, assembly, data status

- `terrain.ts`: `interface TerrainProvider { name; attribution; covers(lat, lon): boolean; sample(points: [lon, lat][], signal): Promise<TerrainSample[]> }` with `TerrainSample = { height: number | null; kind: 'land' | 'water' }`.
  - `kartverketProvider()` (Norway bbox; batches of 49; maps `terreng: "Havflate"` or `datakilde: "dybdekurver"` to `kind: 'water'`).
  - `terrariumProvider()` for AWS Terrain Tiles (`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png`, z 14). Put the **pure** part in `decodeTerrarium(rgba: Uint8ClampedArray, width, height)`, with height = (R × 256 + G + B / 256) − 32768, plus bilinear sampling; unit-test it with synthetic pixel arrays. PNG → pixels goes through `createImageBitmap` + `OffscreenCanvas` (browser only; keep it in a small untested adapter function and say so).
  - `buildTerrainGrid(samples, policy)`: the **P1 terrain policy** from `docs/handoffs/C3-import-spike.md` (Addendum): water → 0 m; null → nearest valid neighbour (ties: lowest row, then column), flagged; fail if > 5 % estimated; all-null outside Norway → fall through to the next provider, and only if every provider fails → flat grid with a warning. Grid 13 × 13 to match existing packages.
- `assemble.ts`: `importSite(frame, deps: { tiles: TileSource; terrain: TerrainProvider[] }, options: { signal?: AbortSignal; onProgress?: (step: ImportStep, state: 'start' | 'done' | 'skipped' | 'failed', detail?: string) => void }): Promise<ImportResult>`, where `ImportStep = 'tiles' | 'buildings' | 'context' | 'terrain' | 'assemble'` and `ImportResult = { sitePackage: SitePackage; warnings: ImportWarning[]; timings: Record<ImportStep, number> }`. Build manifest/terrain/buildings/study-area/roads/trees (empty)/landcover exactly like the spike, then validate with the existing parsers (`parseSiteManifest`, `parseTerrain`, …) and cross-check statistics. `ImportWarning` is structured: `{ code: 'terrain-estimated' | 'terrain-water' | 'terrain-flat' | 'heights-estimated' | 'trees-unavailable' | 'roofs-flat'; message: string }`, with a `heights-estimated` warning always present (heights come from OpenMapTiles `render_height`, partly estimated) and `roofs-flat` always present.
  - Time zone by country bbox (NO Europe/Oslo, SE Europe/Stockholm, DK Europe/Copenhagen, FI Europe/Helsinki, else UTC).
  - Constraints stay the illustrative 18 m / 4 m defaults with the existing "Illustrative design constraint" label (schema change deferred; note it).
  - Abort: honour `signal` at every await; an aborted import rejects with `DOMException` `AbortError` and calls no further `onProgress`.
- `manifest.ts`: add `'user-import'` to the `dataStatus` union and parser; the assembler uses it. Add a parser test. Search the codebase for every `dataStatus` consumer and **list them in your report** (do not edit UI files; Claude will update labels).
- `assemble.test.ts`: full offline import of Grünerløkka and Bjørvika from fixtures (a fake `TileSource` reading `__fixtures__/tiles`, a fake terrain provider reading `__fixtures__/terrain` recorded from the live Kartverket API for those 169-point grids). Assert: packages parse; building counts within ±5 % of the spike's (202 / 52); Bjørvika water/estimated counts 54 / 2; warnings present; abort mid-import rejects with `AbortError`; a failing tile source surfaces a `failed` progress event naming the source.

## Done when

- `npm run lint && npm run typecheck && npm run test && npm run build` pass.
- `src/features/import/` has no imports from React, Three.js, `src/scene`, `src/components` or `src/app`, so it stays renderer-free.
- Append to `docs/plans/spike-findings.md` a "P2 C4/C5 result" section: modules, test counts, fixture list and sizes, which seam case you used, deviations, open questions.
- Final report: files changed, tests added, the `dataStatus` consumers list, anything you could not do.
