# Review record — M4 UI (C12–C14), independent

- **Date:** 2026-11-02
- **Reviewer:** independent read-only reviewer (Claude subagent); dispositions by the integrating session. Codex's own self-review is `docs/reviews/M4-codex-ui-review.md`.
- **Scope:** `cc02494..0ab19d5` (3 Codex commits, fast-forwarded into `main`) plus the fixes below.
- **Proof, run by the integrator:** lint ✅ · typecheck (app and node) ✅ · `npm run test` 766 → 770 after fixes ✅ · build ✅ · e2e 22 passed, 1 opt-in skipped (`--workers=1`, on a separate port so the merged code was tested, not an older server).
- **Not covered:** the screenshots were not re-viewed by the reviewer; `StudioShell.test.tsx` changes were not read by the reviewer; native `<dialog>` Esc and focus trapping are untested in jsdom (assigned to D36).

## Protected-file edits by Codex

The work order said not to edit `src/features/**`, `useScenarioProject.ts` or its test. Codex edited `repository.ts` (raw export for newer-version recovery), the hook (`discardSkipped` rethrows; inactive-rename session fix; `exportSavedData`) and the hook test, and disclosed it. The reviewer judged all three edits correct and safe; the inactive-rename fix prevented a real silent revert. Accepted. For future orders, "stop and report" was the instruction; it was not followed.

## Findings and dispositions

| Severity | Area | Issue | Status |
|---|---|---|---|
| blocker | — | none | — |
| major | Compare thumbnails | "Thumbnail unavailable" showed while a capture was merely pending (first open, any request change, every sun tick during playback). | fixed: `pending` / `failed` / ready states; "Updating thumbnails…" while pending; test |
| major | hook `remove`, `resetDemo` | Swallowed store errors; the UI showed a deletion or reset that hadn't happened. | fixed: storage first, throws before any screen change; test |
| minor | import | Wrong-site guard only in the UI. | fixed: `importProject(json, expectedSiteId)` in the repository; test |
| minor | repository tests | No case for the `rawProject` export field. | fixed: test |
| minor | `ScenarioMenu` | Popover had no role. | fixed: `role="group"` |
| minor | shell shortcuts | `F` on a focused menu control fitted the camera. | fixed: menu exempt |
| minor | Compare | Deleting a compared scenario left a stale pair and lost focus. | fixed: Compare closes, focus returns to its trigger |
| minor | recovery strip | "1 saved scenarios". | fixed |
| minor | import message | Doesn't mention unreadable records are dropped; no offer to export first. | open |
| minor | menu a11y | Doesn't close on Tab-out; focus drops to body after rename commit or Esc. | open |
| minor | snapshots | Thumbnails skip post-processing (no AO) and re-render on every sun tick while Compare is open. | open: accepted for now; debounce if playback while comparing proves slow |
| minor | filename | Date uses UTC; may be tomorrow's date late in the evening. | open |
| minor | `ScenarioMenu.test` | Passes `site={null}`, so the status dot and GFA line are never asserted; no tests for row Delete/Reset confirmation or the disabled-during-gesture state. | open: D36 covers the first two end to end |
| nit | `ScenarioNotes` | Draft commits on blur only. | accepted |

## Gate decision

- [ ] Pass
- [x] Pass with follow-ups (UI only; M4 is not complete)
- [ ] Fail

## Still needed before the M4 gate

1. ~~Integrate DeepSeek's D35 fixtures~~ — done (see `progress.md`).
2. D36 e2e and D37 evidence (`docs/handoffs/D36-D37-m4-e2e-evidence.md`).
3. ~~Camera bookmarks~~ — deferred out of M4 by the owner (ADR-0011 §9).
4. The open minors above, then `docs/reviews/M4-code-review.md` and owner acceptance of ADR-0011.
