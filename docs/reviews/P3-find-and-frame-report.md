# P3 — Find & frame (`/new`) — build report (2026-11-03)

**Builder:** Claude, from `docs/handoffs/C6-P3-find-and-frame.md`. Codex could not be started unattended in this session. **Branch:** `m6/p3-find-frame`, not merged.

## What shipped

- `/new` (lazy `src/app/NewSitePage.tsx`): MapLibre map (OpenFreeMap positron), ARIA combobox search (`searchPlaces`, 300 ms debounce, abort per keystroke), nine quick picks, frame size radios 200/400/600 m with area readout, fixed centred frame (map padding keeps the map centre under the frame on wide screens), **Load in 3D** with a five-step progress list, **Cancel import**, error alert with **Try again**, reduced-motion `jumpTo`.
- `src/features/import/framing.ts`: frame pixel size, readout and validated frame (pure, tested).
- `src/features/import/session.ts`: in-memory imported-site store (P4 replaces it with Dexie).
- `/studio/import/:importId` (`ImportedStudioPage`), with the not-available page after a reload.
- `SiteSummary` widened (`id: string`, `'user-import'`, `'Imported area'`, optional `notices`). The inspector shows `Imported · open map data`, the import notes, and the source attributions from the manifest.
- Landing: **Start from any address** card under the curated sites.

## Evidence

- `npm run lint` passes. `npm run test`: 83 files, 820 tests pass. `npm run build` passes.
- Live check (production build via `vite preview`, 1440 × 900): search `Thorvald Meyers gate 40` → Load → the studio shows the imported OSM buildings with terrain, the subtitle `OpenStreetMap context · heights partly estimated · not survey data`, import notes and the OpenFreeMap + Kartverket attribution.
- 375 × 812: stacked layout, no horizontal scroll.

## Known limitations

1. **The map is blank under `npm run dev`.** The style never finishes loading in the Vite dev server (no tiles requested, no error). Production builds and `npm run preview` work. Likely the dev pre-bundle and the MapLibre worker; investigate in P5.
2. Imports are lost on reload (by design until P4). Scenario autosave still writes IndexedDB records under the import id, and those become orphans after a reload. P4 must own their cleanup.
3. The `roofs-flat` warning text in `assemble.ts` names the Opera House, which is wrong outside Bjørvika. Fix it in the library, not the UI.
4. No reverse geocoding or live building count (P5). The title is the chosen search result or quick pick, otherwise `Custom area`.
5. The e2e suite with a mocked network is D24 (DeepSeek), `docs/handoffs/D24-P3-import-e2e.md`.
