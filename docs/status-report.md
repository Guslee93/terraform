# Terraform v1 — Status report

**Date:** 18 November 2026 · **Working branch:** `run1/foundations` (draft **PR #25** → `main`; PR #18 merged 2026-11-25)
**Prepared from the repository state:** the Run 1 ledger (`docs/handoffs/RUN1-log.md`), the visual-upgrade plan (`docs/plans/terraform-visual-upgrade/`), the ADRs, the review records and the CI record on PR #25. This file replaces the superseded stub that previously stood here; the full narrative background is `docs/reports/terraform-project-report.md` (16 November 2026).

**What Terraform is.** An architectural site-planning **portfolio prototype** — not a commercial product and not planning advice. A Vite + React + TypeScript studio over two curated Oslo site packages (OSM footprints, Kartverket DTM1 terrain and measured heights, the official road-noise map, hazard and parcel layers), plus an address-import path, five analyses (Sun, Wind, Noise, Water, Snow), scenario storage with autosave, and measured export passes. Everything on screen is labelled for what it is — mapped authority data, a calculation, or a screening — and no panel or caption claims compliance, safety or a verified result.

---

## 1. How far the project has come

### 1.1 The product is built (milestones M0–M5, gates closed)

- **M0–M2 — shell and model.** Design tokens, landing and About, the studio shell with its focus-managed inspector, the local-ENU coordinate contract (no latitude/longitude as mesh vertices), two validated static site packages, terrain/context/boundary layers, camera presets with compass and scale, the massing model with validation, undo/redo and one-drag-one-undo-entry semantics.
- **M3–M5 — analyses and finish.** Sun hours on the ground, roofs and façades inside the analysis circle with a From–To window of the day; the wind map lifted to any whole metre with terrain-following slices and wakes that refill from above; areas, coverage and measured roofs; the Sun/Wind/Noise/Water/Snow cards in one column; scenario CRUD with autosave and migrations; landing polish, empty and error states, the case study, accessibility and performance passes, and the deployment path.
- **Foundation layers (branch `build/foundation`, ADR-0032–0039).** Provenance on every layer, measured building heights from Kartverket's surface model, the official strategic road-noise map as 5 dB bands, the parcel layer, hazard facts that never turn an absence into "safe", the 1 m terrain tools (slope bands, section profile), the Water runoff screening and the Snow winter-climate context.

### 1.2 The plan's groundwork is delivered (Run 1, T0–T10 — all done)

Run 1 was the visual-upgrade plan's Gate 0/1 foundations run. Every task finished; none blocked or partial.

| # | Task | Delivers | Commit |
|---|---|---|---|
| T0 | TF-VIS-007 | Runoff control runs vs WhiteboxTools: bare-terrain agreement **69.8 %**, per-building-offset **66.0 %** on main paths (standard run 67.0 %). The earlier "no bug" verdict is **withdrawn** — the divergence sits in the fill/routing method, not the buildings. | `ab1df95` + `0f17a24` (PR #23) |
| T1 | TF-VIS-014 | `src/features/analysis/graphics.ts` — one renderer-free home for every analysis colour and band boundary; the legacy constants now derive from it. | `61d49f3` |
| T2 | TF-VIS-054 | Claim guardrail test: no forbidden term in any analysis caption, note, disclaimer or legend label. | `b1a8dd4` |
| T3 | TF-VIS-040 A | The pure legend model `legendFor(id, context)`; the claim is supplied from the existing caption functions, never authored. | `48b1b6c` |
| T4 | TF-VIS-010 | `scripts/capture-reference.mjs` + `compare-captures.mjs`; smoke run 24 captures / 0 failures. | `bef462d` |
| T5 | TF-VIS-012 | `e2e/visual-reference.spec.ts`, opt-in behind `VISUAL=1`; passes 5/5 headed. | `af6a258` |
| T6 | TF-VIS-013 | `src/scene/style.ts` + the `NORDIC` style; zero differing pixels against pre-refactor baselines. | `6f2a74e` |
| T7 | TF-VIS-030 | `e2e/camera-input.spec.ts` characterisation tests (6 passed, twice). | `ded94a5` |
| T8 | TF-VIS-034 | Ground-click arbitration as a pure function, with a 16-combination table test. | `517e3b4` |
| T9 | TF-VIS-016 | `docs/design/visual-inventory.md` — every scene colour, line, legend and floating surface, with `file:line`. | `57e5436` |
| T10 | TF-VIS-015 | The Visual Lab route (`/lab/:siteId`) behind a flag + `ADR-0040`; the Lab chunk is fully tree-shaken out of production. | `d2ca2ea` |

An independent review of T8–T10 (`docs/reviews/run1-T8-T10-review.md`) returned **approve with minor follow-ups**; the follow-ups are applied (CI now runs `check-no-lab-chunk.mjs` after the build; the inventory's road row corrected to *changes*).

### 1.3 Records and health

- **Decisions on record:** 40 ADRs (`ADR-0001`–`ADR-0040`, all accepted except ADR-0011, still proposed). ADR-0040 (the Visual Lab) landed with T10.
- **Checks.** Unit suite **1 234 passed / 4 skipped / 1 `it.todo`**; typecheck, lint and build green after every Run 1 task. CI on PR #25 is green across lint+test+build and the three Playwright Chromium shards, with a Vercel preview deployment.
- **Measurement exists.** `scripts/measure-perf.mjs` with a committed baseline (`docs/perf/`), `scripts/capture-reference.mjs` + `compare-captures.mjs` for before/after visual claims, and an opt-in visual-regression spec. Gate 1's premise — *make the picture measurable before changing it* — is now met.
- **The visual direction is settled.** On 18 November the owner approved the visual identity (dark desaturated orthophoto terrain, white contours and massing, point-cloud vegetation, HDRI ambient with the physical sun, mist dissolve, charcoal glass panel, horizontal analysis toolbar). This closes the A/B/C direction search and supersedes the plan's Direction-A recommendation; `09-VISUAL-IDENTITY-INTEGRATION.md` and the revised Gate 2 in `05` carry it.

---

## 2. What is left

### 2.1 The merge path — seven open draft PRs

| PR | Branch | What it is |
|---|---|---|
| **#25** | `run1/foundations` | Run 1 (this report's subject) — T1–T10 code, the T0 ledger, the run summary and the T8–T10 review |
| #23 | `test/runoff-reference` | The WhiteboxTools comparison, now with the corrected control-run verdict |
| #26 | `review/water-snow` | Independent review of the Water and Snow work (TF-VIS-002) |
| #27 | `review/foundation-rv1` | Independent re-run of the foundation acceptance numbers (TF-VIS-003) |
| #28 | `fix/water-snow-followups` | The water/snow review's minor follow-ups |
| #18 | `build/foundation` | The foundation layers themselves — the base every other draft targets |
| #29 | `run7/identity-lab` | Run 7: first look of the approved visual identity in the Visual Lab |

All are drafts by design. The owner reviews and merges; no agent merges. `#18` is the base — the others should be reviewed against it and land in an order that keeps `build/foundation` green.

### 2.2 Release blockers (Gate 0 tail)

1. **Production still serves 404s** for `/about`, `/studio/*` and the site manifests (checked 18 November), and the cause is still unknown (TF-VIS-001). Merging PR #18 may not fix it — diagnose first (D0). This is the one true release blocker.
2. **TF-VIS-008** — merge PR #18 and verify production afterwards.
3. **TF-VIS-009** — a finish-gate visual review of the captures that have not been reviewed yet.
4. **TF-VIS-005** — bring the operating documents fully up to date. In particular, the checklist in `05-MASTER-TODO.md` has not been ticked: it still shows TF-VIS-007, 010, 012, 013, 014, 015, 016, 030, 034, 040 (part A) and 054 open although Run 1 delivered them. Of the 58 backlog items, 2 are ticked and 11 more are delivered-but-unticked, so **≈ 45 items genuinely remain**.

### 2.3 Checks only the M1 Pro can run (no GPU in CI or the sandbox)

These are written into the Run 1 ledger; they gate the T4/T5 acceptance, and the visual baselines are only valid there:

```bash
npm ci && npm run build
node scripts/capture-reference.mjs run1
node scripts/capture-reference.mjs run2
node scripts/compare-captures.mjs run1 run2          # 0 differing pixels, or list each cause

VISUAL=1 npx playwright test e2e/visual-reference.spec.ts --headed --update-snapshots
VISUAL=1 npx playwright test e2e/visual-reference.spec.ts --headed
```

### 2.4 Owner decisions still open (`08-OPEN-QUESTIONS-AND-DECISIONS.md`)

**Answered 2026-11-24/25:** **D0** (production 404s no longer reproduce, `docs/reviews/production-404-diagnosis.md`), **D1** (PR #18 merged into `main` on 2026-11-25), **D2** (the wind legend shows speed ranges only), **D3** (the eight PR #18 points, `progress.md`). Still open: **D13** (orthophoto source and licence — blocks the identity's terrain and keeps the Lab local-only under D19; the Kartverket request is sent). Then the design-phase ones: **D7** (noise band colours), **D8** (white-pass edges), **D9** (orthographic plan), **D10** (deterministic MP4 dependency), **D11** (landing still), **D14–D18** (ADR amendments, accent, type).

### 2.5 The remaining backlog, by gate (≈ 45 items)

- **Gate 1 tail — finish the measurable groundwork.** TF-VIS-040 part B: wire `legendFor` into a new `MapLegend` and retire the four caption blocks and the two ramp bars; **041** overlay fade and cross-fade; **042** the screening hatch; **043** analysis-focus dimming; **046** stale-result and rapid-change tests; **055** regenerate design-contract §8 from `style.ts` and the registry.
- **Gate 2 — the approved identity.** **020** identity stages in the Lab; **021** the fat-line system with light-white contours; **023** cartographic hillshade (optional); **024** AO and soft shadows on the dark ground at export quality; **025** HDRI ambient + ADR-0042; **026** the identity decision board and owner acceptance; **027** ship the `IDENTITY` style; **028a/b** orthophoto licence research and the terrain pipeline; **029** airy point-cloud vegetation; **02A** atmospheric dissolve (export moods only); **02B** the integrated prototype (analysis off / wind on); **031/032** camera A/B then adopt with `CameraHandle`, arc transitions and ADR-0043; **033** orthographic plan (D9); **035** keyboard camera; **036** first-visit settle; **047** the charcoal studio theme; **048** the always-visible horizontal analysis toolbar.
- **Gate 4/5 — the analysis grammar and the pilots.** **044** the wind pilot; **045** the water pilot; **050** the sun ramp and legend; **051** the noise mapped grammar and palette (D7); **052** the snow winter chart; **053** terrain contours; **060–063** export parity, clip camera paths, deterministic MP4 (D10, optional) and the credit/depth invariants; **064** the landing still (D11); **065** the About refresh after Gate 5.
- **Gate 6 / release.** **070** the sun-hours point reference (optional); **071** the accessibility audit of the new UI; **072** the browser and device matrix; **073** the performance regression against the Gate 1 baseline; **074** release acceptance and deploy.

### 2.6 Known limitations to carry forward

- **The runoff screening is not matched to a reference tool.** Main flow paths agree 67 % (standard), 69.8 % (bare), 66.0 % (offset) with WhiteboxTools — below the 95 % IT-7 bar — and the earlier "correct, not buggy" conclusion is withdrawn. Water remains a **Tier 2 screening** and the card says so; the divergence is the leading open technical question.
- **Eleven hex values still mean two things** (recorded by the T1 snapshot). Gate 5 empties that list, one analysis at a time.
- **The wind activity legend keeps the Lawson "Uncomfortable" names** until D2 is decided; the guardrail holds them as an explicit `it.todo`.
- **The Lab is local-only** until the orthophoto licence (D13) clears, per D19.
- **`legendFor` carries colours and boundaries but not band labels yet**; the labels stay in their domain modules and attach when `MapLegend` is wired (TF-VIS-040 part B).
- **`wind-validation.test.ts` "case 4" timed out once** during T0 and did not recur in the rest of the run or in the review re-run.

---

## 3. Where everything is recorded

| What | Where |
|---|---|
| Run 1 ledger, run summary, owner questions and M1 commands | `docs/handoffs/RUN1-log.md` |
| Run 1 brief | `docs/handoffs/RUN1-deepseek.md` |
| Independent review of T8–T10 | `docs/reviews/run1-T8-T10-review.md` |
| The visual-upgrade plan (exec summary, audit, direction, architecture, backlog, validation) | `docs/plans/terraform-visual-upgrade/00–09` |
| The approved visual identity and its integration | `09-VISUAL-IDENTITY-INTEGRATION.md` in the same folder |
| Owner decisions and their defaults | `08-OPEN-QUESTIONS-AND-DECISIONS.md` |
| Architecture decisions | `docs/decisions/ADR-0001` … `ADR-0040` |
| Performance baseline and notes | `docs/perf/` |
| Design inventory (every scene colour and legend, with `file:line`) | `docs/design/visual-inventory.md` |
| Earlier narrative | `docs/reports/terraform-project-report.md` |

## 4. Verify it yourself

```bash
npm ci
npm run typecheck && npm run lint && npm run test && npm run build
npx playwright test                     # three shards, headed-capable
node scripts/check-sources.mjs          # has a publisher changed its data?
git -C . log --oneline -12              # the Run 1 commit series
```

The one-line version: **the product is built and honest, the plan's groundwork is measured and merged-ready on PR #25, the visual direction is approved — what remains is the GPU-only capture and baseline runs, and then the identity work of Gates 2–5.**



