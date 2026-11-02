# Review record — M4 (scenarios, persistence, comparison)

- **Status:** DRAFT — not a gate decision. Fill in when D36/D37 land and C15 is merged.
- **Reviewer:** (final: `engineering-code-reviewer`, independent of the builders)
- **Scope:** `ef2a92b..HEAD` for M4: S1–S4 (Claude, `cc02494`), K1 keyboard e2e, C12–C14 (Codex, reviewed in `M4-ui-independent-review.md`), D35 fixtures (DeepSeek, integrated `5543667`), C15 minors (Codex), D36/D37 e2e and evidence (DeepSeek).
- **Decisions:** ADR-0011 (**proposed — owner has not accepted**); camera bookmarks deferred (ADR-0011 §9).

## Required tests (M4 brief) → proof

| Required test | Proof | Status |
|---|---|---|
| Two scenarios persist distinctly across reload (QA-09) | `useScenarioProject.test.ts` ("QA-09…"), `repository.test.ts`; e2e: D36 `m4-scenarios.spec.ts` | unit ✅ · e2e pending |
| Comparison deltas match fixture calculations (QA-12) | `compare.test.ts`, `ComparePanel.test.tsx` (hand-calculated 600 / 1 400 / +800 m²); e2e: D36 | unit ✅ · e2e pending |
| Unknown site, missing record, corrupt JSON and quota failure give recoverable UI (QA-14) | `repository.test.ts`, `__fixtures__/fixtures.test.ts`, `ProjectRecovery.test.tsx`, `useScenarioProject.test.ts`; e2e: D36 `m4-recovery.spec.ts` | unit ✅ · e2e pending |
| Migration fixture v0 → current | `__fixtures__/fixtures.test.ts` (v1 and v0 → exactly `stepped-v2.expected.json`), `migrate.test.ts` | ✅ |
| Export/import round trip preserves geometry and assumptions | `repository.test.ts`, `fixtures.test.ts` (FR-048 round trip, legacy bundle, wrong site) | ✅ |
| No autosave writes during pointer movement | `autosave.test.ts` (waits while busy); e2e: D36 counts IndexedDB `put` calls during a roof drag | unit ✅ · e2e pending |

## Findings

(Carry over open rows from `M4-ui-independent-review.md` and C15; add new findings from the final review.)

| Severity | File / area | Issue | Recommendation | Status |
|---|---|---|---|---|
| | | | | |

## Gate checklist

- [ ] `npm run lint`, `typecheck`, `test`, `build`, `test:e2e --workers=1` pass on `main`
- [ ] D36 e2e and D37 evidence merged; `docs/reviews/M4-evidence.md` maps every required test
- [ ] C15 minors merged and reviewed
- [ ] No unresolved blocker or major finding
- [ ] Save status truthful in every state (saved, saving, unsaved, quota, unavailable, read-only)
- [ ] Deltas neutral; envelope disclaimer present in Compare
- [ ] Studio chunk size recorded (346 kB raw / 110 kB gzip at `0ab19d5`) and accepted against the M5 budget
- [ ] Owner accepts ADR-0011

## Gate decision

- [ ] Pass
- [ ] Pass with follow-ups
- [ ] Fail — re-review required
