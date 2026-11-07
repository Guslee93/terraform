# Wind analysis — status audit

**Date:** 2026-11-07 · **Reviewer:** Claude · **Method:** walked through every wind view in the dev build (Compact Infill: Comfort, Direction, circle moved to the terrain edge, Off/Noise switching) and checked the code behind each finding. This is a read-only audit: nothing has been fixed yet.
**Build checked:** `e55136f` (the same code as the live Vercel deploy).

## Overall status

The wind feature works end to end and is stable. No crashes were found in this pass; the one crash found earlier (reduced-motion Play demo) is already fixed. The issues below are **consistency and clarity** problems, plus one data gap in Delta, rather than broken features.

## Verified working

- Wind on/off/Noise switching cleans up every overlay (claim, ramp bar, particles); the noise legend is unaffected.
- Comfort view: legend shares add up (81 / 12 / 5 / 1 / 1 %), the bands match the map, and the "activity at this wind only" note is shown.
- Analysis circle: moving it (mouse or arrow keys) re-solves at the new spot, the heatmap is hard-clipped at the circle, and overlays drape on the terrain even at the site edge (heights are clamped).
- Resolution caption: the "about 1.8 m" figure matches the formula (2 × r × 1.4 ÷ 160).
- The screening claim stays on the viewport with the panel closed.
- Height slices progress to 4/4, then unlock the 3D streamlines and roof colours.

## Findings

| # | Severity | Area | Finding | Evidence | Suggested fix |
|---|---|---|---|---|---|
| 1 | **Medium** | Graphics / information | **Particles use the old colour scale.** In every view, particles are coloured by the old speed-ratio bands (blue → red), while the map uses Lawson colours (Comfort) or the white → blue → magenta m/s ramp (Direction). In the jet, red particles sit on a blue/violet map, so the two colour languages contradict each other. | `WindParticles.tsx` line 69 uses `speedBand()`; screenshots in Direction and Comfort | Colour particles with the same `windColour()` as the map, or make them neutral (dark blue, like Forma's streamlines) in Comfort/Direction |
| 2 | **Medium** | Information / a11y | **The Direction view has no legend in the panel.** The list renders empty (`legend: []` for Direction), so there are no shares and nothing for screen readers. The ramp bar has `aria-label` on a plain `div` with no role, which screen readers ignore. | `climateView.ts` line 191; `WindRampBar.tsx` line 4 | Show m/s bands with area shares (0–2, 2–4 … 10+) in the panel, with ramp-matched colours; give the ramp bar `role="img"` |
| 3 | **Medium** | Data | **A baseline taken before the upper heights finish has no roof data.** "Set baseline" only waits for the ground field to settle, so a baseline set in the first ~8 s has partial or no height slices, and roofs then show no delta colour. | `StudioShell.tsx` line 501: `canSetBaseline={!!freshFlow?.settled}` | Require `slicesComplete` as well, or record which heights the baseline has and say so |
| 4 | Low | Information | **Comfort legend doesn't say it covers ground cells only.** Roofs are coloured with the same Comfort bands but not counted, which can confuse when roofs look windy and the legend says "81 % sitting". | `buildClimateView` samples the ground lattice only | Caption: "Shares are for open ground inside the circle" |
| 5 | Low | Information | **The Comfort bands merge two Lawson classes.** The UI shows "Uncomfortable 8–15 m/s", while the comfort maths (`comfort.ts`) has a 10 m/s threshold (class E is 8–10; above 10 is beyond E). Not wrong for a momentary view, but inconsistent with the domain module. | `climateView.ts` ACTIVITY_BANDS vs `LAWSON_NORCONSULT.thresholds` | Either split at 10 m/s or note "uses thresholds 2/4/6/8 and the 15 m/s safety limit" |
| 6 | Low | Information | **The downwash toggle only affects the ground level**, not roofs or 3D streamlines. Not stated in the UI. | `flowRunner.ts`: the boost is applied to the ground slice only | Add "(ground level)" to the caption |
| 7 | Low | Graphics | **The analysis-circle ring is hard to see** behind buildings and over the heatmap (seen again at the street edge). | Screenshot | Draw the ring on top (no depth test) at higher contrast, or as a dashed ring like the study boundary |
| 8 | Low | Behaviour | **Play demo overwrites settings changed during the demo.** It restores the settings captured at start, so a change made while it runs is lost. | `useWindDemo`: `onWindChange({ ...wind, from })` uses the start snapshot | Acceptable for a recording tool; or stop the demo on any panel input |
| 9 | Known limit | Physics | **Low-rise clusters overstate the ground-level speed-up** (Sloped Edge, 12–28 % of the circle above 1.3× from six directions). The 2D slice can't send wind over low roofs. | `docs/research/wind-validation-note.md` (direction sweep) | Owner decision: canopy-drag model, or the true 3D run (W6) |
| 10 | Known limit | Performance | 3D streamlines run at about 9 fps in headless **software** GL (baseline 14). A real GPU should be fine, but this is unmeasured on a real laptop. | `e2e/wind-perf.spec.ts` | Measure once on a real machine; reduce segments further if needed |
| 11 | Known limit | Data | **The wind direction is a manual choice**, with no wind rose or annual comfort. | — | Needs a MET Norway Frost client ID (the plan is in the chat) |
| 12 | Not wind | Tests | The `m4-recovery` e2e spec is flaky under parallel load (passes serially, 6/6). | Session report | Mark the spec serial |

## Recommended order

1, 2 and 3 first (about 1–2 h together; all small, local changes plus tests). Then 4–7 (copy and visual polish, under 1 h). Items 9–11 need your decisions.

## Resolution (2026-11-07)

All 8 fixable findings are resolved; 9–12 are unchanged (known limits / not wind).

| # | Fix | Evidence |
|---|---|---|
| 1 | `particleColour()`: particles use the map's scale (Lawson in Comfort, m/s ramp in Direction); neutral dark blue in Delta | Unit test; browser: no red particles in the jet |
| 2 | Direction legend in m/s bins (0–2 … 10+) with ramp-matched colours and shares; the ramp bar is `role="img"` with a description | Unit test; browser: "0–2 m/s 81 % …" |
| 3 | "Set baseline" also waits for the whole height stack (`slicesComplete`) | Browser: disabled at 4 s, enabled once complete |
| 4 | Caption: "Shares are for open ground inside the circle; roofs are coloured but not counted." | Browser |
| 5 | Comfort split at the Lawson 10 m/s threshold: Uncomfortable 8–10, Very uncomfortable 10–15, Unsafe > 15 | Unit test |
| 6 | Downwash caption ends "Applies at ground level only." | Browser |
| 7 | Ring drawn on top as a dashed dark line over a white halo | Browser screenshot |
| 8 | An edit during Play demo stops it, restores the saved settings and keeps the edit (`stopWith`) | Two unit tests |

Gate: lint ✅ · 991 unit tests ✅ · build ✅ · e2e wind/wind-a11y/smoke/layers 11/11 ✅.
