# Agent log

Record every meaningful agent engagement. The point is to preserve **why** an output was accepted or rejected, not to create a transcript archive.

## Rules

- One row per engagement, not per message.
- Name the skill directory exactly.
- Link the artifact the agent produced or changed.
- Record rejected advice too; it prevents the same suggestion returning.
- If an agent contradicts the PRD, note the PRD section that prevailed.

## Log

| Date | Milestone | Agent | Goal | Artifact | Outcome | Notes |
|---|---|---|---|---|---|---|
| 2026-10-27 | Setup | Cline (orchestration, no skill invoked) | Audit the repo and design the agent operating model | `AGENTS.md`, `docs/milestones/*`, `docs/design/design-contract.md`, ADR-0001–0003 | Accepted | Roster reduced from 90 skills to a core team plus milestone specialists; excluded scope documented. |
| 2026-10-27 | M0 | Cline (scaffold, reviews pending) | Create the runnable shell and governance docs | App scaffold, tokens, landing/about, studio shell, R3F viewport, tests, screenshots | Shell accepted visually; formal gates pending | 14 unit tests and 1 smoke test pass. `ui-finish-gate-reviewer` and `code-reviewer` have not yet reviewed. Do not mark M0 complete. |
| 2026-10-27 | M0 | `agency-ux-architect` | Audit layout, CSS, responsive structure, focus | `docs/reviews/M0-ux-review.md` | Accepted | 16 findings. Blockers: fake scenario selector, off-screen focusable inspector, placeholder tool wall. |
| 2026-10-27 | M0 | `agency-ui-designer` | Audit tokens, type, states, distinctiveness | `docs/reviews/M0-ui-review.md` | Accepted | 14 findings. Hero orphan, low-contrast thumbnails, warning contrast, micro-type floor. |
| 2026-10-27 | M0 | `agency-minimal-change-engineer` | Apply consolidated blocker/major fixes | 10 source files, 2 SVGs, 1 new test file | Accepted | Removed fabricated control, condensed chrome, 1100 px drawer, focus trap, hero/grid/thumbnail polish. |
| 2026-10-27 | M0 | `agency-code-reviewer` | Review the M0 diff | `docs/reviews/M0-code-review.md` | Pass with follow-ups | Found one blocker: full-screen empty-state overlay blocked canvas pointer events. Fixed; drawer tests added. |
| 2026-10-27 | M0 | `agency-ui-finish-gate-reviewer` | Hard visual gate against the design contract | `docs/reviews/M0-visual-gate.md` | **PASS with follow-ups** | No blocking visual issue; mobile read-only notice and disclaimer added before sign-off. |
| 2026-10-27 | M1 | `agency-research-synthesist` | Verify OSM/Kartverket licences and attribution | Source decision recorded in `findings.md`, package attribution | Accepted | OSM ODbL 1.0 and Kartverket CC BY 4.0 approved with visible attribution and ODbL share-alike for derived footprints. |
| 2026-10-27 | M1 | Cline (pipeline/implementation) | Build two static packages, loader, scene, cameras, layers | `scripts/build_site_packages.py`, `public/sites/*`, `src/features/sites/*`, `src/scene/*` | Accepted after QA | 137 Compact / 33 Sloped buildings, 13×13 terrain, local ENU, 60.1 fps on Metal. |
| 2026-10-27 | M1 | `agency-gis-qa-engineer` | CRS, topology, provenance and camera QA | `docs/reviews/M1-geometry-qa.md` | **PASS with follow-ups** | Found 12 self-intersecting simplified footprints; repair and runtime validation fixed them. |
| 2026-10-27 | M1 | `agency-code-reviewer` | Review M1 implementation | `docs/reviews/M1-code-review.md` | **PASS with follow-ups** | No blockers after QA fix; loader, camera and geometry disposal verified. |
| 2026-10-27 | M1 | Lead visual pass | Review both site scenes and HUD | `docs/reviews/M1-visual-review.md` | **PASS with follow-ups** | Compact/slope scenes read correctly; remaining façade z-fighting and mobile framing are follow-ups. |
| 2026-10-27 | M2 | DeepSeek V4 Flash (Antigravity) | D1 grid snapping helpers (new files only, not wired) | `src/features/editor/snapping.ts`, `src/features/editor/snapping.test.ts` | Accepted | Pure module; 6 tests cover step/ties/origin/`-0`/invalid input per report §15.3 D1. |
| 2026-10-27 | M1 | DeepSeek V4 Flash (Antigravity) | D2 add `idle` state to `useSitePackage` (report §15.3 D2) | `src/features/sites/useSitePackage.ts`, `src/features/sites/useSitePackage.test.tsx`, `src/app/StudioPage.tsx` | Accepted | `null` site → `idle` (incl. id → null); StudioPage narrows `idle` away before StudioShell; 4 renderHook tests. |
| 2026-10-27 | M1 | DeepSeek V4 Flash (Antigravity) | D3 15 s timeout for stalled site package requests (report §15.3 D3) | `src/features/sites/package.ts` (`fetchJson`), `src/features/sites/fetchJson.test.ts` | Accepted with fix | Timer + caller abort combined via local `AbortController`; timeout names URL; 3 tests (timeout, caller abort, timer cleared). |
| 2026-10-27 | M2 | Claude Code (Opus 5.5) | Checkpoint the massing domain model and ADR-0004 | commit `5e92e12` | Accepted | `src/lib/polygon.ts`, `src/features/massing/*`, `docs/decisions/ADR-0004-massing-model.md`. |
| 2026-10-27 | M2 | Claude Code (Opus 5.5) | Add massing fixtures; fix max height and simple-ring checks | commit `f250232` | Accepted | Fixtures §2–3; `maxHeight` no longer floors at 0; `isSimpleRing` edge cases. |
| 2026-10-27 | M2 | Claude Code (Opus 5.5) | Add scenario-level validation and JSON serialization | commit `4d09bfc` | Accepted | `validation.ts` document rules; `serialize.ts` round-trip with schema guard. |
| 2026-10-27 | M2 | Claude Code (Opus 5.5) | Add massing command layer and undo/redo history | commit `4c054cd` | Accepted | `src/features/editor/commands.ts`, `history.ts`; 100-entry bound; preview/commit/cancel. |
| 2026-10-27 | M0 | DeepSeek V4 Flash (Antigravity) | D5 capture 1024×800 drawer-breakpoint screenshots (report §15.3 D5) | `scripts/capture.mjs`, `docs/screenshots/m1-*-1024x800.png` | Accepted | Playwright probe: floating drawer control visible at 1024×800, hidden at 1280×800. |
| 2026-10-27 | M1 | DeepSeek V4 Flash (Antigravity) | D6 verify cached raw source checksums in offline mode (report §15.3 D6) | `data/raw/SHA256SUMS`, `scripts/build_site_packages.py`, `README.md` | Accepted | `--offline` rebuild matches packages (`git status public/sites` clean); tamper probe raises `RuntimeError` naming file + digests. |
| 2026-10-27 | M1/M2 | Claude Code (Opus 5.5) | Review and merge D1–D6 from `deepseek/followups` | merge `9ebb4e4` + D3 fix | Accepted | All six in scope; no protected files touched; offline rebuild reproduces packages. D3: `response.json()` was returned un-awaited, so the timer and caller abort stopped covering the body read — fixed with a failing test first. D5 screenshot shows "Site notes" overlapping the study-boundary legend at 1024 px (follow-up). |
|  |  |  |  |  |  |  |
| 2026-10-28 | M2 | DeepSeek V4 Flash (Antigravity) | D7 add undo/redo shortcut matcher (status report §15.3b D7) | `src/features/editor/shortcuts.ts`, `src/features/editor/shortcuts.test.ts` | Pending Claude review | New files only, not wired into the UI. Pure matcher: mod+`z` undo, mod+Shift+`z`/Ctrl+`y` redo (never Meta+`y`), case-insensitive key, Alt and editable targets → null. 14 tests. |
| 2026-10-28 | M2 | DeepSeek V4 Flash (Antigravity) | D9 add footprint dimension helper (status report §15.3b D9) | `src/lib/dimensions.ts`, `src/lib/dimensions.test.ts` | Pending Claude review | New files only. Minimum-area bounding rectangle via convex-hull edge directions; `width ≥ depth`; rotation of the width axis from east CCW in `[0, π)`; ties → smallest rotation; <3 vertices → zeros. 7 tests incl. 30°-rotated rectangle at π/6. |
| 2026-10-28 | M2 | DeepSeek V4 Flash (Antigravity) | D13 map QA rows to covering tests (status report §15.3b D13) | `docs/qa/fixtures.md` §7 | Pending Claude review | Added "Covered by" column to the QA matrix, citing only existing tests from `src/**/*.test.ts(x)` and `e2e/*.spec.ts`; QA-09–13/15/17 marked "Not yet covered" (M3/M4/M5 scope). |
| 2026-10-28 | M2 | DeepSeek V4 Flash (Antigravity) | D10 add massing e2e flow (task message §D10) | `e2e/massing.spec.ts` | Pending Claude review | Draws a mass from the Top preset, then esc-cancel and commit+undo roof-drag tests. Deviation: roof drag runs in Iso — in Top view the drag plane is parallel to the view axis, so the preview saturates past the 1–40 storey cap and a release can never commit (~160 storeys at 80 px); verified by probe before switching. |
