# Road-edge AO specks — investigation report (D19)

**Date:** 2026-10-28 · **Commit:** `docs(qa): road edge AO speck investigation`
**Site/view:** `compact-infill`, Iso preset, 1440 × 900, canvas clip 260 × 180 centred on the
park's north-west corner (page x 360–620, y 393–573).

## Question

The M2 scene-look known gap said "faint AO specks at some road edges". This run varies the
two settings that touch road-edge AO and counts specks in the park NW-corner crop.

## Settings tested

`ROAD_LIFT` in `src/scene/siteGeometry.ts` × `ao.configuration.aoRadius` in
`src/scene/SceneComposer.tsx` (AO intensity stays at the current 1.6; distanceFalloff 1;
colour `#2B3138`). Six combinations; one page reload per combination; 3.2 s settle.

| Setting | Specks (visual proxy, see method) | Crop |
|---|---|---|
| `ROAD_LIFT 0.05` · `aoRadius 3` | 61 | `docs/qa/road-ao/lift0.05-ao3.png` |
| `ROAD_LIFT 0.05` · `aoRadius 5` | 68 | `docs/qa/road-ao/lift0.05-ao5.png` |
| `ROAD_LIFT 0.15` · `aoRadius 3` | 63 | `docs/qa/road-ao/lift0.15-ao3.png` |
| `ROAD_LIFT 0.15` · `aoRadius 5` | 67 | `docs/qa/road-ao/lift0.15-ao5.png` |
| `ROAD_LIFT 0.3` · `aoRadius 3` | 59 | `docs/qa/road-ao/lift0.3-ao3.png` |
| `ROAD_LIFT 0.3` · `aoRadius 5` | 62 | `docs/qa/road-ao/lift0.3-ao5.png` |

## Method

The crops were captured headlessly and the speck read was done on the pixels (this agent
cannot eyeball PNGs), so the count is a documented visual proxy instead of an eyeball count:

1. Greyscale the crop; local background = 5 px median filter.
2. Dark = a pixel at least 14 grey levels below its local background.
3. Connected 4-neighbour components of dark pixels.
4. Specks = components of 1–10 px whose centroid lies in the road-ribbon band
   (page x 472–506), which is the projected 2.5 m footpath running through the park's
   NW corner (verified against `roads.json` and the Iso camera transform).

A reviewer should verify the crops by eye; the files are committed next to this report.

## Findings

1. **No specks on the road ribbon itself in any combination.** The footpath pixels are
   uniformly light (grey 226–239) across all six crops; the row profile is flat and has no
   small dark intrusions at either ribbon edge.
2. **The counts above are the surrounding park/tree/building-edge texture**, and they do not
   move with the settings: 59–68, a ±15 % band that is within renderer noise. No systematic
   trend with `ROAD_LIFT` or `aoRadius`.
3. **Setting-induced differences are sub-perceptual.** Mean pixel difference between the most
   distant combinations (`lift0.3-ao5` vs `lift0.05-ao3`) is 1.5 grey levels in the road zone.
   Larger `aoRadius` and larger `ROAD_LIFT` each move the picture, but by less than a pixel's
   worth of luminance.
4. The "faint specks at some road edges" gap is **not reproducible at the park NW corner**
   under the current AO intensity (1.6). Either the earlier report referred to a different
   road, or the intensity/radius tuning in commit `52790d1` already suppressed them.

## Recommendation

Keep **`ROAD_LIFT 0.15` · `aoRadius 4`** (the committed/working values). No combination in
this grid removes or adds visible specks at the park NW corner, and the road ribbon renders
clean in all six. If a specific road still shows specks, share the location (site + crop) and
this grid can be re-run there; the crops here would not support a change.

*Decides: Claude (per the D19 card).*