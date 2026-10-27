# Progress log

## Session: 2026-10-27 — Project bootstrap

### Phase 0: Setup and governance

- **Status:** complete
- **Started:** 2026-10-27
- Actions taken:
  - Audited the workspace: PRD plus 90 skills, no application code and no git repository.
  - Designed the agent operating model: one lead per milestone, time-boxed specialists, five gates.
  - Initialised git on `main`.
  - Scaffolded Vite 8 + React 19 + TypeScript 6 with pinned versions after `create-vite` hung interactively.
  - Installed 456 packages in 39 s.
  - Implemented tokens, landing, About, 404, studio shell, R3F viewport, inspector.
  - Added coordinate utilities, site catalogue, component tests, Playwright smoke spec.
  - Installed Chromium and verified the landing → studio smoke path.
  - Captured eight reference screenshots at four viewports and inspected the landing/studio compositions.
  - Adjusted hero spacing, mobile wordmark, grid contrast and disabled-control opacity after visual review.
  - Wrote AGENTS.md, three ADRs, seven milestone briefs, design contract, site package spec, QA fixtures.
  - Created `task_plan.md`, `findings.md`, `progress.md` and an agent log.
- Files created/modified:
  - Root: `package.json`, `package-lock.json`, `.gitignore`, `index.html`, `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `eslint.config.js`, `README.md`, `AGENTS.md`
  - App: `src/main.tsx`, `src/app/*`, `src/components/**`, `src/features/sites/*`, `src/scene/*`, `src/lib/*`, `src/styles/*`, `src/test/setup.ts`, `e2e/smoke.spec.ts`
  - Assets: `public/sites/compact-infill.svg`, `public/sites/sloped-edge.svg`
  - Docs: `docs/decisions/*`, `docs/milestones/*`, `docs/design/design-contract.md`, `docs/data/site-package-spec.md`, `docs/qa/fixtures.md`, `docs/reviews/REVIEW-TEMPLATE.md`, `docs/agent-log.md`
  - Planning: `task_plan.md`, `findings.md`, `progress.md`
  - Tooling: `scripts/capture.mjs`, `docs/screenshots/*.png`

### Phase 1: M0 shell

- **Status:** complete
- **Started:** 2026-10-27
- Actions taken:
  - Built the responsive studio frame and explicit empty state.
  - Lazy-loaded the studio route to keep the landing bundle small.
  - Verified typecheck, lint, unit/component tests and production build.
  - Ran `agency-ux-architect` and `agency-ui-designer` audits; consolidated 30 findings.
  - Applied blocker/major fixes with `agency-minimal-change-engineer`.
  - Ran `agency-code-reviewer`; fixed the pointer-event blocker and added drawer tests.
  - Ran `agency-ui-finish-gate-reviewer`; final decision **PASS with follow-ups**.
  - Added the mobile read-only notice and mobile disclaimer before sign-off.
- Files created/modified: see Phase 0 plus `docs/reviews/M0-*.md`, `src/components/studio/Inspector.test.tsx`, `e2e/smoke.spec.ts`.

## Test results

| Test | Input | Expected | Actual | Status |
|---|---|---|---|---|
| Typecheck | `npm run typecheck` | No errors | No errors | pass |
| Lint | `npm run lint` | No errors | No errors | pass |
| Unit/component | `npm run test` | All pass | 17/17 pass | pass |
| Production build | `npm run build` | Success | Success; landing ~91 kB gzip, studio ~251 kB gzip | pass |
| E2E smoke | `npm run test:e2e` | Landing → studio | 1/1 pass | pass |
| Reference screenshots | `npm run capture` | 8 images at 4 viewports | 8 images in `docs/screenshots/` | pass |
| Visual review | `agency-ui-finish-gate-reviewer` | PASS with follow-ups | PASS with follow-ups | pass |
| Code review | `agency-code-reviewer` | No blockers | 1 blocker found and fixed; pass with follow-ups | pass |

## Error log

| Timestamp | Error | Attempt | Resolution |
|---|---|---|---|
| 2026-10-27 | `npm create vite` hung on an interactive prompt | 1 | Killed process; scaffolded manually with pinned versions |
| 2026-10-27 | Tests found duplicate DOM nodes across cases | 1 | Added explicit `cleanup()` in `src/test/setup.ts` |
| 2026-10-27 | Lazy studio route failed a synchronous test | 1 | Used `findByRole` for the unknown-site assertion |
| 2026-10-27 | Build warning: studio chunk >500 kB | 1 | Accepted for M0; route lazy-loaded; vendor split scheduled M1 |
| 2026-10-27 | ESLint `no-undef` in `scripts/capture.mjs` | 1 | Added Node globals for JS/MJS/CJS files in flat config |
| 2026-10-27 | Wide studio screenshots showed an illegible grid | 1 | Replaced Drei Grid with two `gridHelper` layers and stronger contrast |
| 2026-10-27 | Full-screen empty-state overlay blocked OrbitControls | 1 | Added `pointer-events-none` to the overlay; card keeps `pointer-events-auto` |
| 2026-10-27 | E2E asserted removed milestone copy | 1 | Updated the smoke test to the product-facing empty-state heading |

## 5-question reboot check

| Question | Answer |
|---|---|
| Where am I? | M0 complete; M1 site packages next |
| Where am I going? | M1 provenance → preprocessing → package validation → layers/camera; then M2 massing |
| What's the goal? | Terraform v1: credible interactive architectural site-planning portfolio prototype |
| What have I learned? | See `findings.md` — versions, bundle sizes, skill roster, review findings |
| What have I done? | See Phase 0/1 above, `docs/reviews/M0-*.md`, and `git log` |
