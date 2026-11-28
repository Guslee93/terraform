# Wind solver WebAssembly kernel

From the repository root, with the existing npm dependencies, Playwright Chromium,
and Rust 1.85.1 with the `wasm32-unknown-unknown` target installed:

```sh
rustc +1.85.1 --target wasm32-unknown-unknown --crate-type cdylib \
  -C opt-level=3 -C lto -C strip=symbols scripts/wind-wasm/lbm.rs -o src/features/analysis/lbm.wasm
node scripts/wind-wasm/benchmark.mjs src/features/analysis/lbm.wasm
```

The benchmark runs in a Chromium module worker. It checks both D2Q9 state
buffers and the velocity field after 301 steps at 2 m and 15 m on both curated
sites and a synthetic workload with 2,000 context buildings. It alternates implementation order, discards the first pair, and reports
the median of the next five pairs. The standalone kernel timing includes grid
allocation, buffer copies in both directions, and velocity extraction.

The full-stack case uses the existing flow runner at 270° on the curated sites
and 45° on the synthetic site. It compares ground velocity, slice heights,
slice masks and all slice velocities. The injected production step synchronizes
both distributions and the solid mask at every batch. The harness also compares
the sampled velocity ratios across all eight sweep bearings for the synthetic site.
Full-stack time includes geometry preparation, convergence, downwash and
upper-slice processing. It is a single run per implementation per site with
opposite run orders on the two sites. Wasm instantiation is reported separately
and excludes download.

The benchmark harness is outside the Vite application. Both application workers
load the same compiled module on demand.
