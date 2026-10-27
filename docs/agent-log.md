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
|  |  |  |  |  |  |  |
