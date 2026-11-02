# M4 — Codex resumption audit (2026-11-02)

**Subsequent update:** the owner asked to proceed. Recovery export was repaired and C12–C14 implemented. See `docs/reviews/M4-codex-ui-review.md`; the audit below records the initial state.

## Verified checkout

- Worktree: `/Users/gustavekamanzi/Downloads/2026/Terraform-m4ui`.
- Branch: `m4/ui`, starting clean at `cc02494` (same commit as main).
- Assignment: `C12-C14-m4-ui.md`; no implementation changes made during this audit.
- `npm ci` succeeded. A separately installed Codex CLI is unnecessary for this desktop session.

## Actual progress

- M0/M1 foundations and static site packages exist, with review records.
- M2 massing/editing is implemented, but its historical review explicitly leaves G4 acceptance and tool/accessibility follow-ups open. Do not infer full closure from the M3 sign-off; reconcile remaining findings against current code before release.
- M3 analysis and solar work was signed off by the owner on 2026-10-29 according to `progress.md`.
- Studio v2 editor layout and close-out are present; ADR-0009/0010 are recorded as accepted.
- M4 S1–S4 and hook integration are present: format 2, migrations, repository, autosave, independent sessions and comparison calculations. C12–C14 are outstanding.
- D35 is now committed at `416773a` in `../Terraform-d35` on `deepseek/d35`, clean when inspected. This differs from the pasted handoff. Its base predates format 2; review/adapt its tests during integration. No cherry-pick performed.
- D36/D37 and M4 review/acceptance remain outstanding. ADR-0011 remains proposed.
- M5 export/polish/accessibility/performance/deployment/case study remains pending.
- Some optional M6 site-import groundwork exists; this does not imply M6 or the v1 release gate is complete.

## Handoff API issue: newer-version recovery export

The C14 work order requires an “Export saved data” action for a newer-version project, using the hook API. It also explicitly says: “If the API is missing something, stop and report it; don't add it yourself.” The hook and `src/features/**` are reserved to Claude.

Evidence from the current code:

1. `ScenarioRepository.load()` returns only `{ status: 'newer-version', version }` when the stored project index is newer. It does not expose the original index or scenario rows to the hook.
2. `useScenarioProject.apply()` creates fresh in-memory Concept A/B for this state, and leaves `skipped` empty.
3. `actions.exportProject()` serializes those fresh defaults. It does not export the inaccessible saved data. Labelling it “Export saved data” would be false.
4. The repository's separate `exportProject(siteId)` can preserve scenario row text for this state, but it omits the original project index. Simply calling it would not preserve the complete original project either.

Proposed bounded repair: expose a raw recovery export through the hook/repository that preserves both the original project index and scenario rows verbatim, without migrating or overwriting them. Add a regression test seeded with a format-99 project and distinctive raw row contents; assert the export contains those originals and storage is unchanged. Keep the live/unsaved project export for normal and memory sessions.

Requested owner authorization to take over this protected repair before continuing C12 → C13 → C14. No protected files changed.

## Baseline verification

- `npm ci`: pass.
- `npm run lint`: pass.
- `npm run test`: 749 tests in 73 files passed.
- `npm run build`: pass, including TypeScript checks; existing large Three.js chunk warning remains.
- `npm run test:e2e`: first attempt could not bind localhost under the sandbox (`EPERM`); rerun with approved escalation gave 20 passed, 1 skipped, 2 failed (render-quality reload timeout; roof-drag test failed while creating its mass). `npm run test:e2e -- --last-failed --workers=1`: both passed. The complete parallel suite was not clean; concurrency sensitivity remains to investigate.

No UI changes or new screenshots in this audit. No milestone declared complete.
