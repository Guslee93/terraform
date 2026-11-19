# 00 — Executive summary

**Terraform visual and UX upgrade plan · 16 November 2026 · planning only, nothing implemented**

## Where the project stands

- **The code is ahead of what visitors see.** The real current state is `build/foundation` (draft PR #18, 15 commits ahead of `origin/main`, CI green, 1 196 unit tests passing and lint clean, re-run during this audit).
- **Production is broken in a way the branch gap does not explain.** `terraform-studio.vercel.app` serves the landing page but returns 404 for `/about`, `/studio/compact-infill` and the site manifests. `origin/main` already contains the SPA rewrite and the site packages, so production is probably pointing at a stale or misconfigured deployment. Merging PR #18 may not fix it. The cause has to be found first (01 §1.1).
- **Two foundation pieces have no independent check yet:** Water and Snow have had no code review, and the runoff method has never been compared with a reference tool.
- **The scene is disciplined but visually unfinished.** It has a sound white-model base, real data and honest claims. What it lacks: a line-weight hierarchy, a shared analysis colour system, legends in one place, any overlay transitions, interruptible camera moves, and a visual difference between mapped facts, calculations and screening. Scene colours are scattered constants, and analysis ramps live in six domain modules that reuse the same hex values for unrelated meanings.

## Strategic recommendation

1. **Fix the release before the look.** Gate 0: diagnose the 404s, review Water and Snow, compare the runoff with WhiteboxTools, correct the About page, answer PR #18's open points, merge.
2. **Make the picture measurable, then change it.** Gate 1: a reproducible capture set, a performance harness with frame p95/p99, latency and export time, and two zero-pixel-change refactors that give scene style and analysis colours one home each. Then a dev-only **Visual Lab** route that uses the real renderer, data and workers.
3. **Finish the accepted direction rather than replacing it.** The provisional recommendation is **Direction A, the Nordic white model, carried through properly**, plus Direction B's line system and an orthographic plan. Direction C (atmospheric) is limited to export moods. The owner chooses from Lab captures.
4. **Give honesty a visual grammar.** Mapped data, calculated results, screening and illustrative motion each get their own look, with one legend. Wind and Water are the pilots.
5. **Interaction second, exports last.** Camera transitions that stop when the visitor touches the canvas, zoom towards the cursor, and keyboard camera control come next. Deterministic clips and export-quality stills follow.

## Best opportunities (high value, low risk)

| Opportunity | Why | New dependency |
|---|---|---|
| Interruptible arc transitions + zoom to cursor | Largest feel improvement; `OrbitControls.zoomToCursor` and drei `CameraControls` are already installed | none |
| Pixel-true line hierarchy (three `Line2`) | Same drawing in viewport and 4K export | none |
| Output-class grammar + single legend | Makes the project's main strength, its honesty, visible | none |
| Reverse the sun-hours ramp | The sunniest surfaces are currently the palest on a white model | none |
| Export-quality ambient occlusion and shadows | Better stills from installed n8ao settings | none |
| Playwright screenshot baselines | Every later visual claim becomes checkable | none |

Five of the six library recommendations add nothing to `package.json` (02 §5). The only candidate new runtime dependency is `mediabunny` for deterministic MP4, behind a Gate 6 go/no-go.

## Top blockers

1. Production 404s, cause unknown (TF-VIS-001).
2. Water/Snow unreviewed (TF-VIS-002) and runoff not compared with a reference (TF-VIS-007).
3. PR #18 open decisions (TF-VIS-006).
4. No performance or visual baseline that supports before/after claims (TF-VIS-010, 011).
5. `ViewportCanvas.tsx` (785 lines, 35 props) is the single integration point. Tasks that edit it must run one at a time.

## Decisions needed from the owner

Full list with defaults in `08-OPEN-QUESTIONS-AND-DECISIONS.md`. The five that matter first:

1. **D0** — fix production before anything else (recommended: yes).
2. **D3** — PR #18's eight points (recommended: accept as built).
3. **D2** — drop the Lawson activity names from the wind legend (recommended: yes).
4. **Q3** — which models are available, so the assignments in 05 hold.
5. **D5** — allow the Lab on Vercel previews (recommended: yes).

## Where the plan lives

Committed to `build/foundation` on 2026-11-17. The plan reflects the audit of 16 November 2026. Progress since then:

- Done: TF-VIS-004 (About page, PRs #19 and #20), TF-VIS-005 part 1 (operating documents, PR #22), TF-VIS-011 (performance harness and mains-power baseline, PR #21).
- In review: TF-VIS-007 (runoff vs WhiteboxTools, PR #23). Main flow paths agree 67 %, below the 95 % bar; a control run without building blocks is pending, so Water stays a Tier 2 screening.
- The baseline in `docs/perf/` replaces the "re-measure" note in 01 §1.2.

**18 Nov 2026 — visual identity approved.** The owner's art direction (dark 80 %-desaturated orthophoto terrain, white contours and massing, point-cloud vegetation, HDRI ambient with the physical sun, mist dissolve, charcoal glass panel and horizontal analysis toolbar) closes the A/B/C search. The "Strategic recommendation" §3 above (Direction A light white model) is superseded; everything else stands. See `09-VISUAL-IDENTITY-INTEGRATION.md` and the revised Gate 2 in 05. Since 17 Nov: the control runs for TF-VIS-007 finished (bare 69.8 %, offset 66.0 %; "no bug" verdict withdrawn); Run 1 (draft PR #25) implemented 010, 012, 013, 014, 030, 040 part A and 054, unmerged; production still 404s (checked 18 Nov).

## Index

| File | Contents |
|---|---|
| `00-EXECUTIVE-SUMMARY.md` | This page |
| `01-CODEBASE-AUDIT.md` | Verified state: branches, deployment, scene, workers, editor, export, tests, design system, invariants |
| `02-GITHUB-REPOSITORY-RESEARCH.md` | 27 candidates plus 8 more, with licence, activity, fit and disposition |
| `03-VISUAL-DIRECTION.md` | Three directions, design system, atmospheres, analysis grammar, motion, reference captures, Norwegian angle |
| `04-ARCHITECTURE-AND-EXPERIMENTS.md` | Seams, Visual Lab, style module, graphics registry, camera, export, budgets, experiments, ADRs |
| `05-MASTER-TODO.md` | Gate-ordered backlog TF-VIS-001 … 074 with owners, reviewers and acceptance |
| `06-AGENT-HANDOFF-PROMPTS.md` | Copy-paste prompts for the first eleven packages and a template |
| `07-VALIDATION-AND-RELEASE-GATES.md` | Per-PR checklist, automated checks, visual rules, science, a11y, devices, rollback |
| `08-OPEN-QUESTIONS-AND-DECISIONS.md` | Owner decisions, ADR conflicts, technical unknowns |
| `09-VISUAL-IDENTITY-INTEGRATION.md` | 18 Nov: approved identity vs code — verified status, compatibility matrix, revised Gate 2, risks, first prototype brief, decisions, next task |
