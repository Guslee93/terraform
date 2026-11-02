# C17 — M5 states pass (Codex work order)

Project: Terraform v1, milestone M5 (feature freeze: polish only). Worktree `/Users/gustavekamanzi/Downloads/2026/Terraform-m5states`, branch `m5/states`.
Read first: `AGENTS.md`, `docs/plans/M5-plan.md` §1–2, `docs/design/design-contract.md` §0, `docs/handoffs/C16-m5-landing.md` (finished look of the marketing pages).

## HARD RULE
Edit only `src/components/studio/**`, `src/components/ui/**`, `src/app/**` and their tests. If something needs another file (`src/features/**`, `e2e/**`, styles, package.json), STOP that item and report it. No new dependencies, no new features, no invented numbers. Do not commit, merge or push. No browser tools.

## Items
1. **Studio loading state.** While the site package loads (`packageStatus === 'loading'`) the studio must show a calm skeleton in the same layout as the editor (canvas area + right panel placeholders, flat cool surfaces, hairlines, no shadows, no spinner-only screen), with an accessible status ("Loading site package", `role="status"`). Respect `prefers-reduced-motion` (no shimmer under reduce).
2. **Failed/missing package state.** Review what the studio shows when the package fails to load or is missing (`packageStatus === 'error'`): plain-language message, a working Retry, a link back to the sites, no raw error text as the only content. Match the visual system.
3. **Invalid-polygon / invalid-input copy.** Find the messages the studio shows for invalid footprints/fields (MassFields, drawing feedback). Rewrite so each says what is wrong and what to do, in short plain sentences, no jargon, no blame. Keep tests/e2e assertions that look for existing text working, or update the unit tests you touch; list every text you changed in the summary.
4. Unit tests for 1–3 (loading status role, error retry, reduced-motion class presence).

## Done when
`npm run lint`, `npm run test`, `npm run build` pass. Summary: items done/stopped, texts changed, tests added, commands and results. Add no row to docs/agent-log.md.
