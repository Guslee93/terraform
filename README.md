# Terraform

An interactive architectural site-planning portfolio prototype. Explore a curated Oslo site, shape a conceptual massing, test sunlight and shadow, read geometry-derived metrics, and compare two concepts.

> **Status:** M0 shell. The 3D viewport, studio layout and design system are in place. Curated site packages arrive in M1; the studio intentionally shows no invented site geometry.

## Quick start

```bash
npm install
npm run dev
```

Open the printed local URL. Routes:

- `/` — landing and site selection
- `/studio/compact-infill` — primary demonstration studio
- `/studio/sloped-edge` — terrain-focused demonstration studio
- `/about` — scope, limitations and stack

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck + production build |
| `npm run preview` | Preview the production build |
| `npm run typecheck` | TypeScript for app and tooling |
| `npm run lint` | ESLint |
| `npm run test` | Vitest unit/component suite |
| `npm run test:e2e` | Playwright Chromium smoke path |
| `npm run capture` | Capture reference screenshots into `docs/screenshots/` |

## Stack

TypeScript 6, React 19, Vite 8, Three.js 0.186, React Three Fiber 9, Drei 10, Zustand 5, Tailwind CSS 4, Dexie 4, SunCalc 2, Turf 7. Fonts are self-hosted (Inter Variable, Newsreader Variable).

## Project documents

| Path | Contents |
|---|---|
| `AGENTS.md` | Agent operating guide, roster, gates and definition of done |
| `Terraform_Comprehensive_PRD_v1.md` | Product requirements and acceptance criteria |
| `docs/milestones/` | M0–M6 briefs and gates |
| `docs/decisions/` | Architecture decision records |
| `docs/design/design-contract.md` | Visual and interaction contract |
| `docs/data/site-package-spec.md` | Site manifest, CRS and asset contract |
| `docs/qa/fixtures.md` | Geometry, solar and persistence fixtures |
| `task_plan.md`, `findings.md`, `progress.md` | Persistent planning memory |

## Scope and honesty

Terraform is a portfolio prototype, not a commercial planning product. It does not certify daylight factor, planning compliance, structural performance or legal setbacks. Site constraints are explicitly illustrative. Curated sites are simplified demonstrations, not official parcel data.

No backend, authentication, payments, telemetry or AI generation is part of v1.
