# M3 with Claude Fable 5.1 — plan and delegation

**Status:** Proposed, 2026-10-28 · **Budget:** $15 of Fable 5.1 credit · **Milestone brief:** `docs/milestones/M3-live-analysis.md`
**Principle:** spend the premium model only where a wrong answer is expensive and hard to spot: domain correctness (geometry, time, sun). Everything that is UI, wiring, evidence or reference-gathering goes to Codex and DeepSeek, which are cheaper and good at well-specified work.

---

## 1. Where M3 actually stands (checked in the repo, 2026-10-28)

| M3 deliverable | Already exists | Real gap |
|---|---|---|
| 1 Metrics | `src/features/massing/aggregate.ts`: tier/volume/scenario GFA, volume, max height, footprint union (turf), coverage | **GFA is Σ(footprint × storeys)**, which PRD FR-051 forbids for stacked or overlapping forms ("compute occupied slices … no double-counting overlapping slab areas"); PRD line 403 asks for level-indexed occupied polygons; status report §8 #3 flags it as an ADR-0004 revisit. **Coverage ignores the parcel**: FR-054 wants union ∩ parcel, with external area reported separately. No building count or storey aggregation per building. |
| 2 Method disclosure | — | Copy and tooltips (UI). |
| 3 Solar | `src/features/analysis/sun.ts`: `sunDirection(instant, lat, lon)` via suncalc 2; fixed `DEMO_SUN_INSTANT`; `src/scene/lighting.ts` `sunPosition()` | No **Europe/Oslo wall-clock ↔ instant** model (DST gap and overlap), no below-horizon state, no day model for the scrubber, no polar day/night (imported sites go up to 71° N), no independent reference. |
| 4 Shadows | Fitted shadow frustum, PCF, context and masses cast and receive, AO | Night state (direct sun off), quality profiles, no-WebGL fallback (QA-15). |
| 5 Time controls | — | UI. |
| 6 Constraints | `src/features/massing/clearance.ts`: boundary inside/crossing/outside, float/cut (QA-06) | **Setback polygon** (planar inward offset of a possibly concave ring; `turf.buffer` is geodesic and wrong in ENU metres), **height reference** (FR-073: grade or datum, stated), envelope status per mass with the **offending geometry** (FR-074), `Not evaluated`. |
| 7 Disclaimers | Claim policy in AGENTS.md | Strings in tooltips, inspector and exports. |
| 8 Heatmap | — | Optional; **skip** (P1). |

Required tests not yet covered: fixtures for area/volume/coverage incl. **outside-parcel coverage**, QA-10 determinism, QA-11 no-sun claim, DST, an independent sun reference ≤ 0.5°, QA-15 no-WebGL.

## 2. What Fable does, and why those parts

Fable gets the five problems where a subtle error would survive review and quietly make every visible number wrong:

| # | Fable work item | Why premium |
|---|---|---|
| **F1** | **Floor-level GFA** (FR-051): level-indexed occupied polygons with union per elevation plane, across tiers **and** overlapping volumes; storey aggregation per building; building count. **ADR-0007** records the definition: slab elevation tolerance, what counts as a floor, mixed storey heights. | Definitional and geometric; the brief names it as a risk. |
| **F2** | **Parcel-aware coverage** (FR-054): ground union ∩ study area, external area separately; the "fully outside → not counted" fixture. | Polygon boolean edge cases (touching edges, slivers). |
| **F3** | **Constraint envelope engine** (FR-070–074): planar inward **setback offset** robust to concave rings (via the polygon-clipping that turf already bundles, not geodesic buffer); height check against an explicit reference with **ADR-0008 (grade vs datum)**; per-mass status `Within` / `Exceeds` / `Not evaluated` with the reasons and the **offending geometry** (footprint part outside the setback, height excess in metres) for highlighting. | Computational geometry plus a product decision with legal-sounding wording. |
| **F4** | **Solar time model**: Europe/Oslo (and any IANA zone) local date+time → UTC instant using `Intl` only, handling the **spring gap** (02:00–03:00 does not exist) and the **autumn overlap** (02:00–03:00 happens twice); `SunState { instant, localLabel, azimuthDeg, elevationDeg, belowHorizon, direction ENU }`; a day model for the scrubber (sunrise/sunset or **polar day/night** when suncalc returns no events); QA-10 determinism; QA-11 rule (no positive sun-hours claim when below horizon). | Time-zone bugs are classic silent failures; polar cases matter for imported northern sites. |
| **F5** | **Independent sun oracle in tests**: a NOAA-equation implementation **in the test suite only**, compared with suncalc over a year at Oslo (and Tromsø), Δ ≤ 0.5° above the horizon; plus checks against DeepSeek's externally generated NREL SPA table (D30). | "SunCalc is not its own reference" (fixtures §4). |

Fable also delivers **typed public APIs** for F1–F4 (the contracts in §6), so Codex can build UI against them without guessing.

**Not for Fable:** UI, screenshots, browser checks, docs prose beyond the two ADRs, the reference table gathering, e2e. Those are the expensive-per-value tokens.

## 3. Budget: how $15 maps to work

Fable 5.1: $10 / M input, **$50 / M output**, $0.25 / M cached input (`claude-api` reference, cached 2026-10-06). In an agentic coding session most input is cached re-reads, so **output and thinking tokens dominate**.

| Item | Rough output share | Rough cost |
|---|---|---|
| Orientation (reading the files named in the kickoff; cheap, mostly input) | — | ~$0.50 |
| F4 time model + F5 oracle | ~25 % | ~$3.50 |
| F1 floor-level GFA + ADR-0007 | ~25 % | ~$3.50 |
| F3 constraints engine + ADR-0008 | ~30 % | ~$4.00 |
| F2 coverage | ~5 % | ~$0.75 |
| Fixes from test failures, final handoff | ~15 % | ~$2.00 |
| **Total** | | **~$14** (estimate, not a quote) |

How to keep it inside $15:
- **Effort `high`, not `max`.** Fable at `high` already outperforms older models at `xhigh`.
- **Order by value:** F4 → F1 → F3 → F2 → F5's extra cities. If money runs low, F2 and the extra oracle cities are the cheapest for Codex to finish from Fable's notes.
- **Give inputs by path,** don't paste. Prepare the reference data first (§5 phase 0), so Fable doesn't spend tokens gathering it.
- **Checkpoint commits** after each F-item, so a cut-off session loses nothing.
- **Stop rule:** at roughly $12 spent (watch `/cost` in Claude Code), stop new work and write `docs/handoffs/M3-fable-remaining.md` (what's done, what's left, exact next steps), then commit.

## 4. Who does what

| Agent | Role in M3 | Items |
|---|---|---|
| **Fable 5.1** (one session, $15) | Domain correctness core | F1–F5 + ADR-0007, ADR-0008 + typed contracts |
| **Codex** | UI and scene wiring against Fable's contracts | C8 time controls · C9 metrics panel + method disclosure · C10 constraint layers, statuses, clickable warnings · C11 night state, shadow profiles, no-WebGL fallback |
| **DeepSeek** | Reference data, fixtures, tests, evidence | D30 NREL SPA reference table · D31 DST/zone fixtures · D32 M3 e2e · D33 evidence screenshots + fixture tables · D34 disclaimer audit test |
| **Claude (this session)** | Orchestration and gates | Branch hygiene, review of every delivery, visual checks, accepting ADR-0007/0008 with you, M3 gate record (`docs/reviews/M3-*.md`) |

## 5. Phases and order

```text
Phase 0 (now, cheap)      DeepSeek D30 + D31  ─┐     Claude: branch hygiene (needs your OK)
                                                ├─►  Phase 1: Fable session F4 → F1 → F3 → F2 → F5
Codex C11 (independent)  ───────────────────────┘                     │
                                                                       ▼
                                   Phase 2: Codex C8, C9, C10 against Fable's contracts
                                                                       │
                                                                       ▼
                     Phase 3: DeepSeek D32 (e2e), D33 (evidence), D34 (disclaimers) → Claude M3 gate
```

- **Phase 0 (before spending Fable):** DeepSeek generates the independent sun reference (D30) and the DST fixture list (D31). The M3 brief requires the reference to be recorded *before* implementation. Codex can do C11 now, since it doesn't depend on Fable. I consolidate branches (§8).
- **Phase 1:** the Fable session (kickoff prompt in §7).
- **Phase 2:** Codex builds the UI against Fable's typed APIs. Expanded work orders go into `docs/handoffs/` once Fable's contracts are merged, so they quote real signatures.
- **Phase 3:** DeepSeek tests and evidence; I run the visual and code review gate with `gis-qa-engineer` / `code-reviewer` roles.

## 6. Contracts Fable must deliver (so Phase 2 can start)

Names are a starting point; Fable may refine them but must keep them renderer-free (`src/features/analysis/**`, `src/features/massing/**`) and document the final shapes in its handoff.

```ts
// F4 — src/features/analysis/time.ts, sun.ts
resolveLocalTime(date: 'YYYY-MM-DD', time: 'HH:mm', timeZone: string): { instant: Date; kind: 'normal' | 'gap-shifted' | 'overlap-earlier' }
sunState(instant: Date, latitude: number, longitude: number, timeZone: string): SunState
type SunState = { instant: Date; localLabel: string; azimuthDeg: number; elevationDeg: number; belowHorizon: boolean; directionEnu: Vec3 | null }
dayModel(date, latitude, longitude, timeZone): { kind: 'normal'; sunrise: Date; sunset: Date } | { kind: 'polar-day' } | { kind: 'polar-night' }
DATE_PRESETS, TIME_PRESETS   // equinoxes/solstices; morning/noon/evening defined in local solar terms

// F1/F2 — src/features/massing/metrics.ts (aggregate.ts keeps the simple helpers)
scenarioMetrics(document, studyArea): {
  gfaM2, groundFootprintM2, coverageWithinParcel, footprintOutsideParcelM2,
  volumeM3, maxHeightM, buildingCount,
  perVolume: { volumeId, gfaM2, storeys: { elevation, areaM2 }[], maxHeightM }[]
}

// F3 — src/features/analysis/constraints.ts
evaluateEnvelope(document, site: { studyArea; heightAt; constraints?: { maxHeightM; setbackM; reference: 'grade' | 'datum' } }): {
  status: 'within' | 'exceeds' | 'not-evaluated'
  perVolume: { volumeId; status; reasons: ('outside-setback' | 'outside-boundary' | 'too-tall')[]; outsideSetbackRings: Vec2[][]; heightExcessM: number }[]
  setbackPolygon: Vec2[][]   // for the scene layer (may be several rings for concave boundaries)
}
```

## 7. Fable kickoff prompt (copy-paste)

Run in Claude Code with the model set to `claude-fable-5-1` and effort `high`, in its own worktree (§8). Fable prompts work best as goals and acceptance criteria rather than step lists.

```text
You are the senior domain engineer for Terraform v1, an architectural site-study prototype (React + Three.js, but your work is renderer-free TypeScript).

Read first: AGENTS.md; docs/plans/M3-fable-plan.md (this plan: §1 gaps, §2 your items F1–F5, §6 contracts); docs/milestones/M3-live-analysis.md; docs/qa/fixtures.md §2–§4; Terraform_Comprehensive_PRD_v1.md FR-050–FR-075 and line 403; docs/decisions/ADR-0002 and ADR-0004; src/features/massing/{types,aggregate,clearance}.ts; src/features/analysis/sun.ts; src/lib/polygon.ts. Reference data from DeepSeek: docs/qa/sun-reference/ (NREL SPA table) and src/features/analysis/__fixtures__/dst-oslo.json.

Goal: make M3's domain layer correct and tested, so every number and sun state the UI shows later is trustworthy. Do F4, F1, F3, F2, F5, in that order, as specified in plan §2, delivering the contracts in plan §6.

Constraints:
- Renderer-free only: src/features/analysis/**, src/features/massing/**, src/lib/**, tests, docs/decisions/ADR-0007 (floor-level GFA) and ADR-0008 (height reference), docs/qa/fixtures.md. No UI, no scene files, no screenshots, no browser.
- No new dependencies (suncalc 2.1.1 and @turf/turf 7.4 are available; turf's buffer is geodesic, so don't use it on ENU metres).
- TypeScript strict, no `any`. Tests with known fixtures for every rule; keep existing tests green.
- Truthful claims (AGENTS.md §7): never imply verified sunlight hours or planning compliance.
- Commit after each F-item (one commit per item, conventional message, ending with the attribution line below).
- Budget: this session has ~$15. At about $12 spent, stop new work, write docs/handoffs/M3-fable-remaining.md (done / remaining / exact next steps / final contract signatures), commit, and end.

Done when: npm run lint, typecheck, test and build pass; fixtures §2–§4 rows are covered by named tests; ADR-0007 and ADR-0008 are written with status Proposed; the handoff file lists final signatures for Codex.

Commit attribution: end every commit message with
Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
```

## 8. Branches and file ownership

**Set up 2026-10-28:** `deepseek/round3` merged into `main` as `88c629d` (suite green: lint, typecheck, 396 tests, build). Fable worktree created: `../Terraform-m3` on `m3/domain` from `main`, `npm ci` done. DeepSeek's worktree `../Terraform-ds4` is clean and fully merged; DeepSeek starts its next round with `git switch -c deepseek/round5 main` inside that worktree. The main checkout is on `main`.

Right now the main checkout is on `deepseek/round3`, which holds everything (scene look, import spike, rounds 3–4), and Codex resumes C4/C5 there at 15:21.

**Before Fable starts (Claude, needs your OK):** once Codex's C4/C5 is reviewed and committed, merge `deepseek/round3` into `main`, then give each agent its own worktree from `main`:

| Agent | Worktree / branch | Owns |
|---|---|---|
| Fable | `../Terraform-m3` · `m3/domain` | `src/features/analysis/**`, `src/features/massing/{metrics,aggregate,floors}.ts` (+ tests), `src/lib/**` additions, ADR-0007/0008, `docs/qa/fixtures.md`, `docs/handoffs/M3-fable-remaining.md` |
| Codex | main checkout · `m3/ui` (after Fable) | `src/components/studio/**`, `src/scene/**` for C8–C11 |
| DeepSeek | `../Terraform-ds4` · `deepseek/round5` | `docs/qa/sun-reference/**`, `src/features/analysis/__fixtures__/**`, `e2e/m3-*.spec.ts`, `docs/screenshots/m3-*`, `scripts/*reference*` |

No two agents write the same file at the same time. Claude merges.

## 9. Codex work (summaries; full work orders written after Fable's contracts land)

- **C11 — Night state, shadow quality profiles, no-WebGL fallback** *(can start in phase 0)*: `belowHorizon` → directional light off, hemisphere only, `Sun below horizon` chip; quality profiles `high` (4096, AO), `balanced` (2048, AO off on software GL, which D28 already detects), `low` (no shadows) with an Inspector setting; QA-15 fallback page when WebGL is unavailable (extend `SceneErrorBoundary`), with metrics still shown. Tests: unit for profile selection; e2e with WebGL disabled.
- **C8 — Time controls** (FR-060, 063–066): date presets (equinoxes and solstices), scrubber 00:00–23:59 in local time, morning/noon/evening presets, play/pause with speed, readout of elevation and compass direction, gap/overlap note on DST days; drives `sunState()` into the existing light rig; replaces `DEMO_SUN_INSTANT` (kept as the default). Keyboard reachable; reduced motion disables auto-play.
- **C9 — Metrics panel + method disclosure** (FR-056/057, deliverable 2): compact cards (GFA, footprint, coverage within parcel + outside area, volume, max height, buildings, `Concept GFA ratio`) from `scenarioMetrics()`; per-storey breakdown for the selected building; tooltips stating units and the GFA/footprint/coverage difference; disclaimers per FR-075.
- **C10 — Constraint layers and warnings** (FR-070–074): toggleable layers for parcel, setback polygon, max-height plane; inspector status `Within demo envelope` / `Exceeds demo envelope` / `Not evaluated`; clicking a warning selects the mass and highlights `outsideSetbackRings` and the height excess; `Illustrative constraint — not planning advice` on every surface.

## 10. DeepSeek cards (ready to paste after round 4b)

- **D30 — Independent sun reference (NREL SPA)** · `docs/qa/sun-reference/`: in a Python venv, use `pvlib` (NREL SPA) to compute azimuth/elevation for Oslo (59.9235, 10.758) and Tromsø (69.6492, 18.9553) at the fixtures §4 timestamps plus every hour on 2026-03-20, 06-21, 09-22, 12-21 (local time via `zoneinfo`). Commit the script, the CSV/JSON output, pvlib version and source citation. Fill the "Independent" columns of `docs/qa/fixtures.md` §4. No TypeScript.
- **D31 — DST and zone fixtures** · `src/features/analysis/__fixtures__/dst-oslo.json`: with Python `zoneinfo`, list every Europe/Oslo transition for 2026–2028; for each, local times inside the gap (e.g. 02:30) with the expected shifted instant, and local times inside the overlap with both possible instants; plus normal-day controls. Record the generator script and tzdata version.
- **D32 — M3 e2e** *(after C8–C10)*: time scrubber and presets change the shadow (canvas compare), night state shows `Sun below horizon`, envelope violation → click warning selects the mass, no-WebGL fallback still shows metrics.
- **D33 — Evidence** *(after C8–C10)*: fixed-camera screenshots for morning/noon/evening, winter/summer, below-horizon and envelope violation (`docs/screenshots/m3-*`); the fixture table "expected vs actual" from the test output; Claude reviews the images.
- **D34 — Disclaimer audit test**: a unit/e2e test that every constraint tooltip, the inspector status and the export path contains `Illustrative constraint — not planning advice`, and that no UI string contains the forbidden claims from AGENTS.md §7.

## 11. M3 gate (Claude)

- Fixture table expected vs actual (DeepSeek D33 + test names), sun reference table filled (D30) with Δ ≤ 0.5°, QA-06/10/11/15 results.
- ADR-0007 and ADR-0008 accepted by you.
- Visual check of D33 screenshots against the design contract; code review record `docs/reviews/M3-code-review.md`.
- `npm run lint && npm run test && npm run build` and the e2e suite pass.

## 12. Risks

| Risk | Mitigation |
|---|---|
| Fable runs out before F3 | Order F4 → F1 → F3; checkpoint commits; stop rule writes a handoff Codex can finish from. |
| Azimuth convention inversion | suncalc 2 is north-based (verified in `sun.ts`); F5 oracle + D30 independent table; a shadow-direction check in D33 ("a mass south of another casts northward at noon"). |
| Floor-level GFA definition disputes | ADR-0007 states the rule and tolerance explicitly; you accept it before C9 shows the number. |
| Setback offset fails on concave or self-touching boundaries | F3 fixtures include an L-shaped and a notched boundary; offset result validated with `isSimpleRing`. |
| Branch collisions with Codex C4/C5 | §8 worktrees; Claude is the only one who merges. |
| Overclaiming (sun hours, compliance) | QA-11 test, D34 audit, claim policy in every work order. |
