# Claude session handoff (orchestrator), 2026-10-29

Read this instead of the previous long conversation. Then read `AGENTS.md` and `docs/plans/next-48h-plan.md`.

## Role

Claude orchestrates: approves agent plans, reviews deliveries, makes visual and design decisions, runs gates, merges. Codex and DeepSeek implement. Keep Claude turns short; prefer Sonnet for routine reviews.

## Repo state

- `main` holds everything; M0–M3 complete (M3 signed off 2026-10-29, `docs/reviews/M3-code-review.md`). No git remote; never push.
- Worktrees: main checkout `Terraform` (Codex works here, on feature branches such as `m4/scenarios`); `../Terraform-ds4` (DeepSeek, new branch per round from `main`); `../Terraform-m3` (Fable, `m3/domain`, done; may be removed).
- Suite at sign-off: lint 0 · 699 unit tests · build ✅ · e2e 18 passed (+1 opt-in evidence spec: `SHOT_EVIDENCE=1 npx playwright test e2e/m3-evidence.spec.ts`).

## How agents are run

- **Codex:** `npx -y @openai/codex@0.164.0 exec -C "$PWD" -s workspace-write [-c sandbox_workspace_write.network_access=true] -o <scratch>/report.md "<prompt>" < /dev/null` as a tracked background task. **stdin must be `/dev/null`** or it hangs. It has usage limits (it hit one before; on a limit, report to the owner, don't retry). Its sandbox can't run Playwright or open a browser, so Claude runs e2e during review. It once tried desktop computer use; every work order forbids it.
- **DeepSeek:** the owner runs it (via OpenRouter, Antigravity) from prompts Claude writes; it can't view images, so Claude reviews any screenshots.
- Work orders live in `docs/handoffs/`; task cards for DeepSeek live in `docs/status-report.md` §15.3x or in the 48 h plan.

## Review checklist (per delivery)

1. `git log`/`git diff --stat` against the base: only the files the order allowed.
2. `npm run lint && npm run typecheck && npm run test && npm run build`, plus `npx playwright test` (software GL; render quality Auto → Low there).
3. Spot-read the riskiest logic; check the claim policy (AGENTS.md §7).
4. Images: build one contact sheet (PIL) rather than opening many full screenshots.
5. Agent-log row (`docs/agent-log.md`), short `progress.md` entry, merge (`--ff-only` where possible).

## Conventions

- Commit messages end with the attribution line from the system reminder.
- Screenshots: `scripts/capture.mjs` pins render quality High; use `SHOT_PREFIX` / `SHOT_VIEWPORT`.
- Design tokens and scene palette: `docs/design/design-contract.md` §8. ADRs 0001–0008 in `docs/decisions/`.

## Open items

- M2 owner acceptance; round-2 agent-log rows D7–D13 unreviewed.
- M3 follow-ups: `docs/reviews/M3-code-review.md` §4 (export disclaimer → M5, FR-076 panel, status chip label, import triangulation artefact, preset years, height-label wording).
- M4 started via `docs/plans/next-48h-plan.md` §5.
