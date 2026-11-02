# M5 — Portfolio polish and presentation: plan and delegation

**Status:** Draft for owner approval, 2026-11-02 · **Brief:** `docs/milestones/M5-polish.md` · **Gate:** PRD §13 (complete 3-minute workflow in a production build), design contract §0 and §12 · **Starts after:** the M4 gate (`docs/reviews/M4-code-review.md`) and the keyboard follow-ups in `docs/reviews/studio-v2-code-review.md`.

**Scope change:** PNG export is out of v1 (ADR-0012).

**Principle:** M5 is a feature freeze. Everything here makes existing features trustworthy, presentable and deployable. Anything that looks like a new feature (site import, GLB, heatmaps) is M6 and stays out.

## 1. Where M5 starts

| Deliverable | State today |
|---|---|
| 1 PNG export | **Dropped by the owner (ADR-0012).** |
| 2 Landing and onboarding | Landing, About and site cards still use the pre-v2 look (spec §10 marks them M5). No coach marks. "Reset demo" exists in the scenario menu. |
| 3 States | Loading, WebGL fallback, corrupt and quota states exist (M3, M4). Missing: a skeleton for the studio, missing-asset state, invalid-polygon message review, export-complete state. |
| 4 Responsive | Studio stacks below 1024 px; below 640 px it is read-only. Needs a pass at 1024, 768 and 390 px with the new layout. |
| 5 Accessibility | Keyboard e2e and contrast checks exist for the studio; no audit of landing/About, no canvas instructions review, no recorded checklist. |
| 6 Performance | `scripts/measure-fps.mjs` exists (60 fps @1×, ~46 fps @2× on an M1 Pro, scene-look round). Studio chunk is 346 kB raw / 110 kB gzip after M4. No bundle budget or recorded baseline for the new layout. |
| 7 Deployment | Nothing. Needs a host decision. |
| 8–9 Case study, demo script | Nothing. |

## 2. Who does what

| Agent | Items |
|---|---|
| **Claude (this session)** | **P1** the visual punch list against contract §0 at the gate viewports · integration, reviews, final M5 gate record |
| **Codex** (in this order) | **C16** landing, About and site cards restyled to the v2 system (spec §10 file list; type scale and tokens only, no new components beyond need) · **C17** states pass (studio loading skeleton, missing asset, invalid-polygon copy, error pages) · **C18** onboarding coach marks (3 steps, skippable, dismissed once via `localStorage`, reduced-motion safe) · **C19** responsive pass at 1024, 768 and 390 px with the editor layout (no horizontal scroll, read-only phone view coherent, menu and Compare usable on a tablet) |
| **DeepSeek** | **D38** full 3-minute workflow e2e (land → choose site → orbit → draw → sun → duplicate → compare → reload) on the production build (`vite preview`) · **D39** performance baseline: fps at 1440×900 and 1920×1080, bundle report, Lighthouse-style timings, recorded in `docs/reviews/M5-perf.md` · **D40** accessibility checklist run (keyboard, labels, contrast computed from tokens, reduced motion) recorded in `docs/reviews/M5-a11y.md` · **D41** final screenshots at the gate viewports |
| **Claude subagents** | `design-persona-walkthrough` and `design-ux-researcher` first-time-visitor walkthrough once the UI is stable · `engineering-section-508-specialist` one-time audit · final code review |
| **Owner** | Deployment host, case-study authorship/voice, the live recording |

## 3. Phases

```text
Phase 0  Claude: E1 export contract, P1 punch list        DeepSeek: D39 baseline on current main (before polish, so we can see the change)
Phase 1  Codex: C16 → C17 → C18 → C19 (one branch, review between items)
Phase 2  DeepSeek: D38, D40, D41   Claude subagents: walkthrough + a11y audit
Phase 3  Deployment (owner picks host) → case study + demo script → final review → M5 gate
```

## 4. Decisions needed from the owner (before Phase 1)

1. **Host.** Static HTTPS, no telemetry: Cloudflare Pages, Netlify, Vercel or GitHub Pages. Any works; the choice sets the build and redirect config (SPA fallback for `/studio/:siteId`). Default recommendation: Cloudflare Pages or Netlify (free, SPA fallback is one line).
2. **Domain.** Use the host's default URL, or a custom domain?
3. **Case study.** Who writes the voice: you, or a draft from `technical-writer` and `visual-storyteller` for you to edit?
4. ~~PNG export~~ — **dropped by the owner, 2026-11-02 (ADR-0012).** The acceptance workflow and the demo script lose their export step.

## 5. Definition of done (M5 gate)

- The full workflow runs on the production build without intervention (D38), with no console errors.
- No inactive main-path control; every button and number works.
- Visual gate at 1440×900, 1280×800, 1920×1080 and 390×844 against contract §0; mobile read-only is coherent.
- Perf baseline, bundle report and the accessibility checklist are recorded, with known limitations stated (3D editing isn't fully keyboard-equivalent).
- Live URL, case study and demo script ready.
- Feature freeze respected: the diff contains no new analysis or product features.
