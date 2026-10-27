# M0 — Foundation and visual shell

- **Status:** In progress — shell implemented, design/visual gate pending
- **PRD gate:** Interface looks cohesive at target viewport; navigation and accessibility basics work (§13)
- **Lead agent:** `engineering-software-architect`
- **Design agents:** `design-ux-architect`, `design-ui-designer`
- **Implementers:** `engineering-frontend-developer`, `engineering-developer-tooling-engineer`
- **Gates:** `engineering-code-reviewer`, `design-ui-finish-gate-reviewer`

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
- [x] Empty state that explicitly awaits M1 site geometry

## Remaining

- [ ] Run `design-ux-architect` review of layout/CSS and record findings
- [ ] Run `design-ui-designer` review of tokens, type scale and components
- [ ] Run `ui-finish-gate-reviewer` against `docs/design/design-contract.md`
- [ ] Fix visual findings (spacing, hierarchy, density, states)
- [ ] Keyboard pass: skip link, tab order, focus rings, inspector drawer focus
- [ ] Capture 1440×900, 1280×800 and 1920×1080 screenshots
- [ ] Run `code-reviewer` and record `docs/reviews/M0-code-review.md`

## Out of scope

Site geometry, terrain, context buildings, massing tools, analysis, persistence, export, onboarding coach marks, authentication.

## Acceptance evidence

- Landing and studio screenshots at 1440×900, 1280×800 and 1920×1080.
- `npm run lint`, `npm run test`, `npm run build` pass.
- 14 unit/component tests passing; Playwright smoke path defined.
- Accessibility notes: focus visible, reduced-motion CSS, canvas instructions, labelled controls.
- Code review and visual gate records linked from `docs/agent-log.md`.

## Risks / notes

- The studio empty-state card is intentional. Do not replace it with invented site geometry to make screenshots look fuller.
- The tool rail and inspector expose disabled future controls with milestone tooltips. Before M5, every main-path control must either work or leave the release UI.
- The studio chunk is large; vendor splitting belongs to M1 performance work.
