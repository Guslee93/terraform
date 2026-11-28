# ADR-0045 — WebAssembly kernel for wind workers

Accepted for the local application on 2026-11-28.

Both browser wind workers use the same optional Rust/WebAssembly implementation
of the D2Q9 step. The live worker uses it for ground fields and upper slices.
The sweep worker uses it for all eight bearings. The worker inputs are local
grids and obstruction masks, so the choice of kernel is independent of whether
a site is curated or imported, and of its location.

The TypeScript solver starts immediately. Each worker loads the versioned Wasm
asset on its first solve and can switch between batches. On unsupported grids
or when Wasm is unavailable, the TypeScript solver handles the step. Each
worker keeps authoritative distributions in JavaScript, preserving warm starts,
request cancellation, convergence and transfer of results. Copies occur once
per batch. No calculation parameters or output schemas change.

The stripped module is 16,982 bytes before compression. Vite emits it as a
hashed asset, requested only during wind analysis. The source is an outbound
port of the project's own TypeScript kernel, using the Rust 1.85.1 standard
library and no third-party crates or npm packages. Rust standard library code
is available under MIT or Apache-2.0. The pinned build command is documented
with the benchmark. The checked-in binary keeps Rust out of the regular npm
build and CI toolchain.

Runtime depends on grid size, number of slices, convergence, building geometry
and device. This decision accelerates the shared numerical kernel; it does not
set a per-site latency target or change site import or rendering.
