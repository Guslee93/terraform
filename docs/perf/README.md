# Performance harness (TF-VIS-011)

Build the current checkout, then run on the owner's machine with a working graphical desktop
and Playwright Chromium installed:

```sh
npm run build
node scripts/measure-perf.mjs --runs=3 --window-ms=6000 --label=foundation-baseline
```

The harness resolves paths relative to its own checkout, requires `dist/index.html`, and serves
that existing build with `npx vite preview` on a free loopback port. It does not build the app or
verify that `dist` matches HEAD: rebuild immediately before recording. It launches **headed**
Chromium at 1440 × 900 CSS pixels, device scale factor 2, with the studio's own render preference,
which is fixed at `auto` in `StudioShell.tsx` (the harness cannot force High without an app change).
On a hardware GPU Auto starts at High and drops a tier for the session only when a 3 s window
averages over 33 ms per frame (ADR-0018). Each window records `max3sMeanFrameMs`, the worst mean
frame interval over any 3 s span, and `downgradeRisk` when it exceeds 33 ms. Gaps between windows
(opening a card, waiting for a result) are not sampled, so a downgrade there would go unseen:
treat any run with `downgradeRisk` as invalid, and check the result visually if numbers jump.
Forcing High needs an app change (for example a URL parameter read by `StudioShell`); that is a
follow-up, not part of this harness.

Camera: every window except the orbit starts from the **3D** preset, clicked and allowed
1.5 s to settle. The orbit drag path is a function of elapsed time (`ORBIT` in the script) and
ends at the same pointer position every run. Each site/run has a fresh context, storage and HTTP cache. The browser
and preview process group are cleaned up on completion, errors, SIGINT and SIGTERM. Process
group cleanup targets macOS/Linux; an uncatchable OS kill cannot run cleanup.

Keep the browser visible and foreground, with a consistent display refresh rate and power mode.
Close competing workloads. Do not run tests or captures concurrently. A baseline is valid only
on the machine that recorded it; comparisons across machines are not regressions or gains.
The unmasked renderer is read from the studio canvas in every run. A renderer matching
`swiftshader|llvmpipe|software` prints **NOT a valid baseline** and sets `softwareRenderer`
to `true`. An unknown GPU also invalidates the baseline. Hardware rendering alone does not
establish a valid run: review missing metrics, page errors and timeout reasons.

## Options

| Option | Default | Meaning |
| --- | --- | --- |
| `--runs=N` | `3` | Positive integer runs **per site**, each in a fresh context. |
| `--window-ms=N` | `6000` | Positive integer target duration of each state window. Actual duration is recorded. |
| `--label=NAME` | UTC `YYYY-MM-DD` | Output basename in `docs/perf/NAME.json`. Letters, digits, dots, underscores and hyphens; starts with a letter or digit. Existing output with this label is overwritten. |

Use `--key=value` syntax. Unknown options and invalid values fail. Both `compact-infill` and
`sloped-edge` always run. UI/readiness/download timeouts are fixed at 60 seconds. There are no
CPU-throttling or headless options. Downloads are accepted in the temporary browser context,
counted, and removed when the context closes; this harness does not publish or retain PNGs.

## States and measurements

Every run measures these windows in sequence:

1. **idle**: untouched studio, default Noise card open; includes initial settling.
2. **orbit**: mouse drag on the canvas along a time-based path that ends at the same point
   every run; no camera reset before it, so it starts from the settled 3D preset of the idle window.
3. **sun**: open Sun; wait for no visible `Computing` or `Tracing where the water runs…` text for one second, bounded by 60 seconds.
4. **wind**: open Wind; the window includes its initial solve rather than waiting for it.
5. **water**: open Water, using the same bounded wait (the Water card shows `Tracing where the water runs…` while it loads and computes).
6. **slope**: open the containing Parameters group, find the checkbox named `Slope`, and check
   it. Water remains open. A missing/inaccessible control produces a null window with a reason.

This is a cumulative UI sequence, not six isolated scenes. Sun/Water waiting only establishes
absence of the displayed Computing message; it is not a guarantee that all network assets
have loaded or that an analysis succeeded. Failed preparation records a null window; subsequent
windows still attempt to run. Consult reasons and page errors before comparing results.

| Metric | Definition |
| --- | --- |
| `load.fcpMs` | Browser First Contentful Paint entry, milliseconds since navigation. |
| `load.timeToCanvasMs` | Browser clock when Playwright observes the first canvas visible, since navigation; polling/automation overhead is included. This is not the first rendered 3D frame. |
| `load.timeToDefaultCardMs` | Same clock when the Noise card is observed visible. Waits run concurrently with the canvas wait. |
| `durationMs` | Actual browser-clock span of the sample, including scheduling/automation delays. |
| `fps` | 1000 divided by the mean interval between sampled requestAnimationFrame callbacks. This measures callback cadence, not GPU presentation rate. |
| `frameMsP50/P95/P99/Max` | Nearest-rank interval percentiles and maximum in milliseconds, using consecutive callbacks wholly inside the window. No rounding or interpolation. |
| `longTasksCount` | Main-thread Long Task API entries starting inside the window with duration strictly greater than 50 ms. |
| `longTaskMsMax` | Maximum observed qualifying duration; null with a reason when there were none or the API was unavailable. A supported count of zero is a real measurement. |
| `drawCallsPerFrameP50/Max` | Differences in cumulative wrapped WebGL `drawArrays`, `drawElements` and instanced draw calls between callbacks. Includes zero-draw frames and all render passes; not triangle count or GPU time. Extension-specific draw entry points are not instrumented. |
| `heapMbBefore/After` | CDP `JSHeapUsedSize` divided by 1,000,000. No forced GC; excludes GPU memory and worker heaps. |
| `export.count` | Observed download events after clicking Image passes, Compact Infill only. Listener is installed before clicking and catches bursts. |
| `export.ms` | Node monotonic elapsed time from immediately before the click to the last observed download event (up to four), not disk-write completion. If fewer than four arrive within 60 seconds, the partial count/time is retained with a timeout reason; zero downloads means null time. |
| `pointerLatencyMs` | Null, with an explicit reliability reason. The helper draws one small four-corner block using the existing e2e sequence and waits for Storeys. It does not report a drag timing: changed canvas pixels cannot attribute the first changed frame to this block versus camera damping/analysis animation, and pixel readback changes timing. Drawing failure instead records its error. |

Higher fps means better average cadence; lower interval percentiles mean smoother frames. p95
and p99 expose slow frames that the average can hide. A short window has few tail samples, so
compare all runs and maxima as well as the median, under the same display and state sequence.
Instrumentation itself adds work; keep the harness and settings fixed for comparisons.

## Output and missing data

JSON includes the actual `git rev-parse HEAD`, CPU model, OS/release/architecture, Chromium
version, recording timestamp, settings and every run. GPU and `softwareRenderer` are per-run
because each uses a new context; these are a string and boolean respectively (both null with
`rendererReason` if unavailable). Measurements use `{ "value": number }`; unavailable metrics
use `{ "value": null, "reason": "..." }`. Whole unavailable windows use the same null wrapper.
No numeric fallback substitutes for missing evidence. A fatal run error is recorded as
`failure`; completed runs are checkpointed after each context closes.

The console table groups every numeric metric by site and window: measured-run count, median,
minimum and maximum. Null measurements are excluded from those aggregates; an entirely missing
metric shows null aggregates, never zero. Median is the middle observed value, or the arithmetic
mean of the middle two for an even count. Raw JSON values retain their numeric precision.

TF-VIS-011 implementation validation is limited to:

```sh
node --check scripts/measure-perf.mjs
npm run lint
```

The headed benchmark is deliberately reserved for the coordinator. Syntax/lint success does
not certify browser execution or create baseline evidence. The pointer null fallback is the
explicit allowance in the frozen work order, not a measured latency result.
