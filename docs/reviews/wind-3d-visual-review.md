# Wind W5 (3D look) — visual review

**Date:** 2026-11-06 · **Reviewer:** Claude (design-ui-finish-gate role) · **Reference:** Forma wind images (owner-supplied), `docs/plans/wind-3d-plan.md`
**Evidence:** `docs/screenshots/wind-3d-streamlines.png` (1440×900, High quality, `SHOT_EVIDENCE=1 npx playwright test e2e/wind-evidence.spec.ts -g W5`)

## Findings and outcome

| # | Severity | Finding | Outcome |
|---|---|---|---|
| 1 | major (claim) | Rise-over-roof is a rule, but no UI text said so (only a code constant) | Fixed: caption "Rise over roofs is a visual rule — the flow itself is layered 2D" under the streamline controls in 3D mode |
| 2 | major (truth) | m/s conversion treated the 10 m reference speed as the 2 m speed: every m/s value ~1.42× too high (comfort bands, ramp, roofs saturated magenta) | Fixed: `localSpeedMs = ratio × ref × profileFactor(2)` (≈ 0.70). 7 m/s at 10 m now reads strolling at 2 m, 10 m/s walking; tests updated to the corrected values |
| 3 | minor | ~130 long 3D streamlines buried the ground heatmap and hid the circle | Fixed: 72 lines (18 across × 4 heights), traced to 1.15 r, width 1.2, default opacity 0.65 |
| 4 | minor | Evidence helper expected a single claim (two since the C23 fix) | Fixed in `e2e/wind-evidence.spec.ts` (viewport-scoped check) |
| 5 | accepted | Ramp bar sits over the lower scene centre | Matches Forma placement; does not overlap the claim or scale legend |
| 6 | accepted | Roofs above the 35 m slice stay uncoloured | Documented limit; no curated building exceeds 20 m |
| 7 | accepted | 3D streamlines appear ~40–60 s after Wind is switched on | Height select shows "Upper heights computing…"; ground particles/streamlines show meanwhile |

## Verdict
Pass after fixes. Comparable to Forma's rapid view (image 2): ground + roof heatmap, m/s ramp, streamlines rising over roofs and swirling in the courtyard. Not comparable to Forma's detailed CFD (image 1) — by design (plan §3C).
