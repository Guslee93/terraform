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
| `node scripts/measure-fps.mjs` | Probe steady-state GPU frame rate per site at DPR 1 and 2 |
| `python3 scripts/build_site_packages.py --offline` | Rebuild both site packages from committed raw caches |
| `python3 scripts/test_build_site_packages.py` | Self-check for the road clipping used by the package builder |

## Site data pipeline

The two static packages under `public/sites/` are generated offline from openly licensed sources:

- **Building footprints:** © OpenStreetMap contributors, ODbL 1.0. Simplified with a 1.2 m tolerance; building relations are omitted.
- **Terrain:** © Kartverket DTM1, CC BY 4.0, sampled on a 13 × 13 grid through the open height API.
- **Study boundary:** an authored rectangle, explicitly not a cadastral parcel.

Raw OSM XML and elevation responses are cached in `data/raw/` for reproducible offline rebuilds; `--offline` mode verifies them against `data/raw/SHA256SUMS` before use. Each package ships an `attribution.md`; the studio also exposes the credits in the Inspector and About page. The Python script uses `certifi` when available for TLS on macOS.

**Prerequisite for rebuilding packages:** `python3 -m pip install certifi` so the script can validate TLS against the elevation API on macOS.

Never replace these packages with invented parcel or regulation data.

## Wind screening

A live 2D wind flow around the site, Forma-inspired and labelled as **indicative screening, not engineering**.

- **Solver:** D2Q9 lattice-Boltzmann in a Web Worker, solved inside a movable analysis circle (60–250 m, about 1.8 m cells at r = 100 m). It re-solves live while you drag a building.
- **Views:** Comfort (Lawson activity bands at the chosen wind; momentary, not annual), Direction (continuous m/s ramp), and Delta against a saved baseline. Particles, streamlines and a scripted **Play demo** for screen recording.
- **3D look:** height slices at 2/10/20/35 m (plus one above any building taller than 35 m), roof colouring, and streamlines that rise over roofs. The rise is a labelled visual rule; the flow is layered 2D. The full stack is ready in about 8 s.
- **Units:** the slider is the wind at 10 m; pedestrian speeds use the indicative urban profile (× ≈ 0.70 at 2 m).
- **Limits:** no terrain effect on the flow, no measured climate data, downwash is a rule, and low-rise clusters overstate the ground-level speed-up beside them (see `docs/research/wind-validation-note.md`).
- **Docs:** `docs/plans/wind-simulator-prd.md`, `docs/decisions/ADR-0014-wind-flow-solver.md`, `docs/case-study/wind.md`, `docs/reviews/wind-*.md`.
- **Opt-in checks:**
  ```bash
  SHOT_EVIDENCE=1 npx playwright test e2e/wind-evidence.spec.ts   # evidence screenshots
  WIND_PERF=1 npx playwright test e2e/wind-perf.spec.ts --workers=1  # frame-rate probe
  WIND_SWEEP=1 npx vitest run src/features/analysis/wind-sweep.test.ts --silent=false  # direction sweep
  WIND_BENCHMARK=1 npx vitest run src/features/analysis/flowRunner.test.ts -t benchmark --silent=false
  ```

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
