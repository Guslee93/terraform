# M0 — Foundation and visual shell

- **Status:** Complete — visual gate passed with follow-ups (2026-10-27)
- **PRD gate:** Interface looks cohesive at target viewport; navigation and accessibility basics work (§13)
- **Lead agent:** `engineering-software-architect`
- **Design agents:** `design-ux-architect`, `design-ui-designer`
- **Implementers:** `engineering-frontend-developer`, `engineering-developer-tooling-engineer`
- **Gates:** `engineering-code-reviewer`, `design-ui-finish-gate-reviewer`
- **Evidence:** `docs/reviews/M0-{ux-review,ui-review,code-review,visual-gate}.md`; `docs/screenshots/m0-*`

## Goal

Establish a credible, calm, light-mode studio shell with routing, design tokens, reusable controls, responsive structure and a real 3D viewport frame — before any site data or massing logic exists.

## Delivered

- [x] Git repository and `.gitignore`
- [x] Vite 8 + React 19 + TypeScript 6 scaffold with pinned versions
- [x] Tailwind 4 entry, PRD §7.2 CSS variables, self-hosted Inter/Newsreader
- [x] Browser routing: `/`, `/studio/:siteId`, `/about`, 404
- [x] Landing page: proposition, site cards, method strip, case-study CTA
- [x] About page with scope, limitations, stack and attribution language
- [x] Studio shell: top bar, tool rail, inspector, footer, responsive drawer
- [x] R3F canvas: ground, grid, lighting, orbit controls, fit-site event, WebGL fallback
- [x] Reusable primitives: `Button`, `ButtonLink`, `Icon`, `IconButton`
- [x] Coordinate utilities and ENU↔Three tests
- [x] Vitest + RTL + Playwright configuration
- [x] Empty state that honestly explains the missing site model

## Gate work completed

- [x] `design-ux-architect` review recorded in `docs/reviews/M0-ux-review.md`
- [x] `design-ui-designer` review recorded in `docs/reviews/M0-ui-review.md`
- [x] `ui-finish-gate-reviewer` gate passed with follow-ups
- [x] Visual findings applied: hero composition, grid, thumbnails, overlay density, micro-type, token cleanup
- [x] Keyboard pass: skip link, focus rings, 1100 px drawer, focus trap and restore
- [x] Screenshots at 1440×900, 1280×800, 1920×1080 and 390×844
- [x] `code-reviewer` gate passed with follow-ups

## Out of scope

Site geometry, terrain, context buildings, massing tools, analysis, persistence, export, onboarding coach marks, authentication.

## Acceptance evidence

- Landing and studio screenshots at 1440×900, 1280×800, 1920×1080 and 390×844.
- `npm run lint`, `npm run test`, `npm run build` pass.
- 17 unit/component tests and 1 Playwright smoke test passing.
- Accessibility notes: focus visible, reduced-motion CSS, canvas instructions, labelled controls, focus-managed drawer.
- Code review and visual gate records linked from `docs/agent-log.md`.

## Risks / notes

- The studio empty-state card is intentional. Do not replace it with invented site geometry to make screenshots look fuller.
- The M0 tool rail exposes only working Select and Site notes actions; future massing tools stay out of the UI until they work.
- Open M2 hardening follow-ups: inert the background for assistive technology and guard focus restoration on resize (`docs/reviews/M0-code-review.md`).
- The studio chunk is large; vendor splitting belongs to M1 performance work.
