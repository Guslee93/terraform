# M0 code review

- **Date:** 2026-10-27
- **Reviewer:** `agency-code-reviewer`
- **Scope:** working tree diff from `ae11d3f` (M0 UX/UI fixes)
- **Commands:** `npm run typecheck` pass · `npm run lint` pass · `npm run test` 17/17 pass · `npm run build` pass · `npm run test:e2e` 1/1 pass
- **Review type:** review only; the blocker and test gap below were fixed before sign-off

## Summary

The patch correctly removes the fabricated scenario selector, condenses the M0 chrome, hardens the drawer, and replaces developer-facing milestone copy. TypeScript remains strict with no `any` or unchecked assertions in application code. The most serious issue found was an invisible interaction bug: the full-screen empty-state overlay swallowed pointer events, so the 3D camera could not be orbited. That is fixed.

## Findings

| # | Severity | File / line | Issue | Recommendation | Status |
|---|---|---|---|---|---|
| 1 | 🔴 Blocker | `StudioShell.tsx` empty-state wrapper | `absolute inset-0` overlay intercepted pointer events across the entire canvas, disabling OrbitControls. | Add `pointer-events-none` to the overlay and keep `pointer-events-auto` on the card. | **Fixed** |
| 2 | 🟡 Major | `Inspector.tsx` | New drawer focus/inert logic had no tests. | Add component tests for closed render, focus entry and focus restoration. | **Fixed** — 3 tests in `Inspector.test.tsx` |
| 3 | 🟡 Minor | `Inspector.tsx` backdrop | Backdrop and close button shared the accessible name “Close inspector”, producing ambiguous queries and screen-reader output. | Rename the backdrop to “Dismiss inspector”. | **Fixed** |
| 4 | 🟡 Minor | `Inspector.tsx` | `aria-modal="true"` is set, but background regions are not `inert` to assistive technology; the focus trap only constrains keyboard traversal. | In M2, move the drawer to a portal/`<dialog>` or mark the top bar, rail and canvas `inert` while open. | Open follow-up |
| 5 | 🟡 Minor | `Inspector.tsx` focus effect | If the viewport grows past 1100 px while the drawer is open, cleanup restores focus to the toggle that is now hidden. | Guard restoration with `element.offsetParent !== null` or move focus to the inspector heading on desktop. | Open follow-up |
| 6 | 💭 Nit | `Inspector.tsx` `TABS` | Unavailable tabs and the `note` field remain in the data though they are filtered out. | Intentional staging for M3/M4; remove `note` if it stays unused after M3. | Accepted |
| 7 | 💭 Nit | `StudioTopBar.tsx` scenario chip | The static chip explains itself only through a `title` tooltip, which keyboard users cannot reach. | Add a visually hidden suffix or `aria-description` when the chip becomes interactive in M4. | Open follow-up |
| 8 | 💭 Nit | `StudioShell.tsx` `isDesktop` | Initial state reads `window.matchMedia` directly. Safe for this client-only Vite app, but not SSR-safe. | If SSR is ever introduced, initialise to `false` and resolve in an effect. | Accepted |

## Positive notes

- Removing the scenario `<select>` eliminates the only fabricated main-path interaction.
- The 1100 px drawer breakpoint now matches the design contract, and the inspector is genuinely removed from the DOM when closed.
- The compact warning treatment preserves the disclaimer while restoring inspector density.
- Token additions replace the stray hex values; reduced-motion transforms are gated correctly.
- No M1–M5 features or dependencies were added.

## Gate decision

**Pass with follow-ups.** Blocker 1 and major 2 are fixed; follow-ups 4–5 belong to M2/M5 hardening, not the M0 gate.
