# M5 — Portfolio polish and presentation

- **Status:** Pending
- **PRD gate:** Complete 3-minute workflow works cleanly without intervention in a production build (§13)
- **Lead agents:** `design-ui-designer` + `design-ux-architect`
- **Implementers:** `engineering-frontend-developer`, `engineering-senior-developer`
- **Reviewers:** `design-ui-finish-gate-reviewer`, `design-persona-walkthrough`, `design-ux-researcher`
- **Content/ops:** `design-visual-storyteller`, `engineering-technical-writer`, `engineering-devops-automator`, `engineering-sre`, `engineering-section-508-specialist`

## Goal

Turn the working tool into a credible portfolio product: polished states, export, onboarding, performance, accessibility, deployment and a case study that distinguishes shipped functionality from future work.

## Deliverables

1. **PNG export** — viewport scale and 2× where supported, hide gizmos/outlines, optional north arrow/title/date/legend, attribution in metadata, filename `terraform_<site>_<scenario>_<yyyymmdd>.png`.
2. **Landing and onboarding** — refined hero, site cards, 3-step coach marks (skippable, dismissed once), reset demo with confirmation.
3. **Complete states** — loading skeletons, empty, WebGL fallback, missing asset, corrupt storage, quota warning, invalid polygon, export complete.
4. **Responsive read-only experience** — <1100 px inspector drawer; mobile read-only presentation, no broken controls.
5. **Accessibility pass** — focus order, labels, contrast, reduced motion, canvas instructions, numeric alternative controls; WCAG 2.2 AA target for HTML UI.
6. **Performance pass** — 1440×900 target >45 fps, 60 preferred; quality profiles; asset lazy-loading; bundle budget.
7. **Deployment** — static HTTPS host, no secrets, no telemetry, source disclosures reachable.
8. **Case study** — Challenge → intent → interaction sketches → system diagram → UI views → demo/motion → computational proof → limitations.
9. **Demo script** — 90-second recorded walkthrough from PRD §16.
10. **Feature freeze** — no new product features during M5.

## Agent sequence

1. `ui-designer` + `ux-architect` produce a punch list against the design contract.
2. `frontend-developer` implements visual and state polish; `senior-developer` handles export and resilience.
3. `ui-finish-gate-reviewer` hard gate; `persona-walkthrough` + `ux-researcher` validate the first-time path.
4. `section-508-specialist` accessibility audit; `sre` performance/resilience review.
5. `devops-automator` deploys; `visual-storyteller` + `technical-writer` produce the case study.
6. `code-reviewer` final review.

## Acceptance

- Full workflow: land → choose site → orbit → edit mass → change sun → duplicate → compare → export → reload.
- No inactive main-path control; every button and metric works.
- Visual gate passes at 1440×900, 1280×800, 1920×1080; mobile read-only is coherent.
- Lighthouse/performance baseline recorded; no console errors.
- Accessibility checks recorded with known limitations (3D editing is not fully keyboard-equivalent).
- Case study and live URL ready.

## Out of scope

New analysis modes, AI, GLB/PDF export, extra sites, MapLibre, dual live comparison, pricing/auth.

## Evidence

- Production URL and deployment log.
- 3-minute recording and 90-second walkthrough.
- Final screenshots and visual gate record.
- Perf trace, bundle report, a11y checklist.
- Case-study draft.

## Risks

- Scope creep disguised as polish — enforce feature freeze.
- Visual polish masking broken geometry — re-run QA-03–12 before the gate.
- Export including debug overlays — test at both resolutions.
