# C11 — Night state, render quality profiles, no-WebGL fallback (Codex work order)

Role: implementer (3D scene / frontend). Project: Terraform v1, milestone **M3** (`docs/milestones/M3-live-analysis.md` deliverable 4, PRD FR-062, FR-066, QA-15). Read in order: `AGENTS.md`; `docs/plans/M3-fable-plan.md` §1, §4, §9 (C11 summary) and §8 (ownership); `docs/design/design-contract.md` §8 (scene palette and lighting) and §9 (accessibility); then `src/scene/ViewportCanvas.tsx` (`SiteLights`, `AmbientOcclusion`, `<Canvas>`), `src/scene/lighting.ts`, `src/scene/rendererTier.ts`, `src/scene/SceneComposer.tsx`, `src/scene/SceneErrorBoundary.tsx`, `src/scene/CameraHud.tsx`, `src/components/studio/{StudioShell,Inspector}.tsx`.

**Branch:** you are on `m3/ui` in the main checkout. Do not commit or stage.

## Context

The scene lights itself from a fixed reference sun (`DEMO_SUN_INSTANT`, `sunDirection()` in `src/features/analysis/sun.ts`). A separate Fable session (other worktree) is building the full time model (`sunState()`, `SunState.belowHorizon`) in `src/features/analysis/**`. Time controls (C8) come later. **Your job is the lighting and rendering behaviour that those will drive**, built so it works today from the elevation alone.

## You own (create or edit only these)

- `src/scene/lighting.ts` (+ test), `src/scene/renderQuality.ts` (+ test, new), `src/scene/ViewportCanvas.tsx`, `src/scene/CameraHud.tsx`, `src/scene/SceneErrorBoundary.tsx` (+ test), `src/scene/webglSupport.ts` (+ test, new)
- `src/components/studio/StudioShell.tsx`, `src/components/studio/Inspector.tsx` (+ their tests)
- `e2e/m3-rendering.spec.ts` (new)

## Do not touch

`src/features/**` (Fable owns analysis/massing; sites/import are done), `src/lib/**`, `src/scene/SceneComposer.tsx` internals (you may only change whether it mounts), `public/**`, `scripts/**`, `package.json`. No new dependencies.

## Spec

### 1. Light rig as a pure function (`lighting.ts`)

`lightRig(sun: { azimuthDeg: number; elevationDeg: number }, profile: RenderProfile): LightRig`, where `LightRig = { night: boolean; sun: { intensity: number; castShadow: boolean; azimuthDeg; elevationDeg } | null; ambient: number; hemisphere: { sky: string; ground: string; intensity: number } }`.

- **Day** (`elevationDeg > 0`): exactly today's values (ambient 0.28; hemisphere `#EEF3FA` / `#D2D5D8` at 1.75; sun 3.2); `castShadow` from the profile.
- **Low sun** (0° < elevation < 6°): fade the sun intensity linearly from 3.2 at 6° to 0 at 0° so dawn and dusk don't pop. Fill unchanged.
- **Night** (`elevationDeg <= 0`): `sun: null` (no directional light, no shadows), `night: true`; ambient 0.35, hemisphere sky `#C9D3E0`, ground `#B9BEC4`, intensity 1.0. The model stays readable but clearly not daylit. No blue tint on buildings beyond that sky colour.
- Unit tests: day, the 3° fade midpoint, exactly 0°, −10°, and that `low` profile never casts shadows.

`SiteLights` renders from `lightRig(...)`; keep the fitted shadow frustum (`fitShadowFrustum`) and `sunPosition()` exactly as they are. `SiteLights` takes the sun direction as a prop instead of computing `DEMO_SUN_INSTANT` inside, and `ViewportCanvas` passes today's `sunDirection(DEMO_SUN_INSTANT, …)` (a later C8 will swap in `sunState()`).

### 2. Render quality profiles (`renderQuality.ts`)

`type RenderProfile = 'high' | 'balanced' | 'low'`; `type RenderPreference = 'auto' | RenderProfile`.

| Profile | Shadow map | Shadows | Ambient occlusion |
|---|---|---|---|
| `high` | 4096 | on | on (still subject to the 640 px width rule) |
| `balanced` | 2048 | on | off |
| `low` | — | off (`<Canvas shadows={false}>` and no `castShadow`) | off |

- `resolveProfile(preference, rendererName)`: `auto` → `low` when `isSoftwareRenderer(rendererName)` (`rendererTier.ts`), else `high`; explicit choices are honoured as given.
- Preference stored per viewer in `localStorage` key `terraform.renderQuality`; every read and write in `try/catch`, falling back to `auto` (private mode, blocked storage).
- Inspector: a **Render quality** select (Auto / High / Balanced / Low) at the end of the Layers section, labelled, keyboard reachable, with a one-line hint "Auto lowers quality on software rendering." No new design tokens.
- The existing software-renderer AO skip (`AmbientOcclusion`) becomes the profile rule; don't keep two mechanisms.
- Unit tests for `resolveProfile` and the storage fallback (storage that throws).

### 3. `Sun below horizon` state (FR-066)

- When `lightRig(...).night` is true, `CameraHud` shows a chip **`Sun below horizon`** next to the existing top-left chip, using the existing chip style (no new colours), with `role="status"`.
- No positive sun-hours or "sunlit" wording anywhere when night (QA-11 spirit).
- Component test: chip present for elevation −5°, absent for 20°.

### 4. No-WebGL fallback (QA-15)

- `webglSupport.ts`: `detectWebGL(): 'webgl2' | 'webgl' | 'none'`, using a throwaway canvas and `getContext('webgl2')` then `'webgl'`, `try/catch` → `none`.
- If `none`, `ViewportCanvas` renders a fallback panel **instead of** mounting `<Canvas>`: same visual style as the current `SceneErrorBoundary` notice, heading "3D view unavailable", text saying WebGL isn't available in this browser, that the inspector, masses list, site data and metrics still work, and how to enable hardware acceleration. The inspector and the rest of the studio keep working.
- `SceneErrorBoundary` keeps handling runtime failures; share the panel markup between the two paths (one component, two messages).
- Tests: unit for `detectWebGL` with mocked `getContext`; component test that the fallback renders and the Canvas does not.

### 5. E2E (`e2e/m3-rendering.spec.ts`)

- No-WebGL: `page.addInitScript` patching `HTMLCanvasElement.prototype.getContext` to return `null` for `webgl`/`webgl2`; open `/studio/compact-infill`; assert the fallback heading is visible and the inspector shows `137 simplified`.
- Render quality: switching to Low and back changes the canvas (reuse the clip-compare technique from `e2e/smoke.spec.ts`), and the preference survives a reload.
- Your sandbox may not be able to launch a browser (earlier runs couldn't). If so, write the spec, make sure it type-checks, and say clearly in your report that you could not run it; Claude will run it.

## Done when

- `npm run lint && npm run typecheck && npm run test && npm run build` pass.
- Today's daytime render is unchanged at the `high` profile (same constants, same frustum).
- Report: files changed, tests added, whether the e2e spec ran, anything you could not do or decided differently (with why).
