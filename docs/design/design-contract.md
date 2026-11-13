# Terraform — Design contract

- **Source:** PRD §7, §11, §12.3
- **Status:** Active for M0–M5 · Studio v2 revision 2026-11-02 (ADR-0009) · editor layout draft 4 (ADR-0010) supersedes the §5 layout
- **Reviewer:** `design-ui-finish-gate-reviewer`
- **Implementation:** `src/styles/tokens.css`, `src/styles/global.css`
- **Detailed spec:** `docs/design/ui-redesign-spec.md` (section numbers below match it); approved prototype `terraform-live-sun.html` is the visual source of truth

This document is the written contract the visual gate reviews against. It is intentionally stricter than "make it look nice". Change it by ADR, not by ad-hoc component styling.

## 0a. Studio v3 (ADR-0016) — current for the studio screen

Card layout on a warm grey canvas with soft shadows, pill toolbar, 340 px Parameters panel, ENU floor grid, outline selection. The analysis cards (Sun · Wind · Noise) live in the Parameters panel, one per analysis, and the card that is open is the analysis on the map (ADR-0026). Where ADR-0016 and §0 disagree for the studio, ADR-0016 wins, and where ADR-0026 disagrees with ADR-0016, ADR-0026 wins; tokens `--canvas`, `--card`, `--card-line`, `--ink-unit`, `--shadow-card`, `--shadow-float`, `--frost`, `rounded-panel`. Evidence: `docs/screenshots/studio-v3-*`, `docs/screenshots/panel-*`.

## 0. Draft 4 editor layout (ADR-0010) — superseded for the studio by ADR-0016

Reference image: `docs/design/ux-assessment/06-proposed-dashboard-v4.png`. Where this section and §2–§7 disagree, this section wins.

- **Layout:** canvas + one right panel (392 px) on a single screen ≥ 1024 px; stacked below. No tabs, no drawer, no insight tiles.
- **Panel order:** design check → scenario figures → buildings (selected mass = solid accent row, fields below) → groups: Sun · Layers and render quality · Site and sources · Assumptions · About these numbers → attribution.
- **Canvas:** text toolbar (Select, **Draw building** solid ink, Undo, Redo, Layers); text views (3D, Plan, North, South, Street) with an underline; compact compass; one legend pill with the scale; sun band under the scene (clock, date presets, day barcode = `Local time` slider, azimuth/altitude or "Sun below horizon", Play).
- **Surfaces:** ground `#E4E4E1`, panels `#F1F1EF`, hairlines `#D9D9D5`; `rounded-card` 10 px, `rounded-chip` 4 px; no shadows, no blur.
- **Type:** Geist; small labels are 11 px sentence case (`text-caption`), not uppercase mono; mono for numbers, times and units; large light figures for the check count, figures and clock.
- **Colour roles (small marks only):** blue = selection and "now"; amber = attention (squares, over-limit values, bar overrun, status dots); green = pass; sun orange = sun only. The scene keeps its hues at 60 % saturation (`soften`); the selected mass is solid blue.
- **One height:** every height shown uses the envelope reference (grade/datum) and says so.

## 1. Principles

1. **Canvas first, data second.** The model viewport and the key figures own the page; detail moves into a drawer.
2. **Editorial calm.** One cool ground, slightly lighter cards, hairlines only where they separate information. No shadows.
3. **Numbers carry the hierarchy.** Large, thin figures; small mono uppercase labels (`02 / SITE COVERAGE`).
4. **Colour has a job.** Blue = selected / proposal. Yellow → orange = sun. Amber = needs attention. Everything else is ink on grey.
5. **Plain controls.** A tab is a word with an underline; a tool is a line icon.
6. **Motion is small and purposeful.** Build in once; only live things keep moving.

## 2. Tokens

Source: `src/styles/tokens.css` (spec §2). Never add a hex to a component; add a token first.

| Token | Value | Use |
|---|---|---|
| `--bg-app` | `#E4E4E1` | Page ground (draft 4) |
| `--surface` | `#F1F1EF` | Cards, panels (draft 4) |
| `--surface-hover` | `#F5F5F3` | Card hover |
| `--surface-paper` | `#FAFAF8` | Inset strips, parcel fill, inputs |
| `--surface-viewport` | `#F3F3F1` | 3D viewport card |
| `--surface-inverse` | `#141414` | Dark readouts, tooltips, toast |
| `--ink-primary` | `#141414` | Text, primary button |
| `--ink-secondary` | `#646461` | Secondary text, labels |
| `--ink-disabled` | `#A3A3A0` | Disabled controls only |
| `--ink-on-inverse` / `-2` | `#F2F2F0` / `#9A9A96` | Text on inverse |
| `--border` | `#D6D6D2` | Hairlines |
| `--border-strong` | `#141414` | 1 px rule above metric rows and axes |
| `--muted-fill` | `#E2E2DE` | Empty gauge pills and tracks; interim control hover |
| `--accent` | `#1F3BD6` | Selected / proposal only (+ `-soft #E6E9FB`) |
| `--sun-low` … `--sun-glow` | `#F7C948` `#F08C00` `#F59F00` `#E8590C` `#E0A800` `#FFD43B` | Sun marks only, never text < 24 px |
| `--positive` | `#2F7A4C` | Pass track |
| `--warning` | `#C98A16` | Lines, icons, rings, bars only |
| `--warning-ink` | `#8A5A00` | Any warning text |
| `--warning-soft` | `#FBF1DE` | Warning fill |
| `--danger` | `#B4372E` | Over limit, invalid |
| `--focus` | `= --accent` | Focus ring |

Rules:
- Exactly one accent in the chrome; never for links, generic buttons or decoration.
- Amber is never text; warning text uses `--warning-ink`.
- No gradients, glows or shadows in the chrome (exception: the flat 35 % sun glow in the sun-path diagram, and the stripe/barcode patterns).
- **Open decision:** sun orange and warning amber are close in hue. They are separated by shape (warnings always carry the ⚠ triangle or a dashed amber line). If testing shows confusion, warnings move to red (`#B4372E` lines, `#8F2A22` text).

Tailwind utilities keep the existing short names for existing roles (`bg-app`, `bg-surface`, `text-ink`, `text-ink-secondary`, `border-line`, `bg-viewport`) and use token names for new ones (ADR-0009 §4).

## 3. Typography

| Role | Family | Package |
|---|---|---|
| UI, headings, large hero numbers | Geist Variable | `@fontsource-variable/geist` 5.3.0 |
| Figures, labels, axes, HUD, codes | Geist Mono Variable | `@fontsource-variable/geist-mono` 5.3.0 |

Type scale (Tailwind `@utility` in `global.css`; each carries family, weight, tracking and case):

| Utility | Size / line-height | Weight | Family | Tracking | Use |
|---|---|---|---|---|---|
| `text-hero` | 112 / 0.85 | 300 | Geist | −0.065em | Coverage number |
| `text-display` | 76 / 0.9 | 300 | Mono | −0.07em | Sun clock |
| `text-figure-l` | 64 / 0.9 | 300 | Geist | −0.06em | Tile hero figures; landing/About headings |
| `text-figure` | 30 / 1.1 | 300 | Mono | −0.04em | Metric row figures |
| `text-figure-s` | 28 / 1.1 | 300 | Geist | −0.04em | Per-block figures |
| `text-title` | 17 / 1.3 | 500 | Geist | −0.01em | Section titles |
| `text-body` | 14 / 1.45 | 400 | Geist | 0 | Nav, body |
| `text-body-sm` | 13 / 1.4 | 400 | Geist | 0 | Rows, checks, meta |
| `text-label` | 11 / 1.3 | 400 | Mono | +0.08em, UPPERCASE | All small labels, codes, axes, HUD |
| `text-unit` | 12 | 400 | Mono | 0 | Superscript units, ink-secondary |

Rules: smallest text 11 px; only labels are uppercase; section label pattern `NN / NAME` with optional right-aligned meta; numbers use a space thousands separator (`3 664`), one decimal for % and m; live figures use `tabular-nums`. No `text-[…]` or `tracking-[…]` classes in `src/`.

## 4. Spacing, radii, elevation

| Token | Value | Use |
|---|---|---|
| `--gap-grid` | 12 px | Gap between cards |
| Page padding | 22 top / 28 sides / 28 bottom (16 px < 640 px) | Outer page |
| Card padding | 20–24 px (tiles 20/22, large panels 24/28) | Inner card |
| `rounded-card` | 14 px | Cards, panels |
| `rounded-control` | 8 px | Inputs, segments |
| `rounded-pill` | 999 px | Round buttons, pills, dots |
| Hairline | 1 px `--border` | Dividers |
| Rule | 1 px `--border-strong` | Above metric rows, under axes |
| Underline | 1.5 px `--ink-primary` | Active tab/view, text buttons |

Elevation: none. No `shadow-*` and no ad-hoc `rounded-[…]` in `src/`. Card hover = `--surface-hover`, 200 ms.

## 5. Components

Primitives live in `src/components/ui/` (spec §5 has full specs):

| Component | Contract |
|---|---|
| Text button (default) | `text-body` ink, 1.5 px underline, optional 14 px icon; hover underline → accent |
| Solid button (rare) | Ink pill, white text, 36 px tall, one decisive action per view |
| Round icon button | 28 px circle, 1 px ink border, 44 px hit area (Play) |
| Rail icon button | 40 px, 16 px line icon ink-secondary; active = ink + 1.5 × 20 px bar on the rail hairline; `aria-pressed` |
| Tabs | Text + 14 px icon, 30 px apart; active ink with 1.5 px underline (`scaleX` 350 ms); disabled `--ink-disabled`, `aria-disabled` |
| Segmented text control | `text-label` items 20 px apart, underline pattern, `role="group"` + `aria-pressed` |
| Card | `--surface`, `rounded-card`, no border, header slot (label left, meta/action right, min-height 28 px) |
| Metric | Label (13 px icon) → `text-figure` + superscript unit; row = 4 columns under a rule, hairlines between |
| Numeric input | 40 px, `rounded-control`, `--surface-paper`, 1 px border, Geist Mono 14; label above in `text-label`; focus border accent |
| Check row | `18px 1fr auto`, top hairline; pass = ink check icon; attention = amber triangle + `--warning-ink` text |
| Legend swatch | 14 px lines (solid / dashed / dotted); 7 × 7 px square areas |
| Toast | `--surface-inverse` bar, 32 px, Geist Mono 12, 2.5 s, `role="status"` |

Icons: one line family on a 16 grid, 1.4 px stroke, round caps, `currentColor`, no fill except Play (spec §6 has final paths). Icon-only buttons need `aria-label`; decorative icons `aria-hidden`.

Layout (spec §7): desktop ≥ 1200 px is a 5-column grid (`540px 394px` rows): viewport spans 3, panel 02 spans 2 (coverage / sun / constraints by tab), five insight tiles below. Mass list, selection fields and groups live in a 392 px right drawer. 640–1199 px: 2 columns; < 640 px: 1 column, drawer becomes a bottom sheet. No horizontal page scroll at any width. Insight tiles are presentational only: they read existing selectors and show `—` + `NOT AVAILABLE FOR THIS SITE` when a value is missing.

Implementation notes (round 2, 2026-11-02): site packages carry no coverage limit, so the gauge shows used/remaining only and no limit pill; the metric row is Concept GFA · Footprint · Volume · Max height (never BRA/BYA); tile 07 lists the four checks the app evaluates (height, setback, study area, terrain contact) counted per mass. The Compare tab stays hidden until M4. The viewport legend shows from 1680 px, after the scale bar; below that the Layers drawer group describes the layers. The breakpoint is the `studio:` variant (75rem).

## 6. States

- Hover: colour or background change over 200 ms; no scale.
- Focus: 2 px `--focus` outline, 2 px offset, always visible.
- Active: ink text + 1.5 px underline (tabs, views) or rail bar; selection = accent.
- Disabled: `--ink-disabled`, not-allowed cursor, or removed from the release path.
- Loading: quiet pulse, never an indefinite spinner.
- Error: specific cause + recovery action; preserve previously valid input.
- Empty: explain what will appear and the next action.

## 7. Motion

Easing `--ease-out: cubic-bezier(.2,.7,.1,1)`. Mount animations run once per mount (cards fade + rise 800 ms, staggered 50 ms; figures count up; bars and stripes grow); data changes tween between values (numbers 400 ms, bars 300 ms). Only four things move while idle: the selected-mass anchor ring, the current-sun ring, the setback marching ants and the local-session dot. Full timing table: spec §8. CSS keyframes for mount and loops; `requestAnimationFrame` only for count-up and sun travel; no animation library.

`prefers-reduced-motion: reduce` turns all of it off: durations 0.01 ms, no loops, camera snaps, sun playback steps. Never animate a control that tracks a pointer.

## 8. 3D scene palette

Scene colours are TypeScript constants in `src/scene/*`; they are the single source (the `--scene-*` CSS tokens were deleted, ADR-0009). Spec §9 proposes a cooler palette (white masses with ink edges, blue selected mass, animated amber setback); it is not applied yet and the table below is the current state.

"White model" look — see `docs/design/scene-look-plan.md`. Separation comes from light, shadow and linework, not hue.

| Element | Colour |
|---|---|
| Background / fog | `#F4F2EE` (`--surface-viewport`) |
| Terrain | warm off-white `#F7F4EF` → `#EEEAE3` by elevation; skirt `#DCD8D1` |
| Context buildings | single matte `#FAF9F6`, no per-use tints |
| Context edges | `#7E7D7A` at 0.85 opacity, 1 device px, creases > 30° only — thin mid-grey outline ≈ 140/255, matched to Hektar |
| Concept massing | pale accent `#C9DBE5` — the only tinted built object; warning/invalid stay semantic; storey bands + outline `#355E79` at 0.35 |
| Alternate mass | cool blue-grey `#E9EDF0` |
| Parcel boundary | `#355E79`, 2 px |
| Setbacks | `#B8822B`, dashed |
| Selection outline | dark blue-grey |
| Grid | `#B9C0B6`, sections `#9AA399`; shown only in Top view or while drawing |
| Contours | `#6F6E6A`, 1 m at 0.14, 5 m at 0.32; only when relief ≥ 2 m |
| Streets (OSM) | `#C1BEB7`, warm light grey (half the on-screen contrast of `#ADAAA3`) well below the ground value (darkened 2026-11-11: barely visible at site scale) |
| Trees (OSM) | leaf-cluster canopies (18–28 jittered clumps, greens `#A9CBA0` `#8FBB8A` `#C3DAB5` `#7FAE7E` per clump), 6 variants × round/tall, branches `#A39A8C`; size 0.75–1.35×, varied by position (Codex C2) |
| Green space (OSM park/grass/wood) | rendered ≈ `#D3DCCB` (muted sage), painted into the terrain texture |
| Water (OSM) | rendered ≈ `#C6DCE8`, painted into the terrain texture |

Lighting: one directional sun at the real Oslo position for 21 June, 15:00 (`DEMO_SUN_INSTANT`, azimuth ≈ 217°, elevation ≈ 49.5°, suncalc) until M3 adds date/time controls; intensity 3.2; ambient 0.28; cool hemisphere fill (`#EEF3FA` / `#D2D5D8`, 1.75), low enough that walls read by their angle to the sun, as in Hektar (facing ≈ white, oblique ≈ 225, away ≈ 195–210); `NeutralToneMapping`. Shadows: PCF, 4096 map fitted to the site (~0.1 m/texel). Shadow radius 1 (crisp). Ambient occlusion: N8AO radius 4 m, intensity 1, cool `#2B3138`, desktop widths only (ADR-0005). No fake PBR realism, no bloom, no vignette on the canvas.

## 9. Accessibility

- WCAG 2.2 AA target for standard HTML UI; document that immersive 3D editing is not fully keyboard-equivalent in v1.
- Contrast ≥4.5:1 for body text, ≥3:1 for essential controls.
- Status never conveyed by colour alone: add label/icon.
- Keyboard reach for top bar, rail, inspector, dialogs; visible focus; skip link.
- Canvas has accessible instructions and numeric alternatives in the inspector.
- Tab order never disappears into the canvas.
- Reduced motion respected.
- Form errors are programmatically associated and specific.

## 10. Content and voice

- Sentence case for titles and body; uppercase only for `text-label`.
- Verbs first: `Add mass`, `Fit site`, `Export PNG`.
- State the method: `Concept GFA`, `Ground footprint`, `Illustrative max height`.
- Disclaimers are short, visible and not buried in a modal.
- No marketing superlatives inside the studio. The landing page may carry the portfolio argument; the tool stays factual.

## 11. Do / do not

**Do**
- Use the PRD tokens and one accent colour.
- Let the canvas breathe; remove a panel before shrinking the model.
- Show units next to numbers and method behind a tooltip.
- Use real geometry and real states, even when empty.
- Keep motion under 200 ms except the intentional site-entry camera.

**Do not**
- Add a gradient hero card that could belong to any SaaS.
- Use pill-shaped everything, emoji icons or stock 3D renders.
- Colour a pass/fail without a label.
- Animate drag feedback.
- Show placeholder metrics or fake site data to fill the composition.
- Introduce a second accent or a decorative illustration style.

## 12. Visual gate checklist

- [ ] Hero and section hierarchy read at a glance; no orphan micro-labels.
- [ ] Studio canvas dominates; inspector does not crowd it at 1440×900.
- [ ] All tokens match §2; no stray hex values in components (except scene constants and `SiteStudyGraphic`).
- [ ] Type scale matches §3; `rg "text-\[|tracking-\[|shadow-|rounded-\[" src` finds no class names.
- [ ] Only Geist and Geist Mono load; they work offline.
- [ ] Blue, sun and amber appear only where §2 allows (spec §11.3).
- [ ] Every number in a tile matches the store; tiles show "Not available" correctly.
- [ ] Every interactive state (hover/focus/active/disabled/loading/error) is designed.
- [ ] Empty and error states are intentional, not browser default.
- [ ] No inactive main-path control at M5.
- [ ] Reduced motion and focus states verified.
- [ ] Screenshots at the three desktop viewports plus one mobile read-only view.
- [ ] The result looks like an architectural product, not a generic dashboard.

Avoid weights above 500. No italic in the UI.
