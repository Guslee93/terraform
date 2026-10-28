# Review record — M2 Massing engine

- **Date:** 2026-10-28
- **Reviewer:** Claude Code (Opus 5.5) acting as `engineering-code-reviewer`. **This is a self-review by the implementing agent** — independence is limited; an independent review before M2 sign-off is recommended.
- **Scope:** `main` from `5e92e12` (M2 checkpoint) to `5b244a3` (stacked tiers), excluding DeepSeek round 1 (reviewed separately at merge `9ebb4e4`) and round 2 (unmerged, `deepseek/round2`).
- **Commands run** (isolated worktree of `main`, 2026-10-28): `npm run typecheck` ✅ · `npm run lint` ✅ · `npm run test` ✅ 205/205 (22 files) · `npm run build` ✅ (landing 91.88 kB gzip, studio 276.54 kB gzip; known >500 kB raw warning) · Playwright smoke ✅ 2/2 on a dedicated server.
- **Screenshots:** `docs/screenshots/m2-gate-flat-l-stepped-iso.jpg`, `m2-gate-flat-l-stepped-top.jpg` (fixed ISO and TOP presets, Compact Infill); per-feature evidence in `docs/screenshots/m2-*.jpg`.

## Architecture check

| Rule (AGENTS.md / ADRs) | Result |
|---|---|
| Domain renderer-free (`src/features/massing/**`, `src/features/editor/**`, `src/lib/polygon.ts`) | ✅ no React/Three/Zustand imports |
| Local ENU metres; one conversion path to the renderer (ADR-0002) | ✅ `massGeometry.ts` rotates (east, north, up) → (east, up, −north); raycasts convert back with `[x, −z]` |
| Immutable document, snapshot history, preview/commit/cancel (ADR-0003/0004) | ✅ incl. §3 amendments (preview from base; locked masses) |
| One pointer drag = one undo entry; Esc cancels; release commits | ✅ unit + browser (QA-07) |
| Strong typing at boundaries; persisted data validated | ✅ `parseScenarioDocument` decodes untrusted JSON; no `any` in domain |
| No new runtime dependencies | ✅ none added in M2 |
| Truthful claims; disclaimers visible | ✅ clearance warnings say "Illustrative check · not planning advice"; numbers derive from geometry |

## Findings

| Severity | File / area | Issue | Recommendation | Status |
|---|---|---|---|---|
| major | M2 brief deliverable 3 | **Tools missing:** add mass at point, scale footprint, vertex edit. | Build them on the existing gesture model (`interaction.ts`), or descope by ADR with the user. | open |
| major | `MassFields.tsx` / a11y | **No single-pointer alternative to dragging a mass** (WCAG 2.2 SC 2.5.7). Height has one (Storeys field); position does not. | Add east/north nudge buttons or position fields that call `moveVolume`. | open |
| major | M2 brief deliverable 5 | Inspector lacks **width/depth/rotation** readouts and the **palette** control. | Wire D9 (`footprintDimensions`) after review; palette needs a design-contract decision. | open (D9 pending) |
| minor | `interaction.ts` draw tool | Grid snapping (P0) applies to moves only; **drawn corners are not snapped**. | Snap draw vertices with `snapPoint`, behind the same 1 m step. | open |
| minor | `MassLayer.tsx` roof handle | Handle is a focusable button but **not keyboard-operable** (inspector Storeys field is the accessible alternative). | ArrowUp/ArrowDown on the focused handle → ±1 storey via `updateTier`. | open |
| minor | `MassLayer.tsx` stacked tiers | A lower tier's roof handle sits at its roof centroid, **often under the upper tier**. | Place the handle on an exposed part of the roof (e.g. nearest exposed edge midpoint). | open |
| minor | `StudioShell.tsx` clearance summary | Viewport "N masses need attention" **counts hidden masses**. | Count visible masses only, or say "(1 hidden)". | open |
| minor | `MassLayer.tsx` `usePlaneDrag` | Unmounting mid-drag stops listeners but **does not dispatch `pointerCancel`**, so the reducer could stay in `dragging`. | Dispatch `pointerCancel` from the unmount cleanup. | open |
| minor | `commands.ts` `updateTier` | Stack-following moves **every** tier at or above the old top, including a tier added beside rather than on top via `addTier`. UI only creates true stacks (`stackTier`). | Restrict to tiers whose footprint overlaps the edited tier, if `addTier` is ever exposed. | open |
| minor | Performance | Not measured **during drags** (geometry rebuild + clearance sampling per pointer move). | Re-measure FPS at 1440×900 with 5+ masses while dragging; budget 45 fps (M1 measured 60 fps static). | open |
| nit | `MassFields.tsx` | Delete button colour removed (class conflict); destructive actions rely on undo rather than confirmation. | Acceptable while undo exists; revisit with persistence (M4). | accepted |
| nit | Domain GFA | Σ(footprint × storeys) per tier; tiers overlapping at the same level would double-count (PRD line 403). `stackTier` never creates that case. | Decide on level-indexed GFA before M3 (status report §7.4.3). | open (M3) |

No blockers found.

## QA-03 – QA-08 (PRD §12)

| QA | Requirement | Automated | Browser | Result |
|---|---|---|---|---|
| QA-03 | Create valid polygon → visible, selectable, persisted | factories, validation, draw tool (`interaction.test.ts`) | draw → mass visible + selected (2026-10-27) | **Pass** except "persisted" (M4 owns persistence; serialization round-trip tested) |
| QA-04 | Self-intersecting polygon → clear validation, model unchanged | `validation.test.ts`, `interaction.test.ts` (QA-04) | bow-tie → "Footprint edges must not cross.", points kept | **Pass** |
| QA-05 | Storeys 3 → 5 → height and GFA update | `commands.test.ts` (16 m, 1 080 m²) | roof drag 3 → 5 storeys · 16.0 m; inspector 5 × 3.5 m → 17.5 m | **Pass** (GFA card is M3) |
| QA-06 | Footprint across boundary → warning, highlight | `clearance.test.ts` | drag across boundary → amber + warning, live | **Pass** |
| QA-07 | Drag roof + Esc → exact pre-drag dimensions, no entry | `interaction.test.ts`, `commands.test.ts` | 18-storey preview → Esc → exact 3 storeys, camera unchanged | **Pass** |
| QA-08 | Undo/redo duplicate, delete, rotate → exact state and selection | `commands.test.ts` (QA-08) | duplicate/rotate 45°/delete with Undo/Redo restore geometry and selection | **Pass** (keyboard shortcuts pending D7) |

Required tests from the brief: rectangle ✅, stepped fixture ✅ (also through `stackTier` + `updateTier`), self-intersection without mutation ✅, drag = one entry / Esc = zero ✅, undo/redo after duplicate/delete/rotate ✅, numeric input QA-16 ✅, serialization round-trip ✅.

## Gate decision

- [ ] Pass
- [x] **Pass with follow-ups — code review (G1) and PRD QA gate (QA-03–08)**
- [ ] Fail — re-review required

**Milestone acceptance (G4) is not met yet:** brief deliverables 3 (add-at-point, scale, vertex edit), 5 (width/depth/rotation, palette) and the WCAG 2.5.7 move alternative are outstanding, the interaction recording is not captured, and DeepSeek round 2 (D7 shortcuts, D9 dimensions, D10 massing e2e) is unmerged. Do not mark M2 complete until these land or are descoped by ADR with the user's agreement.

## Follow-ups (separate tasks, not sneaky edits)

1. Missing tools: add mass at point, scale footprint, vertex edit — or ADR descoping them.
2. Position alternative to dragging (WCAG 2.5.7) + roof-handle arrow keys.
3. Review/merge DeepSeek round 2; wire D7 shortcuts and D9 readouts; palette decision.
4. Snap drawn corners to the grid.
5. Lower-tier handle placement; hidden masses in the warning count; `pointerCancel` on unmount.
6. Drag-time performance measurement; short interaction recording for the case study.
7. Independent review of M2 before sign-off.

## Notes

- Reviewed in an isolated worktree because DeepSeek round 2 was running in the main checkout; no files on `deepseek/round2` were touched.
- Earlier M2 sessions found and fixed during browser verification: hidden selection outline (`polygonOffset`), passive-listener `preventDefault`, raw developer error text, stale inspector copy, floating roof handle on hidden masses, a 1 m cut threshold that flagged ordinary plinths, and a flaky lazy-route test.
