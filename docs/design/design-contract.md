# Terraform — Design contract

- **Source:** PRD §7, §11, §12.3
- **Status:** Active for M0–M5
- **Reviewer:** `design-ui-finish-gate-reviewer`
- **Implementation:** `src/styles/tokens.css`, `src/styles/global.css`

This document is the written contract the visual gate reviews against. It is intentionally stricter than "make it look nice". Change it by ADR, not by ad-hoc component styling.

## 1. Principles

1. **Canvas first.** At least ~70% of working width belongs to the model when panels are closed.
2. **Architectural calm.** Quiet surfaces, precise linework, measured negative space, editorial typography.
3. **Data legibility.** Units, method and status are visible without turning the inspector into a spreadsheet.
4. **Quiet confidence.** No bouncy SaaS motion, no gradient soup, no glassmorphism for its own sake.
5. **Semantic colour only.** Amber warning, red error, subdued green valid, blue-grey selection. Never colour as decoration.
6. **One product, not a template.** Avoid generic dashboard cards, oversized rounded pills and interchangeable hero sections.

## 2. Tokens

| Token | Value | Use |
|---|---|---|
| `--bg-app` | `#F5F5F1` | Page background |
| `--surface` | `#FFFFFF` | Panels, cards, bars |
| `--surface-muted` | `#EFEFEA` | Hover, subtle fills |
| `--surface-viewport` | `#E8EBE7` | 3D background and thumbnail backdrop |
| `--ink-primary` | `#202521` | Primary text, primary button |
| `--ink-secondary` | `#69716C` | Secondary text, labels |
| `--border` | `#DDE1DA` | Hairlines, panel borders |
| `--accent` | `#355E79` | Selection, links, key figures |
| `--accent-soft` | `#E1EBF0` | Active tool, selected tab |
| `--positive` | `#477D65` | Valid / within envelope |
| `--warning` | `#B8822B` | Illustrative constraint, caution |
| `--danger` | `#B9584F` | Invalid geometry, destructive |
| `--focus` | `#245F93` | Focus ring |
| `--radius-card` | `12px` | Cards, panels, modals |
| `--radius-control` | `8px` | Buttons, inputs, tabs |

Rules: never introduce a new hex in a component; add a token first. Borders are 1 px. Shadows are soft and restrained (`--shadow-soft`), never neon.

## 3. Typography

| Role | Face | Size / weight |
|---|---|---|
| Wordmark | Inter | 12 px, 600, tracking 0.24em, uppercase |
| Hero | Newsreader | `clamp(2.9rem, 6.2vw, 4.6rem)`, 400, line-height 0.96 |

## 4. Layout

### Studio (desktop ≥1100 px)

- Top bar: **56 px**, surface background, 1 px bottom border.
- Tool rail: **56 px**, icon-only 40 px targets, 8 px radius.
- Inspector: **336 px**, 300–360 px allowed; collapsible.
- Bottom bar: **36 px**, status and disclaimers.
- Canvas: remaining width/height, never letterboxed by panels.
- Overlays: 12–16 px inset, max two floating cards at once.

### Responsive

- `<1100 px`: inspector becomes a right drawer with backdrop; canvas remains primary.
- `<768 px`: landing stacks; studio is explicitly read-only with a clear notice; no broken editing controls.
- Touch targets ≥40 px; no hover-only affordances.
- Test at 1440×900, 1280×800, 1920×1080 and 390×844.

## 5. Components

| Component | Contract |
|---|---|
| Primary button | `--ink-primary` fill, white text, 40 px min height; one per view region |
| Secondary button | Surface fill, 1 px border, ink text |
| Ghost button | Text only, muted → ink on hover |
| Icon button | 36–40 px square, 8 px radius, tooltip + `aria-label` |
| Segmented control | 6 px radius, active `--accent-soft`, no sliding pill theatre |
| Inspector card | 12 px radius, 1 px border, 16–20 px padding, clear title/subtitle |
| Numeric input | Suffix unit inside field, 2 dp display, explicit error text below |
| Tooltip | Dark ink background, 11 px text, 4 px radius, 120 ms delay max |
| Toast | Bottom-left, surface, 1 px border, semantic accent bar; max 2 stacked |
| Modal | Only for destructive confirmation, methodology or export options |
| Empty state | One sentence, one action, no illustration clutter |

## 6. States

- Hover: background shift or border darkening; no scale bounce over 1.02.
- Focus: 2 px `--focus` ring with 2 px offset, always visible.
- Active: `--accent-soft` fill + `--accent` text.
- Disabled: 35–50% opacity, cursor not allowed, tooltip explains the milestone — or remove from release UI.
- Loading: skeleton or quiet pulse, never an indefinite spinner.
- Error: specific cause + recovery action; preserve previously valid input.
- Empty: explain what will appear and the next action.

## 7. Motion

- Duration 120–200 ms for controls; 300 ms for panels; 700–1000 ms for site-entry camera.
- Easing `--ease-out` for entrances; linear or short easing for drag response.
- Never animate a control that must track a pointer.
- Respect `prefers-reduced-motion`: disable camera fly-ins, pulses and decorative transitions.
- Selected mass outline is 1–2 px equivalent; no flashing.

| Section title | Newsreader | `clamp(2rem, 4vw, 3rem)`, 400 |
| Panel title | Newsreader | 24–28 px, 400 |
| Body | Inter | 13.5–15 px, 400, line-height 1.6–1.8 |
| Control label | Inter | 12–13 px, 500 |
| Micro label | Inter | 9–10 px, 500, uppercase, tracking 0.12–0.22em |
| Numeric data | Inter | 11.5–13 px, 500, tabular numbers where available |


## 8. 3D scene palette

"White model" look — see `docs/design/scene-look-plan.md`. Separation comes from light, shadow and linework, not hue.

| Element | Colour |
|---|---|
| Background / fog | `#EEEDE9` (`--surface-viewport`) |
| Terrain | near-white `#F0EFEC` → `#E6E5E1` by elevation (≤ 4% tint); skirt `#D8D7D3` |
| Context buildings | single matte `#F3F2EE`, no per-use tints |
| Context edges | `#6F6E6A` at 0.3 opacity, creases > 30° only |
| Concept massing | pale accent `#C9DBE5` — the only tinted built object; warning/invalid stay semantic; storey bands + outline `#355E79` at 0.35 |
| Alternate mass | cool blue-grey `#E9EDF0` |
| Parcel boundary | `#355E79`, 2 px |
| Setbacks | `#B8822B`, dashed |
| Selection outline | dark blue-grey |
| Grid | `#B9C0B6`, sections `#9AA399`; shown only in Top view or while drawing |
| Contours | `#6F6E6A`, 1 m at 0.14, 5 m at 0.32; only when relief ≥ 2 m |
| Streets (OSM) | `#E2E1DD`, one value step darker than ground |
| Trees (OSM) | four canopy tints `#9BBA94` `#AFC9A3` `#8AAD86` `#C0D4B2` at 0.82 opacity, round or tall clustered canopy, size 0.75–1.35×, varied by position; trunk `#B8B2A6` |
| Green space (OSM park/grass/wood) | rendered ≈ `#CBDBC5`, painted into the terrain texture |
| Water (OSM) | rendered ≈ `#BCD6E6`, painted into the terrain texture |

Lighting: one directional sun (default SW, 35° elevation until M3 drives it), intensity 2.4; ambient 0.3; cool hemisphere fill (`#FFFFFF` / `#CDD0D4`, 1.6); `NeutralToneMapping`. Shadows: PCF, 4096 map fitted to the site (~0.1 m/texel). Ambient occlusion: N8AO, cool `#2B3138`, desktop widths only (ADR-0005). No fake PBR realism, no bloom, no vignette on the canvas.

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

- Sentence case for UI labels; uppercase only for micro labels.
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
- [ ] All tokens match §2; no stray hex values in components.
- [ ] Type scale matches §3; line lengths are controlled.
- [ ] Every interactive state (hover/focus/active/disabled/loading/error) is designed.
- [ ] Empty and error states are intentional, not browser default.
- [ ] No inactive main-path control at M5.
- [ ] Reduced motion and focus states verified.
- [ ] Screenshots at the three desktop viewports plus one mobile read-only view.
- [ ] The result looks like an architectural product, not a generic dashboard.

Avoid weights above 600. Italic is reserved for the hero accent and editorial moments, not UI labels.
