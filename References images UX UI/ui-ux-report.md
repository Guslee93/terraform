# Terraform — UI/UX report (input for the visual redesign)

**Date:** 2026-10-29 · **State:** `main` after M3 sign-off · **Author:** Claude (measured from the code; no new screenshots taken)
**Scope of the planned redesign:** graphical only, meaning colours, fonts, spacing and component styling, mainly the **panels and app chrome**. Features, flows and interactions stay the same. The 3D scene changes little, if at all.

Use this report as the starting point for the UI/UX assessment session. §6 lists what a redesign touches; §8 lists the questions that session should answer.

---

## 1. Summary

- The UI is **token-driven at its core**: colours, radii, shadows and fonts live in `src/styles/tokens.css` and map into Tailwind in `src/styles/global.css`. **The studio panels contain no hard-coded colours**, so a colour or font change there is cheap.
- **Typography is the weakest system:** 15 different arbitrary font sizes (9–28 px) and 8 letter-spacing values, defined inline per component rather than as a scale. This is where a redesign needs real work.
- **Radii and shadows are mostly tokenised** but with ad-hoc exceptions (`6px`, `14px`, `2px`, `5px`, `7px`; Tailwind `shadow-sm` beside the token shadow).
- **The 3D scene has its own palette in TypeScript constants**, which has drifted from the `--scene-*` tokens in `tokens.css` (those still hold the original M1 values). This doesn't matter if the scene stays as is, but it should be made one source of truth.
- **Accessibility gaps:** heavy use of 9–10 px uppercase micro-labels, and the warning amber `#b8822b` reaches only 3.35:1 on white, which is below AA for small text.

## 2. Current visual system

### 2.1 Colour tokens (`src/styles/tokens.css`)

| Role | Token | Value | Notes |
|---|---|---|---|
| App background | `--bg-app` | `#f5f5f1` | warm off-white |
| Surfaces | `--surface` / `--surface-muted` / `--surface-subtle` / `--surface-sunken` | `#ffffff` / `#efefea` / `#fbfbf8` / `#f1f2ec` | four near-identical warm greys; worth simplifying |
| 3D viewport background | `--surface-viewport` | `#f4f2ee` | matched to the scene grade |
| Text | `--ink-primary` / `--ink-secondary` / `--ink-hover` | `#202521` / `#69716c` / `#2c332d` | |
| Lines | `--border` / `--border-strong` / `--border-dashed` | `#dde1da` / `#c8cec5` / `#cdd2ca` | |
| Accent | `--accent` / `--accent-soft` | `#355e79` / `#e1ebf0` | one blue-grey accent (design contract rule) |
| Status | `--positive` / `--warning` / `--warning-ink` / `--danger` | `#477d65` / `#b8822b` / `#7a5414` / `#b9584f` | |
| Focus | `--focus` | `#245f93` | |
| Scene (stale) | `--scene-terrain/context/massing/parcel/setback` | M1 values | **not used by the scene any more**; the real scene palette is in `src/scene/*` constants (design contract §8) |

### 2.2 Typography

- **Families:** Inter Variable (UI, sans) and Newsreader Variable (display, serif), both self-hosted via `@fontsource-variable` (works offline).
- **Sizes in use** (count of occurrences in `.tsx`):

| Size | Uses | Typical role |
|---|---:|---|
| 9 px | 14 | micro labels, chips |
| 9.5 px | 1 | |
| 10 px | **57** | uppercase section labels, legend, HUD |
| 10.5 px | 5 | |
| 11 px | 9 | |
| 11.5 px | 19 | inspector values, layer rows |
| 12 px | 16 | buttons, body small |
| 12.5 px | 9 | body |
| 13 px | 9 | |
| 13.5 px | 2 | |
| 14 / 15 px | 2 / 2 | landing body |
| 24 / 26 / 28 px | 2 / 3 / 3 | Newsreader headings |

- **Letter-spacing:** 0.01, 0.1, 0.12, 0.14, 0.16, 0.18, 0.22 and 0.24 em: eight variants for what is essentially one "micro label" style.
- **Verdict:** collapse to a **type scale of 6–7 named steps** (e.g. `micro`, `caption`, `body-sm`, `body`, `title`, `display`) defined as tokens, with 1–2 tracking values.

### 2.3 Spacing, radii, shadows

- **Spacing:** Tailwind's default 4 px scale, used consistently; no arbitrary spacing values found.
- **Radii:** `--radius-control` (8 px, 22 uses) and `--radius-card` (12 px, 8 uses) are tokens; ad hoc `rounded-[6px]` (10), `rounded-[14px]` (4), `[2px]` (3), `[5px]`, `[7px]`; `rounded-full` (25, chips and buttons).
- **Shadows:** `--shadow-soft` (4) plus Tailwind `shadow-sm` (13).
- **Widths:** the inspector is a fixed `w-[336px]`; text measures use 30–58 ch caps.

### 2.4 Motion

`--ease-out`; reduced motion respected (camera snaps, sun playback steps instead of animating). The design contract (§7) defines the motion rules.

## 3. Screen and component inventory

| Area | Components | Notes for the redesign |
|---|---|---|
| **Landing** (`LandingPage`, `SiteChrome`, `SiteCard`, `SiteStudyGraphic`) | hero, two site cards, illustration | `SiteStudyGraphic` holds **42 hard-coded colours** (an SVG illustration) and needs separate treatment |
| **About** (`AboutPage`) | long-form text, data notes | typography-heavy; benefits most from a type scale |
| **Studio top bar** (`StudioTopBar`) | logo, site title/subtitle, scenario chip, local-session chip, Fit site, info | M4 adds the scenario switcher here |
| **Tool rail** (`ToolRail`, `IconButton`) | select, draw, layers, undo/redo | icon-only; tooltips and labels |
| **Viewport HUD** (`CameraHud`, `CameraPresets`) | "Curated demo" and "Sun below horizon" chips, compass, legend, scale bar, ISO/TOP/N/S/EYE presets, boundary toast | overlays on the 3D view, so contrast against a light scene matters |
| **Inspector** (`Inspector`, 405 lines) | tabs Model / Sun / Constraints (Compare disabled, M4) | **Model tab is long**: Metrics → Masses → Selection → Site package → Layers → Assumptions. Layers + render quality also show below the other tabs |
| Model tab (`MetricsPanel`, `MassList`, `MassFields`) | 2-column metric cards, mass list, numeric fields, floor list | dense; many 9–11.5 px labels |
| Sun tab (`SunPanel`) | readout, date presets, date input, time slider with night shading, presets, play/speed, day info, method note | the most "Hektar-like" panel |
| Constraints tab (`ConstraintsPanel`) | status + disclaimer, limits, Grade/Datum select, warning buttons | amber warning surfaces |
| Error/fallback (`SceneErrorBoundary`, `AppErrorBoundary`, `NotFoundPage`) | WebGL-unavailable panel, error pages | M5 completes the state set |
| Primitives (`Button`, `Icon`, `IconButton`) | | the obvious place to define the new component styles |

## 4. UX observations (interaction stays, but presentation matters)

1. **The Model tab carries too much.** Metrics, masses, selection, site metadata, layers and assumptions in one scroll. A redesign can regroup visually (sections, collapsible groups) without changing behaviour.
2. **Layers are global but live inside a tab.** Hektar keeps layers in their own rail panel. Consider a dedicated layers popover from the tool rail (same controls, different place).
3. **Micro-label density:** uppercase 9–10 px labels everywhere make the panel read as "technical". Fewer, larger labels would calm it.
4. **Status language is consistent and honest** (claim policy). Keep the wording; restyle the containers.
5. **HUD overlays compete** at narrow widths (legend vs scale bar needed a fix in D17b). A redesign should give the HUD a clear grid: top-left status chips, top-right compass, bottom-left legend and scale, bottom-right camera presets.
6. **The scene grade is now light and airy, while the panels are warm-grey and dense.** Aligning the panel palette with the Hektar-style scene (whiter surfaces, cooler greys, one accent) would make the app feel like one product.

## 5. Accessibility notes (measured contrast)

| Pair | Ratio | AA small text (4.5) |
|---|---:|---|
| `--ink-primary` on surface | 15.58 | ✅ |
| `--ink-secondary` on surface | 5.02 | ✅ |
| `--ink-secondary` on app bg | 4.60 | ✅ (barely) |
| `--ink-secondary` on viewport | 4.49 | ⚠️ just below (HUD labels on the scene) |
| `--accent` on surface | 6.93 | ✅ |
| `--accent` on accent-soft | 5.73 | ✅ |
| `--positive` on surface | 4.78 | ✅ |
| `--danger` on surface | 4.59 | ✅ (barely) |
| **`--warning` on surface** | **3.35** | ❌ use `--warning-ink` (6.76) for text; keep amber for lines and fills |

Other notes: focus-visible and `aria-live` are present (8 component files); the `role="status"` night chip has no explicit accessible name (M3 follow-up); 9 px text is below a comfortable minimum, so a redesign should set the smallest text step to ~11 px.

## 6. What a redesign touches (impact map)

| Area | Where | Effort | Notes |
|---|---|---|---|
| Colour tokens | `tokens.css`, `global.css` | **Low** | one place; panels follow automatically |
| Fonts | `tokens.css` + `@fontsource-variable` packages | Low–medium | a new family = a new pinned dependency (ADR) and a bundle check |
| Type scale | ~200 inline `text-[…px]` / `tracking-[…]` classes | **Medium** | define scale tokens first, then a mechanical replace pass (good Codex work) |
| Radii / shadows | ~20 ad hoc classes | Low | |
| Component styling | `ui/Button`, `IconButton`, chips, cards, inputs | Medium | define once in primitives and reuse; today some styling is inline per panel |
| Inspector layout regrouping | `Inspector`, panels | Medium | presentation only; tests use roles/labels, so they mostly survive |
| HUD layout | `CameraHud`, `CameraPresets` | Low–medium | |
| Landing illustration | `SiteStudyGraphic` (42 colours) | Medium | redraw or re-tint |
| 3D scene | `src/scene/*` constants | Low (if any) | make `--scene-*` tokens the single source, or delete them |
| Tests | `ConstraintLayer.test.tsx` (asserts colours/opacity), any style assertions | Low | a few expectations to update |
| Evidence screenshots | `docs/screenshots/*` | Low | scripted recapture (`npm run capture`, the M3 evidence spec) |
| Design contract | `docs/design/design-contract.md` §2–§5, §8, §12 | Low | must be updated **first**; M5's visual gate checks against it |

**Unaffected:** the analysis core (`src/features/**`), data and site packages, the importer, domain tests, and most e2e tests, which select by role and label.

**Rough effort for a chrome-only reskin:** 1 design session (you), 1 Claude round to turn decisions into the contract and tokens, 2 Codex rounds (tokens + type scale; component and layout pass), 1 DeepSeek round (recapture evidence, update style assertions), and 1 Claude visual review.

## 7. Recommended sequencing (decided 2026-10-29)

1. **Your UI/UX assessment session** produces the direction (palette, fonts, type scale, spacing/radii, key component specs, inspector/HUD layout).
2. Claude updates `design-contract.md` and the tokens, and writes the Codex work order.
3. Codex applies the reskin to the existing UI. In parallel, M4's persistence work continues (no UI).
4. M4's new screens (scenario switcher, comparison table) are built on the new system.
5. M5 does the fine polish and the final visual gate against the new contract.

## 8. Questions for the assessment session

1. **Palette:** keep the warm off-white, or move to the cooler, whiter Hektar-like chrome that matches the new scene grade? Keep the single blue-grey accent?
2. **Fonts:** keep Inter + Newsreader (serif headings), or a single sans family? (Newsreader gives the "architectural portfolio" tone.)
3. **Type scale:** which 6–7 steps, and what is the smallest size? (Recommend ≥ 11 px.)
4. **Density:** compact professional tool, or calmer with more whitespace?
5. **Inspector structure:** keep tabs (Model / Sun / Constraints / Compare), or Hektar-style icon rail with panels? (Same features, different container.)
6. **Layers:** stay in the inspector or move to a tool-rail popover?
7. **HUD:** which overlays are essential on the canvas (chips, compass, legend, scale, presets) and where they sit.
8. **Status colours:** keep amber/red/green semantics; confirm amber for lines only and darker ink for amber text.
9. **Landing page:** in scope for this redesign, or left to M5?
10. **3D scene:** confirm "no change" or list the small changes (e.g. accent/proposal colour, setback amber), so the scene tokens can be finalised.
