# M0 UI design review

- **Date:** 2026-10-27
- **Reviewer:** `agency-ui-designer`
- **Scope:** tokens, type scale, component states, visual language, spacing, motion, scene overlay palette
- **Evidence:** screenshots at four viewports; `src/styles/*`; `src/components/{ui,marketing,studio}/*`
- **Review type:** read-only; no code changed

## Findings

| # | Severity | File / area | Issue | Recommendation |
|---|---|---|---|---|
| 1 | **Major** | `src/app/LandingPage.tsx` hero | At the primary 1440×900 target the headline breaks into four lines and leaves “impact.” as an orphan. The intended three-line editorial rhythm only holds at 1920. | Widen the text column (`~1.12fr`), reduce the clamp maximum slightly, or remove the hard break before the third line and use balanced wrapping. Verify all three desktop widths. |
| 2 | **Major** | Studio canvas | The `gridHelper` colours (`#7E8C81`, `#8F9B8E`) are darker than the design-contract grid tokens and the grid now dominates the empty viewport. | Soften to `#A2AC9F` / `#B4BDB2` or add the contract grid tokens; keep the empty-state card as the focal point. |
| 3 | **Major** | `public/sites/*.svg` | Site-card thumbnails are washed out: context blocks, parcel and massing sit within ~1.1:1 contrast, so the cards read as empty placeholders at 1440. | Darken context blocks, strengthen the parcel stroke and lift the massing fill; keep the sage backdrop. |
| 4 | **Major** | Warning copy | `--warning` (#B8822B) on a 6% amber background is below 4.5:1 for 10 px text. | Use `--ink-primary` for the body, keep amber for the icon/rule, or add a darker `--warning-ink` token and verify contrast. |
| 5 | **Major** | Micro typography | Footer labels are 8.5 px; chips and kbd hints 9 px. At 1440/1920 they are decorative rather than readable. | Raise functional micro-copy to 10 px; reserve 9 px for non-essential metadata and never for status. |
| 6 | **Major** | Studio empty state | The selection card is ~300 px tall with no content, pushing “Planned assumptions” below the fold at 1280×800 and giving an empty state more weight than the site package. | Compress to two lines plus one action; let Site package be visible at 800 px height. |
| 7 | **Minor** | `src/app/LandingPage.tsx` | The decorative accent block behind the study card uses `-z-10` and is not visible. | Create an isolated stacking context (`isolate`) and place the card at `z-10`; or remove the decoration. |
| 8 | **Minor** | `src/components/marketing/SiteStudyGraphic.tsx` | The isometric faces are very close in value; edges blur, and the “CONCEPT A” label collides with a mass edge. | Add a subtle 0.75 px stroke to top faces or increase the side-face differential; move the label into clear space. |
| 9 | **Minor** | Buttons and cards | Hover transforms (`-translate-y-0.5`, `scale-[1.025]`) still apply when reduced motion is requested; only the duration is removed. | Gate transforms with `motion-safe:` and keep colour/border feedback for reduced motion. |
| 10 | **Minor** | `src/components/**` | Stray hex values (`#2c332d`, `#c8cec5`, `#cdd2ca`, `#fbfbf8`, `#f1f2ec`) bypass the token layer. | Add semantic tokens for surface-subtle, border-strong and ink-hover. |
| 11 | **Minor** | Studio footer | Three uppercase status items at 8.5 px are visually noisy and truncate on mobile. | Show site · scenario on the left and one disclaimer on the right; move the build status to the About page. |
| 12 | **Minor** | Tool-rail focus | The active tool state is a very pale accent fill; the disabled icons are almost invisible. The hierarchy reads as “everything off”. | Keep one active tool with a clearer 1 px accent border; hide future tools rather than dimming seven. |
| 13 | **Nit** | Inspector rows | Label/value rows use identical weight, so the eye has no anchor. | Keep labels muted 10 px and values 11.5 px medium; add 2 px more row padding. |
| 14 | **Nit** | Landing hero meta | “Sites / Access / Platform” reads like a spec sheet and competes with the primary CTA. | Keep, but reduce to two items or move below the card on desktop. |

## Top five UI changes

1. **Fix the 1440 hero composition** so the three-line hierarchy holds at the target viewport (finding 1).
2. **Raise micro-type to 10 px and fix warning contrast** — accessibility before polish (findings 4, 5).
3. **Strengthen illustration contrast** in site cards and the hero study so they read as designed artefacts, not placeholders (findings 3, 8).
4. **Let the viewport breathe** — soften the grid, compress the empty state, and reduce overlay competition (findings 2, 6, 12).
5. **Tokenise the remaining hex values and respect reduced motion** (findings 7, 9, 10).

## Resolution (2026-10-27)

Findings 1–6 were fixed before the M0 gate:

- Hero now holds three lines at 1440 and 1920 with no orphan.
- Studio grid softened to a quieter two-level line set.
- Site thumbnails and hero isometric faces gained contrast and edge definition.
- Warning copy uses the darker `--warning-ink` token.
- Functional micro-type floor raised to 10 px.
- Empty-state selection card compressed; Site package and Assumptions fit at 1280×800.
- Stray hex values replaced with semantic tokens; reduced-motion transforms gated.

Findings 7–14 remain documented follow-ups. The final decision is recorded in `M0-visual-gate.md` (**PASS with follow-ups**).
