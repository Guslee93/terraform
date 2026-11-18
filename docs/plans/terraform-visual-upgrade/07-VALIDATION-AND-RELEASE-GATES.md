# 07 — Validation and release gates

Applies to every PR in this plan, and in full at each gate exit. Builds on AGENTS.md §5.4 (G0–G4) and §7 (definition of done); it does not replace them.

## 1. Per-PR checklist

- [ ] `npm run lint && npm run test && npm run build` pass; CI green.
- [ ] Scope matches the task in `05-MASTER-TODO.md`; no file outside it changed.
- [ ] Invariants I1–I11 (`01-CODEBASE-AUDIT.md` §11) that the task touches are covered by a test.
- [ ] No new runtime dependency without an accepted ADR (licence, size, maintenance, runtime cost).
- [ ] No new `any`, no unchecked `as`.
- [ ] Visual change: reference captures before and after (`scripts/capture-reference.mjs`), same machine and settings.
- [ ] Render-path change: performance harness run (`scripts/measure-perf.mjs`) against the gate's baseline; numbers in the PR.
- [ ] Reduced motion checked for anything that moves.
- [ ] A reviewer other than the implementer approved; high-risk items (renderer, input, domain, export) reviewed by Opus.
- [ ] `docs/agent-log.md` and `progress.md` updated.

## 2. Automated checks to add

| Check | Where | Task |
|---|---|---|
| Lab route absent in production build | unit test + `dist/` scan | TF-VIS-015 |
| `NORDIC` equals pre-refactor values | `src/scene/style.test.ts` | TF-VIS-013 |
| Graphics registry rules (classes, ≤ 7 bands, shared colours list) | `graphics.test.ts` | TF-VIS-014, enforced in TF-VIS-055 |
| Sun position independent of atmosphere | `lighting.test.ts` | TF-VIS-025 |
| Ground-click intent table | `groundClick.test.ts` | TF-VIS-034 |
| Camera and input characterisation | `e2e/camera-input.spec.ts` | TF-VIS-030 |
| Stale-result races | e2e | TF-VIS-046 |
| Claim guardrails in legends and captions | unit + e2e | TF-VIS-054 |
| Depth pass: no credits, byte-identical for unchanged scene | e2e opt-in | TF-VIS-063 |
| Credits on still, white, analysis, every clip frame | e2e opt-in (decode first, middle, last clip frames) | TF-VIS-063 |
| Runoff reference fixture | `runoff` test | TF-VIS-007 |
| *18 Nov identity:* orthophoto schema, registration (≤ 1 px), credit in every credited pass and absent from depth; layer absent → zero-pixel diff | unit + opt-in visual | TF-VIS-028, 063 |
| Seeded point vegetation deterministic; points not raycast; override passes handle `Points` | unit + `camera-input.spec.ts` + export e2e | TF-VIS-029, 060 |
| Dissolve starts outside the study halo and analysis circle | unit | TF-VIS-02A |
| Sun direction and shadows identical across styles and HDRI load failure falls back | `lighting.test.ts` | TF-VIS-025 |
| Toolbar and panel share one analysis state; hover content also on focus | unit + e2e | TF-VIS-048 |
| Charcoal theme contrast (AA) | `m5-a11y.spec.ts` | TF-VIS-047 |
| Perf windows for identity neutral / wind-on; texture memory and point counts recorded | `measure-perf.mjs` | TF-VIS-02B, 073 |

*18 Nov:* identity production tasks (027, 047, 048) do not merge before Gate 0 exits (TF-VIS-008). Lab work may proceed.

## 3. Visual comparison rules

1. Same site, camera preset, browser build, canvas size and scale, date, time, analysis state, quality tier, and reduced motion on. The capture manifest records all of them.
2. Baselines are per machine. CI does not run pixel comparisons (software rendering).
3. A change that is meant to be invisible (refactors) must show **zero** differing pixels.
4. A change that is meant to be visible is approved by the owner from a side-by-side, and the new captures become the baseline in the same PR.
5. Exports are compared as well as the viewport: the still must look like the viewport at the same view (style parity), and the depth pass must be unchanged unless the task is about the depth pass.
6. Every analysis view passes a greyscale check and a deuteranopia/protanopia simulation before its colours are accepted (03 §2.3).

## 4. Scientific and claim checks

| Item | Gate | Evidence |
|---|---|---|
| Runoff vs WhiteboxTools | 0 | `docs/qa/runoff-reference.md` (TF-VIS-007) |
| Water/Snow independent review | 0 | `docs/reviews/water-snow-code-review.md` (TF-VIS-002) |
| Foundation numbers reproduced | 0 | `docs/reviews/foundation-rv1.md` (TF-VIS-003) |
| Sun position | existing | `docs/qa/sun-reference/` (NREL SPA) |
| Sun hours vs Ladybug/Radiance | 7, optional | TF-VIS-070 |
| Visual-only steps documented | each pilot | Every interpolation, fill, widening or tracing used for display is named in the legend's method note or the ADR |
| No forbidden claims | 5 | TF-VIS-054 |

No PR may say an analysis became "more accurate" because it looks better. Accuracy claims need a reference comparison.

## 5. Accessibility

- WCAG 2.2 AA for HTML UI: contrast ≥ 4.5:1 text, ≥ 3:1 legend swatch borders and controls.
- Legends never rely on colour alone: band labels are text; screening has a word as well as a hatch.
- Keyboard: viewport focusable; camera keys (TF-VIS-035) documented in the accessible label; no keyboard trap; editor shortcuts unchanged.
- Reduced motion: camera snaps, overlays switch instantly, particles static, no first-visit settle.
- Existing specs stay green: `e2e/m5-a11y.spec.ts`, `wind-a11y.spec.ts`, `keyboard.spec.ts`.

## 6. Browser and device matrix (Gate 7)

| Target | Must | Evidence |
|---|---|---|
| Chromium desktop (reference machine) | full suite + perf budgets | harness JSON |
| Safari macOS | studio loads, all cards, export still, clip fallback | screenshots + notes |
| Firefox desktop | studio loads, all cards, export still | screenshots + notes |
| iPhone (Safari) | loads; orbit ≥ 30 fps idle/orbit on Compact Infill; Low tier fallback works | device, OS, numbers (MP-1) |
| Mid-range Android (Chrome) | same | same |
| Software GL | Low tier chosen; no ambient occlusion; usable | existing CI |

## 7. Performance

Budgets in `04-ARCHITECTURE-AND-EXPERIMENTS.md` §7, against the Gate 1 baseline JSON. A PR that exceeds a budget either improves elsewhere to compensate (shown in numbers) or is rejected. FPS averages alone are never sufficient evidence.

## 8. Deployment and rollback

- Agents never push to `main`. The owner merges.
- Every PR has a Vercel preview; the owner reviews visual changes on the preview, ideally also on a phone.
- After each production deploy: `curl` the four URLs of TF-VIS-001 (200), run `e2e/smoke.spec.ts` against the production URL, open one studio and one export.
- Rollback: Vercel "promote previous deployment" (instant). Code rollback: revert the PR. Style changes keep `NORDIC` available, so a style can be reverted by one constant.
- The Lab flag (`VITE_LAB`) must be unset in the production environment; verified by the `dist/` scan in CI.

## 9. Release acceptance (Gate 7 exit)

- [ ] Gates 0–6 exits met and recorded.
- [ ] Full Playwright suite green on the production build.
- [ ] Performance regression run within budget (TF-VIS-073).
- [ ] Accessibility audit closed (TF-VIS-071).
- [ ] Device matrix recorded (TF-VIS-072).
- [ ] Design contract §8 regenerated (TF-VIS-055); About page current (TF-VIS-065).
- [ ] Every ADR raised by this plan accepted or withdrawn.
- [ ] Known limitations listed in the release record (`docs/reviews/visual-upgrade-release.md`).
