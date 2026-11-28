# Wind solver WebAssembly prototype

The Rust port retains the TypeScript solver's operation order and uses Float64
intermediates with Float32 storage. The prototype uses a single WebAssembly
instance with one grid allocation at a time. Chromium verified bit-for-bit
agreement on both population buffers and on velocities in four fixed-step cases.
The full runner also produced bit-identical ground and slice velocity fields
with matching slice heights and obstacle masks on both curated sites.

## Browser worker timings

Chromium 156.0.8078.4 on an Apple Silicon Mac. The stripped Rust 1.85.1 Wasm
binary is 16,982 bytes and instantiated in 0.4 ms in the final run. Timings are local
measurements in milliseconds.

| Site | Workload | TypeScript | Rust/Wasm | Speedup |
|---|---|---:|---:|---:|
| Compact Infill | 2 m kernel | 311.9 | 155.0 | 2.01× |
| Compact Infill | 15 m kernel | 133.4 | 66.2 | 2.02× |
| Sloped Edge | 2 m kernel | 464.2 | 220.3 | 2.11× |
| Sloped Edge | 15 m kernel | 148.4 | 73.5 | 2.02× |
| Compact Infill | 14-slice stack | 12,222.3 | 6,005.4 | 2.04× |
| Sloped Edge | 7-slice stack | 5,674.9 | 2,772.8 | 2.05× |

The stack test includes the cost of copying both population buffers to and
from Wasm after each batch of steps. It starts each run with a fresh solver,
covers one wind direction and excludes the studio's message scheduling,
rendering, and network latency. Fixed-step cases use five measured pairs
each. Full stacks use one measured pair per site. An earlier run
measured 1.89× and 2.05×, respectively. No other browsers or
interactive edit sequences were measured.

## Verification

- Production build, lint, and strict type-check of the experimental worker passed.
- 382 analysis tests passed and four opt-in checks were skipped.
- The checkout-wide suite reported 1,066 passes, four skips and 12 failures across import suites that use pre-existing missing PBF fixture files.
- Chromium required filesystem sandbox escalation to start on this Mac.
- The experiment adds no production dependency, build flag or bundle payload.
  Screen captures are inapplicable because the prototype has no UI.

The measurements justify a production integration candidate. Before switching
the application worker, an integration change should exercise cancellation,
warm starts, and the TypeScript fallback in the real worker entry point.

## Shared worker integration

The follow-up benchmark called the same Wasm adapter as the shipping workers.
The two curated stacks used 270°. A synthetic site with 2,000 context
buildings used 45° and produced 31 slices. Its directional sweep covered all
eight bearings. Each stack and the sweep are one timed run per implementation.

| Workload | TypeScript | Rust/Wasm | Speedup |
|---|---:|---:|---:|
| Compact Infill, 14 slices | 12.107 s | 6.225 s | 1.94× |
| Sloped Edge, 7 slices | 5.868 s | 2.853 s | 2.06× |
| Synthetic site, 31 slices | 12.681 s | 6.259 s | 2.03× |
| Synthetic site, eight directions | 10.171 s | 5.181 s | 1.96× |

All tested ground and lifted fields matched bit-for-bit, with matching masks
and slice heights. Sweep arrays matched bit-for-bit for finite samples, with
NaNs at the same positions. Unit coverage exercises changing grid dimensions,
odd/even buffer swaps, warm starts with edited geometry and load failure.
The original worker tests cover replacing rapid requests and transferring
the completed stack. A same-toolchain rebuild matched the bundled binary
byte-for-byte.

The same worker entry points serve imported and curated sites. Absolute times
will vary with the device, site geometry and number of additional heights.
The synthetic geometry broadens coverage and gives no site-specific timing
guarantee for live imports.

The production build emitted the shared 16,982-byte Wasm asset and both
worker entries referenced it. Lint and build passed. All three Chromium
wind specs passed against the production build, covering baseline and delta,
the direction sweep, and wind height controls. No visual changes were made.
An isolated copy with the missing PBF fixtures restored from HEAD passed
all 1,080 enabled Vitest cases. Four opt-in tests were skipped.
