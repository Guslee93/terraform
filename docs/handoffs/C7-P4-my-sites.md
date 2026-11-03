# C7 — P4 My sites — Codex work order

**Owner:** Claude (spec, review, integration) · **Builder:** Codex
**Branch / worktree:** `m6/p4-my-sites` in `../Terraform-p4`, cut from `m6/p3-find-frame` at `4d455b9`
**Authority:** ADR-0006 §5 (imported packages in IndexedDB via Dexie, schema-versioned), `docs/plans/site-import-plan.md` P4 row. The owner asked for the next phase on 2026-11-03.

Read first: `AGENTS.md`, this file, `docs/handoffs/C6-P3-find-and-frame.md` (what P3 built), `docs/reviews/P3-find-and-frame-report.md`, `src/features/import/session.ts`, `src/app/NewSitePage.tsx`, `src/app/StudioPage.tsx`, `src/features/scenarios/store.ts` (Dexie and error-mapping pattern to copy), `src/features/sites/package.ts` and `src/features/sites/manifest.ts` (parsers).

## Goal

Imported sites survive a reload. The landing page lists them under **My sites**, where they can be opened or deleted. Deleting also removes that site's saved scenarios.

## Scope

1. **Store** `src/features/import/store.ts`:
   - A separate Dexie database `terraform-imports` (do not bump the scenario DB), table `sites` keyed by `id`.
   - Row: `{ id, savedAt, json }`, where `json` is the serialised `ImportedSite` plus `schemaVersion: 1`.
   - Provide an interface `ImportedSiteStore` with `list()` (summaries plus savedAt and building count, newest first, unreadable rows reported as `{ id, status: 'unreadable' }` and not thrown), `get(id)`, `put(site)` and `delete(id)`, with a Dexie implementation and a memory implementation for tests. Map failures to the same `quota` / `unavailable` kinds as `toStoreError` (reuse it, do not copy).
   - Add a version-migration hook: a `migrate(raw)` function that accepts `schemaVersion: 1` and rejects unknown versions with a clear error.
2. **Validation on read:** `get` must re-validate the stored package through the existing parsers (`parseSiteManifest`, `parseTerrain`, `parseBuildings`, `parseStudyArea`, `parseRoads`, `parseTrees`, `parseLandCover`). Add a `parseSitePackage(raw: unknown): SitePackage` in `src/features/sites/package.ts` if none exists, built from those parsers. Also check the summary's fields. Invalid rows → `unreadable`; never hand unvalidated data to the studio (AGENTS guardrail 7).
3. **Replace `session.ts`:** keep the export names, but make them async, backed by the Dexie store through a shared accessor like `getScenarioRepository()`. Remove the `ponytail:` comment.
   - `NewSitePage` awaits `saveImported` before navigating.
   - On a quota or unavailable error, show it in the existing `role="alert"` box with the copy `This browser could not save the site (<reason>). You can still open it once.`, plus a button **Open without saving** that keeps today's in-memory behaviour.
4. **Studio route:** `ImportedStudioPage` loads asynchronously.
   - While loading, show the existing studio loading state: pass `packageStatus="loading"`, or reuse the route fallback, whichever matches StudioShell's contract.
   - Not found → the existing "no longer available" page. Change its body to `It may have been deleted from My sites.`
   - Unreadable → the same page with `This saved site could not be read.` and a **Delete it** button.
5. **Landing "My sites":** a section after the curated sites and the "Start from any address" card. It renders only when at least one imported site exists.
   - Heading `My sites`.
   - Each row shows the title, `Imported <date> · <n> buildings`, a link **Open** to `/studio/import/<id>`, and a **Delete** button.
   - Delete uses the existing `ConfirmDialog` with the copy `Delete <title>? This removes the imported site and its saved scenarios from this browser.`
   - On confirm, call `delete(id)` and then `getScenarioRepository().resetSite(id)`.
   - The section is keyboard reachable, and focus returns to a sensible place after a delete.
6. **Orphans:** after a successful delete nothing remains in either database for that id. Add a test with the memory stores.

## Out of scope

Renaming sites, thumbnails, export or sharing, quota management UI, and any change to the curated sites, the import library (except adding `parseSitePackage`), or `NewSitePage` beyond the save step.

## UI contract additions (keep the P3 contract unchanged)

| Element | Role / name |
|---|---|
| My sites section | `region` or section with `heading` `My sites` |
| Row actions | `link` `Open <title>`, `button` `Delete <title>` |
| Confirm | the existing `ConfirmDialog`, confirm button `Delete` |

## Tests

- `store.test.ts` (memory and, if `fake-indexeddb` is not installed, memory only; **do not add dependencies**): put/get/list order, unreadable row, unknown schema version, delete.
- `parseSitePackage` round-trips a curated package fixture and rejects a broken one.
- Landing component test: no section when empty; the list renders; delete confirms and removes the site plus its scenarios (memory repositories injected).
- `ImportedStudioPage`: loading → ready, not found, unreadable.
- Update `NewSitePage.test.tsx` for the async save, plus the save-failure path with **Open without saving**.
- Existing suites stay green.

## Done when

- `npm run lint`, `npm run test` and `npm run build` pass.
- A manual check with `npm run build && npm run preview` (the map is blank under `npm run dev`; Claude is fixing that separately): import → reload `/studio/import/<id>` → still there; landing lists it; delete → gone; reload → gone.
- Commit on `m6/p4-my-sites` (conventional commits). No push, merge or deploy.
- Report in `docs/reviews/P4-codex-report.md` and a row in `docs/agent-log.md`.
