# Review record — M4 (scenarios, persistence, comparison)

- **Status:** Reviewed 2026-11-02 — **Pass with follow-ups**, pending owner acceptance of ADR-0011. Persistence core reviewed independently (read-only subagent); UI reviewed in `M4-ui-independent-review.md`.
- **Reviewer:** (final: `engineering-code-reviewer`, independent of the builders)
- **Scope:** `ef2a92b..HEAD` for M4: S1–S4 (Claude, `cc02494`), K1 keyboard e2e, C12–C14 (Codex, reviewed in `M4-ui-independent-review.md`), D35 fixtures (DeepSeek, integrated `5543667`), C15 minors (Codex), D36/D37 e2e and evidence (DeepSeek).
- **Decisions:** ADR-0011 (**proposed — owner has not accepted**); camera bookmarks deferred (ADR-0011 §9).

## Required tests (M4 brief) → proof

| Required test | Proof | Status |
|---|---|---|
| Two scenarios persist distinctly across reload (QA-09) | `useScenarioProject.test.ts` ("QA-09…"), `repository.test.ts`; e2e: D36 `m4-scenarios.spec.ts` | unit ✅ · e2e ✅ (D36, `--workers=1`) |
| Comparison deltas match fixture calculations (QA-12) | `compare.test.ts`, `ComparePanel.test.tsx` (hand-calculated 600 / 1 400 / +800 m²); e2e: D36 | unit ✅ · e2e ✅ (D36, `--workers=1`) |
| Unknown site, missing record, corrupt JSON and quota failure give recoverable UI (QA-14) | `repository.test.ts`, `__fixtures__/fixtures.test.ts`, `ProjectRecovery.test.tsx`, `useScenarioProject.test.ts`; e2e: D36 `m4-recovery.spec.ts` | unit ✅ · e2e ✅ (D36, `--workers=1`) |
| Migration fixture v0 → current | `__fixtures__/fixtures.test.ts` (v1 and v0 → exactly `stepped-v2.expected.json`), `migrate.test.ts` | ✅ |
| Export/import round trip preserves geometry and assumptions | `repository.test.ts`, `fixtures.test.ts` (FR-048 round trip, legacy bundle, wrong site) | ✅ |
| No autosave writes during pointer movement | `autosave.test.ts` (waits while busy); e2e: D36 counts IndexedDB `put` calls during a roof drag | unit ✅ · e2e ✅ (D36, `--workers=1`) |

## Findings

(Carry over open rows from `M4-ui-independent-review.md` and C15; add new findings from the final review.)

| Severity | File / area | Issue | Recommendation | Status |
|---|---|---|---|---|
| Major | `autosave.ts` writeAll | Snapshot iteration overwrote an edit committed during an earlier id's write, then reported "saved" (M1) | Read pending at write time | Fixed `21bfafa` + test |
| Major | reset demo / import | In-flight scenario writes could land after reset/import and resurrect rows (M2) | Flush, discard, then storage call | Fixed `21bfafa` (residual: edits typed during the await) |
| Minor | delete / import failure | Unsaved edits dropped when delete or import fails (m1) | Re-commit on failure | Fixed |
| Minor | autosave | Failed in-flight write re-added a discarded id (m2) | Track dropped ids | Fixed + test |
| Minor | load of repaired/default data | Index named ids never stored (m5) | Commit repaired scenarios | Fixed |
| Minor | save status | Project-index write failures swallowed; stale `error` status survives discard (m3, m4) | Route index writes through status | Open, known limit |
| Minor | hook | Stale `data` closures after await in remove/discardSkipped/reset/import (m6) | Functional setData | Open, known limit (one IDB op window) |
| Minor | import | Replace deletes unreadable/newer rows without round-tripping them (m7); no size cap, no cross-tab handling (m11) | Warn (C15 warns); document | Open, known limit |
| Minor | migration | Timestamps stamped at each load until first save (m8); unload flush best-effort (m9); `saveScenario` can throw synchronously (m10) | — | Open, known limit |
| Nit | misc | Unchecked `as` in serialize.ts, lenient `Date.parse`, `-0` delta, per-id queue map growth (n1–n7) | — | Open |

## Gate checklist

- [x] lint, typecheck, unit (806) pass on `main`; full e2e with `--workers=1` to be re-run at the M5 gate (M3/roof-drag specs flaked once under software GL, passed alone)
- [x] D36 e2e and D37 evidence merged; `docs/reviews/M4-evidence.md` maps every required test
- [x] C15 minors merged and reviewed
- [x] No unresolved blocker or major finding
- [x] Save status truthful in every state (saved, saving, unsaved, quota, unavailable, read-only)
- [x] Deltas neutral; envelope disclaimer present in Compare
- [ ] Studio chunk size recorded (346 kB raw / 110 kB gzip at `0ab19d5`) and accepted against the M5 budget
- [ ] Owner accepts ADR-0011

## Gate decision

- [ ] Pass
- [x] Pass with follow-ups
- [ ] Fail — re-review required
