# Run 7 — progress ledger

The run book is the owner's "Run 7" prompt. One task per commit. Update this file at the start and
end of every task, and push it. Statuses: `todo`, `in progress`, `done`, `partial`, `blocked`.

All work attributed as **DeepSeek V4 Pro (Cline)** in commit trailers, `docs/agent-log.md`,
`progress.md` and this ledger.

## Run summary

_(Filled at the end of the run.)_

## Environment

- **Machine / OS:** Apple MacBook, macOS 15.7.3 (Build 24G419), arm64.
- **Node:** v22.23.1 · npm 10.9.8.
- **Browser:** Google Chrome (system) via Playwright Chromium.
- **GPU (headed):** `ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro, Unspecified Version)` — a
  hardware GPU, so the **pixel safety net is available** and baselines can be created locally.
- **GPU (headless):** SwiftShader (`ANGLE (Google, Vulkan … SwiftShader Device …)`).
- **Remote:** `origin` = `https://github.com/Guslee93/terraform.git`; `gh` authenticated as
  `Guslee93` (`repo`, `workflow`, `gist`, `read:org` scopes).
- **Base:** `origin/run1/foundations` @ `fe43015` (matches the local remote-tracking ref).

## Tasks

| # | Task | Status | Commit(s) | Checks (last lines) | Open items |
|---|---|---|---|---|---|
| T1 | Fix the Visual Lab's blank first view (TF-VIS-015 follow-up) | done | a1682ea | typecheck 0 · lint 0 · unit 1234 passed / 4 skipped / 1 todo · build OK (903 ms) · chunk 0 · LAB=1 e2e 3 passed | Root cause: min-height-only section (Safari %-height collapse); fixed per breakpoint in LabPage.tsx only |
| T2 | TF-VIS-020 stage A: the `IDENTITY` style (Lab only) | done | e87fe15 | typecheck 0 · lint 0 · unit 1241 passed / 4 skip / 1 todo · build OK · chunk 0 · VISUAL=1 5/5 (NORDIC pixel-identical) · Lab IDENTITY renders | All identity values provisional (owner tunes); chunk delta StudioPage.js +81 B gzip |
| T3 | TF-VIS-053: contours from the 1 m tile, selected by style | done | ed55abc | typecheck 0 · lint 0 · unit 1245 passed / 4 skip / 1 todo · build OK · chunk 0 · VISUAL=1 5/5 · Lab identity+1 m renders (no errors) | 1 m pass median 128.6 ms / max 135.5 ms → worker; minor fade ≈1.5× isometric (provisional); prod chunk +~1.5 kB (dead for NORDIC) |
| T4 | TF-VIS-02A: atmospheric terrain dissolve (Lab only) | done | b73f592 | typecheck 0 · lint 0 · unit 1249 passed / 4 skip / 1 todo · build OK · chunk 0 · VISUAL=1 5/5 · Lab identity+dissolve renders | dissolve values provisional; overlays not faded, depth pass unchanged |
| T5 | TF-VIS-040 part B: `MapLegend` component (Lab only) | done | deba3c0 | typecheck 0 · lint 0 · unit 1253 passed / 4 skip / 1 todo · build OK · chunk 0 · Lab noise legend renders | claim text = existing caption functions; studio caption blocks untouched |
| T6 | TF-VIS-029: airy point-cloud vegetation (Lab only) | done | 24cbc98 | typecheck 0 · lint 0 · unit 1258 passed / 4 skip / 1 todo · build OK · chunk 0 · VISUAL=1 5/5 · Lab identity+points renders | Points hidden in depth/white passes; forest fill skipped (optional) |
| T7 | Lab stage picker A/B/C + reproducible URLs | done | 70f39e3, f2784c5 | typecheck 0 · lint 0 · unit 1267 passed / 4 skip / 1 todo · build OK · chunk 0 · LAB=1 e2e 3 passed · 5 screenshots captured | Screenshots in docs/screenshots/vis/run7/ (preview, not baseline) |
| T8 | Stretch: TF-VIS-046 stale-result / rapid-change tests | todo | — | — | — |
| T9 | Stretch: TF-VIS-021 fat-line system (Lab only) | todo | — | — | — |

## Decisions I made

- **T2 — `IDENTITY` provisional values** (all will be tuned by the owner in the Lab): background
  `#171B19`; context `#EEEDE8` @ roughness 0.92; road `#2C312E`; water `#26302F` @ roughness 1
  (flat, no reflections); contour minor/major `#F7F7F2` @ 0.16/0.38; crease `#9DA49F` @ 0.6; AO
  `#0E1110` @ intensity 1.6; parcel/section keep NORDIC. `groundTint = { saturation: 0.2,
  lightness: 0.5 }` — `saturation` is the *kept* chroma fraction (0.2 = "desaturated by 0.8") and
  `lightness` a multiplicative factor, applied to **both** the land-cover paint and the near-white
  terrain vertex colours; the terrain material multiplies them, so 0.5² lands the ground near the
  `#2A2F2C`–`#3A403C` target. Marked provisional in the code comment.
- **T2 — no separate `fog` field.** Fog colour already equals the background (ViewportCanvas.tsx
  `fog args`), and the identity fog colour is the background, so a separate field was unnecessary.
- **T2 — `waterRoughness` added** to carry the "flat, no reflections" water without a second
  material path (NORDIC stays 0.55).
- **T3 — 1 m contours run in a worker.** Measured `rasterContourSegments` on the curated
  compact-infill tile (624×734 = 458 016 cells): 1 m interval median 128.6 ms / max 135.5 ms,
  5 m interval median 113.6 ms / max 114.1 ms (5 runs) — well over the 16 ms main-thread budget, so
  a worker computes them and transfers flat Float32Arrays. Segment counts at 1 m: 69 423 minor +
  15 581 major.
- **T3 — 1 m contours are placed on the drawn 16 m surface.** Each vertex's elevation is re-sampled
  through `sampleTerrainHeight` (the 16 m mesh's height function) and lifted by the shared
  `CONTOUR_LIFT` (0.15 m), so the finer lines never float or sink where the 1 m tile differs from
  the 16 m mesh.
- **T3 — minor-contour zoom fade (provisional).** Minor contours fade out beyond 1.5× the isometric
  preset distance (~774 m on compact-infill; band ends at 1.35× that), via a distance-fade shader.
  Majors keep full opacity.
- **T3 — production chunk delta ~1.5 kB gzip** (a 728 B `rasterContourWorker` chunk + the 1 m
  rendering code in `StudioPage`/`SceneComposer`). It is dead code for `NORDIC` (never invoked) and
  the pixel safety net passes 5/5; it follows the existing worker pattern. If the owner wants a
  strict ±0.5 kB bar on every task, the 1 m hook/worker can move into the Lab chunk (deferred).
- **T4 — dissolve band (provisional).** `dissolveRange` = `start = max(study-area bounding radius
  + 200 m halo, analysis-circle radius)`, `end = terrain bounding radius`. On compact-infill that is
  ≈353 m → ≈482 m; on sloped-edge ≈393 m → ≈512 m. It is a **radial** fade by horizontal distance
  from the site origin, so on the rectangular terrain the east/west mid-edges (closer than `start`)
  stay crisp while the corners dissolve — the owner will tune the exact radii. Fades the terrain
  material to transparent (the flat background shows through); roads/water/context sit inside the
  halo and are not faded.
- **T6 — point counts.** compact-infill: 926 trees → 42 596 points (full), 17 039 (mid), 6 390
  (far); sloped-edge: 251 trees → 11 546 / 4 619 / 1 734. 46 points per tree (42 canopy + 4 trunk).
- **T6 — export passes.** Points are **hidden** in the depth, white and analysis passes (never given
  a mesh override material); the still pass (composer frame) shows them. The depth pass for a scene
  without points is unchanged. Forest-fill points inside `wood` polygons were **skipped** (the
  prompt marks them optional), so no "Forest density is illustrative" text is needed; tree positions
  remain mapped OpenStreetMap (same provenance as the mesh trees).

## Questions for the owner

_(Only real decisions, added as they arise.)_

## Session notes

- 2026-11-19 — T7 **done** (`70f39e3`, `f2784c5`). Stage picker A/B/C (via `identityStage`) and
  reproducible URLs (`parseLabParams` with per-field fallback). Five headed preview screenshots
  (NORDIC, A, B, C neutral, C wind) in `docs/screenshots/vis/run7/` with a README.
- 2026-11-19 — T6 **done** (`24cbc98`). Point-cloud vegetation (`vegetation: 'points'`) for IDENTITY
  via a seeded pure builder + `THREE.Points` with a generated sprite; NORDIC keeps the mesh trees.
  Points hidden in the depth/white passes. Safety net 5/5.
- 2026-11-19 — T5 **done** (`deba3c0`). `MapLegend` renders the `legendFor` model (title, class,
  ramp/band scale, claim, sources, computing) and is mounted in the Lab over the viewport for Sun
  hours, Wind, Noise, Water and Slope. Claims come from the existing caption functions; the studio's
  caption blocks are untouched. Tree-shaken from production (chunk check clean).
- 2026-11-19 — T4 **done** (`b73f592`). `dissolveRange` (pure) + a terrain fade shader dissolve the
  IDENTITY terrain toward the background; overlays and the depth pass are untouched. Safety net 5/5.
- 2026-11-19 — T3 **done** (`ed55abc`). 1 m-tile contours (`contourSource: 'tile1m'`) computed in a
  worker and drawn on the 16 m surface in the IDENTITY style, with a provisional distance fade for
  minor contours; NORDIC keeps `grid16`. Measured the pass at 128.6 ms median → worker. Safety net
  5/5 (NORDIC pixel-identical); Lab renders identity + 1 m without errors.
- 2026-11-19 — T2 **done** (`e87fe15`). `IDENTITY` style (stage A) added beside an unchanged
  `NORDIC`; wired skirt hiding, floor-grid flag, `groundTint` (pure `tintGroundColour`) and water
  roughness into the terrain/land-cover/water paths. Pixel safety net (VISUAL=1 --headed) passed
  5/5 → NORDIC pixel-identical; production chunk delta +81 B gzip (StudioPage.js). Lab renders the
  IDENTITY style without JS errors.
- 2026-11-19 — T1 **done**. The Lab's viewport `<section>` had only `min-h-[480px]`, so
  `ViewportCanvas`'s `h-full` root (and the R3F canvas) could collapse to 0 px in strict engines —
  the blank first view. Fixed in `LabPage.tsx` only with a definite `h-[min(720px,70dvh)]`
  (`lg:h-[calc(100dvh_-_1.5rem)]`), matching the studio's definite-height approach. Added two
  opt-in `LAB=1` regressions (substantial canvas height; camera already at the isometric preset on
  first mount). No `src/scene/` change, so production/NORDIC pixels are unaffected.
- 2026-11-19 — Setup. Worktree `../Terraform-run7` created on `run7/identity-lab` (base
  `origin/run1/foundations` @ `fe43015`). `npm ci` clean (487 packages). Environment verified:
  headed Chromium uses the Metal GPU, so the pixel safety net is available. Started T1.
