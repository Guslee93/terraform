# Terraform

An interactive architectural site-planning portfolio prototype. Explore a real, simplified Oslo study area, shape a conceptual massing, test sunlight and shadow, read geometry-derived metrics, and compare two concepts.

> **Status:** M1 complete. Two static, openly licensed Oslo site packages load in a validated local ENU frame with terrain, simplified OSM context, study boundaries, camera presets, compass and scale. M2 massing engine is next.

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
| `python3 scripts/build_site_packages.py --offline` | Rebuild both site packages from committed raw caches |

## Site data pipeline

The two static packages under `public/sites/` are generated offline from openly licensed sources:

- **Building footprints:** © OpenStreetMap contributors, ODbL 1.0. Simplified with a 1.2 m tolerance; building relations are omitted.
- **Terrain:** © Kartverket DTM1, CC BY 4.0, sampled on a 13 × 13 grid through the open height API.
- **Study boundary:** an authored rectangle, explicitly not a cadastral parcel.

Raw OSM XML and elevation responses are cached in `data/raw/` for reproducible offline rebuilds. Each package ships an `attribution.md`; the studio also exposes the credits in the Inspector and About page. The Python script uses `certifi` when available for TLS on macOS.

**Prerequisite for rebuilding packages:** `python3 -m pip install certifi` so the script can validate TLS against the elevation API on macOS.

Never replace these packages with invented parcel or regulation data.

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
