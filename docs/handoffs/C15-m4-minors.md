# C15 — M4 UI minor fixes (Codex work order)

Role: implementer (frontend, minimal-change). Project: Terraform v1, milestone **M4**. Work in the worktree `/Users/gustavekamanzi/Downloads/2026/Terraform-m4minors`, branch `m4/minors` (created from `main`). Do not work in the main checkout. Commit once per item with a conventional message; don't merge or push.

**Read first:** `AGENTS.md`; `docs/reviews/M4-ui-independent-review.md` (the "open" rows are your list); `docs/design/design-contract.md` §0; then `src/components/studio/{ScenarioMenu,ProjectRecovery,StudioTopBar}.tsx` and their tests.

## HARD RULE: stop and report, don't reach

You may edit only `src/components/studio/**`, `src/components/ui/**` and their tests. If a fix seems to need anything else (`src/features/**`, `useScenarioProject.ts`, `e2e/**`, `package.json`, styles), **stop that item and report it in your summary**. Last time the order said this and three protected files were edited anyway. DeepSeek is writing `e2e/**` in parallel on another branch, so touching it would create conflicts.

## Items

1. **Menu closes on Tab-out.** When focus leaves the scenario menu (a `focusout` whose `relatedTarget` is outside the menu root and not the trigger), close it without stealing focus back. Esc and selecting a row keep today's behaviour (close, focus returns to the trigger).
2. **Focus after rename.** After a rename commits (Enter or "Save name") or is cancelled (Esc in the field), focus lands on that row's Rename button, not on `body`. If the row disappears, focus the trigger.
3. **Import warning text.** The import confirmation must say what's lost. Wording: "Importing replaces every scenario for this site, including any saved records that couldn't be opened." When `skipped.length > 0`, add "Export your project first if you want to keep them." with the "Export project" button reachable from the dialog's surrounding strip (don't nest a second dialog).
4. **Export filename uses the local date.** `terraform_<siteId>_<yyyymmdd>.json` currently uses `toISOString()` (UTC), so late evening exports carry tomorrow's date. Extract the name into a small pure, exported function (e.g. `projectFileName(siteId, date = new Date())`) built from `getFullYear/getMonth/getDate`, and unit-test it with a fixed `Date` that would differ in UTC.
5. **Single import control.** "Import project…" is a styled label and a visible native file input doing one job. Hide the native input (visually hidden, still focusable via its label — keyboard users must be able to open it with Enter or Space) so there is one control.
6. **Missing menu tests.** In `ScenarioMenu.test.tsx` (pass a real `site`/package, not `site={null}`): the status dot and Concept GFA line per scenario; row **Delete** confirmation (Cancel keeps the scenario; confirm removes it); **Reset** confirmation; items disabled while a gesture is open; Tab-out closes the menu; focus after rename (items 1–2). jsdom stubs `showModal`, so don't try to test native dialog Esc or focus trapping here; DeepSeek covers that in e2e.

Optional, only if trivial and the layout holds: column headers in the comparison table read "A · <name>" and "B · <name>" instead of bare "A" and "B".

## Done when

- `npm run lint`, `npm run test` and `npm run build` pass. Run `npx playwright test --workers=1` too **only after** confirming nothing else listens on port 5173 (`lsof -nP -iTCP:5173 -sTCP:LISTEN`); an old dev server from the earlier `m4/ui` worktree may still be running and would silently test outdated code. If it is, stop and tell the owner, don't kill it.
- `e2e/keyboard.spec.ts` stays green (tab order unchanged).
- A short summary: items done, items stopped (with the reason), tests added, commands and results.
- Add a row to `docs/agent-log.md` ("Pending Claude review").
