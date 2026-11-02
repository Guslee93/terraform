# Terraform — UI/UX redesign spec ("Studio v2 · minimal")

**Date:** 2026-11-02 · **Status:** approved direction, ready for implementation
**Input:** `ui-ux-report.md` (2026-10-29), the nine reference images, and the approved prototype `terraform-live-sun.html` (keep it next to this file; it is the visual source of truth).
**Scope:** the chrome only (colours, type, spacing, component styling, layout of panels and HUD) plus a set of **presentational** infographics that read data the app already computes. No analysis logic, data, importer or domain rules change.

---

## 0. How to use this document

1. **First:** update `docs/design/design-contract.md` from §2–§7 of this spec. M5's visual gate checks against the contract, so it must change first.
2. **Codex round 1 (tokens + type):** §2, §3 and §4. Replace the token files, add the fonts and run the mechanical type-scale replacement.
3. **Codex round 2 (components + layout):** §5, §6 and §7. Restyle the primitives, then the panels, the HUD and the new insight tiles.
4. **Codex round 3 (motion + polish):** §8, plus the remaining items in §9.
5. **Verification round:** §10 and §11. Recapture the evidence screenshots, update the style assertions and run the acceptance checklist.

Each section ends with a **Done when** line that can be pasted into a work order.

---

## 1. Design direction in one paragraph

Quiet, editorial and data-first, closer to a printed report (Polestar sustainability report, Setio) than to a control panel.

- **Ground and surfaces:** one light, cool-grey background with slightly lighter cards. There are no shadows, borders appear only where they separate information, and lines are hairlines.
- **Numbers carry the hierarchy:** the key figures are very large and thin (Geist Mono at weight 300 for figures, Geist for the large hero number), and labels are small mono uppercase codes such as "02 / SITE COVERAGE".
- **Colour has a job, not a mood:**
  - **Blue** means "selected / proposal / yours".
  - **Yellow → orange** means "sun".
  - **Amber** means "check needs attention".
  - Everything else is ink on grey.
- **Controls are plain:** they look like text. A tab is a word with an underline, and a tool is a line icon with a short bar beside it.
- **Motion:** small, fast and purposeful. Things build in once on load, and only "live" things keep moving (the current sun, the selection, the session dot).

---

## 2. Colour tokens (`src/styles/tokens.css`)

Replace the current colour block entirely. The four near-identical warm surfaces collapse into three cool ones.

```css
:root {
  /* Ground & surfaces */
  --bg-app:            #E8E8E5;  /* page ground (was #f5f5f1) */
  --surface:           #F3F3F1;  /* cards / panels */
  --surface-hover:     #F5F5F3;  /* card hover */
  --surface-paper:     #FAFAF8;  /* inset strips (ruler), parcel fill, inputs */
  --surface-viewport:  #F3F3F1;  /* 3D viewport card = same as surface */
  --surface-inverse:   #141414;  /* dark readouts / tooltips */

  /* Ink */
  --ink-primary:       #141414;
  --ink-secondary:     #646461;  /* 5.34:1 on surface, 4.84:1 on bg-app */
  --ink-disabled:      #A3A3A0;  /* disabled controls only, never content */
  --ink-on-inverse:    #F2F2F0;
  --ink-on-inverse-2:  #9A9A96;  /* 6.52:1 on inverse */

  /* Lines */
  --border:            #D6D6D2;  /* hairlines between items */
  --border-strong:     #141414;  /* the 1px "rule" above metric rows and axes */
  --muted-fill:        #E2E2DE;  /* empty gauge pills, empty tracks */

  /* Accent: proposal / selection */
  --accent:            #1F3BD6;  /* 7.12:1 on surface, OK for text */
  --accent-strong:     #172DA8;  /* shaded face of the selected mass */
  --accent-light:      #4C62E0;  /* top face of the selected mass */
  --accent-soft:       #E6E9FB;

  /* Sun (data colour, marks only, never small text) */
  --sun-low:           #F7C948;  /* sun near horizon */
  --sun-high:          #E8590C;  /* sun at max altitude; also June path */
  --sun-mid:           #F08C00;  /* equinox path, sun ring */
  --sun-dot:           #F59F00;  /* current sun disc */
  --sun-winter:        #E0A800;  /* December path */
  --sun-glow:          #FFD43B;  /* glow / June area fill (use at 16–35% opacity) */

  /* Status */
  --positive:          #2F7A4C;
  --warning:           #C98A16;  /* lines, icons, rings, bars ONLY */
  --warning-ink:       #8A5A00;  /* any warning TEXT */
  --warning-soft:      #FBF1DE;
  --danger:            #B4372E;

  /* Neutrals used as data series (mass B, C) */
  --series-2:          #141414;  /* block B */
  --series-3:          #9A9A96;  /* block C */

  /* Focus */
  --focus:             var(--accent);
}
```

**Rules:**
- Exactly **one** accent (`--accent`) in the chrome. Blue is reserved for "the selected / proposed thing" and the active state of the primary selection. Do not use it for links, generic buttons or decoration.
- **Sun colours** appear only in sun-related visuals (the Sun tab, the day barcode, the sun-path diagram, the sun chip icon). They are never used for text below 24 px.
- **Amber** (`--warning`) is never used for text. Warning text uses `--warning-ink`.
- No gradients, glows or shadows in the chrome. The only exception is the sun glow in the sun-path diagram (a flat circle at 35% opacity, not a blur).
- Delete the stale `--scene-*` tokens, or repoint them as in §9.3. Keep one source of truth.

**Open decision (flag in the contract):** sun orange and warning amber are close in hue. The prototype keeps both, separated by **shape**: warnings always carry the ⚠ triangle icon or a dashed amber line, and the sun never does. If testing shows confusion, switch warnings to `--danger`-tinted red (`#B4372E` for lines and `#8F2A22` for text) and keep orange for the sun only.

**Tailwind mapping (`src/styles/global.css`):** expose every token as a colour utility with the same name. On Tailwind v4, use `@theme { --color-bg-app: var(--bg-app); … }`. On v3, extend `theme.colors` in the config with `'bg-app': 'var(--bg-app)'` and so on. Remove any Tailwind palette colours that are still referenced in the studio (`gray-*`, `slate-*`).

**Done when:** every studio component compiles with no hard-coded hex values (except the scene constants and `SiteStudyGraphic`), and the contrast table in §11.2 passes.

---

## 3. Typography

### 3.1 Families

| Role | Family | Package | Notes |
|---|---|---|---|
| UI, headings, large hero numbers | **Geist** (variable) | `@fontsource-variable/geist` | replaces Inter |
| Figures, labels, axes, HUD, codes | **Geist Mono** (variable) | `@fontsource-variable/geist-mono` | new |

- Remove **Inter** and **Newsreader** (two dependency removals, two additions). Record this in an ADR, then check the bundle; both families ship latin subsets of about 30–40 kB each as woff2.
- Self-hosted, as today, so the app still works offline.
- Turn on `font-variant-numeric: tabular-nums` for all figures that update live (clock, metrics during count-up).

```css
:root {
  --font-sans: 'Geist Variable', 'Geist', system-ui, sans-serif;
  --font-mono: 'Geist Mono Variable', 'Geist Mono', ui-monospace, monospace;
}
body { font-family: var(--font-sans); -webkit-font-smoothing: antialiased; }
```

### 3.2 Type scale (replaces the 15 ad-hoc sizes and 8 tracking values)

| Token | Size / line-height | Weight | Family | Tracking | Case | Used for |
|---|---|---|---|---|---|---|
| `--t-hero` | 112 px / 0.85 | 300 | Geist | −0.065em | — | the coverage number in the gauge |
| `--t-display` | 76 px / 0.9 | 300 | Geist Mono | −0.07em | — | the sun clock (Sun tile, Sun tab) |
| `--t-figure-l` | 64 px / 0.9 | 300 | Geist | −0.06em | — | tile hero figures (height) |
| `--t-figure` | 30 px / 1.1 | 300 | Geist Mono | −0.04em | — | core metrics row, inspector metrics |
| `--t-figure-s` | 28 px / 1.1 | 300 | Geist | −0.04em | — | per-block figures above the stripes |
| `--t-title` | 17 px / 1.3 | 500 | Geist | −0.01em | Sentence | section titles inside the inspector |
| `--t-body` | 14 px / 1.45 | 400 | Geist | 0 | Sentence | nav, body, list labels |
| `--t-body-sm` | 13 px / 1.4 | 400 | Geist | 0 | Sentence | rows, checks, meta |
| `--t-label` | 11 px / 1.3 | 400 | Geist Mono | +0.08em | UPPERCASE | **all** small labels, codes, axes, units, HUD |
| `--t-unit` | 12 px | 400 | Geist Mono | 0 | — | units set superscript after a figure (`m²`, `m`) |

**Rules:**
- **Smallest text is 11 px.** Delete all the 9 / 9.5 / 10 / 10.5 px classes.
- There are only **two tracking values** for text: `−0.04em` for figures (with tighter variants built into the hero and display tokens) and `+0.08em` for labels.
- **Labels are the only uppercase text.** Titles and body copy stay in sentence case.
- **Section label pattern:** `NN / NAME` in `--t-label`, ink-primary for the code and name, with an optional secondary meta label right-aligned in ink-secondary. Example: `02 / SITE COVERAGE ………… %-BYA · PLAN LIMIT 35`.
- **Number formatting:** use a space as the thousands separator (`3 664`) to match Norwegian practice, keep one decimal for percentages and metres (`26.5`, `22.0`), and set the unit as a 12 px superscript in ink-secondary with a 3 px gap.
- **Newsreader is gone.** The About page uses `--t-figure-l` in Geist for its headings.

**Mechanical replacement:** define these as Tailwind utilities (`text-hero`, `text-display`, `text-figure`, `text-label`…). Then map the old arbitrary classes as follows:
- `text-[9px]`, `text-[9.5px]`, `text-[10px]`, `text-[10.5px]` and `text-[11px]`, plus any `tracking-[…]` or `uppercase` on them → `text-label`.
- `text-[11.5px]`, `text-[12px]`, `text-[12.5px]` and `text-[13px]` → `text-body-sm`.
- `text-[13.5px]`, `text-[14px]` and `text-[15px]` → `text-body`.
- `text-[24px]`, `text-[26px]` and `text-[28px]` with Newsreader → `text-title` in the inspector, or `text-figure-l` on the landing and About pages.

Then grep for zero remaining `text-[` and `tracking-[` classes in `src/`.

**Done when:** `rg "text-\[|tracking-\[" src` returns nothing, and the fonts load offline.

---

## 4. Spacing, radii, borders, elevation

| Token | Value | Use |
|---|---|---|
| Spacing base | 4 px (Tailwind default) | unchanged |
| `--gap-grid` | 12 px | gap between all cards |
| `--pad-page` | 22 px top, 28 px sides, 28 px bottom | outer page padding (16 px under 640 px) |
| `--pad-card` | 20–24 px (tiles 20/22, large panels 24/28) | inner card padding |
| `--radius-card` | 14 px | all cards and panels |
| `--radius-control` | 8 px | inputs, segments (rare now) |
| `--radius-pill` | 999 px | round buttons (play), pills, dots |
| `--hairline` | 1 px `--border` | dividers between columns and rows |
| `--rule` | 1 px `--border-strong` | the black rule above metric rows, under axes |
| `--underline` | 1.5 px `--ink-primary` | active tab, active camera view, text buttons |

- **Elevation: none.** Remove `--shadow-soft` and every `shadow-sm`. Depth comes only from the ground and surface contrast. Floating HUD items sit directly on the viewport card with no backgrounds.
- Remove the ad-hoc radii `rounded-[2px]`, `[5px]`, `[6px]`, `[7px]` and `[14px]`, and use the tokens above.
- Hover on a card changes it to `--surface-hover` (a barely visible lift without a shadow), with a 200 ms transition.

**Done when:** no `shadow-` or ad-hoc `rounded-[` classes remain in the studio.

---

## 5. Primitives (`src/ui/*`)

Define these once and use them everywhere. Today some styling is inline per panel; move it into the primitives.

### 5.1 Text button (`Button variant="text"`), the default
- Text in `--t-body`, ink-primary, with a `--underline` bottom border and 6 px vertical padding, plus an optional leading 14 px icon with an 8 px gap.
- Used for "Fit site", "Add mass", "Reset" and similar.
- Hover changes the underline to `--accent`. Focus shows a 2 px `--focus` outline with a 2 px offset.

### 5.2 Primary button (`variant="solid"`), rare
- Ink-primary background, white text, pill shape, 36 px tall with 16 px horizontal padding.
- Use it only for one decisive action per view (for example an export confirm).

### 5.3 Round icon button (`IconButton variant="round"`)
- 28 px circle with a 1 px ink border, transparent fill and a 12 px icon. Used for Play.
- Keep the hit area at 44 × 44 px, either with an invisible padding wrapper or with `::before { inset:-8px }`.

### 5.4 Rail icon button (`IconButton variant="rail"`)
- 40 × 40 px, no background, 16 px line icon in ink-secondary.
- **Active:** the icon turns ink-primary and a 1.5 px × 20 px vertical bar sits on the rail's left hairline.
- **Hover:** the icon turns ink-primary over 200 ms.
- `aria-label` is required, and `aria-pressed` is set on the active button.

### 5.5 Tabs (`Tabs`)
- Plain text items with a 14 px icon and an 8 px gap, 30 px apart.
- Inactive items are ink-secondary and the active item is ink-primary with a 1.5 px underline.
- **Underline motion:** it animates `scaleX` from 0 to 1 with `transform-origin:left` over 350 ms `--ease-out` when a tab becomes active.
- A disabled tab (Compare until M4) uses `--ink-disabled` with `pointer-events:none` and `aria-disabled="true"`.

### 5.6 Segmented text control (camera views)
- Uppercase `--t-label` items 20 px apart, showing the same underline pattern as the tabs.
- `role="group"` with `aria-pressed` on each item.

### 5.7 Card (`Card`)
- `--surface` background, `--radius-card`, no border, `overflow:hidden`, and `position:relative` for absolute HUD children.
- **Header slot:** a flex row with `justify-content:space-between` and `min-height:28px`. It holds the section label (§3.2) on the left and a meta label or action on the right.

### 5.8 Metric cell (`Metric`)
- A label (`--t-label` with a 13 px icon and a 6 px gap), then a figure (`--t-figure`) with a superscript unit, 10 px apart.
- **Metric row:** a 4-column grid with a `--rule` on top. Each cell after the first has a left hairline and 16 px left padding.

### 5.9 Inputs (numeric fields in the inspector)
- 40 px tall with `--radius-control`, a `--surface-paper` fill, a 1 px `--border` and Geist Mono at 14 px.
- The label sits above in `--t-label`, written as "FLOORS" or "FLOOR-TO-FLOOR, M".
- **Focus:** the border turns `--accent` and the 2 px focus outline appears.

### 5.10 Status row (`CheckRow`)
- A grid of `18px | 1fr | auto` with a 10 px gap, 8 px vertical padding and a top hairline.
- It shows a 16 px status icon, the label in `--t-body-sm`, and the value in Geist Mono at 12 px.
- **Pass:** ink-primary icon (circle with check) and ink-primary text.
- **Attention:** amber icon (`--warning` triangle), with the label and value in `--warning-ink`.

### 5.11 Legend swatch
- Lines are 14 px long, inline, with a 6 px gap before the label:
  - solid 1.5 px for primary series;
  - dashed 1 px for parcel and equinox;
  - dotted for December.
- Area swatches are 7 × 7 px squares (not rounded).

**Done when:** no panel defines its own button, tab or input styling inline.

---

## 6. Icon set

One line-icon family on a **16 × 16 grid** with a **1.4 px stroke**, round caps and joins, no fill (except the play triangle) and `currentColor`. Sizes are 16 px in the rail and nav, 14 px in tile headers and 13 px in metric labels. Put them in `src/ui/Icon` as a sprite or as components. The paths below are final (copied from the prototype):

| Name | Use | Path(s) (viewBox 0 0 16 16) |
|---|---|---|
| `cube` | Model tab | `M2.5 4.8 8 2l5.5 2.8v6.4L8 14l-5.5-2.8z` · `M2.5 4.8 8 7.6l5.5-2.8M8 7.6V14` |
| `sun` | Sun tab, sun tile | circle `cx8 cy8 r2.8` · `M8 1v1.6M8 13.4V15M1 8h1.6M13.4 8H15M3 3l1.1 1.1M11.9 11.9 13 13M3 13l1.1-1.1M11.9 4.1 13 3` |
| `shield` | Constraints tab, checks tile | `M8 1.5 13.5 3.5v4c0 3.4-2.4 5.9-5.5 7-3.1-1.1-5.5-3.6-5.5-7v-4z` · `m5.6 8 1.7 1.7L10.6 6.4` |
| `compare` | Compare tab | rect `2,2.5,5×11,r1` · rect `9,2.5,5×11,r1` |
| `cursor` | Select tool | `M3.5 2.5 12.5 8 8.4 9 6.7 13.3z` |
| `draw` | Draw mass tool | `M2.5 13.5V6l5.5-3.5L13.5 6v7.5` · `M2.5 13.5h11M6 13.5V9.5h4v4` |
| `layers` | Layers | `M8 2.5 14 6 8 9.5 2 6z` · `M2 9.2 8 12.7l6-3.5` |
| `undo` / `redo` | history | `M5.5 3.5 2.5 6.5l3 3` · `M2.5 6.5h7a3.5 3.5 0 0 1 0 7H6` (mirror for redo) |
| `fit` | Fit site | `M2 5.5V2h3.5M10.5 2H14v3.5M14 10.5V14h-3.5M5.5 14H2v-3.5` |
| `area` | BTA, gross area tile | rect `2.5,2.5,11×11` · `M2.5 6.2h11M2.5 9.8h11` |
| `usable` | BRA | rect `2.5,2.5,11×11` · `M8 2.5v11M2.5 8h5.5` |
| `footprint` | BYA, coverage | dashed rect `2.5,2.5,11×11` (dasharray 2 2) · rect `5.5,5.5,5×5` |
| `height` | Height | `M8 13.5V2.5M5.5 5 8 2.5 10.5 5M3 13.5h10` |
| `ok` | passed check | circle `r6` · `m5.4 8.1 1.8 1.8 3.4-3.6` |
| `warn` | attention | `M8 2.2 14.2 13H1.8z` · `M8 6.5v3` · dot at `8,11.2` |
| `play` | sun playback | filled `M5 3.2 12.5 8 5 12.8z` |
| `compass` | sun-path tile | circle `r6` · `m10.4 5.6-1.4 3.4-3.4 1.4 1.4-3.4z` |
| `chevron` | dropdowns, collapsible groups | `m4.5 6.5 3.5 3.5 3.5-3.5` |

- Icon-only buttons always have an `aria-label`.
- Decorative icons next to text get `aria-hidden="true"`.
- No emoji, and no filled icons except the play triangle.

---

## 7. Layout

### 7.1 Studio grid (desktop ≥ 1200 px)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ TOP BAR  logo · [site] · OSLO     ◈Model ☼Sun ⛉Constraints ▯Compare   ■Scenario A ⌄ ●LOCAL SESSION ⛶Fit site │
├───────────────────────────────────────────────┬──────────────────────────────┤
│ 01 / MASSING (viewport, 3 of 5 columns)       │ 02 / SITE COVERAGE (2 cols)  │
│                                               │  pill-arc gauge + hero 26.5  │
│  rail │        3D scene        compass        │  ──────────────────────────  │
│       │                                       │  BTA │ BRA │ BYA │ HEIGHT    │
│  scale        legend          ISO TOP N S EYE │                              │
├─────────┬─────────┬─────────┬─────────┬───────┴──────────────────────────────┤
│03 GROSS │04 SUN   │05 SUN   │06 HEIGHT│07 CHECKS                             │
│ AREA    │ 14:30   │ PATH    │ 22.0 +  │ 7 rows                               │
│ stripes │ barcode │ diagram │ ruler   │                                      │
└─────────┴─────────┴─────────┴─────────┴──────────────────────────────────────┘
```

- `main`: `grid-template-columns: repeat(5, minmax(0,1fr))`, `grid-template-rows: 540px 394px`, `gap: 12px`. The page max width is 1680 px, centred.
- **Viewport:** `grid-column: 1 / span 3`. **Coverage panel:** `grid-column: 4 / span 2`. The five tiles take one column each.
- **Where the existing inspector goes.** The redesign keeps the inspector's **features** but changes its **container**:
  - **Model tab:** the content is the viewport plus panel 02 plus tiles 03–07 as shown. Mass list, selection fields, site package, layers and assumptions move into a **right-side drawer** (§7.4) that opens when a mass is selected or when the Layers rail button is pressed.
  - **Sun tab:** the same grid, but panel 02 becomes the **Sun panel** (§7.5), and the tiles show sun-specific content (barcode, sun path, sun-hours by block if available).
  - **Constraints tab:** panel 02 becomes the **Constraints panel** (§7.6). Tile 07 expands to two columns and the other tiles stay.
  - **Compare tab (M4):** build it on this system later, reusing the stripes and metric-row patterns.
- If keeping the old tab-in-inspector structure is a hard requirement for M3/M4, fall back to the **inspector variant**. In that variant the right column is a 392 px panel with the tabs at the top, the coverage gauge and metric row first, then the mass list and fields, and the tiles 03–07 sit in a strip under the viewport. All component specs below apply unchanged.

### 7.2 Top bar
- **Height:** 40 px row with no background; it sits on the ground and is not a card.
- **Grid:** `1fr auto 1fr`.
- **Left:** a 22 px logo mark, then "Terraform" in 14/500, then a 12 px gap and the site name with the city in `--t-label`.
- **Centre:** the tabs (§5.5).
- **Right:** the scenario (a 7 × 7 accent square, the name, a 12 px chevron), the session state (a pulsing 7 px dot plus a label, §8) and "Fit site" as a text button with the `fit` icon. The gap is 26 px.
- **Under 1200 px:** a single column, with the meta row and nav wrapping.

### 7.3 Viewport (01 / MASSING)
- The card is `--surface-viewport`. The canvas fills the card, and the HUD is laid out on a fixed grid:
  - **Top-left (22, 26):** the section label `01 / MASSING` plus a `CURATED DEMO` meta label. This replaces the "Curated demo" chip.
  - **Left (64, 22):** the **tool rail**, a vertical stack of rail icon buttons with a 1 px left hairline and no background. The order is select, draw, layers, undo, redo.
  - **Top-right (16, 20):** the **compass**, 86 px across: a tick ring (72 ticks, ink at 50%), a 1.6 px north line, a hollow-or-filled diamond needle and an "N" in Geist 9.5/500. It is rotated to the camera azimuth and has no background.
  - **Bottom-left (22, 26):** the **scale bar**, 180 px wide: a tick every 9 px (1 px ink), a 1 px baseline and `0 · 10 · 20 M` labels.
  - **Bottom-centre:** the legend (Parcel dashed ink, Setback dashed amber) in `--t-label`.
  - **Bottom-right (20, 24):** the camera views `ISO TOP N S EYE` (§5.6).
- **Night state:** "Sun below horizon" becomes a meta label next to the section label (`01 / MASSING · SUN BELOW HORIZON`), not a chip. Give it a `role="status"` and an accessible name; this closes the M3 follow-up.
- **Boundary toast:** a `--surface-inverse` bar at bottom-centre, 32 px tall, with Geist Mono 12 px text, `--radius-control`, a 2.5 s life and a fade.
- **Selection annotation (new, presentational):** leader lines from the top corner of each proposal mass to a two-line mono label (`A · 22.0 M` / `6 FL · 1 680 M²`). The selected mass's leader and label are in `--accent` with a 2.5 px dot and a pulsing ring (§8). The others are ink at 0.6 px. Project the labels from scene coordinates every frame, or on camera change only.

### 7.4 Inspector drawer (mass list, fields, groups)
- 392 px wide, sliding over the right two columns from the right (§8 motion). It uses the same `--surface` card with a 1 px left hairline and no shadow.
- **Header:** `MASSES` with the "Add mass" text button.
- **Mass list rows:** 56 px tall. Each has a 36 px outline glyph tile, the name in 14/500, `6 floors · 20 × 14 m` in 12 ink-secondary, and BTA right-aligned in mono 13. The selected row has a `--surface-hover` background and a 7 px accent square before the name.
- **Selection fields:** a 2-column grid of inputs (§5.9).
- **Collapsible groups:** Site package, Layers & render quality, Assumptions. Each is a 48 px row with a top hairline, the label, a right meta label and a chevron; the chevron rotates 180° when open.
- **Model tab content no longer scrolls endlessly.** The overview lives in the grid and the detail lives in the drawer.

### 7.5 Sun panel (panel 02 when the Sun tab is active)
- **Header:** `02 / SUN POSITION` with `21 JUN 2026 · OSLO` on the right.
- **Hero:** the clock in `--t-display` (76 px), or 96 px if the space allows.
- **Metric row:** AZIMUTH, ALTITUDE, SUNRISE / SUNSET, DAY LENGTH.
- **Date presets** as text segments: `20 MAR · 21 JUN · 22 SEP · 21 DEC`.
- **Playback** as text segments: `1× · 10× · 60×`, plus the round Play button.
- **Method note** in `--t-body-sm` ink-secondary on `--surface-paper`, unchanged wording.
- **Time scrubbing:** the day barcode (§7.7.2) becomes the slider and replaces the current night-shaded slider.

### 7.6 Constraints panel (panel 02 when the Constraints tab is active)
- **Header:** `02 / CONSTRAINTS` with `2 / 7` in `--warning-ink` on the right.
- **Hero:** `2/7` in `--t-hero` scale (a 112 px Geist light figure), with "checks need attention" in `--t-body`.
- **Summary bar:** 6 px tall, made of segments in ink (pass) and `--warning` (attention), proportional, with a 3 px gap.
- **Limits list:** `CheckRow`s, each followed by a 4 px track (`--muted-fill`). The fill is `--positive` for a pass and `--warning` for attention.
- **Height reference** select (Grade / Datum) styled as in §5.9.
- **Warning buttons:** CheckRow style, clickable, with a 1 px `--warning` outline on hover and focus.
- Keep the **disclaimer** text exactly as it is now (claim policy), shown as a label: `INDICATIVE · NOT A PLANNING DECISION`.

### 7.7 Insight tiles (row 2)

All tiles are cards with 20/22 px padding and a header slot (§5.7). They are **presentational only**: they read existing selectors and stores. If a value is not available, the tile shows `—` and a label saying `NOT AVAILABLE FOR THIS SITE`. **Never invent values.**

#### 7.7.1 `03 / GROSS AREA` — striped columns
- **Data:** BTA per mass (existing). Show up to 4 masses; above that, show the top 3 and an "Other" column.
- The columns are separated by hairlines and fill the tile to the bottom edge.
- **Each column:** the figure in `--t-figure-s`, then a mono label (`A`), then the stripe block.
  - The stripe block uses `repeating-linear-gradient(90deg, <colour> 0 1.5px, transparent 1.5px 5px)`.
  - Height = `196px × value / max`.
  - The colour is `--accent` for the selected mass, `--series-2` for the next and `--series-3` for the rest. Selection drives the colour, not the order.
- **Accessibility:** the tile has `aria-label`; each column also contains a visually hidden "Block A, 1 680 square metres".

#### 7.7.2 `04 / SUN · <date>` — clock + day barcode
- **Header:** sun icon (in `--sun-high`) + label, with the round Play button on the right.
- **Clock:** `--t-display`. Under it, `AZ 207°  ALT 51°` as labels, with the values in ink-primary mono.
- **Barcode:** 96 stems (one per 15 min), `display:flex; justify-content:space-between`, 84 px tall, bottom-aligned.
  - **Night:** a 1 px × 4 px stem in `#BDBDB8`.
  - **Day:** a 1.5 px stem whose height is `8 + 56 × altitude/altitudeMax` px. Its colour interpolates linearly from `--sun-low` (#F7C948) to `--sun-high` (#E8590C) by `altitude/altitudeMax`.
  - **Current slot:** a 1.5 px × 78 px stem in ink-primary, topped by a 7 px `--sun-high` dot with a pinging ring (§8).
- **Axis:** a 1 px `--rule`, then `00 06 12 18 24` labels. Below that: `↑ 03:54   18 H 50 M   22:44 ↓`.
- **Interaction:** the barcode **is** the time slider.
  - Pointer down or drag on a stem sets the time.
  - It is keyboard-operable as `role="slider"` with `aria-valuemin=0`, `aria-valuemax=95` and `aria-valuetext="14:30"`.
  - Left/Right moves 15 min, Shift+arrow moves 1 h, and Home/End jump to sunrise/sunset.
- **Data:** solar altitude per slot from the existing sun module (NOAA). The interpolation in the prototype is only a stand-in.

#### 7.7.3 `05 / SUN PATH` — sun-path diagram (new infographic)
- **Header:** compass icon (in `--sun-high`) with the latitude (`59.9° N`) on the right.
- **Projection:** north up, azimuth clockwise, radius `r = R × (1 − alt/90°)`, so the horizon is the outer circle and the zenith is the centre. R is 88 within a 260 viewBox.
- **Layers, back to front:**
  1. Outer tick ring at `R+11` with 72 ticks (6 px stroke, 0.6 px dash, ink at 45%).
  2. Altitude rings at 30° and 60° (0.8 px `--border`) with mono 8.5 px labels; the horizon circle is 0.8 px ink. The N–S and E–W axes are 0.8 px `--border`.
  3. Cardinal letters `N E S W` in Geist 11/500, at `R+27`.
  4. June area fill: the June path closed with `Z`, filled `--sun-glow` at 18% opacity.
  5. December path: 1.2 px `--sun-winter`, dotted `1 3`.
  6. Equinox path: 1 px `--sun-mid`, dashed `4 3`.
  7. **Selected-date path:** 1.8 px `--sun-high`, solid, with a 1.8 px dot at every whole hour. In the prototype this is the June path; in the app it is the currently selected date's path, so draw it for the date in the store.
  8. **Current sun:**
     - a glow circle (r 14, `--sun-glow` at 35%);
     - a ring (r 9, 1.2 px `--sun-mid`, pulsing);
     - a disc (r 6, `--sun-dot` fill, 1.2 px `--sun-high` stroke);
     - a dashed 0.8 px `--sun-high` line from the centre to the sun.
- **Legend:** `— JUN   --- MAR/SEP   ··· DEC`, using the swatches in §5.11 with sun colours.
- **Computation** (reference implementation; use the app's existing solar function if it returns alt/az):

```ts
// lat in radians, decDeg = solar declination, t = local solar hours
function sunPos(lat: number, decDeg: number, t: number) {
  const d = decDeg * Math.PI / 180, H = (t - 12) * 15 * Math.PI / 180; // use true solar time
  const alt = Math.asin(Math.sin(lat)*Math.sin(d) + Math.cos(lat)*Math.cos(d)*Math.cos(H));
  const az  = Math.atan2(Math.sin(H), Math.cos(H)*Math.sin(lat) - Math.tan(d)*Math.cos(lat)) + Math.PI; // from north, clockwise
  return { alt, az };
}
const toXY = (alt: number, az: number, C = 130, R = 88) => {
  const r = R * (1 - alt / (Math.PI / 2));
  return [C + r * Math.sin(az), C - r * Math.cos(az)];
};
// paths: sample t = 0..24 step 0.1 h, skip alt < 0, new subpath after a gap.
```

  (The prototype uses `t − 13.3` as a rough clock-to-solar-time offset for Oslo in summer. In the app, use the real equation of time and timezone from the existing sun module.)
- **Accessibility:** `role="img"` with an `aria-label` such as "Sun path for 21 June at latitude 59.9° north; sun now at azimuth 207°, altitude 51°". Update it when the time changes, throttled.

#### 7.7.4 `06 / HEIGHT` — figure, floor stack, ruler
- **Layout:** two columns, content `1fr` and ruler 96 px. The ruler strip is `--surface-paper` with a left hairline and runs full height.
- **Content:**
  - the tallest height in `--t-figure-l`, with `M · TALLEST BLOCK` under it;
  - at the bottom, the **floor stack**: one column per mass, `flex` proportional to the floor count, with floors as 14 px bars and a 3 px gap, stacked bottom-up. The colours follow §7.7.1. Under it are labels such as `A·6  B·5  C·4`.
- **Ruler:**
  - 0 to `ceil(limit/5)×5 + 5` m;
  - 1 px × 20 px minor ticks every metre and 2 px × 40 px major ticks every 5 m, right-aligned;
  - the **limit tick** is `--warning`;
  - mono 11 px labels on the left (`LIM 25` in `--warning-ink`, `A 22` in `--accent`, `B 16`, `C 12` in ink).
- **Data:** mass heights, floor counts and the height limit come from the existing selectors. If there is no limit, hide the LIM tick and label.

#### 7.7.5 `07 / CHECKS`
- **Header:** shield icon with `2 / 7` (attention / total) on the right. The figure is in `--warning-ink` when it is above 0 and ink-primary when it is 0 (then shown as `ALL CLEAR`).
- **Summary bar:** as in §7.6, but 6 px tall with a 16 px top margin.
- **Rows:** one `CheckRow` per constraint check the app already evaluates. Attention rows are listed after passes, or first if you prefer. **Do not invent checks.** The prototype's "Neighbour distance" and "Outdoor sun, 5 h" are placeholders; show only what the constraints module produces.
- **Footer:** the label `INDICATIVE · NOT A PLANNING DECISION`.
- Clicking a row opens the Constraints tab with that check focused.

### 7.8 Coverage panel (02 / SITE COVERAGE)
- **Header:** footprint icon with `02 / SITE COVERAGE`, and `%-BYA · PLAN LIMIT 35` on the right.
- **Pill-arc gauge** (SVG viewBox `0 0 580 300`, `width:100%`):
  - a semicircle centred at (290, 272) with R 232, opening downwards;
  - **21 pills** for 0 to 50 in steps of 2.5 (the scale end is `max(50, ceil(limit×1.4/5)×5)`);
  - each pill is a 17 px-radius circle, with value labels inside every second pill (Geist Mono 10 px);
  - **Pill states:**
    - **used**, where the pill value ≤ the actual value: `--accent` fill with white label;
    - **limit**, where the pill value equals the limit: `--surface-paper` fill, 1.8 px `--warning` ring and `--warning-ink` label;
    - **remaining:** `--muted-fill` fill with ink-secondary label;
  - a `LIMIT 35` callout in `--warning-ink` mono outside the arc next to the limit pill;
  - an inner dotted hairline arc at R−40 (`1 5` dash, `--border`);
  - **centre:** the value in `--t-hero`, and under it the legend `● USED  ○ LIMIT  8.5 HEADROOM` in labels.
- **Over limit:** pills above the limit that are "used" switch to `--danger`, the hero figure turns `--danger`, and the header meta reads `OVER LIMIT BY 2.3`.
- **Metric row** at the bottom (§5.8): BTA, BRA, BYA, HEIGHT, each with its icon.
- **Accessibility:** the gauge is `role="img"` with an `aria-label` such as "Site coverage 26.5 percent of a 35 percent limit".

### 7.9 Responsive
- **≥ 1200 px:** the grid as in §7.1.
- **640–1199 px:**
  - 2 columns, with the viewport spanning both at 520 px tall;
  - the coverage panel spans both columns;
  - the tiles sit two per row, each at least 360 px tall;
  - the top bar stacks.
- **< 640 px:**
  - 1 column, with the viewport 420 px tall;
  - page padding 16 px;
  - the HUD hides the legend (it moves into the Layers drawer) and keeps the scale, compass and views;
  - the camera views wrap.
- There is **no horizontal page scroll** at any width. The drawer becomes a full-width bottom sheet under 640 px.

---

## 8. Motion

All motion uses `--ease-out: cubic-bezier(.2,.7,.1,1)` unless noted. **Everything below is switched off under `prefers-reduced-motion: reduce`**: durations become 0.01 ms, loops stop, the camera snaps and sun playback steps. This rule already exists in the contract §7; extend it to cover these items.

### 8.1 Load / mount (once per session, or on tab switch for the tab content)

| Element | Animation | Duration | Delay |
|---|---|---|---|
| Cards | fade + `translateY(14px → 0)` | 800 ms | staggered 50 ms per card in reading order (0.05–0.44 s) |
| Context buildings | fade + rise `translateY(24px)`, `scaleY(.6 → 1)`, origin bottom | 900 ms | 0.25–0.4 s |
| Proposal masses | same as context buildings | 900 ms | 0.55 / 0.7 / 0.85 s |
| Shadows | opacity 0 → 1 | 600 ms | 1.1 s |
| Leader lines | `stroke-dashoffset` from length to 0 | 1 000 ms | 1.3–1.6 s |
| Leader labels | fade | 600 ms | 1.9–2.1 s |
| Compass needle | rotate −40° → +6° → 0° | 1 600 ms | 0 |
| Gauge pills | `scale(.4 → 1)` + fade, one by one | 450 ms each | 0.35 s + 45 ms × index |
| Numbers | count up from 0 (ease-out quart), keeping decimals and the space separator | 1 300 ms | 0.3 s + 40 ms × index |
| Stripe columns | `scaleY(0 → 1)`, origin bottom | 1 100 ms | 0.6 / 0.75 / 0.9 s |
| Barcode stems | `scaleY(0 → 1)` | 700 ms | 0.5 s + 8 ms × index |
| Sun-path June curve | draw (dashoffset) | 1 600 ms | 0.6 s |
| Sun-path hour dots | fade | 600 ms | 1.0 s + 50 ms × hour |
| Sun | travels sunrise → current time along the path; the clock, AZ and ALT update in step | 2 200 ms (ease-out cubic) | 0.5 s |
| Floor bars | `scale(.4 → 1)` + fade, bottom-up | 350 ms each | 0.7 s + 150 ms × mass + 70 ms × floor |
| Ruler ticks | `scaleX(0 → 1)`, origin right | 500 ms | 0.4 s + 20 ms × metre |
| Check rows | fade + `translateX(−8px → 0)` | 500 ms | 0.6 s + 70 ms × row |

Load animations run **once per mount**. Do not replay them on every data change. On data change (for example editing floors), animate **between values**: numbers tween over 400 ms, bars and stripes animate height over 300 ms, and the gauge pills cross-fade colour over 300 ms.

### 8.2 Persistent ("live") motion: only these four

| Element | Animation | Timing |
|---|---|---|
| Selected-mass anchor ring (viewport) | `scale(1 → 1.9)` + fade out, loop | 2 s ease-in-out, infinite |
| Current-sun ring (sun-path) and barcode marker ring | same pulse/ping | 2 s, infinite |
| Setback line | "marching ants": `stroke-dashoffset 0 → −18`, dash `3 6` | 1.2 s linear, infinite |
| Local-session dot | ping ring `scale(.6 → 1.9)` + fade | 2.4 s, infinite |

No other element animates while idle.

### 8.3 Interaction
- **Tab underline:** `scaleX` over 350 ms (§5.5).
- **Rail and nav hover:** colour over 200 ms.
- **Card hover:** background over 200 ms.
- **Drawer:** `translateX(100% → 0)` over 320 ms, with the content fading 120 ms later. Closing takes 240 ms.
- **Camera view change:** the existing camera tween is unchanged. The active underline moves at once, with no slide.
- **Sun Play:** the sun disc, the barcode marker and the clock advance together, and the barcode marker moves stem by stem rather than smoothly.

**Implementation:** use CSS keyframes for mount and idle loops, and `requestAnimationFrame` only for count-up numbers and the sun travel. Do not add an animation library. Use `transform-box: fill-box` on SVG groups that scale from their own origin.

---

## 9. 3D scene adjustments (small, optional but recommended)

The scene should match the chrome. Make these changes only in `src/scene/*` constants, then point the `--scene-*` tokens at them (or delete the tokens) so there is one source of truth.

### 9.1 Palette

| Element | Value |
|---|---|
| Ground / viewport clear colour | `#F3F3F1` (= `--surface-viewport`) |
| Grid lines | remove, or `#E4E4E0` at 50% |
| Parcel | outline 0.8 px `#141414`, dashed `4 5`; fill `#FAFAF8` |
| Setback | outline 1 px `#C98A16`, dashed `3 6` (animated, §8.2) |
| Context buildings | faces `#F3F3F1` / `#FAFAF8` (top), edges `#BDBDB8` at 0.7 px |
| Proposal masses (unselected) | top `#FAFAF8`, sides `#EDEDEA` / `#E2E2DE`, edges `#141414` at 0.8 px; floor lines ink at 18% |
| Proposal mass (selected) | top `#4C62E0`, sides `#1F3BD6` / `#172DA8`, floor lines white at 22%, no edges |
| Shadows | ink at 4.5% opacity |

### 9.2 Rendering notes
- Keep the light and airy grade from M3, but drop any warm tint toward neutral.
- Edges are the main visual language; rely on outlines rather than heavy shading.

### 9.3 Tokens
- Define `--scene-ground`, `--scene-parcel`, `--scene-setback`, `--scene-context-*`, `--scene-proposal-*` and `--scene-selected-*` with the values in §9.1.
- Read them in the scene through a single `sceneTheme.ts` that parses the CSS variables once at mount, **or** delete them and keep the TS constants as the only source. Pick one and record it in the contract §8.

**Tests:** `ConstraintLayer.test.tsx` asserts colours and opacity, so update it to the new setback and parcel values.

---

## 10. File-by-file change list

| Area | Files | Change |
|---|---|---|
| Contract | `docs/design/design-contract.md` §2–§5, §7, §8, §12 | rewrite from this spec **first** |
| Tokens | `src/styles/tokens.css` | §2, §3.1, §4 tokens |
| Tailwind map | `src/styles/global.css` (+ config if v3) | colour, type-scale and radius utilities |
| Fonts | `package.json`, font imports | add Geist and Geist Mono; remove Inter and Newsreader; ADR |
| Primitives | `src/ui/Button`, `IconButton`, `Icon`, new `Tabs`, `Card`, `Metric`, `CheckRow`, `Legend` | §5, §6 |
| Top bar | `StudioTopBar` | §7.2 |
| Rail | `ToolRail` | §5.4, §7.3 |
| HUD | `CameraHud`, `CameraPresets` | §7.3 grid; text segments; compass; scale; night label |
| Inspector | `Inspector`, `MetricsPanel`, `MassList`, `MassFields` | §7.1 container decision; §7.4 drawer; §7.8 metrics |
| Sun | `SunPanel` | §7.5; barcode slider §7.7.2 |
| Constraints | `ConstraintsPanel` | §7.6 |
| New tiles | `GrossAreaTile`, `SunTile`, `SunPathTile`, `HeightTile`, `ChecksTile`, `CoverageGauge` | §7.7, §7.8: presentational, read existing selectors |
| Motion | `src/styles/motion.css` (new) + small hooks `useCountUp`, `useMountOnce` | §8 |
| Scene | `src/scene/*` constants, optional `sceneTheme.ts` | §9 |
| Error / fallback | `SceneErrorBoundary`, `AppErrorBoundary`, `NotFoundPage` | restyle with Card, labels and text buttons; same copy |
| Landing / About | `LandingPage`, `SiteCard`, `AboutPage`, `SiteStudyGraphic` | **M5**: re-tint the illustration to ink, greys and accent, and apply the type scale |
| Tests | `ConstraintLayer.test.tsx`, any style assertions; e2e unchanged (role/label selectors) | update the expectations |
| Evidence | `docs/screenshots/*` | `npm run capture` after round 3 |

**Unaffected:** `src/features/**` (the analysis core), data and site packages, the importer, the domain tests, and the e2e tests that select by role or label. The new tiles must not add new analysis. If a tile needs a value the app doesn't compute, it shows "Not available" and the gap is logged as a backlog item.

---

## 11. Accessibility & quality gates

### 11.1 Requirements
- **Text:** ≥ 11 px everywhere, and contrast ≥ 4.5:1 for anything below 24 px (see the table).
- **Targets:** ≥ 44 × 44 px for the rail, HUD and play controls (keep the visual size small and expand the hit area). Inspector controls are ≥ 36 px.
- **Keyboard:** every control is reachable and visibly focused (2 px `--focus` outline, 2 px offset). The barcode slider follows §7.7.2.
- **Graphics:** every infographic has `role="img"` and a dynamic `aria-label` that states the same numbers as the visual. Decorative SVG gets `aria-hidden`.
- **Live regions:** time changes during playback announce at most every 5 s (`aria-live="polite"`). The night label and the boundary toast are `role="status"` with accessible names.
- **Colour is never the only signal:**
  - warnings carry the triangle icon;
  - the selected mass carries the label and the leader;
  - gauge states differ in fill **and** ring;
  - sun paths differ in dash pattern **and** colour.
- **Reduced motion:** honoured (§8).

### 11.2 Contrast table (measured)

| Pair | Ratio | AA small |
|---|---:|---|
| `--ink-primary` #141414 on `--surface` #F3F3F1 | 16.58 | ✅ |
| `--ink-secondary` #646461 on `--surface` | 5.34 | ✅ |
| `--ink-secondary` on `--bg-app` #E8E8E5 | 4.84 | ✅ |
| `--accent` #1F3BD6 on `--surface` | 7.12 | ✅ |
| white on `--accent` (gauge labels) | 7.91 | ✅ |
| `--warning-ink` #8A5A00 on `--surface` | 5.33 | ✅ |
| `--ink-on-inverse-2` #9A9A96 on `--surface-inverse` | 6.52 | ✅ |
| `--warning` #C98A16 on `--surface` | 2.65 | ❌ never as text; lines and icons only |
| sun colours on `--surface` | 1.41–3.22 | ❌ never as text; marks only |

### 11.3 Acceptance checklist (visual gate for M5)
- [ ] The ground, cards and HUD match `terraform-live-sun.html` side by side at 1680 × 1050 (within 2 px of layout, exact colours).
- [ ] No shadows, gradients (other than the stripe and barcode patterns) or ad-hoc radii.
- [ ] Only Geist and Geist Mono load; they work offline.
- [ ] `rg "text-\[|tracking-\[|shadow-|rounded-\[" src` returns nothing in the studio.
- [ ] Blue appears only on: the selected mass, the selected list row marker, the scenario square, used gauge pills, the selected stripe and floor column, the selected label and leader, and the focus ring.
- [ ] Sun colours appear only in the sun tile, the sun-path tile, the Sun tab and sun icons.
- [ ] Amber appears only on: the setback line, the limit pill and tick, warning icons, warning bars and tracks, and `--warning-ink` text.
- [ ] Every number shown in a tile matches the store (unit-tested selectors). No hard-coded demo values remain.
- [ ] The tiles show "Not available" correctly for a site without a height limit or without checks.
- [ ] Keyboard: Tab order is top bar → rail → viewport HUD → panel 02 → tiles left to right → drawer. The barcode slider operates by keyboard.
- [ ] Reduced motion: no looping animation, and the sun jumps to the current time.
- [ ] The layout works at 1680, 1440, 1280, 1024, 768 and 390 px widths with no horizontal scroll.
- [ ] The screenshots are recaptured and the `ConstraintLayer.test.tsx` expectations are updated.

---

## 12. Answers to the report's §8 questions (for the record)

| # | Question | Decision |
|---|---|---|
| 1 | Palette | Cooler and whiter (`#E8E8E5` ground, `#F3F3F1` surface), one blue accent `#1F3BD6`, plus a warm sun data palette |
| 2 | Fonts | Geist + Geist Mono; drop Inter and Newsreader |
| 3 | Type scale | 10 tokens (§3.2); 7 core steps plus 3 figure sizes; smallest 11 px; tracking −0.04em / +0.08em |
| 4 | Density | Calm: big figures, generous whitespace; the detail moves into the drawer |
| 5 | Inspector structure | Overview grid plus a detail drawer (preferred); the inspector-column fallback is specified (§7.1) |
| 6 | Layers | A rail button opens the drawer at the Layers group; the legend moves there on mobile |
| 7 | HUD | Section label TL, rail L, compass TR, scale BL, legend BC, views BR: all text and line, no chips |
| 8 | Status colours | Amber for lines and icons only, darker ink for text; green for the pass track only; red for over-limit |
| 9 | Landing page | Deferred to M5, using this system |
| 10 | 3D scene | Small palette changes (§9): white masses with ink edges, a blue selected mass, an animated amber setback |

---

## 13. Reference files

- `terraform-live-sun.html`: the **approved** live prototype, with the warm sun palette and all animations. Open it in any browser; it is the visual source of truth for this spec.
- `terraform-live-sun-hero.png`: the static hero at 1680 × 1050 (2×).
- `terraform-live-animations.mp4`: a recording of the motion (blue-sun version; the timings are identical).
- `sun-compare.png`: the blue and warm sun tiles side by side; warm is approved.

The demo numbers in the prototype (block sizes, the 35 % limit, the 25 m limit, BRA = 0.85 × BTA, the two warnings) are **illustrative only**. The implementation must read every value from the app's stores.
