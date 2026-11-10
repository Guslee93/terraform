# C28 — Simplify studio execution and review

Date: 2026-11-10. Executor/reviewer: Codex, using frontend-developer and code-reviewer role skills (single agent).
Authority: `docs/handoffs/C28-simplify-studio.md`, HARD RULE, and accepted ADR-0020.

## Outcome

Implemented the studio scope cut. Top bar exposes Back, site, Add a block, Export, Fit site and About. Blocks use the existing transactional reducer in memory, with Draw/Select/Delete/Undo/Redo only while enabled. Storeys is a number input, height derives from geometry, and Delete is the only selected-block action. Live geometry continues into the analysis building array and scene shadows. Hiding tools preserves this session's blocks; reopening/reloading the studio starts empty.

The dock contains Sun/Wind/Noise and an optional Blocks count. Inspector retains active analysis controls, minimal selected block, four scene layers, camera presets, visual export and Site attribution. Automatic rendering uses `auto`, ignoring old manual preferences. Removed boundary/constraint rendering and warning annotations; validation of drawable geometry remains.

## HARD RULE audit

- Did not edit LandingPage, NewSitePage, App, AboutPage, marketing components or their unit tests. Concurrent changes to those files, global.css and e2e/smoke.spec.ts belong to the parallel main-page work and are excluded from this inventory.
- No edits to `src/features/analysis/**`, SunPanel, ClimatePanel, DirectionRose, ExportVisuals, PassExporter or exportPasses. Existing untracked export files were retained.
- No dependency additions, commit, push, deployment, or stored-project deletion.
- Pre-existing screenshot deletions and reference images were left alone.

## Verification

| Command | Result |
| --- | --- |
| `npm run lint` | Pass, final run. |
| `npm run test` | Pass: 97 files passed, 1 skipped; 898 tests passed, 4 skipped. Final run 24.68 s. |
| `npm run build` | Pass: TypeScript and Vite. Bundle >500 kB warning remains. |
| `npx playwright test --list` | Pass: 58 tests in 14 files discovered. |
| `npx playwright test e2e/simplified-studio.spec.ts e2e/massing.spec.ts e2e/layers.spec.ts e2e/wind-a11y.spec.ts e2e/wind.spec.ts e2e/m3-analysis.spec.ts e2e/m3-rendering.spec.ts --workers=2` | Blocked before tests: Vite listen EPERM on 127.0.0.1:5173. |
| `git diff --check` | Pass. |

The first unit run had an obsolete toolbar JSON Export assertion and a 5-second wind-validation timeout while checks ran concurrently. Removed the obsolete assertion; full reruns passed without modifying the protected wind tests. Initial editing-script attempts also caught a missing `python` command (used python3) and an over-broad source-range edit (restored the full original analysis wiring before proceeding). Initial typechecks identified old removed-feature test references; these were updated.

Browser and visual gate remain unverified: no fresh screenshots were captured, and no e2e pass is claimed. The new integration spec captures `docs/screenshots/c28-wind-block-export-1440x900.png` when run in an environment that permits Vite to listen.

## Test changes

- Deleted component tests for scenarios, recovery, comparison, checks, constraints, metrics and mass list; deleted the unused autosave/session/comparison/project-operation unit tests and constraint/snapshot adapter tests (exact paths below).
- Deleted all m4 specs and helper plus m5 guide spec. Removed constraint/metrics assertions from m3 tests and the manual quality/persistence rendering case. Preserved sun readouts, time presets, DST gap, no-WebGL fallback, claims and analysis tests.
- Reworked shell coverage for initial analysis-only UI, auto rendering, live analysis geometry, cancel/one-entry drag history, session reset, loading/error states. Reduced MassFields/command tests to remaining editing behavior, including input validation and Escape.
- Updated dock, inspector, toolbar and value tests; layer, wind, keyboard, massing and evidence e2e selectors. m5 accessibility change only replaces the deleted m4 helper import with the shared block helper.
- New `e2e/simplified-studio.spec.ts` observes actual worker requests/results, checks added geometry and changed obstacle field after drawing while Wind remains on, then checks Image passes and Record 6 s clip actions. It does not mock the solver or change production instrumentation.

## Retained intentionally / uncertain removals resolved

- Shared scenario repository, default repository, project, migrate and store modules, their fixtures and tests remain: site import/session code still imports these. No IndexedDB cleanup or schema change.
- All analysis domain modules remain under the HARD RULE, including constraints, massSummary and siteFacts that now lack studio callers. Their massing dependencies (metrics and clearance helpers) are therefore retained too.
- Multi-tier/domain schemas remain compatible with stored data. Removed unused UI command factories (duplicate/rotate/add/remove/stack tier, volume-property edits, scenario notes/name), without rewriting schemas or renderer-free geometry validation.
- The study-area polygon remains in immutable site packages and still supplies existing wind-centre/noise-domain inputs. Only its visible boundary and planning-check uses were removed.
- Camera presets remain under Layers; the floor grid stays on by default. The removed render-size controls use the former medium dock presentation.

## Code review

Source review found no remaining removed-feature imports or guide storage key in src/e2e. Import storage dependencies remain intact; analysis-domain diff is empty. The live geometry path was retained verbatim, and tests check preview/cancel/history behavior. No new unchecked boundary casts, `any`, persistence path or runtime dependency. Visual layout and real browser execution are the outstanding gate, not a source-review approval substitute.

## Files changed by this work

- `e2e/keyboard.spec.ts`
- `e2e/layers.spec.ts`
- `e2e/m3-analysis.spec.ts`
- `e2e/m3-disclaimers.spec.ts`
- `e2e/m3-evidence.spec.ts`
- `e2e/m3-rendering.spec.ts`
- `e2e/m5-a11y.spec.ts`
- `e2e/massing.spec.ts`
- `e2e/studio-helpers.ts`
- `e2e/wind-a11y.spec.ts`
- `e2e/wind-evidence.spec.ts`
- `e2e/wind.spec.ts`
- `playwright.config.ts`
- `src/components/studio/AnalysisDock.test.tsx`
- `src/components/studio/AnalysisDock.tsx`
- `src/components/studio/Inspector.test.tsx`
- `src/components/studio/Inspector.tsx`
- `src/components/studio/LayersCard.tsx`
- `src/components/studio/MassFields.test.tsx`
- `src/components/studio/MassFields.tsx`
- `src/components/studio/StudioShell.test.tsx`
- `src/components/studio/StudioShell.tsx`
- `src/components/studio/StudioTopBar.tsx`
- `src/components/studio/ToolRail.test.tsx`
- `src/components/studio/ToolRail.tsx`
- `src/components/studio/claims.test.tsx`
- `src/components/studio/dockValues.test.ts`
- `src/components/studio/dockValues.ts`
- `src/features/editor/commands.test.ts`
- `src/features/editor/commands.ts`
- `src/features/editor/interaction.test.ts`
- `src/scene/CameraHud.tsx`
- `src/scene/MassLayer.tsx`
- `src/scene/ViewportCanvas.tsx`

## Files deleted by this work

- `e2e/m4-evidence.spec.ts`
- `e2e/m4-helpers.ts`
- `e2e/m4-recovery.spec.ts`
- `e2e/m4-scenarios.spec.ts`
- `e2e/m5-guide.spec.ts`
- `src/components/studio/ComparePanel.test.tsx`
- `src/components/studio/ComparePanel.tsx`
- `src/components/studio/ConstraintsPanel.test.tsx`
- `src/components/studio/ConstraintsPanel.tsx`
- `src/components/studio/MassList.test.tsx`
- `src/components/studio/MassList.tsx`
- `src/components/studio/MetricsPanel.test.tsx`
- `src/components/studio/MetricsPanel.tsx`
- `src/components/studio/ProjectRecovery.test.tsx`
- `src/components/studio/ProjectRecovery.tsx`
- `src/components/studio/ScenarioMenu.test.tsx`
- `src/components/studio/ScenarioMenu.tsx`
- `src/components/studio/ScenarioNotes.tsx`
- `src/components/studio/SiteFactsPanel.tsx`
- `src/components/studio/StudioGuide.tsx`
- `src/components/studio/checks.test.ts`
- `src/components/studio/checks.ts`
- `src/components/studio/studioMode.ts`
- `src/components/studio/useScenarioProject.test.ts`
- `src/components/studio/useScenarioProject.ts`
- `src/features/scenarios/autosave.test.ts`
- `src/features/scenarios/autosave.ts`
- `src/features/scenarios/compare.test.ts`
- `src/features/scenarios/compare.ts`
- `src/features/scenarios/projectOps.test.ts`
- `src/features/scenarios/projectOps.ts`
- `src/features/scenarios/sessions.test.ts`
- `src/features/scenarios/sessions.ts`
- `src/scene/ConstraintLayer.test.tsx`
- `src/scene/ConstraintLayer.tsx`
- `src/scene/ScenarioSnapshots.test.ts`
- `src/scene/ScenarioSnapshots.tsx`

## Files added / session records

- `e2e/simplified-studio.spec.ts`
- `docs/reviews/C28-simplify-studio.md`
- Appended C28 entries to `task_plan.md`, `progress.md`, and `docs/agent-log.md`.
