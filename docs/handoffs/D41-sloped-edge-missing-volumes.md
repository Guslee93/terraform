# D41 — DeepSeek: buildings in the aerial photo with no white volume (sloped-edge)

Role: `gis-qa-engineer` for the diagnosis, then `engineering-minimal-change-engineer` for the fix.
Project: Terraform v1 — architectural portfolio prototype.

Read first, in order:
1. `AGENTS.md` (§1 guardrails, §7 definition of done, §9 do-nots)
2. `docs/decisions/ADR-0023*` (context density: 200 m halo, context buildings)
3. `public/local-ortho/README.md` and `docs/data/orthophoto-source.md` (imagery is local-only)
4. `src/app/LabPage.tsx`, `src/app/lab/LocalPhotoPanel.tsx`, `src/app/lab/localPhoto.ts`
5. `src/scene/` — whatever builds the context-building meshes, the Identity style (`style.ts`) and its tuning (minor fade distance, haze site margin)

Working copy: `/Users/gustavekamanzi/Downloads/2026/Terraform-run7`, branch `run7/identity-lab`.
**It has someone else's uncommitted work.** Do not edit, revert, stash or commit these files:
`e2e/identity-edge.spec.ts`, `src/scene/ViewportCanvas.tsx`, `src/scene/style.ts`, `src/scene/style.test.ts`,
`e2e/visual-reference.spec.ts-snapshots/`. If the fix has to touch one of them, stop and report instead.

## Symptom

Open `http://localhost:5194/lab/sloped-edge?style=identity&preset=top` (dev server: `npm run dev -- --port 5194`).
A new sharp, north-up aerial photo is draped on the terrain (`public/local-ortho/sloped-edge.png`,
3381 × 4096 px covering 652 m × 789.9 m centred on the ENU origin; the default alignment is 0 m east,
0 m north, 652 m wide). Many houses — the residential streets in the upper right of the top view
especially — show as flat roofs in the photo with **no white 3D volume** on them.

## What is already known (verified, do not redo)

- **The data is not the main gap.** Drawing every footprint from `public/sites/sloped-edge/buildings.json`
  (230 buildings: 91 house, 92 apartments, 30 garage, 12 other, 3 commercial, 2 industrial) over the
  photo puts an outline on nearly every roof, including the residential streets. The photo alignment
  is correct (the outlines sit on the roofs with no offset).
- Building base elevations look sane: `baseElevation` spans −116.59 … 1.93 m, terrain heights span
  −116.85 … 5.13 m (both relative to the origin elevation of 136.67 m).
- Only 22 of the 230 buildings have `withinStudyArea: true`; the other 208 are context.
- A few small structures in the photo really have no footprint (sheds in the park, a lean-to by the
  car park). Those are OpenStreetMap gaps: report them; never invent footprints (AGENTS.md §1.5).

So the volumes are lost **between the package and the screen**. Find where.

## Hypotheses to test, in order

1. The Identity style hides, fades or shrinks context buildings (`withinStudyArea: false`) by distance
   or by camera — check the "Minor fade distance", "Haze site margin" and any opacity/LOD rule, and
   whether the top preset puts them past the fade.
2. Context buildings are clipped by a frame, halo or analysis-circle mask that is smaller than the
   photo/terrain tile.
3. Buildings on steep ground are placed below the 1 m terrain (`terrain1m.bin`) at their footprint,
   so the roof is buried — compare each building's roof (`baseElevation + height`) with the highest
   terrain sample under its footprint.
4. Footprints rejected at load (validation, winding, self-intersection, tiny area) — count meshes
   actually built vs records in `buildings.json`.

## Deliverables

1. **Diagnosis** in `docs/reviews/sloped-edge-missing-volumes.md`: which hypothesis is true, with
   numbers — records in the package, meshes built, meshes visible in the top preset, and the list of
   building ids lost and why.
2. **A minimal fix at the root cause**, in one place (a guard in the shared function, not a per-site
   patch). No new dependency, no refactor, no change to the site packages unless the cause is in the
   builder (`scripts/build_site_packages.py`), in which case regenerate only through the builder.
3. **One test** that fails before the fix and passes after (Vitest for scene/domain logic; pytest
   in `scripts/test_build_site_packages.py` if the builder is the cause).
4. **Evidence:** top and isometric screenshots of `sloped-edge` and `compact-infill` in the Identity
   style, before and after, saved under the scratch folder or `docs/screenshots/` **only if the aerial
   photo is switched off** in the Aerial photo panel. Screenshots that show the Kartverket photo must
   not be committed or uploaded.
5. A line in `docs/agent-log.md` and `progress.md`.

## Constraints

- TypeScript strict; no `any`; local ENU metres; domain logic testable without React or Three.js.
- Never commit, upload or deploy anything from `public/local-ortho/` (git-ignored; licence pending).
- Do not change the photo alignment code to hide the problem; the photo is the reference.
- Do not lower density to make the gap disappear.

## Done when

- In the top preset of `sloped-edge`, every building with a footprint in `buildings.json` has a white
  volume on its roof in the photo; the ones still missing are listed as OSM gaps with their location.
- `compact-infill` still looks and measures the same.
- `npm run lint && npm run test && npm run build` pass.

Report: files changed, root cause in one paragraph, tests run, failures, known limitations, open questions.
