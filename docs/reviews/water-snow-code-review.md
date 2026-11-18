# Review — Water (runoff) and Snow (ADR-0038, ADR-0039)

- **Date:** 2026-11-18
- **Reviewer:** DeepSeek V4 Pro (Cline), `engineering-code-reviewer` — Run 2 T1 (TF-VIS-002)
- **Scope:** commit `01c514b` — `src/features/analysis/{runoff,runoffWorker,useRunoff,snowClimate}.ts`,
  `src/scene/RunoffOverlay.tsx`, `src/components/studio/{WaterPanel,SnowPanel}.tsx`,
  `scripts/site-assets/{snow.build,utm33}.ts`, and the StudioShell wiring.
- **Commands run:** read-only. Adversarial grids run via a throw-away script under `/tmp` with
  `npx tsx`, importing `computeRunoff` from the repo. Full unit suite not re-run (read-only run;
  the report's own checks are in `build-foundation-report.md` §11).

## Findings

| Severity | File / area | Issue | Recommendation | Status |
|---|---|---|---|---|
| — | runoff.ts:114–175 | Priority-Flood+Epsilon and D8 are correct: no pits, no cycles, full conservation | None | — |
| convention | runoff.ts:143–160 | D8 tie-break is NW-first (strict `drop > best`, `dr=-1..1` outer). Deterministic but not stated in a comment; it is the documented divergence from WhiteboxTools' tie order | One comment naming the tie-break rule | open |
| claim (minor) | runoff.ts:95,121,154 vs runoff.ts:14 | `RUNOFF_LIMITS` says only the tile **edge** is an outlet, but the code also treats no-data (NaN) cells as outlets/sinks (`ground=-1e9`, seeded, receiver −2). No NaN cells exist in the shipped 624×734 tile, so it is invisible today | Note "cells without data are outlets" in `RUNOFF_LIMITS`, or accept the code comment as sufficient | open |
| convention (minor) | snowClimate.ts:57–68 vs 71 | `monthlyMeanDepthCm` accumulates **every** day, including partial winters at the series ends, while `winters` drops those partial winters. The build dates (1 Sep 1990 → 31 Aug 2020) have no partial winters, so the two agree; the function itself would not if given ragged input | Document the "monthly means use all days" choice, or restrict them to whole winters | open |
| performance (minor) | useRunoff.ts:33–34 | The `footprints` reference is compared by identity; a caller that rebuilds the array each render would restart the worker and show "computing" on every render. StudioShell memoises `runoffFootprints`, so it is fine today | Add a comment that the caller must memoise `footprints` | open |

No `correctness` finding, no `blocker`/`major`.

## Check-by-check

### 1. Priority-Flood+Epsilon and D8 — correct

Adversarial grids (all 1 m cells, minX=minY=0), run against `computeRunoff`:

| Grid (input) | Expected | Got | Verdict |
|---|---|---|---|
| flat 3×3 all `10` | no depressions, no pits, all 9 drained | class `. . .`, `drained=9 cells=9 pits=0`, conserved | ✓ |
| 3×3 centre `0`, ring `10` | centre filled to ~10, marked depression | centre `D`, `drained=9 pits=0`, conserved | ✓ |
| 3×3 centre `NaN` | NaN is a sink; 8 cells drain into it | `drained=8 cells=8 pits=0`, conserved | ✓ |
| 3×3 centre `0` with a full-coverage building block | building raised, no depression under it | all `B`, `drained=9 pits=0`, conserved | ✓ |
| flat 5×5 all `10` | no depressions, no pits, all 25 drained | `drained=25 cells=25 pits=0`, conserved | ✓ |

The fill leaves no pit and the accumulation is conserved in every grid. The D8 receiver graph is a
DAG (strictly descending), so there is no cycle; `runoffSummary.conserved` correctly detects pits
(`pits === 0 && |drained − cells| < 0.5`).

**Bearing on the 67 % main-path disagreement (PR #23):** no correctness bug. The disagreement is
explained by the three *documented* method choices in `docs/qa/runoff-reference.md` — epsilon
gradient vs WhiteboxTools' `--fix_flats` flat gradient; the NW-first neighbour order on exact ties;
and "off the tile is always downhill" edge routing. All three move main-flow-path cells on the
extensive filled flats of the bare/urban terrain, but they are modelling choices, not defects.
Nothing here should be "fixed" to chase the WhiteboxTools number.

### 2. Worker lifecycle (`useRunoff.ts`) — correct

`250 ms` debounce, `cancelled` flag, `terminate()` on cleanup, buffer transfer in
`runoffWorker.ts:17` (`postMessage(response, [accumulation.buffer, hollow.buffer, building.buffer])`).
`state.raster !== raster` returns `null` (stale raster never shown); `state.footprints !== footprints`
keeps the last result visible while marked `computing`. See the one performance note above.

### 3. Claims — no violation

`RUNOFF_NOTE`/`RUNOFF_LIMITS`/`RUNOFF_COURTYARDS` (runoff.ts:13–16) carry no depth, volume,
rainfall, return period. `SNOW_NOTE`/`SNOW_LIMITS` (snowClimate.ts:11–12) carry no snow load,
drift or accumulation. WaterPanel.tsx:26 and SnowPanel.tsx:13 say "not available on imports".
No banned claim word appears in the reviewed strings.

### 4. Snow statistics — correct for the build

`winterStatistics` (snowClimate.ts:52–83) buckets 1 Sep–31 Aug winters, keeps only
`days >= 365 && missing <= 10`, computes median/min/max, and month means for Oct–May. The build
(snow.build.ts:20–21) requests exactly 1990-09-01 → 2020-08-31, so 30 whole winters
(`toHaveLength(30)`). The `sd` theme only is read; `snowload` is named and refused (snow.build.ts:11–12).
`toUtm33` reproduces the feasibility origin to < 1 mm (snow.build.ts:23–28).

### 5. Provenance — correct

`snow.build.ts:51` registers `licence: 'NLOD'` (no version) with the "no version stated" wording in
the attribution; the ADR-0039 correction is applied. Exports carry the layer credits via
`exportCreditLines` (not re-traced here).

### 6. Performance — the heavy work is off the main thread

`computeRunoff` runs in `runoffWorker.ts`. On the main thread, `runoffSummary` (runoff.ts:188) and
`runoffPixels` (RunoffOverlay.tsx:11) are each one O(cells) pass, both memoised, over the
458 016-cell tile — a few ms each per result. Acceptable; no per-frame O(cells) work found.

## Gate decision

- [x] Pass with follow-ups

## Follow-ups (separate tasks, not sneaky edits)

1. Optional: document the D8 NW-first tie-break and the no-data-as-outlet behaviour in a comment /
  the `RUNOFF_LIMITS` text.
2. Optional: make `winterStatistics` restrict `monthlyMeanDepthCm` to whole winters, or document
  the "all days" choice.
3. The 67 % disagreement remains a *method* question, not a defect: if it is ever to be closed,
  isolate the epsilon-fill vs `--fix_flats` difference on a bare flat-and-basin fixture (already the
  next step in `docs/qa/runoff-reference.md`).

## Notes

- Read-only review; no source, script, config or fixture changed.
