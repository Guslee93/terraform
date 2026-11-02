# M3 — Live-analysis evidence record (D33)

- **Date:** 2026-10-29 · **Branch:** `deepseek/round6` (worktree `../Terraform-ds4`) · **Role:** `engineering-senior-developer` / QA
- **Ingress:** `docs/milestones/M3-live-analysis.md` (Evidence section), `docs/qa/fixtures.md`, `docs/plans/M3-fable-plan.md` §10 D33 and §11 (M3 gate)
- **Screenshots:** `docs/screenshots/m3-*.png` (fixed cameras, 1440×900, render quality pinned High) — recaptured 2026-11-02 on the Studio v2 editor layout (ADR-0010); values unchanged, chrome changed

All fixture rows are asserted by the named tests; the values under "Actual" are the values those
assertions enforce. The full suite ran green on this branch: `npm run lint` ✅ · `npm run typecheck`
✅ · `npm run test` 699/699 ✅ · `npm run test:e2e` 18/18 ✅ (incl. the new `e2e/m3-analysis.spec.ts`,
`e2e/m3-disclaimers.spec.ts` and the opt-in evidence spec `e2e/m3-evidence.spec.ts`).

---

## 1. Fixture table — expected vs actual

### 1.1 Area, height and volume (`docs/qa/fixtures.md` §2)

| Fixture | Expected | Actual | Test (all pass) |
|---|---|---|---|
| Rectangle 18 × 12 m, 3 × 3.2 m | footprint 216.00 m² · height 9.60 m · GFA 648.00 m² · volume 2 073.60 m³ | same values asserted | `metrics.test.ts` — "rectangle fixture: 216 m² footprint, 9.6 m, 648 m² GFA, 2 073.6 m³" |
| L-shaped 20 × 10 − 10 × 5 notch, 2 × 3.2 m | footprint 150.00 m² · height 6.40 m · GFA 300.00 m² · volume 960.00 m³ | same values asserted | `metrics.test.ts` — "L-shaped fixture: 150 m², 6.4 m, 300 m² GFA, 960 m³" |
| Stepped mass (lower 20×10×3, upper 10×8×2 at 9.6 m) | ground union 200.00 m² · GFA 760.00 m² · volume 2 432.00 m³ · max height 16.00 m · five storeys · shared slab at 9.6 m counted once | same values asserted | `metrics.test.ts` — "stepped fixture: ground 200 m², GFA 760 m², 2 432 m³, 16 m, five storeys"; "stepped mass: five levels, the shared slab at 9.6 m counted once (fixtures §2)" |
| Same-level overlap (two 10×10 tiers, offset 5 m, 1 storey) | level area 150.00 m² (union, not 200) | 150.00 m² asserted | `metrics.test.ts` — "two tiers overlapping at the same level: the level is their union, not their sum" |
| Same two as separate buildings, 2 storeys each | scenario GFA 300.00 m² · per-building sum 400.00 m² | both asserted | `metrics.test.ts` — "interpenetrating buildings: scenario GFA is the level union, per-building sum is larger" |

### 1.2 Site coverage (`fixtures.md` §2, parcel 40 × 50 m = 2 000.00 m²)

| Case | Expected | Actual | Test (all pass) |
|---|---|---|---|
| Rectangle footprint 216 m² inside | **10.80 %** | 10.80 % asserted | `metrics.test.ts` — "rectangle footprint 216 m² on a 2 000 m² parcel → 10.80 %" |
| Stepped mass ground footprint 200 m² | **10.00 %** | 10.00 % asserted | `metrics.test.ts` — "stepped mass ground footprint 200 m² → 10.00 %, the upper tier adds nothing" |
| Rectangle centred 15 m east (spans 6–24 m) | 168 m² inside · 48 m² outside · **8.40 %** | all asserted | `metrics.test.ts` — "footprint crossing the parcel edge is split: 168 m² inside, 48 m² outside" |
| Rectangle fully outside | **0 %** · 216 m² outside | asserted | `metrics.test.ts` — "footprint fully outside the parcel → 0 % coverage, all of it reported outside" |
| 10 × 10 m sharing the parcel edge and a corner | 100 m² inside · 0 outside | asserted | `metrics.test.ts` — "a footprint sharing the parcel edge and a corner is fully within (touching is not crossing)" |
| 60 × 70 m footprint over the whole parcel | **100 %** · 2 200 m² outside | asserted | `metrics.test.ts` — "a mass larger than the parcel covers 100 % with the rest outside" |

### 1.3 Constraint envelope (`fixtures.md` §3)

| Case | Expected | Actual | Test (all pass) |
|---|---|---|---|
| Footprint inside parcel + setback, 9.6 m vs 12 m | `Within demo envelope` | same status asserted | `constraints.test.ts` — "footprint fully inside parcel and setback, 9.6 m vs 12 m limit → Within demo envelope" |
| Footprint crossing the parcel edge | `Exceeds demo envelope`; 48 m² outside boundary, 96 m² outside the 4 m setback | status + offending part asserted | `constraints.test.ts` — "footprint crossing the parcel edge → Exceeds, with the offending part outside the boundary" |
| Footprint fully outside parcel | `Exceeds`; outside area never counts as coverage | asserted | `constraints.test.ts` — "footprint fully outside the parcel → Exceeds with the whole footprint as offending geometry" |
| Inside parcel but over the setback line | `Exceeds`, outside-setback only | asserted | `constraints.test.ts` — "footprint inside the parcel but over the setback line → Exceeds for the setback only" |
| Footprint on the setback line exactly | `Within` (slivers < 0.01 m² ignored) | asserted | `constraints.test.ts` — "a footprint sharing the setback line exactly is within (no sliver violations)" |
| Height 16.0 m vs 12 m limit | `Exceeds`, 4.0 m excess | asserted | `constraints.test.ts` — "height 16.0 m vs 12 m limit → Exceeds with a 4 m excess" |
| No constraint configured | `Not evaluated` for scenario and every mass | asserted | `constraints.test.ts` — "no constraint configured → Not evaluated for the scenario and every mass" |
| Setback of a 40 × 50 m boundary by 4 m | 32 × 42 m = 1 344 m² | asserted | `constraints.test.ts` — "insets a rectangle exactly" |
| Setback of the L-shaped boundary by 1 m | 95 − π/4 ≈ 94.21 m², one simple ring | asserted | `constraints.test.ts` — "handles an L-shaped (concave) boundary: 95 − π/4 m² with a rounded reflex corner" |
| Setback of a dumbbell boundary (2 m neck) by 2 m | two simple rings, 2 × 36 m² + lenses | asserted | `constraints.test.ts` — "splits a notched (dumbbell) boundary into two polygons when the neck is narrower than 2d" |
| Height reference (ADR-0008) | grade = lowest terrain under the ground tier; same mass reads 9.6 m from grade and 8.6 m from datum on a 1:10 slope | asserted | `constraints.test.ts` — "the same mass is taller from grade than from datum on a falling slope" |

### 1.4 DST and zone fixtures (`fixtures.md` §4 + `dst-oslo.json`, tzdata 2026.6)

| Case | Expected | Actual | Test (all pass) |
|---|---|---|---|
| Spring gap 2026-03-29 02:30 | never occurred; instant = 01:30Z; shown 03:30 CEST | asserted | `time.test.ts` — "fixtures §4: 01:30Z on 2026-03-29 reads 03:30 local, not 02:30"; D32 e2e shows the panel note |
| Autumn overlap 2026-10-25 02:30 | two occurrences; default to the earlier (CEST) | asserted | `time.test.ts` — "defaults an overlap to the earlier (CEST) occurrence" |
| Both transition kinds present 2026–2028, all fixture rows | gap/overlap instants match `dst-oslo.json` | asserted | `time.test.ts` — "has both transition kinds for 2026–2028", "resolves normal-day controls from the fixture" |
| 23-hour spring day scrubber | no 02:xx minutes exist; they display as 03:xx | asserted | `time.test.ts` — "a 23-hour spring day has no 02:xx minutes: they display as 03:xx" |

## 2. Sun reference table (`fixtures.md` §4, pvlib 0.15.2 NREL SPA vs suncalc 2.1.1)

| Timestamp (Europe/Oslo) | Independent az. | Independent el. | SunCalc az. | SunCalc el. | Δ | Verified by |
|---|---|---|---|---|---|---|
| 2026-03-20 12:00 | 172.96° | 29.85° | 172.95° | 29.86° | ≤0.02° | `sun-reference.test.ts` — "fixtures §4 row … suncalc within 0.05° of the independent value" |
| 2026-06-21 12:00 | 150.58° | 51.01° | 150.57° | 51.01° | ≤0.01° | same |
| 2026-09-22 12:00 | 160.01° | 28.82° | 160.01° | 28.82° | <0.01° | same |
| 2026-12-21 12:00 | 176.53° | 6.71° | 176.53° | 6.71° | <0.01° | same |
| 2026-12-21 23:00 | 331.82° | −51.21° | 331.82° | −50.73° | 0.48° | same (below-horizon row) |

Additional oracles: every daytime row of `docs/qa/sun-reference/nrel_spa_reference.json` (Oslo and
Tromsø, hourly on the four dates, 80+ rows) within **0.5°** of NREL — `sun-reference.test.ts`
"… suncalc and NOAA within 0.5° of NREL"; the NOAA general solar-position equations (test-only
oracle `__fixtures__/noaa-oracle.ts`) agree with suncalc every hour of 2026 at Oslo and Tromsø —
"both agree the sun is up or down at every hour, except within 0.5° of the horizon". Shadow
direction vs the north arrow is a D33 visual check: "a mass south of another casts northward at
noon" (fixture row in `fixtures.md` §4).

## 3. QA results

| QA | Result | Test name(s) |
|---|---|---|
| **QA-06** Boundary crossing warning | PASS — inside/crossing/fully-outside/crossing-upper-tier/float/cut all flagged | `clearance.test.ts` — "reports nothing for a mass fully inside", "flags a mass crossing the boundary", "flags a mass fully outside", "flags a crossing upper tier even when the base tier is inside", "flags a mass floating above the ground with the gap", "flags a mass cutting into a slope with the depth"; envelope side in `constraints.test.ts` (table §1.3); end-to-end in `e2e/m3-analysis.spec.ts` "D32: a mass drawn across the study boundary exceeds the envelope and its warning selects it" (Exceeds + "outside the setback" + warning re-selects) |
| **QA-10** Deterministic sun vector | PASS — identical state for the same site/date/time, including after a JSON reload | `sun.test.ts` — "QA-10: the same site, date and time give an identical state, including after a JSON reload" |
| **QA-11** Winter/no-sun state | PASS — night is below the horizon with no direction and no sun-hours wording; polar night stays below all day | `sun.test.ts` — "QA-11: winter night is below the horizon with no direction and no sun-hours wording"; "polar night keeps the sun below the horizon all day (QA-11 for the scrubber)"; UI chip in `e2e/m3-analysis.spec.ts` "D32: winter solstice evening shows the Sun below horizon chip and no elevation readout" |
| **QA-15** No-WebGL fallback | PASS — accessible "3D view unavailable" fallback, zero canvases, inspector still usable (incl. metric-relevant controls) | `e2e/m3-rendering.spec.ts` — "no WebGL leaves an accessible fallback and the inspector available" |

## 4. Screenshot manifest — what each file should show (for Claude's visual review)

All files are 1440×900 PNGs captured on `/studio/compact-infill` with the **Iso** preset, render
quality pinned High, fixed 1440×900 viewport and `prefers-reduced-motion: reduce` (camera snaps).
The Inspector is open on the **Sun** tab for the time shots and on the **Constraints** tab for the
envelope shots.

| File | Should show |
|---|---|
| `docs/screenshots/m3-morning-21jun-1440x900.png` | 21 June 09:00. Iso view, morning light from the ESE (azimuth ≈ 100°, elevation ≈ 33°): long sun shadows pointing west-north-west across the terrain, the Sun readout "Elevation 32.8° · azimuth 100° (E/ESE)" and the Morning preset pressed. |
| `docs/screenshots/m3-noon-21jun-1440x900.png` | 21 June 12:00. Iso view, high south sun (azimuth ≈ 151° SSE, elevation ≈ 51°): short, compact shadows falling mainly north-north-west; readout ≈ 51° and the Noon preset pressed. |
| `docs/screenshots/m3-evening-21jun-1440x900.png` | 21 June 18:00. Iso view, sun low to the west (azimuth ≈ 266°, elevation ≈ 30°): long east-falling shadows; Evening preset pressed. |
| `docs/screenshots/m3-noon-21dec-1440x900.png` | 21 December 12:00. Iso view, winter sun barely above the horizon (azimuth ≈ 177°, elevation ≈ 6.7°): very long, nearly due-north shadows; Winter solstice + Noon pressed. |
| `docs/screenshots/m3-below-horizon-21dec-1800-1440x900.png` | 21 December 18:00 (sun elevation ≈ −18°). Iso view, night state: no directional light, colder hemisphere light, the "Sun below horizon" chip top-left over the canvas and the same text in the Sun readout; no elevation/direction line. |
| `docs/screenshots/m3-envelope-violation-iso-1440x900.png` | Daylight (21 June 15:00). A ≈ 24 × 30 m, 7-storey (22.4 m) mass straddling the study boundary's west edge. Constraints tab: "Exceeds demo envelope" with "Illustrative constraint — not planning advice" beneath it; the warning lists "outside the study area · outside the setback · 4.4 m above the limit (above grade, ref −0.1 m)"; amber mass tint and amber setback/boundary lines; the translucent height-limit plane at 18 m above grade, with the mass rising 4.4 m through it. *(Recaptured by Claude: the first capture was taken at night with a ≈ 205 × 78 m slab.)* |
| `docs/screenshots/m3-envelope-violation-closeup-1440x900.png` | The same scene dollied in. The height-limit plane (accent, 0.18 opacity, 8 m minimum rim around the footprint) reads as a lid at 18 m that the 22.4 m mass pierces. |

Shadow-direction orientation for the visual review: on 21 June the sun is south of the site all
day, so any mass south of another casts northward — especially clear in `m3-noon-21jun`.

## 5. Reproduction

```bash
git switch -c deepseek/round6 main && npm ci          # worktree ../Terraform-ds4
npm run lint && npm run typecheck && npm run test
npx playwright test                                    # full e2e suite (18/18)
SHOT_EVIDENCE=1 npx playwright test e2e/m3-evidence.spec.ts   # (re)capture docs/screenshots/m3-*
```

Known limitations recorded elsewhere: QA-09/QA-12/QA-13 belong to M4/M5; the "exactly at the limit"
height row is asserted in `constraints.test.ts` ("exactly at the limit is within"); no new product
code was changed by this evidence pass.