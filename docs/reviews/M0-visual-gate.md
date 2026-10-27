# M0 visual finish gate

- **Date:** 2026-10-27
- **Reviewer:** `agency-ui-finish-gate-reviewer`
- **Scope:** implemented M0 shell against `docs/design/design-contract.md`
- **Evidence:** `docs/screenshots/m0-{landing,studio}-{1440x900,1280x800,1920x1080,390x844}.png`
- **Prior reviews:** `M0-ux-review.md`, `M0-ui-review.md`, `M0-code-review.md`

## Decision: **PASS with follow-ups**

The shell reads as an architectural site-study product rather than a generic SaaS dashboard. The landing page has a distinct editorial voice, the studio is canvas-first, and the empty state is honest about the missing site model. No blocking visual issue remains for M0.

## Evidence

| Contract area | Observation | Result |
|---|---|---|
| Product legibility | First viewport names the product, the Oslo site study, and the primary action. Studio shows site name, canvas, tools and inspector. | Pass |
| Hierarchy | Landing: proposition → primary CTA → site selection → method. Studio: canvas dominant, inspector secondary, chrome quiet. | Pass |
| Canvas-first composition | At 1440 the canvas occupies ~70% of the working width; inspector is 336 px; rail is 56 px. | Pass |
| Hero composition | Three-line hero now holds at 1440 and 1920; no orphaned “impact.” | Pass |
| Token fidelity | Core surfaces, ink, accent, warning and borders use the token layer; remaining hex values are confined to SVG assets and intentional shadows. | Pass |
| Type scale | Newsreader display + Inter UI; micro labels raised to a 10 px functional floor; footer and chips legible. | Pass |
| Overlay density | Studio reduced to one status pill cluster and one empty-state card; duplicate Fit-site removed on desktop. | Pass |
| Empty state | “This preview does not include the site model.” explains the state without fake geometry or fabricated metrics. | Pass |
| Mobile read-only | 390×844 shows a `Read-only preview` pill and `Not planning advice` footer; no broken editing affordance. | Pass |
| Distinctiveness | Axonometric site-study illustration, paper palette, architectural linework; not a card-grid dashboard. | Pass |
| States | Drawer, WebGL fallback, route loading, 404, validation of unknown sites and reduced motion are implemented; focus-visible is global. | Pass |

## Keep

- The editorial serif hero and the restrained sage/blue-grey palette.
- The axonometric study illustration and plan-style site thumbnails.
- The explicit “not included in this preview” empty state.
- The 56 px top bar / 56 px rail / 336 px inspector rhythm.
- The compact warning note instead of a full warning card.

## Follow-ups (not blocking M0)

1. Capture hover and keyboard-focus states for the top bar, rail, buttons and inspector in the M5 evidence set.
2. Add a 1024×800 screenshot to prove the 1100 px drawer breakpoint visually.
3. Decide whether the desktop empty-state card needs an action; today it explains without one.
4. Move the drawer to a portal/`<dialog>` or inert the background for assistive technology in M2.
5. Replace the static `Concept A` chip with a real scenario control in M4.
6. Re-check the hero at 1280×800 after the M1 site imagery lands.

## PASS criteria verified

- [x] First-read object and primary action are visible.
- [x] No forbidden generic default remains without a product reason.
- [x] Named states and responsive checks are evidenced at four viewports.
- [x] No inactive main-path control remains in the M0 shell.
- [x] The product can be identified from the first viewport without explanatory copy.
