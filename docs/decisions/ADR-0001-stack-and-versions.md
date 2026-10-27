# ADR-0001 — Stack and pinned versions

- **Status:** Accepted
- **Date:** 2026-10-27
- **Deciders:** Project owner, `engineering-software-architect`
- **PRD references:** §8.1, §8.2, §14.6

## Context

Terraform is a static, desktop-first single-page application with a 3D viewport, conceptual geometry editing, local persistence and no backend. The PRD requires a low-friction deployment, offline-capable curated assets, testable domain logic and stable, mutually compatible releases.

## Decision

Use the following stack with **exact pinned versions** in `package.json` and a committed lockfile.

| Concern | Choice | Version |
|---|---|---|
| Language | TypeScript | 6.0.3 |
| UI | React + React DOM | 19.3.1 |
| Build | Vite + `@vitejs/plugin-react` | 8.3.5 / 6.1.2 |
| 3D | Three.js | 0.186.1 |
| 3D React | `@react-three/fiber` / `@react-three/drei` | 9.8.2 / 10.7.9 |
| State | Zustand | 5.0.16 |
| Routing | React Router | 7.18.4 |
| Styling | Tailwind CSS + `@tailwindcss/vite` | 4.3.3 |
| Persistence | Dexie (IndexedDB) | 4.4.7 |
| Solar | SunCalc | 2.1.1 |
| Geometry | Turf | 7.4.0 |
| Unit/component tests | Vitest + React Testing Library + jsdom | 5.0.5 / 16.3.3 / 30.1.3 |
| E2E | Playwright | 1.64.1 |
| Fonts | Inter Variable + Newsreader Variable (self-hosted) | 5.3.0 |

## Rationale

- Vite produces a static bundle suitable for any HTTPS host and keeps the toolchain small; SSR adds no product value.
- R3F/Drei are the most direct fit for declarative Three.js editing, gizmos, cameras and raycasting. Their published peers support React 19.3 and Three ≥ 0.159.
- Zustand keeps transient editor/UI state small; document state remains a separate command-driven model (ADR-0003).
- Tailwind 4 with CSS variables lets the PRD tokens remain the single visual source without a heavy component library.
- Self-hosted variable fonts preserve the offline demo requirement and avoid third-party font requests.

## Consequences

- The studio chunk is large (~950 kB raw / ~253 kB gzip) because of Three.js and Drei. The studio route is lazy-loaded; the landing route is ~290 kB raw / ~91 kB gzip. Further vendor splitting is an M1 performance task.
- R3F, Drei and Three must be upgraded together. Check peer ranges before changing any of them.
- TypeScript 6.0.x is pinned because `typescript-eslint` 8.72 supports `<6.1.0`. Revisit when the lint toolchain supports TS 7.
- No ESLint typed-linting yet; rules remain syntactic to keep the M0 pipeline fast.

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| Next.js | SSR, server routes and framework surface are unnecessary for a static demo. |
| Babylon.js | Strong engine, but weaker React ecosystem fit for this editor. |
| Redux Toolkit | More ceremony than needed; document history belongs in a domain command layer. |
| CSS-in-JS | Duplicates the token system; Tailwind + variables is faster to review. |
| MapLibre-first | Explicitly P1; live GIS at runtime conflicts with the reliable-demo goal. |

## Verification

- `npm ls --depth=0` reports no invalid peer dependencies.
- `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` pass.
- Dependency licences are recorded in `findings.md` when a package is added.

## Revisit triggers

A React/R3F peer mismatch, a Three.js breaking change, a bundle budget failure, or a lint toolchain upgrade to TypeScript 7.
