# 09 — Visual identity integration

**18 November 2026 · Claude Opus 5.5 · documentation only; no source, package, branch or deployment changed**

Reconciles the approved art direction (`Terraform_Visual_Identity_FINAL.md`, v1.0 plus the *Final Creative Direction Addendum*, 17 Nov 2026 — kept outside the repository in the owner's Downloads folder) with the code and with the backlog in `05-MASTER-TODO.md`. The brief is a **creative** direction; its own §H says production details, licences and performance remain to be tested. This document does not treat it as a validated design system.

**Evidence labels:** **[code]** read at the stated path · **[run]** command output during this audit · **[doc]** stated in a project document, not re-verified · **[est]** estimate or proposal.

**Trees audited:** `build/foundation` @ `99555f3` (worktree `../Terraform-build`, clean) and `run1/foundations` @ `e788c37` (draft PR #25, worktree `../Terraform-run1`, clean). The session checkout (`ci/github-actions` @ `874062d`) holds an older, untracked copy of this folder; it is stale (only `00` differs) and should not be edited.

---

## 1. Executive verdict

**Mostly additive, with three contained replacements and two ADR changes.** Confidence: high on the code facts, medium on cost, low on orthophoto licensing (unverified).

| Kind | What |
|---|---|
| **Reusable unchanged** | ENU contract and the WGS84-bbox raster pattern; workers and analysis domain; `style.ts` and `graphics.ts` seams (PR #25); legend model; capture, perf and visual-regression harnesses; camera/input characterisation; sun position and shadow frustum; export pass structure; provenance and credit lines; Geist type |
| **Configurable** | Scene colours, contour colour/opacity, fog distances, AO tint (all in `style.ts`); lighting intensities (`lightRig`); analysis ramps (registry) |
| **Additive** | Orthophoto package layer + terrain material; atmospheric dissolve; HDRI ambient file behind the existing `EnvironmentLight`; point-cloud vegetation component; horizontal analysis toolbar |
| **Contained replacement** | (1) Land-cover tint + elevation vertex colours → orthophoto on the terrain (land-cover data kept for analyses and fallback). (2) Instanced mesh trees → point clusters. (3) Light studio theme (ADR-0016 tokens) → charcoal theme |
| **ADR changes** | ADR-0017 (light scene, flat light background, Room environment) is superseded for the working view. ADR-0026 (analysis cards only in the panel) is amended by an always-visible horizontal toolbar |

**The single largest risk is not technical: orthophoto rights.** Nothing in the repository sources imagery today, and this audit could not confirm the Norge i bilder terms for a public web app (§6.1). That makes the orthophoto task a research-first task.

**Gate 0 still stands.** Production still 404s on `/about`, `/studio/compact-infill` and the manifest (**[run]** `curl` today: 404/404/404, `/` 200). PR #18 is draft and unmerged. Visual work can proceed in the dev-only Lab; **nothing from this document ships to production before Gate 0 exits.**

## 2. Verified task status

Status from code, PRs and run ledgers, not from checkboxes. "In PR" = implemented on an unmerged branch.

| Task | Status | Evidence |
|---|---|---|
| 001 production 404 | **planned** (unresolved) | [run] curl 18 Nov: same 404s as 16 Nov; no `docs/reviews/production-404-diagnosis.md` |
| 002 Water/Snow review | **planned** | no `water-snow-code-review.md` on any branch |
| 003 RV-1 re-run | **planned** | no `foundation-rv1.md` |
| 004 About copy | **verified complete** | PRs #19, #20 merged into `build/foundation` |
| 005 operating docs | **in progress** (part 1 done) | PR #22 merged; milestone briefs not re-checked |
| 006 PR #18 decisions | **planned / owner** | PR #18 body still lists "Open decisions for the owner"; `progress.md:1021` keeps Lawson names pending |
| 007 runoff vs WhiteboxTools | **blocked on result** | PR #23 draft; main paths 67.0 % (bare 69.8 %, offset 66.0 %) vs the 95 % bar; "no bug" verdict withdrawn (`docs/qa/runoff-reference.md` on `test/runoff-reference`) |
| 008 merge PR #18 | **blocked** | depends on 001, 002, 006 |
| 009 foundation visual gate | **planned** | no `foundation-visual-gate.md` |
| 010 capture script | **in PR #25**; owner GPU run outstanding | `scripts/capture-reference.mjs`; smoke run only, SwiftShader |
| 011 perf harness | **verified complete** | PR #21 merged; `docs/perf/baseline-build-foundation.json` (M1 Pro, Chromium 156, e.g. compact-infill idle p95 17.6 ms, 90 draw calls) |
| 012 visual regression spec | **in PR #25**; baselines not committed | ledger T5 |
| 013 style module | **in PR #25** | `src/scene/style.ts` (`NORDIC`), zero-pixel diff vs pre-refactor baselines (ledger T6) |
| 014 graphics registry | **in PR #25** | `src/features/analysis/graphics.ts`; 11 shared hexes snapshotted |
| 015 Visual Lab | **planned** | ledger T10 todo |
| 016 design inventory | **planned** | ledger T9 todo |
| 030 camera characterisation | **in PR #25** | `e2e/camera-input.spec.ts`, 6 tests passed twice |
| 034 ground-click | **planned** | ledger T8 todo |
| 040 legend | **in PR #25 (part A, model only)** | `legendFor()`; `MapLegend` component not built |
| 054 claim guardrails | **in PR #25** | `claims.test.ts`; Lawson labels as `it.todo` |
| 020–027, 031–036, 041–046, 050–053, 055, 060–074 | **planned** | no code |

Ledger note: the unit suite on PR #23's branch had one unrelated time-out (`wind-validation` case 4); later Run 1 tasks report 0 failures.

## 3. Current implementation map

| Area | File(s) | Today | Evidence |
|---|---|---|---|
| Terrain mesh | `ViewportCanvas.tsx` `TerrainMesh` (l.157), `siteGeometry.ts` | 16 m grid (compact-infill 40 × 47), vertex colours by elevation, skirt | [code] |
| Ground imagery | `landCoverTexture.ts` | 2 048 px canvas of 12 land-cover kinds in pale greens, planar UVs u = east, v = north | [code] |
| Imagery source | — | **None.** No orthophoto, WMS/WMTS or satellite reference in `src/`, `scripts/` or ADRs | [run] grep |
| Raster georeferencing pattern | `scripts/site-assets/terrain1m.build.ts` | requests the Kartverket WCS with an EPSG:4326 bbox so the raster is exact in the app's lat/lon-linear ENU frame (ADR-0033 §3) | [code] |
| 1 m terrain | `public/sites/*/terrain1m.{json,bin}` | 624 × 734 cells, used by slope, section, runoff only | [code] |
| Contours | `features/sites/contours.ts`, `TerrainMesh` | marching squares on the 16 m grid, 1 m / 5 m, graphite `#7E7D7A` at 0.14 / 0.32, 1-device-pixel GL lines | [code] |
| Buildings | `ContextBuildings` (l.255), `roofGeometry.ts` | one merged matte `#FAF9F6` mesh, crease edges, measured gables | [code] |
| Proposal | `MassLayer.tsx` | accent `#1F3BD6` tint, edges, labels | [code] |
| Vegetation | `Trees.tsx`, `foliage.ts`, `treeVariants.ts` | two instanced meshes (canopy, branches), OSM positions (926 / 251 trees), shadows; "simple" on Low tier | [code], ADR-0023 |
| Lighting | `lighting.ts`, `SiteLights`, `EnvironmentLight` | sun from Sun card time, ambient 0.08, hemisphere 1.35, procedural `RoomEnvironment` PMREM at 0.22 | [code] |
| Background / fog | `ViewportCanvas.tsx` l.677–678 | flat `#F1F1EF`, linear fog 600–1 400 m × `viewScale` in the background colour | [code] |
| Post | `SceneComposer.tsx` | N8AO, neutral tone mapping, MSAA | [code] |
| Wind particles | `WindParticles.tsx` | up to 4 000 CPU-advected ribbons | [code] |
| Analysis overlays | `SunHoursLayer`, `WindHeatmap`, `NoiseBands`, `SlopeOverlay`, `RunoffOverlay` | draped textures / vertex-coloured meshes | [code] |
| Studio layout | `StudioShell.tsx` l.581 | grid: viewport + 340 px right `aside` "Parameters" (light card), top bar; analyses chosen as cards inside the panel (ADR-0026) | [code] |
| Tokens | `src/styles/tokens.css` | light theme (`--canvas #eeeeee`, `--card #f7f7f6`, ink `#141414`, accent `#1f3bd6`), `--frost` exists | [code] |
| Exports | `exportPasses.ts`, `PassExporter.tsx` | still / depth / white / analysis / clip; credits burned in except depth | [code] |
| Perf/visual harness | `scripts/measure-perf.mjs`, `capture-reference.mjs`, `e2e/visual-reference.spec.ts` | present (011 merged; 010/012 in PR #25) | [code] |

### Work at risk of becoming obsolete

| Item | Why | Handling |
|---|---|---|
| TF-VIS-020 Directions A/B/C presets (`DIAGRAM`, `ATMOSPHERIC`) | The A/B/C search is closed by the brief | **Rescoped** to progressive stages of one direction |
| 03 §2.2 recommendation "Direction A light white model" | Brief demands a dark, high-contrast world | Superseded; 03 kept as history |
| `NORDIC` light values in `style.ts` | Become the *legacy* style; still needed as the zero-diff baseline and rollback | Keep; add `IDENTITY` style beside it |
| `landCoverTexture.ts` pale tints as the ground look | Replaced by orthophoto | Keep as fallback when no imagery (imports outside coverage, missing licence) |
| Mesh trees `foliage.ts` | Replaced by point clusters | Keep for Low tier until 029 proves cheaper |
| TF-VIS-050 EX-5 "reverse the sun-hours ramp" (pale ground rationale) | Ground is now dark | Keep task; re-derive ramp on dark orthophoto |
| TF-VIS-023 hillshade | Orthophoto already carries relief shading; a second shade risks implying sun | Demoted to optional, after 028 |
| TF-VIS-025 named atmospheres (overcast / winter / summer) | Brief wants one soft Nordic HDRI ambient | Narrowed to the HDRI ambient + sun rule |
| TF-VIS-064 landing still with no imagery | Brief wants Nordic climate photography | Extended; depends on licensed assets |
| Physical sky (already rejected) | Brief also rejects a visible sky | Stays rejected |

## 4. Requirement-to-code compatibility matrix

Complexity S/M/L is **[est]**. "Files" are proposed.

| # | Requirement | Existing + evidence | Change | Cx | Risks (perf / data / licence) | Files | Depends | Tests | Rollback |
|---|---|---|---|---|---|---|---|---|---|
| R1 | Real orthophoto draped on 3D terrain, ~80 % desaturated | None; land-cover canvas on planar UVs; 4326-bbox raster pattern exists | New build-time package layer `orthophoto.{json,webp}` aligned to the terrain extent; terrain material `map` + desaturation uniform; import path deferred | **L** | Licence unverified (§6.1); package size (≈ 1–4 MB per site at 0.25–0.5 m/px **[est]**); texture memory 4096² ≈ 64 MB uncompressed GPU **[est]**; 16 m mesh under 0.25 m imagery shows facets on slopes | `scripts/site-assets/orthophoto.build.ts`, `features/sites/package.ts` + `manifest.ts` (optional layer), `provenance.ts`, `scene/terrainMaterial.ts`, `ViewportCanvas.tsx` ⚠VC | D13 licence; 015 | schema test; UV/registration test (known landmark ENU → pixel); credit appears in still/white/analysis; zero-diff with layer absent | layer optional; style flag off → land-cover look |
| R2 | Fine light-white contours, zoom density | Contours exist (16 m, graphite, 1 px) | Colour/opacity via `style.ts`; fat lines (021); 1 m-tile contours on curated sites (053); density by camera distance (minor hidden beyond a threshold) | M | 458 k-cell marching squares (T4); contour/orthophoto misregistration if contours stay on 16 m grid | `style.ts`, `lines.ts`, `contours.ts`, worker if > 16 ms | 021, 053 | contour count fixture; capture at three zooms | style revert |
| R3 | Opaque matte-white massing, crisp edges, soft shadows | Matte `#FAF9F6`, crease edges, PCF shadows, N8AO | Tune on dark ground: shadow softness (PCF radius), AO tint; proposal stays cobalt (brief `#315CEB` vs token `#1f3bd6`: decision D17) | S | Shadow acne / peter-panning on draped terrain; AO halos on dark ground | `style.ts`, `SiteLights`, `SceneComposer.tsx` | 024 | sun-shadow position unchanged (`lighting.test.ts`); capture | style revert |
| R4 | Airy point-cloud trees and forests | Instanced meshes; OSM points; land-cover `wood` polygons | `THREE.Points`/instanced sprites per tree (seeded cluster); forest fill points inside `wood` polygons, **labelled illustrative density**; distance LOD (fewer points far); colour green-grey; never animated | **L** | Fill-rate with large sprites; point size not DPR-stable; `scene.overrideMaterial` in white/depth passes does not suit `Points` (needs per-pass handling); point shadows need a custom depth material — decide whether trees cast shadows (ADR-0021 limitation wording) | `scene/PointVegetation.tsx`, `scene/vegetationPoints.ts` (pure, seeded) + test, `exportPasses.ts` | 015; D15 | seeded determinism test; budget per 04 §7; export passes | keep `Trees.tsx`; style flag |
| R5 | HDRI ambient, sky not shown; physical sun | `RoomEnvironment` PMREM, flat background; sun from Sun card | Load one licensed overcast HDRI (e.g. CC0) into the same `EnvironmentLight`; background stays flat charcoal; `lightRig` intensities per style; sun untouched | M | Asset 1–6 MB **[est]**, lazy-load + Room fallback; tone shift on matte white | `ViewportCanvas.tsx` `EnvironmentLight` ⚠VC, `lighting.ts`, `public/env/*.hdr`, ADR | 025 | sun position identical for every style (existing test extended); load-failure fallback test | Room env |
| R6 | Dark charcoal background; distant terrain dissolves into mist, no rectangular edge | Linear fog in background colour; terrain ends at skirt + floor grid | Background `#171B19`; radial alpha/fog fade on the terrain and imagery beyond the study halo; hide skirt and floor grid in the identity style; fade must never start inside the site or analysis circle | M | Transparent terrain sorts badly with overlays; fade must not imply an analysis boundary | `scene/terrainMaterial.ts`, `style.ts`, `ViewportCanvas.tsx` ⚠VC | 028 (or land-cover fallback) | unit: fade radius ≥ halo radius; capture; depth pass unchanged | style revert |
| R7 | Analyses keep geography recognisable; colour = computed results | Overlays draw real outputs; registry (014); claim tests (054) | Re-derive ramps for a dark textured ground (03 §2.1 column C: ramps must not start dark); overlay opacity ≤ value that keeps ortho readable; legend (040); wind trails stay distinct from vegetation | M | Low-contrast ramps on imagery; CVD | `graphics.ts`, overlay components | 040, 044 | greyscale + CVD checks (03 §2.3 7–8); claims test | registry revert |
| R8 | Fixed right charcoal frosted-glass analysis panel, essentials first | Right 340 px `aside` exists (light card); cards per ADR-0026 | Theme to charcoal glass (`backdrop-filter`, restrained blur); progressive disclosure inside cards (`<details>` already used) | M | Contrast on glass over a varying image (panel is a grid column today, so it sits on canvas, not on the 3D view — keep that; blur is cosmetic); `backdrop-filter` cost | `tokens.css`, `global.css`, `StudioShell.tsx` ⚠SS, card components | 047 | `m5-a11y.spec.ts` contrast; keyboard spec | token revert |
| R9 | Always-visible horizontal analysis toolbar, hover/focus details, touch | None; ADR-0026 removed the bottom dock | Toolbar of analysis toggles that drives the same "open card = layer" state; tooltip on hover **and** focus; long-press/visible label on touch | M | Duplicate control paths for one state; ADR-0026 amendment | `components/studio/AnalysisToolbar.tsx` + test, `StudioShell.tsx` ⚠SS | 047 | unit: toolbar and card share state; e2e keyboard; touch target ≥ 24 px | remove component |
| R10 | Landing: Nordic climate imagery, human scale; no forced intro | `LandingPage.tsx` wash + search; no imagery | Static licensed photograph(s) first, optional muted loop later, `prefers-reduced-motion` still; no three.js (I10) | M | Asset licences, AI-footage disclosure, LCP weight | `LandingPage.tsx`, `public/landing/*` | D16 assets | landing chunk size unchanged; reduced-motion e2e | revert |
| R11 | Picking, selection, camera, AO, transparency, exports keep working | Characterised (030); export invariants I6–I7 | Points and textured terrain must stay raycast-correct (terrain mesh unchanged → OK); points excluded from raycast; depth pass semantics unchanged | M | Override passes vs Points; ortho texture in white pass must be dropped (white = white) | `exportPasses.ts` | 060, 063 | 030 green; depth byte-identical with layers off; credits test | per-feature flag |
| R12 | Type and palette | Geist + Geist Mono installed; brief lists Geist/Manrope + IBM Plex Mono as candidates | Keep Geist and Geist Mono (no new dependency) until the type specimen decision (D18) | S | — | — | D18 | — | — |

## 5. Revised Gate 2 and changes to other gates

### 5.1 Gate 2 — Identity rendering (replaces "Scene rendering, material and lighting prototypes")

**Exit:** the integrated prototype (TF-VIS-02B) passes the comparison criteria in §7 at the analysis-off and wind-on states; the owner accepts it; the `IDENTITY` style ships to production (TF-VIS-027) only after **Gate 0 exit** and within 04 §7 budgets, or with owner-approved budget exceptions recorded.

Order (dependencies, not dates):

```
015 Lab ─┬─ 020 progressive Lab stages (A → B → C)
         ├─ 028 orthophoto pipeline  ◄── D13 licence (028a research first)
         ├─ 021 lines + white contours ── 053 (1 m contours)
         ├─ 025 HDRI ambient + sun rule
         ├─ 02A atmospheric dissolve  ◄── 028 (or land-cover fallback)
         ├─ 029 point-cloud vegetation
         └─ 024 AO/shadows on dark ground
                  │
 02B integrated prototype (off / wind on) ◄── 020, 028, 021, 025, 02A, 029, 040 part B
                  │
 026 decision board ── 027 ship IDENTITY ⚠VC ◄── Gate 0 exit (008)
```

Stage definitions for TF-VIS-020: **A** = orthophoto + white massing + white contours on charcoal; **B** = A + HDRI ambient + atmospheric dissolve + shadow/AO tuning; **C** = B + point-cloud vegetation + one analysis-on state (wind).

### 5.2 Changes to other gates

| Gate | Change |
|---|---|
| 0 | Unchanged. Add: identity production work (027, 047, 048) depends on 008. Lab work does not. |
| 1 | Unchanged. 015 (Lab) becomes the critical path for this document. 016 inventory adds the orthophoto and vegetation entries when they land. |
| 3 | Unchanged. Camera work must re-run on the identity style before 032 lands (030 is style-agnostic). |
| 4 | 044 Wind pilot: trail colour must read on a dark textured ground and stay distinct from vegetation points. New UI tasks 047 (charcoal theme) and 048 (horizontal toolbar + glass panel). 043 analysis-focus dimming applies to the orthophoto (desaturate/darken further when an analysis is open). |
| 5 | 050: re-derive the sun ramp on the dark ground; EX-5's pale-ground premise no longer holds. 053 becomes a dependency of 02B (white contours from the 1 m tile on curated sites). |
| 6 | 060 export parity extended: orthophoto, dissolve and point vegetation in still and clip; white pass drops the orthophoto map and renders vegetation as white points or omits it (decision D15); depth pass unchanged unless the task is the depth pass. 063 adds the orthophoto credit to every credited pass and clip frame. 064 extended per R10. |
| 7 | 073 perf regression adds windows: neutral identity, wind-on identity, vegetation-dense site; GPU texture memory recorded (`renderer.info.memory`). 072 browser matrix checks `backdrop-filter`, large textures (iOS max texture size), and point sprites on Safari. 071 a11y covers the toolbar and glass contrast. |

### 5.3 Model assignment update

Claude Opus 5.5 is now the primary model: it may plan, implement and integrate. **Self-review is not independent.** Every task Opus implements needs, before merge, either (a) review by a different model (Codex, DeepSeek, or Fable 5.2 where available) or the owner, or (b) for zero-diff refactors, automated evidence (zero-pixel capture diff, tests). High-risk changes (renderer, input, export, domain, claims) need (a) **and** automated evidence. Visual acceptance is always the owner's.

## 6. Risks

### 6.1 Data and licence

| Risk | Evidence | Mitigation |
|---|---|---|
| Norge i bilder terms for a public web app unknown | [run] web search: WMTS endpoint and dataset entries exist on data.norge.no; some entries marked restricted; terms text not confirmed | TF-VIS-028a: read Kartverket/Geovekst terms and the Geonorge dataset page; ask Kundesenter if unclear. **No imagery committed to git or deployed until confirmed.** Lab may fetch at runtime for local evaluation only, if the terms permit viewing |
| Fallback sources | Sentinel-2 (Copernicus) is open but 10 m/px — too coarse for a 1 ha site **[est]**; commercial basemaps need keys and restrict caching | Fallback: land-cover tint (today) inside the site; Sentinel-2 only for the far halo, if licensed |
| Import path (live sites) | Import samples terrain on 13 × 13 and fetches live sources (ADR-0027 warns sources move) | Orthophoto on import is **out of scope** for 028; imports keep the land-cover look |
| Imagery date mismatch with OSM buildings | orthophoto shows buildings that OSM lacks or vice versa | Credit line states imagery year; 80 % desaturation + white masses on top; no claim that imagery is current |

### 6.2 Scientific honesty

- Forest-fill points are **illustrative density**; mapped OSM trees are positions only (sizes already illustrative, `Trees.tsx` l.11). The legend/provenance must say so.
- The atmospheric dissolve must begin outside the study halo and the analysis circle, and must not coincide with any analysis edge.
- HDRI/ambient changes appearance only; sun direction and shadows stay the Sun card's time (existing invariant, 03 §4).
- Wind animation stays solver-driven (existing). Water stays screening (007 shows 67 % main-path agreement): no depth or flood extent visuals.
- Orthophoto is context, not data: never sampled by an analysis.

### 6.3 GPU and performance

No new figures are claimed. Budgets are 04 §7 against `docs/perf/baseline-build-foundation.json`. New measurement points: texture memory, draw calls with points (expect +1–3 **[est]**), fill-rate on 4K export, `backdrop-filter` cost on the panel. Thresholds for orthophoto resolution (2048 vs 4096) and point counts are **owner-approval proposals**, to be set from the 02B measurements, not now.

### 6.4 Export

`scene.overrideMaterial` (white, depth passes) applies a mesh material to `Points`; a per-pass visibility or material swap is needed. The still copies the composer frame, so the dissolve and HDRI appear there automatically; the clip records the live canvas. Credits must include the orthophoto source (I7) and the depth pass must stay credit-free (I6).

## 7. First Visual Lab prototype brief (TF-VIS-02B)

- **Site:** Compact Infill (curated, Oslo); Sloped Edge as the terrain check.
- **Camera:** the `isometric` preset; fixed canvas 1440 × 900 at DPR 2; date 21 June 15:00 (today's default) and, as the second lighting check, 21 Dec 12:00.
- **State 01 — analysis off:** `IDENTITY` style; 80 %-desaturated orthophoto (or land-cover fallback, labelled, if 028a has not cleared); white contours from the 1 m tile; matte-white context; point-cloud trees; charcoal background; HDRI ambient; dissolve.
- **State 02 — wind on:** same scene and camera; the existing wind map and trails with the legend from 040 and the screening caveat; no new wind physics.
- **Reference captures** (via `capture-reference.mjs`, new `--style=identity` label): `NORDIC` baseline at the same view; stage A, B, C; states 01 and 02; still, white and analysis passes beside the viewport.
- **Comparison criteria** (brief §G, plus project gates): (1) imagery texture and legibility; (2) massing clarity and shadow quality; (3) vegetation airiness at near/far, forest coherence; (4) contour readability at three zooms; (5) depth without spotlight/fog effects; (6) overlay legibility, greyscale and CVD checks (03 §2.3 7–8), claims test green; (7) perf against baseline (orbit p95/p99, draw calls, first frame, texture memory), `camera-input.spec.ts` green, keyboard reach of the toolbar.
- **Critical success test:** compelling with analysis off; more informative, not more spectacular, with analysis on.

## 8. Decision log (genuinely open)

| # | Decision | Recommended reversible default |
|---|---|---|
| D13 | Orthophoto source and licence | Norge i bilder **if** terms allow public display and caching with attribution; otherwise land-cover fallback. **Blocking** for committing imagery |
| D14 | ADR-0017 supersession (dark scene, HDRI ambient) and ADR-0026 amendment (toolbar) | Draft ADR-0045 (identity scene) and ADR-0046 (toolbar) with 02B evidence; keep `NORDIC` as rollback style |
| D15 | Vegetation in white pass and tree shadows | White pass: vegetation as white points; trees cast no shadow (matches today's ADR-0021 analysis wording; visual shadows decided after 029 measures cost) |
| D16 | Landing imagery source (stock vs AI) | Licensed stills only for v1; no AI footage until a disclosure policy exists |
| D17 | Accent hex (`#315CEB` brief vs `#1f3bd6` tokens) | Keep `#1f3bd6` until contrast checks on charcoal; the brief marks tokens provisional |
| D18 | Type (Geist vs Manrope; Geist Mono vs IBM Plex Mono) | Keep installed Geist/Geist Mono; no new dependency |
| D19 | Lab on Vercel previews with third-party imagery | Local only until D13 clears |

Unchanged from 08 and still open: D0–D3, D5, D7–D12.

## 9. Recommended next executable task

**TF-VIS-015 — Visual Lab route scaffold + ADR-0040**, on top of PR #25 (`run1/foundations`), owner/implementer Opus, independent reviewer Codex. Every identity prototype in this document needs the Lab; it changes no production pixels; it is already specified (06#tf-vis-015) and its dependency (013) is implemented in PR #25. In parallel and without code, start **TF-VIS-028a** (orthophoto licence research), because it is the only item that can block the identity outright.

## 10. Amendment — owner reference images (2026-11-19)

The owner supplied six reference images (`docs/design/references/identity/`). They are distilled into `docs/design/identity-look-spec.md`, which is now the visual target for the identity style. Changes to this document, recorded as decision D22 in 08:

- **Brightness:** mid-to-low key with the white buildings as the brightest element and haze lifting the distance — not a black world; overall exposure is an owner-tuned Lab control.
- **Atmosphere (R6, TF-VIS-02A):** distance fades to a grey-green haze plus a vignette; terrain, trees **and buildings** fade together.
- **Trees (R4, TF-VIS-029):** tree-shaped instances (deciduous, conifer, birch) with speckled, see-through crowns — not abstract point blobs.
- **Relief (R2):** draw the terrain from the 1 m tile on curated sites.
- **Water:** static sheen allowed (amends 03 §3.6); no animation or reflections.
- **Ground (R1):** the orthophoto carries most of the look, so TF-VIS-028a/028 is the critical path; the land-cover fallback is a stand-in, not a tuning target.

