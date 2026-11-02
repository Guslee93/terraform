# M4 C12–C14 implementation review — 2026-11-02

Reviewer: Codex using `engineering-code-reviewer`, self-review of its own changes. This is a UI handoff, not independent M4 gate approval. Base: `cc02494`; branch: `m4/ui`. No merge performed.

## Delivered

- C12: scenario disclosure, visible-only geometry-derived GFA/floor counts/envelope status, switching, create/duplicate/rename, delete/reset confirmations, notes with a 2,000-character limit. Save-status wording unchanged. Arrow navigation, Escape and trigger focus restoration; phone/tablet menu stays in the viewport.
- C13: Compare replaces the inspector; two selectors, neutral B − A deltas, notes, envelope disclaimer, Edit A/B. Both snapshots render synchronously from one preset camera and the current common lighting, with scenario-specific masses, trees and constraints. The existing renderer is reused; live visibility and render target are restored on failure. No stale image is reused for a changed request.
- C14: unavailable-storage, newer-version, corrupt/missing-record and save-error recovery; raw export/discard confirmation, retry, project download and confirmed import. Invalid JSON and wrong-site import leave current scenarios unchanged. Browser storage is required for import.

## Files

- New UI: `ScenarioMenu.tsx`, `ScenarioNotes.tsx`, `ComparePanel.tsx`, `ProjectRecovery.tsx`, shared `ConfirmDialog.tsx`.
- Wiring: `StudioTopBar.tsx`, `StudioShell.tsx`, `Inspector.tsx`, `ViewportCanvas.tsx`.
- Capture: `ScenarioSnapshots.tsx` plus renderer restoration test.
- Tests: menu, comparison, recovery, hook regressions and shell integration. Existing shell drag assertions now traverse the live scenario group.
- Protected-file changes after the owner's instruction to proceed: repository raw export and hook action; inactive rename session correction. No dependency, package, token, site-package or e2e file edits.

## Findings fixed

1. Newer-version export returned fresh defaults through the hook. Added `exportSavedData()` and retained the original raw project index plus raw scenario records in the repository recovery export. Regression verifies exact strings and no writes.
2. Rename of a previously active, now parked scenario reverted on activation. Reproduced with a failing test; apply the rename command to the parked session too, retaining geometry and undo history.
3. New live-scenario group invalidated an existing test's direct-child assumption. Updated traversal, preserving all geometry/envelope assertions.
4. Fixed dialog width calculation and constrained mobile menu positioning/top-bar wrapping.
5. Prevented imports belonging to another site from replacing the current editor context.

## Verification

- `npm run lint`: pass.
- `npm run test`: **766 passed, 77 files** (17 more tests than baseline).
- `npm run build`: pass, including TypeScript checks.
- `npm run test:e2e -- --workers=1`: **22 passed, 1 opt-in evidence test skipped**. Existing baseline parallel suite had two failures that passed serially; concurrency stability is not claimed.
- Local Playwright verification with isolated browser storage: distinct A/B PNGs; Edit B survives reload; corrupt-record strip; format-99 warning and saved-data download; zero page errors; no horizontal overflow and menu inside viewport at 1024 and 375 px.
- Viewed screenshots: `m4-scenario-menu.png`, `m4-comparison.png`, `m4-recovery.png`, `m4-newer-version.png` at 1440×900; `m4-menu-1024.png`, `m4-menu-375.png`.
- No external data or the user's browser storage was modified by these checks.
- Studio chunk: 345.93 kB raw / 110.42 kB gzip, versus 323.63 / 104.89 at baseline. Existing Three.js chunk warning remains.

## Remaining gate work / limits

- Integrate/review D35 (`416773a`) against schema v2; it has not been cherry-picked.
- D36 durable M4 e2e and D37 consolidated evidence mapping remain assigned separately. The temporary browser verification and these screenshots do not replace those deliverables.
- Independent M4 review and owner acceptance, including ADR-0011, remain pending. Historical M2 acceptance debt still needs reconciliation.
- Snapshot renders use the direct renderer without the live view's AO postprocessing or edit handles/labels. Both sides use the same rendering method; the live camera is not moved.
- The persisted schema allows camera bookmarks, but saving/restoring bookmarks is not exposed by the assigned hook/UI contract and remains an M4 integration check.
- Existing hook persistence paths swallow project-index/delete/reset failures; this work does not claim to resolve all repository failure semantics. Review these before M4 acceptance, including reset/remove behaviour on write failure. Discard now propagates deletion failures to the dialog and retains its record; a regression verifies this.
- No formal accessibility audit or drag-time performance benchmark was performed here.

Acceptance scope: only the assigned M4 UI; local ENU coordinates and immutable site data preserved; no auth, payments, AI, backend, live GIS, regulatory or structural claims added. M4 is not declared complete.
