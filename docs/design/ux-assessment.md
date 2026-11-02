# Studio v2 — UX assessment before round 3

- **Date:** 2026-11-02
- **Scope:** the studio after round 2 (`e724aed`), judged against the product goal: a first-time visitor understands a site, sketches a building and sees its impact in about three minutes (PRD 3-minute workflow, AGENTS.md "protect the demo").
- **Images:** [`01-current-annotated.png`](ux-assessment/01-current-annotated.png) · [`02-proposed-dashboard.png`](ux-assessment/02-proposed-dashboard.png) · [`03-current-first-view-1440x900.png`](ux-assessment/03-current-first-view-1440x900.png) · [`04-proposed-dashboard-v2.png`](ux-assessment/04-proposed-dashboard-v2.png) · [`05-proposed-dashboard-v3.png`](ux-assessment/05-proposed-dashboard-v3.png) · [`06-proposed-dashboard-v4.png`](ux-assessment/06-proposed-dashboard-v4.png)
- **Status:** recommendation for the owner. Nothing here is implemented.

## Verdict

The visual language works: the cool grey palette, Geist type, hairlines, the sun barcode and the clean 3D scene all read as one product. The structure is the problem. Round 2 built a **report** (seven equal cards, each answering one question), but Terraform is an **editor**. A user's loop is *draw → adjust → see what's wrong → fix*, and the layout spreads that loop across the screen, buries the "what's wrong" part and gives the most space to the least useful number.

## Findings (numbers match image 01)

| # | Finding | Why it matters | Severity |
|---|---|---|---|
| 1 | The coverage gauge is the largest element, but the packages have no coverage limit, so it shows a small number on a 0–50 scale with nothing to aim for. | The biggest thing on screen should answer the user's biggest question ("is my design OK?"). | High |
| 2 | Checks are bottom-right and below the fold at 1440×900 (image 03). | The page now scrolls; the actionable result is the last thing a user sees. | High |
| 3 | Two heights side by side: 22.3 m (above site origin) in the metric row, 22.4 m (above grade) in tile 06 and the label. | Two numbers for one idea erode trust in all numbers. | High |
| 4 | The primary action, Draw, is an unlabelled icon that reads as a house. The rail has no labels. | First-time users don't know how to start; the empty state is a giant "0.0" and five dashes. | High |
| 5 | The warning toast covers the panel label and part of the scene. | Status competes with content. | Low |
| 6 | Two of five tiles are about the sun even while modelling; the sun-path diagram needs expert reading. | Space goes to context instead of the task. | Medium |
| 7 | Colour coding disagrees: mass B is blue in the charts but amber in the scene; A is black in charts, pale blue in the scene. | Breaks the contract's own rule "blue = selected". | Medium |
| 8 | Mono uppercase labels and 01–07 codes everywhere. | Editorial flavour, slower to read; codes mean nothing to a user. | Medium |
| 9 | Leader labels sit on busy geometry and overlap buildings. | Hard to read; no plain background. | Low |
| 10 | Tabs swap only panel 02, and the drawer covers that same panel while editing. | Weak mapping between tabs and what changes; results hidden at the moment of editing. | High |
| 11 | "Concept A" looks like a menu but does nothing. | Inert-looking control (AGENTS.md: no inert main-path controls). | Low |

## What the proposed layout changes (image 02)

1. **Editor layout, one screen, no scroll at 1440×900.** Canvas ≈ 68 % width (PRD "canvas first"), one right panel (452 px). Matches how Hektar/Forma-style tools are read: model left, consequences right.
2. **Right panel is ordered by the user's questions:** *Is it OK?* → *How big is it?* → *Edit the selected building* → *More (sun path, site data)*.
3. **"Design check" leads.** A plain-language verdict ("3 issues to review — all on Mass 2") with one row per issue, written as a sentence with its number ("4.4 m over the 18 m height limit"), each with **Show →** to select and frame the mass. Passing checks collapse to one line.
4. **Key figures with context, one height.** Floor area, footprint (with % of site as a small bar, not a hero gauge), tallest building **against its limit** (the only figure that has one), volume. Every height uses the envelope reference (grade/datum), so the scene label, figures and checks agree.
5. **Editing happens inline, not in an overlay.** The building list is the selection; the selected row expands into Floors (stepper), Floor height, Use and actions. Results stay visible while editing.
6. **Labelled toolbar** on the canvas: Select · **Draw building** (primary, ink) · Undo · Redo · Layers. Views use words (3D · Plan · From south · Street).
7. **Sun is a property of the view**, docked at the bottom of the canvas: clock, date presets, the barcode slider (kept, it's the best idea in round 2) and Play. The sun-path diagram moves to a collapsible row.
8. **Colour has one meaning each:** blue only for the selection (list row, outline), amber only for issues (scene tint, label, rows), green only for "passes".
9. **Plain labels:** sentence case section titles, no 01–07 codes, mono only for numbers.
10. **Scene labels** get a solid chip background, show only name + floors + height, and carry the warning state.

One item in the mockup is new behaviour, not just layout: the hint "5 floors would bring Mass 2 under the height limit". It's simple arithmetic from storeys × storey height against the limit, but it would need its own small, tested function and a decision that it stays within the claim policy. Treat it as optional.

## Empty state (not drawn)

Replace the "0.0" gauge and dashes with a three-step prompt in the right panel: **1 Draw a building** (button) · **2 Set floors** · **3 Check it against the demo limits**, plus a one-line description of the site. Figures and checks appear after the first building.

## What to keep from rounds 1–2

Tokens, Geist/Geist Mono, hairlines, the icon set, `Card`/`CheckRow`/`Metric` primitives, `summarizeChecks`, the day barcode slider, the sun-path diagram (in a collapsible), the drawer's group content, and every test-backed number. The change is mostly layout and wording, not new components.

## Effect on round 3

Round 3 (motion + scene palette) assumes the round-2 grid: mount animations for seven cards, count-up gauge pills, stripe columns. If the layout changes, most of that motion table no longer applies. **Decide the layout first.** Options:

- **A — Adopt the editor layout** (recommended): a "round 2b" restructure (shell, right panel, canvas toolbar, sun strip), then a smaller round 3 (scene palette, a few transitions).
- **B — Keep the grid**, fix the high-severity items in place: one height reference, checks moved into panel 02 on Model, labelled toolbar, empty-state prompt, drawer that doesn't cover results, consistent colours. Then round 3 as specified.
- **C — Keep as is** and run round 3.

The spec and design contract would need an update for A or B (contract §5 layout, spec §7).

## Draft 2 (owner feedback, 2026-11-02)

The owner agreed with the findings and chose option A, with three visual changes: keep the spec's typography, more minimal spacing, and translucent panels. Image 04:

- **Type back to spec §3:** light Geist for the large verdict figure, Geist Mono 300 for figures, 10.5–11 px Geist Mono uppercase labels, Geist 400 for body. No weights above 500.
- **Full-bleed scene** behind everything; every control floats on it.
- **Translucent glass panels:** `rgba(246,246,244,.52)` with a 16 px backdrop blur and a 1 px white edge; no shadows. This reverses contract §1 "no glassmorphism" and the spec's "no backgrounds on HUD items", so both need updating when this lands.
- **Fewer lines and fills:** issue rows are hairline-separated text (no amber fills), tracks are 2 px, the selected building is a 2 px blue edge instead of a filled row.
- **Islands:** identity (top-left), tools (below it), views + Fit site (top, beside the panel), sun strip (bottom), legend pill (above the sun strip), one right panel (scenario, design check, key figures, buildings + inline editor, collapsed rows, attribution).

## Draft 3: why draft 2 looked "vibe-coded" (2026-11-02)

The owner felt draft 2 still looked generated. Compared with the reference folder (`References images UX UI/`: Polestar sustainability report, Setio, a mono data-viz set, a Garmin-style grey dashboard, a carbon map tool, an analogue compass), the causes were:

| Draft 2 did | The references do |
|---|---|
| Five accents at once: amber, blue, green, sun orange gradient, blue/amber scene tints, coloured dashed lines | Near-monochrome; **one** colour used **once**, as a solid block (Polestar's blue bar, Garmin's blue card) |
| Frosted glass, pill shapes, white edges, floating islands | Flat panels, one radius, strict grid divided by hairlines |
| An icon or glyph on almost everything (⚠ ✓ → ⓘ, icon buttons) | Few or no icons; status by text, shape and position |
| Uppercase tracked mono labels everywhere | Small, quiet sentence-case labels; mono kept for numbers |
| Many mid-sized texts at similar weight | Strong scale contrast: very large light numbers, tiny labels, empty space |
| A colourful scene (blue mass, amber mass, green park, blue/amber lines) | The model as a monochrome object with one highlighted subject |

Draft 3 (image 05) applies that:

- **Monochrome UI and scene.** The only colour is the accent blue, used for the selected building (in the scene and as the solid editor block) and the current-time marker. Amber is gone: issues are black squares, passes are empty squares, each with its sentence and value.
- **Flat, gridded panels.** Two flat surfaces (canvas, right column) on a grey ground, 10 px radius, hairline grid for the figures. No blur, no shadows, no pills.
- **Text controls.** The toolbar and views are words with an underline for the active one; one solid black "Draw building" button.
- **Scale contrast.** The "3/4" checks figure and the clock are large and light; labels are 11 px grey sentence case.
- **Sun band.** A flat band at the bottom of the canvas with a monochrome barcode (black day stems, grey night, blue now).

Implementation impact: the scene needs the monochrome palette (spec §9 already proposed white masses with ink edges; this goes further: grey park and trees, ink boundary and setback lines, blue only for the selection), and the contract's colour rules (§2) change from "amber = attention" to "shape + text = attention".

## Draft 4: colour back, used sparingly (2026-11-02)

Owner feedback on draft 3: no longer generated-looking, but bland; bring colour back to the 3D scene (softened) and add small touches in the panel. Image 06 (source HTML beside it):

- **Scene:** the existing scene palette, desaturated to about 60 % (`saturate(.6)`), so the park, trees, water, boundary and setback lines read but stay quiet. The selected building stays solid accent blue.
- **Colour roles, each used in small marks only:**
  - **Blue:** the selection (scene mass, its label, the editor block), the "now" marker in the sun band, the footprint bar.
  - **Amber:** attention (issue squares, over-limit values, the part of the height bar above the limit, the dot on Mass 2's label).
  - **Green:** passes (the pass square and "Pass", Mass 1's dot).
  - **Sun orange:** only the sun (the dot on the sun label, warm day stems in the barcode).
- **Unchanged from draft 3:** flat panels, hairline grid, text controls, big light figures, one solid block (the selected building).

Scene implementation: keep the current scene colours and lower their saturation in the constants (one place, `src/scene/*`), rather than the CSS filter used in the mockup.
