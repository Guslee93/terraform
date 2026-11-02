# D39–D40 — M5 performance baseline and accessibility checks (DeepSeek work order)

Role: QA. Project: Terraform v1, milestone **M5**. Work in `/Users/gustavekamanzi/Downloads/2026/Terraform-d39` (branch `deepseek/d39`, from `main`; run `npm ci` first). Edit only `e2e/`, `scripts/` (new files only) and `docs/reviews/`. **Don't edit `src/**`, `package.json` or config files.** If you need a hook the app doesn't provide, report it. A product bug you find is reported, never worked around in a test (mark the test `test.fixme` with the bug cited).

Read first: `AGENTS.md`; `docs/plans/M5-plan.md` (items D39, D40); `docs/design/design-contract.md` §0 and §9; `docs/reviews/studio-v2-code-review.md` (known contrast numbers); `scripts/measure-fps.mjs` and `e2e/keyboard.spec.ts` (conventions); `docs/handoffs/D35-m4-fixtures.md` (how DeepSeek notes were written before).

Environment rules that bit earlier runs: use `npx playwright test --workers=1`; first check nothing else listens on port 5173 (`lsof -nP -iTCP:5173 -sTCP:LISTEN`), because Playwright would silently reuse an old dev server; if something is there, stop and report it, don't kill it. The IndexedDB database `terraform` opens at native Dexie version 10.

## D39 — performance baseline → `docs/reviews/M5-perf.md`

This is the "before" picture for M5, taken on current `main`, so changes can be compared later.

1. **Bundle report.** Run `npm run build`; record every chunk (raw and gzip) from the output, and which route loads which (landing vs studio). Note the studio chunk is expected to be about 346 kB raw / 110 kB gzip (it includes Dexie since M4).
2. **Frame rate.** Run `node scripts/measure-fps.mjs` (it starts or reuses the dev server). Record fps at device scale 1 and 2 for both sites on this machine, plus the machine (model, OS, browser). Also record with **three drawn masses** (draw them via the app as `e2e/massing.spec.ts` does, then measure with the same method): add a short `scripts/measure-fps-masses.mjs` for this if the existing script can't. State clearly if the numbers come from software rendering (headless SwiftShader), in which case they are **not** representative of a real GPU; prefer a headed run for the headline numbers. Target from the M5 brief: 1440×900 above 45 fps, 60 preferred.
3. **Load timings** at 1440×900, cold cache: landing and studio. From the Navigation Timing API and a Playwright `page.evaluate`: DOMContentLoaded, load, first contentful paint, and time until the 3D viewport region is visible and the first masses can be drawn. Median of 5 runs each.
4. **Write the report:** environment, method (the exact commands), raw numbers in tables, and a short "what stands out" list. **No recommendations beyond what the numbers show; no invented numbers.**

## D40 — accessibility checks → `e2e/m5-a11y.spec.ts` and `docs/reviews/M5-a11y.md`

No new dependencies (an automated engine such as axe would need an ADR). Build the checks with Playwright and plain DOM queries.

1. **Names.** On `/`, `/about` and `/studio/compact-infill`: every `button`, `a[href]`, `input`, `select`, `textarea`, `summary`, `[role=button|tab|slider|checkbox]` has a non-empty accessible name (use `locator.ariaSnapshot()` or compute from `aria-label`, `aria-labelledby`, label text and content). List any that don't.
2. **Structure.** Each page has exactly one `h1`, no skipped heading levels, and `header`, `main` and `footer` landmarks where they should be (the studio has `main`; note what it lacks).
3. **Contrast.** Parse `src/styles/tokens.css` and compute the WCAG ratio for each text/background pair the contract names (ink on surface and ground, ink-secondary on both, accent on surface, white or `ink-on-inverse` on accent, `warning-ink` on surface, `positive` on surface, `ink-disabled` for disabled). Report pass/fail at 4.5:1 for text under 24 px. Also sample **real rendered text**: for every visible text node in the studio and landing, compute the effective colour and the nearest opaque background from `getComputedStyle` and flag any pair below 4.5:1 (note elements with transparency or background images as "not computable"). Report counts and the worst ten.
4. **Reduced motion.** Emulate `reducedMotion: 'reduce'` and assert no element has a running CSS animation with `iteration-count: infinite` or a duration above 0.1 s (check `document.getAnimations()`), on landing, About and the studio with a mass selected.
5. **Focus.** Every focusable element on each page shows a focus indicator (outline or box-shadow not `none`) when focused by keyboard. `e2e/keyboard.spec.ts` already does this for the studio; extend it to landing and About by importing nothing from it (new file only).
6. **Touch targets.** On the studio and landing at 1440×900, list interactive elements smaller than 24×24 px (WCAG 2.5.8 minimum) and those below 44×44 px, with their names.
7. **Write the report:** a table of checks with pass/fail/not-computable, the exact failures, and a "known limitations" section (3D editing is not fully keyboard-equivalent; the canvas has no per-object semantics; what you couldn't measure). Facts only.

Tests that fail because of a real product issue stay as `test.fixme` with the finding cited in the report; the suite must otherwise be green.

## Done when

- `npm run lint` passes; `npx playwright test e2e/m5-a11y.spec.ts --workers=1` passes (fixme allowed with reasons).
- Both reports are written with real numbers, the commands used and the environment.
- Commit on `deepseek/d39` (your terminal may be unable to; if so, leave changes uncommitted and say so, Claude will commit). Add a row to `docs/agent-log.md` ("Pending Claude review").
