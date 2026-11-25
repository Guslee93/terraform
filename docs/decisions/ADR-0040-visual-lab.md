# ADR-0040 — The Visual Lab (a local-only comparison route)

- **Status:** Proposed (2026-11-18)
- **Relates to:** the visual-upgrade plan (04 §2, 06 §TF-VIS-015), ADR-0038/0039 (analysis hooks),
  `src/scene/style.ts` (TF-VIS-013)
- **Dependencies:** none added.

## Context

The visual upgrade needs a place to compare scene styles, line systems, lighting, camera behaviour
and overlay grammar **on real site packages and real worker results**, without changing what
visitors see. Prototyping on a branch with a forked renderer diverges from production within days;
a separate Vite app duplicates the config, fonts and package loader.

## Decision

A route `/lab/:siteId` lives in the same app, mounts the real `ViewportCanvas`, and is lazy-loaded
and excluded from production builds.

1. **Isolation by build flag.** `src/app/LabPage.tsx` (lazy) is registered in `App.tsx` only when
   `import.meta.env.DEV || import.meta.env.VITE_LAB === '1'`. The production build has neither
   flag, so the route and its chunk are tree-shaken out. A unit test asserts the route is absent
   when the flag is off, and a build check asserts `dist/` has no `LabPage` chunk.
2. **Real hooks, no copied computation.** The Lab's fixed states (neutral, sun hours, wind 2 m
   direction view, noise Lden, water, slope, one demo mass) call the production hooks
   (`useCircleSunHours`, `useWindFlow`, `useRunoff`) and domain functions. It never reimplements
   an analysis, and it has no editor UI beyond a fixed demo mass.
3. **Plain tweak panel.** Style, state, preset, date/time and render tier are plain HTML controls
   from `src/components/ui/controls.ts`. No GUI library.
4. **Local-only for now.** The Lab is not wired into Vercel previews (decision D19 in 08/09) until
   the orthophoto licence (D13) clears. It never writes to IndexedDB and never adds a link from
   the production UI.

## What may live in the Lab

- Scene style objects and a style picker (today `NORDIC`; `IDENTITY` becomes one new entry).
- Fixed state builders that assemble `ViewportCanvas` props.
- Tweak controls for style, state, preset, date/time and render tier.
- Opt-in e2e specs gated on `LAB=1`.

## What may not live in the Lab

- Any new style, line, light or camera behaviour that changes production pixels.
- Any analysis computation (the Lab calls the hooks; it never re-derives a figure).
- Any production UI change, link, route or state.

## Removal plan

The Lab is additive and flag-gated. If the upgrade ends without a shipping `IDENTITY` style, the
Lab is removed by deleting `src/app/LabPage.tsx`, `src/app/lab/` and the conditional route in
`App.tsx`, plus this ADR's status marked *Superseded*. Nothing else references it, so no other
file changes.
