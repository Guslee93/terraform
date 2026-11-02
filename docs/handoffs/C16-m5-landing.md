# C16 — M5 landing, About, site cards and error pages (Codex work order)

Role: implementer (frontend). Project: Terraform v1, milestone **M5**. Work in `/Users/gustavekamanzi/Downloads/2026/Terraform-m5landing` (branch `m5/landing`, from `main`). Don't work in the main checkout.

**Read first:** `AGENTS.md` (claim policy, accessibility, no scope drift); `docs/plans/M5-plan.md` (item C16; PNG export was dropped, ADR-0012); `docs/design/design-contract.md` §0 (**current** rules; the studio already follows them) and §9–§11; `docs/design/ui-redesign-spec.md` §3 type scale and §10 (the landing/About file list); `docs/design/ux-assessment/06-proposed-dashboard-v4.png` and `07-built-draft4-1440.png` (the look to match); then the current files below.

## Goal

The landing, About and error pages still use the pre-redesign look (warm backgrounds, serif-era layout, old type classes). Restyle them to the same system as the studio so the whole product reads as one thing: flat cool grey ground and panels, hairlines, no shadows, Geist for text and Geist Mono for figures and units, one blue accent used only for "selected", small colour marks only where they carry meaning. Calm and editorial; large light numbers and headings; lots of space. **No new features, no new copy claims.**

## Scope

You may edit only:
- `src/app/LandingPage.tsx`, `AboutPage.tsx`, `NotFoundPage.tsx`, `AppErrorBoundary.tsx`, `App.tsx` (loading fallback only), `StudioPage.tsx` (its loading/missing-site view only)
- `src/components/marketing/**` (`SiteCard`, `SiteChrome`, `SiteStudyGraphic`)
- their tests (add or update), and `src/components/ui/**` only if a shared control needs a small change.

**HARD RULE:** if anything needs another file (`src/components/studio/**`, `src/features/**`, `src/scene/**`, styles/tokens, `e2e/**`, `package.json`), **stop that item and report it**. Don't edit those files.

## What to do

1. **Landing page.**
   - **Hero:** headline and one-line description in the v2 type scale (`text-figure-l` or smaller as space allows; light weight, tight tracking). One primary action ("Open the studio" style link) as the solid ink button, one text link. Keep the existing h1 text (`/explore a site/i` must still match) and the link names.
   - **Site cards:** two flat cards with the study graphic, the site name (`h3`, same text as today), morphology line, and the real numbers the catalogue already provides (buildings, terrain relief if present). Hover = `surface-hover`, 200 ms. The primary link keeps its accessible name `Open <site> in the studio`.
   - **Layout:** max width about 1200 px, 28 px side padding (16 under 640 px), sections separated by hairlines, not boxes. Works at 1440, 1280, 1920, 1024, 768 and 390 px with no horizontal scroll.
2. **About page.** Same system: `h1`, section headings as `text-title`, body at `text-body`, comfortable line length (≤ 68 ch). Keep every existing sentence, link, disclosure and data-source section (`#data` anchor must still work). Technical-stack and limitation lists become hairline-separated rows, not cards.
3. **Site chrome (`SiteChrome`).** Header: wordmark (the diamond + "Terraform", as in the studio top bar), two text links, one text button. No borders around controls, no shadows. Footer: one line of disclaimers and data credits.
4. **`SiteStudyGraphic`.** Re-tint to ink, greys and the single accent; no other hues. It is decorative: `aria-hidden`.
5. **Error and not-found pages, loading fallback, missing-site view.** Same system; keep all copy; each has one clear action (go home / try again).

## Rules

- **Tokens and classes only.** Use the existing Tailwind utilities from `src/styles/global.css` (`bg-app`, `bg-surface`, `text-ink`, `text-ink-secondary`, `border-line`, `rounded-card`, `text-figure-l`, `text-title`, `text-body`, `text-body-sm`, `text-caption`, `text-label` where a mono label is warranted). **No** `text-[`, `tracking-[`, `shadow-`, `rounded-[` classes and no hex values in components (`SiteStudyGraphic` may keep colour values as local constants with a comment, as it does today).
- **Claim policy (AGENTS.md §7):** use "Curated Oslo demo · simplified context", "Illustrative design constraints", "Local ENU metres", "Geometric sun direction". Never "planning compliant", "verified daylight", "official parcel", "BIM-ready", "IFC". Don't add statistics or claims that aren't derived from the catalogue or already on the page.
- **Accessibility:** one `h1` per page, logical heading order, landmarks (`header`, `main`, `footer`), visible focus (the global ring), ≥ 44 px hit area for the main links, contrast from the tokens only, `prefers-reduced-motion` respected for any transition (the global rule already handles most).
- **Don't break the existing tests.** `e2e/smoke.spec.ts` expects: an `h1` matching `/explore a site/i`; a heading named `Compact Infill`; a link named `/open compact infill in the studio/i`. `e2e/m3-disclaimers.spec.ts` sweeps the landing and About pages for forbidden claims. Keep component tests green and add tests for anything new (e.g. the cards' accessible names, one `h1`).
- **No browser, Playwright or computer use.** Verify with `npm run lint`, `npm run test`, `npm run build`. Claude runs the browser checks and screenshots in review.
- **Git:** your sandbox can't write the worktree's git lock, so **do not try to commit**. Leave the changes uncommitted and list in your summary what belongs to each numbered item above; Claude commits them.
- Add one row to `docs/agent-log.md` ("Pending Claude review").

## Done when

`npm run lint`, `npm run test` and `npm run build` pass; every item above is done or explicitly reported as stopped (with the reason); a short summary lists files changed, tests added and the exact commands with their results.
