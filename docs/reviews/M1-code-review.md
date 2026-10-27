# M1 code review

- **Date:** 2026-10-27
- **Reviewer:** `agency-code-reviewer`
- **Scope:** M1 diff from `67123cb` — site packages, manifest/loader, scene layers, camera/HUD, layer UI, data pipeline
- **Commands:** `npm run typecheck` pass · `npm run lint` pass · `npm run test` 33/33 pass · `npm run build` pass · `npm run test:e2e` 2/2 pass
- **Geometry QA:** `docs/reviews/M1-geometry-qa.md` — pass with follow-ups

## Summary

The M1 implementation is correctly separated into a validated package layer, a renderer adapter and a small UI state layer. Domain/package code does not import React or Three.js. The camera, compass and scale derive from the actual manifest and camera state. No M2 massing or analysis work was introduced. The main pre-review defect — self-intersecting simplified footprints — was found by geometry QA and is now prevented by both the preprocessing repair pass and the runtime package validator.

## Findings

| # | Severity | File / line | Issue | Recommendation | Status |
|---|---|---|---|---|---|
| 1 | 🟡 Major | `scripts/build_site_packages.py` / `package.ts` | RDP simplification could emit self-intersecting building rings; the first package build contained 11 invalid compact footprints and 1 invalid slope footprint. | Preprocessing now retries finer tolerances and skips irreparable ways; `parseBuildings` rejects non-simple rings; QA re-check reports zero invalid footprints. | **Fixed** |
| 2 | 🟡 Major | `src/features/sites/package.ts` | The validator previously checked schema and dimensions but not simple-ring topology or manifest statistics consistency. | Added `isSimpleRing`, building footprint area/length checks, study-ring simplicity, and cross-checks for building count, terrain samples and study area. | **Fixed** |
| 3 | 🟡 Minor | `src/features/sites/useSitePackage.ts` | A `null` site id leaves the hook in `loading` indefinitely. Only the unknown-site route hits this, and it ignores the state. | Make the state a discriminated `idle` state, or only call the hook from a component where the site is known. | Follow-up |
| 4 | 🟡 Minor | `src/scene/HudProbe.tsx` | The compass is derived from the camera's right/up basis. When looking along the north vector at eye level, the projection degenerates and the arrow can be ambiguous. | Hide the compass below a near-horizon threshold, or add a north-up mini-plan in M5. | Follow-up |
| 5 | 🟡 Minor | `src/scene/CameraRig.tsx` | Preset framing does not adapt to very narrow aspect ratios; mobile screenshots crop the site more aggressively than desktop. | Apply an aspect-based framing multiplier for `<768 px` in M2/M5, or accept as a read-only mobile limitation. | Follow-up |
| 6 | 🟡 Minor | `src/features/sites/manifest.ts` | `projection: 'orthographic'` is allowed by the type but rejected at validation. | Either narrow the type to `'perspective'` for v1 or implement orthographic camera switching in a later milestone. | Accepted |
| 7 | 🟡 Minor | `src/features/sites/package.ts` | `fetchJson` has no timeout; a stalled local request could keep the loading state. | Add an `AbortSignal.timeout` or a fetch timeout when the loader is used with slower hosting. | Follow-up |
| 8 | 💭 Nit | `scripts/build_site_packages.py` | The Python preprocessing script depends on `certifi` on the local macOS Python for TLS; it falls back to the system store otherwise. | Document the prerequisite in `README` or pin the script environment. | Follow-up |
| 9 | 💭 Nit | `src/scene/siteGeometry.ts` | Building footprints are inset up to 15 cm toward their centroid to reduce z-fighting between adjacent OSM walls. This is purely visual and not documented in the package. | Add a one-line comment in the geometry function; no data change. | Accepted |
| 10 | 💭 Nit | `src/scene/siteGeometry.ts` | Terrain and building geometries are disposed correctly; the boundary `Line` and R3F materials rely on Drei/R3F disposal. | No action; verified by unmount path inspection. | Accepted |

## Positive notes

- Package validation is renderer-free and covered by 11 fixture tests against the real generated JSON.
- Loader uses `AbortController`, validates site-id consistency, and exposes a recoverable error state.
- Layer state is small, local and genuinely controls scene visibility.
- Camera presets are data-driven; no hard-coded coordinates in React.
- Attribution is visible in the studio footer, inspector and About page; ODbL and CC BY 4.0 links are correct.
- No new dependencies and no M2–M5 features.

## Gate decision

**Pass with follow-ups.** Findings 3–5 and 7–8 are non-blocking M2/M5 hardening items. Findings 1–2 were fixed before sign-off.
