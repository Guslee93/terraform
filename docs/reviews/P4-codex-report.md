# P4 My sites — Codex report

Date: 2026-11-03. Work order: `docs/handoffs/C7-P4-my-sites.md`.
Worktree: `Terraform-p4`; branch: `m6/p4-my-sites`.

## Result

Implementation and unit/component gates pass. Browser acceptance remains blocked by this environment; P4 is not declared fully accepted.

- Imported packages use separate Dexie database `terraform-imports`, schema 1, table `sites` keyed by `id`. Scenario database schema is unchanged. Rows contain `id`, `savedAt`, serialized imported site and schema version.
- `migrate` rejects unsupported versions clearly. Reads validate summary fields, dates, warning codes/messages, package identity, all seven existing parsers and package statistics. Corrupt rows remain listed as unreadable and are never passed to StudioShell.
- Async session accessors share the persistent store. NewSitePage awaits saving, reports quota/unavailable errors in its alert and offers explicit **Open without saving**, retained only in memory until reload.
- Imported studio renders the existing route fallback while loading, validated content when ready, the requested missing/unreadable messages, and confirmed deletion for unreadable imports. Storage outages receive a distinct error rather than being reported as missing data.
- Landing renders **My sites** after the curated sites and address card, only when imports exist. Rows show title, save date and actual building count, with named Open/Delete actions. Unreadable rows can also be opened or deleted.
- Confirmed deletion calls imports delete then scenario repository reset. Both databases are empty for the deleted id after success. Dialog errors stay visible and retryable. Focus returns to My sites heading, or the address link after deleting the last row.
- No dependency additions, curated package mutations, scenario schema changes, new routes or import-library changes beyond the requested package parser. ADR-0006 §5 supplies authority for persistence.

## Files

- `src/features/import/store.ts`: Dexie/memory implementations, read validation, migration hook, unreadable results; reuses `toStoreError`.
- `src/features/import/session.ts`: shared accessor, async save/get, explicit memory fallback and shared deletion workflow.
- `src/features/sites/package.ts`: `parseSitePackage` for materialized packages.
- `src/components/marketing/MySites.tsx`, `src/app/LandingPage.tsx`: list, accessible actions, confirmation and focus restoration.
- `src/app/NewSitePage.tsx`, `src/app/StudioPage.tsx`: async persistence integration and error/loading states.
- `src/app/RouteFallback.tsx`, `src/app/App.tsx`: extract existing fallback for reuse.
- Tests: `src/features/import/{store.test,storeFixtures}.ts`, `src/app/{NewSitePage,ImportedStudioPage,LandingPage}.test.tsx`.
- Logs: `task_plan.md`, `progress.md`, `docs/agent-log.md`, this report.

## Verification

| Check | Result |
|---|---|
| `npm run lint` | Pass |
| `npm run test` | Pass: 847 tests, 86 files |
| `npm run build` | Pass: app/tooling TypeScript and Vite production build |
| `git diff --check` | Pass |
| Store tests | Memory put/get/list ordering/delete; corrupt rows; unknown versions; orphan cleanup |
| Package parser | Curated round trip; all component failures; cross-package IDs/statistics |
| Landing | Empty state, list/actions, cancel/confirm, both stores cleared, last-row focus, unreadable row |
| Imported studio | Loading → ready, missing, unreadable, storage unavailable |
| New-site page | Existing P3 behavior; asynchronous save awaited; quota/unavailable fallback |
| `npm run test:e2e` | Blocked before browser tests: server bind `127.0.0.1:5173` denied with EPERM |
| `npm run preview -- --host 127.0.0.1 --port 4173` | Blocked: server bind denied with EPERM |
| Live import/reload/list/delete/reload | Not performed; preview unavailable |
| Fixed-view screenshots | Not captured; preview unavailable |

`fake-indexeddb` is absent; memory-store tests follow the work order's explicit allowance. Existing non-blocking Vite config-loader, Three.js CommonJS deprecation and large-chunk warnings remain. MapLibre remains in the lazy NewSitePage bundle (~297.7 kB gzip); production build does not add dependencies.

Initial lint/typecheck/test failures were corrected: explicit warning-code return typing, supported test query options, proper type-only imports, void beforeEach callback, and an explicit lazy-route wait under full-suite load. The final combined lint/test/build invocation exited 0. The initial script command used unavailable `python`; rerunning with `python3` succeeded.

## Code review

Builder self-review using the code-reviewer skill; independent owner review is still pending. Checked unknown-data boundaries, imported/package/row identity matching, schema rejection, storage error mapping, asynchronous unmount guards, curated route preservation, no new dependency, and removal/focus behavior. Fixed route error state so an error for one id does not mask navigation to another id. No remaining blocking implementation findings in this review.

Deletion is deliberately sequential across two separate databases, as C7 specifies. It is not an atomic cross-database transaction: if scenario cleanup fails after the import row is removed, the dialog retains the failure and permits retry. A browser crash in that interval, or another tab writing scenarios concurrently, is not covered by this phase. Successful deletion is covered with real memory repositories and raw-row assertions.

## Remaining acceptance

In an environment allowing local servers, run build/preview, import a real site, reload its import URL, verify the landing list, delete with confirmation, reload and verify absence. Capture desktop 1440×900 and mobile 375×812 list/dialog states. Run Playwright. Owner review and these browser checks remain necessary before accepting the full P4 gate.

No push, merge or deployment was performed. The pre-existing untracked `.codex-run.log` was left untouched.

## Commit status

After lint, tests and build passed, attempted staging the explicit P4 file list and committing with `feat(import): persist imported sites and add My sites`. Git failed before staging:

```text
fatal: Unable to create '/Users/gustavekamanzi/Downloads/2026/Terraform/.git/worktrees/Terraform-p4/index.lock': Operation not permitted
```

The worktree's Git metadata is in the parent checkout, outside the writable sandbox. No commit was created. All changes remain in `m6/p4-my-sites`; no push, merge or deployment occurred. Commit completion requires an environment with permission to write that Git metadata.

## PRD acceptance clause

> Implement only the currently assigned milestone of Terraform PRD v1. Preserve the local East/North/Up metre coordinate model and immutable site packages. Treat geometry, solar data, assumptions, and UI labels truthfully. Before declaring the milestone complete, list the implemented acceptance criteria, run relevant tests/build, report failures and known limitations, and provide screenshots of the fixed reference scenes when tools allow. Do not add payment, authentication, AI generation, regulatory interpretation, or backend services unless explicitly requested.
