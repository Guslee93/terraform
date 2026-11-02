# C18 — M5 onboarding (Codex work order)

Project: Terraform v1, M5 (polish; no new product features). Worktree `/Users/gustavekamanzi/Downloads/2026/Terraform-m5onboard`, branch `m5/onboarding`.
Read first: `AGENTS.md`, `docs/plans/M5-plan.md`, `docs/design/design-contract.md` §0, `src/components/studio/StudioShell.tsx`.

## HARD RULE
Edit only `src/components/studio/**`, `src/components/ui/**` and their tests. If something needs another file, STOP that item and report. No new dependencies, no new routes. Do not commit/merge/push. No browser tools.

## Goal
A first-time visitor gets a short, skippable guide in the studio. Three steps, each pointing at a real existing control and saying one plain sentence:
1. Draw or add a mass (tool rail).
2. Move the sun (the sun band / Local time slider).
3. Duplicate a concept and compare (scenario menu).

## Requirements
- Shown once: dismissing or finishing sets a `localStorage` flag (wrap all storage access in try/catch; if storage is unavailable the guide still works and simply may reappear).
- Skip button on every step; Esc skips. Keyboard reachable; focus moves to the guide when it opens and returns to the previous element when it closes; no focus trap that blocks the studio; `role="dialog"`-free non-modal region labelled "Studio guide" is fine.
- Never blocks editing or covers the controls it describes; flat style per contract (hairline border, no shadow/blur); reduced-motion safe (no animation under reduce).
- A way to reopen it: a "Guide" text button in the top bar or panel (real, working).
- Copy: plain, no jargon, claim policy respected (no compliance claims).
- Unit tests: shows first time, doesn't show after dismissal, skip, Esc, reopen, storage-unavailable path.

## Done when
`npm run lint`, `npm run test`, `npm run build` pass; existing keyboard e2e tab order (`e2e/keyboard.spec.ts`) is not expected to change — say so if you add a focusable element in the tab path. Summary: files, tests, commands/results, items stopped.
