# Next 48 hours — credit-aware plan (2026-10-29 → Sat 19:00 reset)

**Constraint:** Claude Pro weekly limit at 81 % (resets Sat 19:00), 5-hour window 35 %. Claude stays in the loop, but only where its judgement is needed.

## 1. Where the project stands

| Milestone | State |
|---|---|
| M0 Foundation · M1 Site packages | ✅ complete |
| M2 Massing | Review recorded (`docs/reviews/M2-code-review.md`), QA-03–08 covered; **owner acceptance still open**; round-2 agent-log rows (D7–D13) unreviewed |
| Scene look (ADR-0005) | ✅ white model, Hektar grade, real sun, outlines, land cover, trees |
| **M3 Live analysis** | ✅ **complete** (owner sign-off 2026-10-29) |
| M6 Site import | P1 spike + P2 importer library ✅; P3–P5 (map UI, My sites, hardening) wait until after M5 |
| **M4 Scenarios** | ⏳ not started: 8 deliverables (CRUD, isolation, Dexie persistence + autosave, migrations, comparison, matched visuals, activation, JSON backup) |
| **M5 Polish & release** | ⏳ not started: PNG export, landing/onboarding, states, responsive, a11y, perf, deployment, case study, demo script |

Roughly **60 % of the release path is done** (M0–M3 of M0–M5). M4 is mid-sized and mostly well-specified engineering; M5 is broad, with many small items plus judgement-heavy design and story work.

## 2. The biggest credit levers (in order)

1. **Retire this conversation.** It is very long, so every Claude turn re-sends a huge context. A **fresh Claude session** that starts from `docs/handoffs/claude-session-handoff.md` costs a fraction per turn. This is the single biggest saving.
2. **Sonnet 5.5 for routine Claude work** (reviews of diffs, merges, doc updates); Opus only for design and gate decisions. Both draw on the same weekly limit, but Sonnet draws less per turn.
3. **Agents write their own plans and work orders from the milestone brief;** Claude only approves (a short read) instead of authoring them.
4. **One review per round, not per card.** Agents hand in a self-check (test output, files, a single contact-sheet image), and Claude reviews the diff summary plus that one image.
5. **A first-pass reviewer before Claude:** Codex reviews DeepSeek's work and vice versa (`codex-review` / `claudex-loop` skills exist). Claude spot-checks the risky parts only.
6. **No Claude browser driving.** Screenshots come from DeepSeek's Playwright scripts; Claude looks at one contact sheet.

**On adding another OpenRouter model:** optional. DeepSeek already covers the cheap tier; a third model adds coordination overhead. Add one only as a *reviewer* (a strong coding model from OpenRouter's leaderboard) if Codex is rate-limited.

## 3. Who does what in the next 48 h

| Agent | Work |
|---|---|
| **Codex** (main checkout, branch `m4/scenarios`) | **M4 planning + core**: write `docs/handoffs/C12-m4-plan.md` from the M4 brief, then implement persistence (Dexie, versioned document, migrations, autosave, recoverable corrupt/quota states) and scenario CRUD + isolation. Then comparison table + activation. |
| **DeepSeek** (`../Terraform-ds4`, `deepseek/round7`) | **M4 tests and fixtures** (QA-09 reload, QA-12 deltas, QA-14 corrupt/quota, v0 → current migration fixture, export/import round-trip) against Codex's plan; then **M5 groundwork that doesn't touch product code**: case-study draft text (technical-writer role, claim policy), demo-script draft (PRD §16), deployment options note (static hosts, no secrets). |
| **Claude** (fresh session, Sonnet for reviews) | Approve Codex's M4 plan (short); one review per round; the M4 gate after the Saturday reset (Opus). |

## 4. Order

1. **Now:** start Codex (C12 plan + persistence core). Start DeepSeek round 7 (M5 text drafts first, since they don't depend on Codex; M4 tests once Codex's plan lands).
2. **Tomorrow:** Claude (fresh session, Sonnet) approves Codex's plan; DeepSeek switches to M4 tests.
3. **After the Saturday reset:** Claude (Opus) reviews M4, runs the gate, and plans M5 with the same split.

## 5. Ready-to-paste prompts

### Codex

```text
Role: senior developer for Terraform v1, milestone M4 (scenarios). Branch: in /Users/gustavekamanzi/Downloads/2026/Terraform run `git switch -c m4/scenarios main`. Do not use computer use or drive any desktop app. Do not commit or stage.

Read: AGENTS.md; docs/milestones/M4-scenarios.md; docs/decisions/ADR-0003 (state and history) and ADR-0004 (massing model); src/features/massing/serialize.ts (+ tests); src/features/editor/**; src/components/studio/StudioShell.tsx; docs/reviews/M3-code-review.md §4 (follow-ups).

Step 1: write docs/handoffs/C12-m4-plan.md: module map (src/features/scenarios/**), the persisted document schema with version, the migration strategy, the autosave/flush rules, the error states (unknown site, missing record, corrupt JSON, quota), the UI changes, and the test list mapped to the brief's required tests. Keep it under 150 lines. Then STOP and report; Claude approves it before you continue.
```

After approval:

```text
Implement docs/handoffs/C12-m4-plan.md (as approved), persistence and CRUD/isolation first, then comparison + activation. Renderer-free domain in src/features/scenarios/**; Dexie is already a dependency. No new dependencies. Run lint, typecheck, test and build. Report files, tests, deviations; do not commit.
```

### DeepSeek

```text
Role: technical writer + QA for Terraform v1. In /Users/gustavekamanzi/Downloads/2026/Terraform-ds4 run `git switch -c deepseek/round7 main && npm ci`. Never work in the main checkout. No computer use; Playwright only.

Read: AGENTS.md (claim policy §7); docs/milestones/M5-polish.md; Terraform_Comprehensive_PRD_v1.md §16 (demo script); docs/reviews/M3-code-review.md; docs/plans/site-import-plan.md (for the "what's next" section only).

Do, one commit each:
1. docs/case-study/draft.md: Challenge → intent → system diagram (mermaid) → UI views (reference existing docs/screenshots by path) → computational proof (link the M3 evidence and fixtures) → limitations. Claim policy only; ~1 200 words.
2. docs/case-study/demo-script.md: the 90-second walkthrough from PRD §16, step by step with on-screen actions and voice-over lines.
3. docs/plans/deployment-options.md: 3 static HTTPS hosts compared (cost, custom domain, headers/CSP, SPA routing for /studio/*, no secrets/telemetry), with a recommendation; no account creation.
Then wait: when docs/handoffs/C12-m4-plan.md exists on main, write the M4 tests it lists (unit + e2e), touching only test files and fixtures.

Report: commit → files, anything unclear. Then tell Claude: "review deepseek/round7".
```
