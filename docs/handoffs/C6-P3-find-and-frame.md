# C6 — P3 Find & frame (`/new`) — Codex work order

**Owner:** Claude (spec, review, integration) · **Builder:** Codex · **Tests in parallel:** DeepSeek D24 (`docs/handoffs/D24-P3-import-e2e.md`)
**Branch / worktree:** `m6/p3-find-frame` in `../Terraform-p3` (cut from `main`)
**Authority:** ADR-0006 (accepted, includes `maplibre-gl`), `docs/plans/site-import-plan.md` §4–§6 (P3 row). The owner asked for P3 on 2026-11-03, ahead of the M5 gate. The demo path must stay untouched (AGENTS guardrail 9).

Read first: `AGENTS.md`, this file, `docs/plans/site-import-plan.md` §4–§5, `docs/decisions/ADR-0006-site-import.md`, `docs/design/design-contract.md`, `src/features/import/*.ts` (do not rewrite them).

## Goal

A visitor can open `/new`, search for an address or place in Oslo (or pick a Nordic city), see a square site frame on a map, choose its size, press **Load in 3D**, watch honest progress, cancel at any time, and land in the existing studio with the imported site.

## Already done (P1–P2, reuse; do not re-implement)

- `importSite(frame, { tiles: openFreeMapSource(), terrain: [kartverketProvider(), terrariumProvider()] }, { signal, onProgress })` in `assemble.ts` → `{ sitePackage, warnings, timings }`. Steps: `tiles`, `buildings`, `context`, `terrain`, `assemble`. Check how `terrain` providers are selected before wiring; pass both.
- `searchPlaces(query, signal)` in `geocode.ts` (Kartverket ranked first, Photon type-ahead) → `PlaceResult[]`.
- `QUICK_PICKS` in `cities.ts`. `validateFrame` in `frame.ts` (lat 54–71.5, lon 4–32, size 100–800 m, id slug, title required).

## Scope

1. **Route** `/new` → lazy `src/app/NewSitePage.tsx` (same lazy pattern as `StudioPage` in `App.tsx`). MapLibre must load only in this chunk; check `dist/` after build that the landing chunk does not contain it.
2. **Dependency:** add `maplibre-gl`, exact pinned version (latest 5.x released ≥ 2 weeks ago). Move `@mapbox/vector-tile` and `pbf` from devDependencies to dependencies if they are still dev-only. Add an addendum to ADR-0006: versions, gzip size of the new lazy chunk, licences (BSD-3).
3. **Map:** full-bleed MapLibre map, style `https://tiles.openfreemap.org/styles/positron`, attribution control visible (`© OpenMapTiles © OpenStreetMap contributors`). Initial view: Oslo Grünerløkka quick pick. Keyboard: MapLibre's built-in keyboard pan/zoom stays on, and the map container has a visible focus ring and `aria-label="Map. Use arrow keys to move the site frame."`.
4. **Frame:** a fixed square overlay centred in the map viewport (the map moves under it; panning is how the frame moves). Its pixel size is computed from metres at the current zoom and latitude, updated on `move`/`zoom`. The frame centre is the map centre. Size presets: radio group **Frame size** with `200 m`, `400 m` (default), `600 m`. Readout under the controls: area in m² (e.g. `400 × 400 m · 16 ha`) and `Study area — not a cadastral parcel`.
5. **Search:** an ARIA combobox, label **Search for an address or place**, with a `listbox` of `option`s. 300 ms debounce, minimum 3 characters, abort the previous request on each keystroke, arrow keys + Enter + Esc. Selecting a result flies the map there and sets the site title to the result `label`. Show `No places found` when empty, and a polite `role="status"` line on error (`Search is unavailable right now. You can still move the map.`).
6. **Quick picks:** a group **Quick picks** with one button per `QUICK_PICKS` entry (accessible name = `label`). A click flies there and sets the title.
7. **Load:** button **Load in 3D**. Build the frame from the map centre, the chosen size, the current title (`Custom area` if none) and id `import-<base36 timestamp>`. Show a list **Import progress** with items, in order: `Map tiles`, `Buildings`, `Streets and green space`, `Terrain`, `Site package` (mapping to the five `ImportStep`s). Each item shows a status word: `Waiting`, `Loading`, `Done`, `Skipped` or `Failed`, plus the source name where known. Use `aria-live="polite"` on the list. Controls are disabled while loading except **Cancel import**.
8. **Cancel:** **Cancel import** aborts the controller. Show `Import cancelled` and re-enable the controls. Navigating away also aborts.
9. **Failure:** show the error message in a `role="alert"` box with **Try again**. Never show a partial package.
10. **Success:** put the result into a new in-memory store `src/features/import/session.ts` (`saveImported`, `getImported`; a `Map` keyed by id holding `{ summary, sitePackage, warnings, importedAt }`). Add the comment `// ponytail: in-memory only, lost on reload; P4 replaces this with the Dexie store.` Then navigate to `/studio/import/<id>`.
11. **Studio integration:**
    - `siteCatalog.ts`: widen `SiteSummary.id` to `string` (keep `SiteId` for the curated ids), `dataStatus` to `'curated-demo' | 'user-import'`, and `morphology` with `'Imported area'`. Fix the type fallout, without behaviour changes for the curated sites.
    - `App.tsx`: add the route `/studio/import/:importId`. A small wrapper reads `getImported(id)` and renders `StudioShell` with `packageStatus="ready"`. The subtitle reads `OpenStreetMap context · heights partly estimated · not survey data`.
    - If the id is missing, show the existing studio "unknown site" layout with the heading `This imported site is no longer available`, the body `Imported sites are kept only until the page reloads. Saving them arrives with My sites.` and a link **Import it again** to `/new`.
    - In the studio, show the import warnings (from `ImportWarning.message`) where the inspector shows site provenance. Reuse the existing provenance or disclaimer component; do not invent a new panel.
12. **Landing:** after the two curated site cards, add a card or link **Start from any address** → `/new` with one line: `Pick a block anywhere in the Nordics and load open map data in 3D. Context is simplified and partly estimated.` The curated sites stay first.
13. **Responsive:** usable at 375 × 812 (controls in a bottom sheet or stacked panel, no horizontal scroll) and at 1440 × 900 (controls in a left panel over the map). Use existing tokens and `Button` primitives only. Reduced motion: `flyTo` becomes `jumpTo` when `prefers-reduced-motion: reduce`.

## Out of scope

IndexedDB / My sites (P4), reverse geocoding, live building count, custom polygon boundary, rate limiting/backoff, outage drills (P5), any change to `src/features/import/*` beyond `session.ts` (report bugs in them instead of rewriting), and changes to the curated packages.

## UI contract (DeepSeek's e2e depends on it; do not rename)

| Element | Role / accessible name |
|---|---|
| Landing entry | link `Start from any address` |
| Search | `combobox` `Search for an address or place`; results `option` |
| Quick picks | `group` `Quick picks`; `button` per pick label, e.g. `Oslo (Grünerløkka)` |
| Frame size | `radiogroup` `Frame size`; `radio` `200 m` / `400 m` / `600 m` |
| Load | `button` `Load in 3D` |
| Progress | `list` `Import progress`; `listitem`s with the step labels above and a status word |
| Cancel | `button` `Cancel import`; then text `Import cancelled` |
| Error | `alert`; `button` `Try again` |
| Success | URL `/studio/import/<id>` |
| Missing import | `heading` `This imported site is no longer available`; `link` `Import it again` |

## Tests (Codex writes unit/component tests; DeepSeek writes e2e)

- `session.test.ts`: save/get, unknown id.
- `NewSitePage.test.tsx` with `maplibre-gl` mocked and `importSite`/`searchPlaces` mocked: combobox keyboard flow; quick pick sets the title; size radios; progress statuses follow `onProgress`; cancel aborts the signal and shows `Import cancelled`; failure shows the alert; success navigates to `/studio/import/<id>`.
- Studio import route: renders the imported title; missing id shows the not-available page.
- Existing suites stay green.

## Done when

- `npm run lint`, `npm run test` and `npm run build` pass in the worktree. Run `npm run test:e2e` if browsers are installed; existing specs stay green.
- One live manual check with `npm run dev`: search `Thorvald Meyers gate 40` → load → the studio shows buildings. Note timings.
- Screenshots `docs/screenshots/p3-new-1440.png`, `p3-new-375.png`, `p3-loading-1440.png`, `p3-studio-import-1440.png`.
- Commit on `m6/p3-find-frame` (conventional commits). Do not merge, push or deploy.
- Report in `docs/reviews/P3-codex-report.md`: files changed, test counts, bundle sizes, live timings, known limitations, open questions. Add a row to `docs/agent-log.md`.
