# M0 UX architecture review

- **Date:** 2026-10-27
- **Reviewer:** `agency-ux-architect`
- **Scope:** layout architecture, CSS system, responsive behaviour, inspector density, overlay hierarchy, keyboard/focus structure
- **Evidence:** `docs/screenshots/m0-landing-{1440x900,1280x800,1920x1080,390x844}.png`, `docs/screenshots/m0-studio-{1440x900,1280x800,1920x1080,390x844}.png`
- **Review type:** read-only; no code changed

## Findings

| # | Severity | File / area | Issue | Recommendation |
|---|---|---|---|---|
| 1 | **Blocker** | `src/components/studio/StudioTopBar.tsx` | The `Concept A / Concept B` select looks like a working scenario switcher but only changes a label. This is fabricated state and violates the “no inert main-path controls” guardrail. | Make it a static `Concept A` chip until M4, or wire it to a real document store. Do not ship a select that implies saved concepts. |
| 2 | **Blocker** | `src/components/studio/Inspector.tsx` | On screens below 1024 px the inspector is translated off-screen but remains in the tab order. Keyboard users can tab into invisible controls. | Conditionally render, or apply `inert` / `aria-hidden` + `tabIndex={-1}` when closed. Add focus trap, focus-on-open, restore-on-close. |
| 3 | **Blocker** | `src/components/studio/ToolRail.tsx` | Seven tool buttons are rendered as a primary control surface while six are disabled placeholders. The rail reads as broken rather than intentionally staged. | For M0 show a single working Select tool plus a quiet “Tools unlock with the site model” note. Hide future tools until their milestone; do not present a wall of dead icons. |
| 4 | **Major** | Studio breakpoints (`lg` = 1024 px) | The design contract requires the inspector to become a drawer below 1100 px. At 1024–1099 px it is static, leaving a ~632 px canvas. | Replace `lg:` inspector variants with `min-[1100px]:` or add a custom `studio` breakpoint at 1100 px. |
| 5 | **Major** | Studio overlays | Five floating clusters compete at once: site pills, Oslo metadata, centred empty card, bottom hints, fit button, plus footer. | Show at most two overlays in the empty state. Drop the Oslo metadata card and bottom hints until a site package exists. Keep one site-identity pill and one empty-state card. |
| 6 | **Major** | `StudioShell.tsx` empty state | “Inspect the site notes” is inert on desktop because the inspector is already visible. | Remove on desktop; on mobile it may open the drawer. Or scroll/focus the Site package section. |
| 7 | **Major** | User-facing copy | “Milestone M1”, “M2”, “M0 shell · site packages pending” and “available in M2” are developer language inside the product. | Replace with product language: “Site model not included in this preview”, “Analysis unlocks with a site model”. Keep milestone labels in docs and tooltips for developers only. |
| 8 | **Major** | `StudioTopBar.tsx`, `StudioShell.tsx` | Site identity is hidden below `md`, so the mobile studio shows only “Curated demo / Concept A”. | Surface the site name in the mobile top bar or the empty-state card. |
| 9 | **Major** | Navigation | On mobile, About is unreachable: header links are hidden at `sm` and the footer has no navigation. | Add About (and Sites) to the footer, or add a mobile menu. |
| 10 | **Major** | Disabled controls | Disabled Undo, Redo and Export use `title` only. Disabled buttons are not focusable, so keyboard users cannot discover why. | Hide them until functional, or use `aria-disabled="true"` on focusable buttons with an explanation. |
| 11 | **Minor** | Studio controls | Two “Fit site” controls (top bar and canvas) do the same thing. | Keep one; remove the canvas duplicate. |
| 12 | **Minor** | `src/components/**` | Hardcoded hex values (`#fbfbf8`, `#cdd2ca`, `#c8cec5`, `#2c332d`, `#f1f2ec`) bypass the token system. | Add `--surface-subtle`, `--border-strong`, `--ink-hover` tokens and use them. |
| 13 | **Minor** | Micro typography | Several labels are 8.5–9 px (footer, chips, kbd), below a comfortable floor at 1440/1920. | Raise functional labels to 10 px minimum; reserve 9 px for non-essential metadata only. |
| 14 | **Minor** | Reduced motion | `prefers-reduced-motion` removes transition duration but hover translates/scales still jump instantly. | Gate transforms behind `motion-safe:` or disable them in the reduced-motion block. |
| 15 | **Minor** | Landing hero decoration | The accent block behind the study card uses `-z-10` inside a `relative` figure and is effectively invisible. | Give the figure an isolated stacking context and put the decoration at `z-0`, card at `z-10`; or remove it. |
| 16 | **Minor** | Landing first viewport | At 1440×900 the site cards are still below the fold; only the section heading peeks. | Acceptable, but add a visible scroll cue or reduce hero block by another ~40 px so card tops appear. |
| 17 | **Nit** | Spacing | Mixed 0.5-step values (2.5, 3.5, 5.5) weaken vertical rhythm in the inspector. | Normalise to a 4 px base scale in the next pass. |

## Top five changes for the M0 visual gate

1. **Remove fabricated interaction** — static scenario chip; no fake selector (finding 1).
2. **Make the mobile inspector inaccessible when closed and trap focus when open** — correctness before polish (finding 2).
3. **Stage the M0 chrome honestly** — condense the tool rail, hide future tabs/Export, remove the duplicate Fit site, replace milestone copy (findings 3, 7, 10, 11).
4. **Fix responsive structure** — 1100 px inspector breakpoint, mobile site identity, mobile About access (findings 4, 8, 9).
5. **Reduce overlay competition and tokenise the leftovers** — two overlays maximum, no stray hex, 10 px micro-type floor (findings 5, 12, 13).

## Resolution (2026-10-27)

Blockers 1–3 and majors 4–10 were fixed before the M0 gate:

- Scenario selector replaced with a static `Concept A` chip.
- Drawer now unmounts when closed, traps focus when open, restores focus and uses `role="dialog"`/`aria-modal`.
- Tool rail reduced to the two working actions (Select, Site notes).
- Inspector breakpoint moved to 1100 px.
- Overlays reduced to one status pill, one empty-state card and a mobile-only Fit control.
- Milestone copy replaced with product-facing copy.
- Mobile site identity appears in the empty-state card; footer navigation and mobile disclaimer added.
- Disabled Undo/Redo/Export and placeholder Add/Draw controls removed.

The final visual decision is recorded in `M0-visual-gate.md` (**PASS with follow-ups**).
