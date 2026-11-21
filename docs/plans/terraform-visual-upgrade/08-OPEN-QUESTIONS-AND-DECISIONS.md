# 08 — Open questions and decisions

Ranked by impact. Each has a proposed default that is safe to act on until the owner says otherwise, unless marked **blocking**.

## Owner decisions

| # | Decision | Options | Proposed default | Blocks |
|---|---|---|---|---|
| D0 | **Fix production before anything else?** | (a) diagnose and fix the 404s first, (b) merge PR #18 and see | (a) — the 404s may not be caused by the branch gap (01 §1.1) | **blocking** Gate 0 |
| D1 | Merge PR #18 after Gate 0 checks | merge / keep as draft | Merge after TF-VIS-001, 002, 004, 006; TF-VIS-007 result available | Gate 1 baseline location |
| D2 | Lawson activity names in the wind legend (PR #18 decision 3) | keep / drop and show speed bands | Drop, as feasibility 07 recommends ("no comfort or safety classes") | TF-VIS-044 |
| D3 | Other PR #18 points: heuristic noise deleted; weekly source check in CI; `data/raw/` 21 MB in git; Sloped Edge 95.7 % heights; WP-9 cut/fill; parcels default off; plan file location; NVE licence before commercial use | — | Accept as built; add the weekly check as a separate PR later; leave WP-9 out of this plan | Gate 0 exit |
| D4 | ~~Visual direction~~ **Closed 18 Nov 2026** by the approved identity (`09-VISUAL-IDENTITY-INTEGRATION.md`) | — | — | — |
| D5 | Lab on Vercel previews (`VITE_LAB=1` for preview env) | yes / local only | Yes — lets you review on a phone; production stays without it. *18 Nov: local only while the Lab shows third-party imagery not yet cleared (D19)* | TF-VIS-015 |
| D6 | ~~Lighting atmospheres at all~~ **Narrowed 18 Nov** to one HDRI ambient (TF-VIS-025 revised) | — | — | — |
| D13 | **Orthophoto source and licence** | Norge i bilder / Sentinel-2 halo only / land-cover fallback | Norge i bilder if terms allow public display, caching and export with attribution; else fallback. Research in TF-VIS-028a | **blocking** TF-VIS-028 commit/deploy *19 Nov research (`docs/data/orthophoto-source.md`): Norge i bilder WMTS and the orthophoto dataset are "Norge digitalt begrenset"; use needs written permission. Owner sends the drafted request; land-cover fallback meanwhile.* |
| D14 | ADR-0017 supersession (dark scene, HDRI ambient) and ADR-0026 amendment (horizontal toolbar) | accept / keep | Draft ADR-0045 and ADR-0046 with TF-VIS-02B evidence; keep `NORDIC` as rollback | TF-VIS-027, 048 |
| D15 | Point vegetation in the white pass; tree shadows | white points / omit; shadows yes / no | White points; no tree shadows until 029 measures cost (keeps ADR-0021 wording) | TF-VIS-029, 060 |
| D16 | Landing imagery source and AI disclosure | stock only / stock + AI | Licensed stills only for v1 | TF-VIS-064 |
| D17 | Accent hex | brief `#315CEB` / tokens `#1f3bd6` | Keep `#1f3bd6` until contrast checks on charcoal | TF-VIS-047 |
| D18 | Type | Geist or Manrope; Geist Mono or IBM Plex Mono | Keep installed Geist and Geist Mono (no new dependency) | — |
| D19 | Lab on previews with third-party imagery | yes / local only | Local only until D13 clears | TF-VIS-015, 028 |
| D20 | **Decided 18 Nov 2026 (owner):** IT-7 runoff acceptance | 95 % exact Jaccard / tolerance rule | Adopted: no invented main paths (≥ 95 % within 2 cells) + missed paths disclosed on the Water card; full-tile confirmation open | TF-VIS-007, 008 |
| D21 | **Decided 19 Nov 2026 (owner):** close IT-7 without a further reference run | close / one more run (Barnes flat resolution) | Closed: no defect; rule 1 recorded as a measurement (92–93 % at 2 cells, full tile) and kept as a crop regression guard | TF-VIS-007, 008 |
| D22 | **Decided 19 Nov 2026 (owner):** identity look from the owner's reference images | — | `docs/design/identity-look-spec.md`: mid-to-low key with bright buildings, haze + vignette (everything fades), tree-shaped speckled trees, 1 m relief, static water sheen (amends 03 §3.6), exposure tuned by the owner in the Lab | TF-VIS-020, 029, 02A, 02B, 026 |
| D7 | Noise band colours | keep current swatches / new sequence / match the planning guideline's yellow and red zones | New sequence, **not** styled as guideline zones unless mapped exactly and labelled | TF-VIS-051 |
| D8 | White export pass with or without edges after fat lines | keep edge-free (today) / add edges | Add edges — the white pass is for presentation and enhancement | TF-VIS-021, 060 |
| D9 | Orthographic plan view | yes / no | Yes, after the controller decision | TF-VIS-033 |
| D10 | Deterministic MP4 with a new dependency (mediabunny, MPL-2.0) | adopt / keep MediaRecorder | Prototype; adopt only if it meets 02 §2.6 | TF-VIS-062 |
| D11 | Landing page product image | static captured still / keep abstract wash | Static still, regenerated from the capture script | TF-VIS-064 |
| D12 | Context-fidelity Phase B (building parts), tree shadows, cut/fill pad | in this plan / separate | Separate; they change data or claims, not presentation | — |

## Questions only the owner can answer

| # | Question | Why it matters | Default if unanswered |
|---|---|---|---|
| Q1 | What caused the production 404s? (Vercel access) | Gate 0 | Owner runs TF-VIS-001 |
| Q2 | Which machine is the reference for captures and performance? | Baselines are per machine | The Apple M1 Pro used in all earlier evidence |
| Q3 | Which models are actually available now: Codex (which model), DeepSeek (which), Kimi, MiniMax via Cline, Opus 5.5? | Assignments in 05 | Opus for renderer/review; Codex for modules/tests; DeepSeek for tests/evidence; MiniMax M3.1-Flash (wired in `agent-round.yml`) for docs/copy |
| Q4 | Should the GitHub agent pipeline (`agent-minimax.yml`) run any of these tasks? | Background execution | Only docs and copy tasks (TF-VIS-004, 005, 016, 055, 065), because its reviewer is Opus and its builder is a small model |
| Q5 | Is there a real phone available for Gate 7? | MP-1 | Owner's own phone, plus one borrowed Android |
| Q6 | Any commercial use planned? | NVE licence confirmation (ADR-0039), mediabunny MPL note | Assume portfolio use only |

## ADR conflicts and change proposals

| Proposal | Conflicts with | Needed only if |
|---|---|---|
| Atmospheric working view, sky gradient, darker ground | ADR-0017 (flat background, light scene) and the reasoning in ADR-0018 (bloom on a light scene) | D4 = C |
| Fat lines hidden or kept in override passes | ADR-0019 (export passes' contents) | D8 = add edges → amend ADR-0019 |
| Camera transitions longer than 200 ms | Design contract §11 "keep motion under 200 ms except the site-entry camera" | Clarify: camera preset moves are a deliberate exception, as they already are today (0.75 s) |
| A screen-space edge or silhouette pass | ADR-0019 declined one | Only if geometric silhouettes prove too costly; prefer geometric |
| Orthographic camera presets | Site manifest camera preset contract (`features/sites/manifest.ts`), M1 compass/scale | D9 = yes → ADR-0043 |
| New runtime dependency | AGENTS.md §1.8 | mediabunny or anything else → ADR first |

No proposal in this plan reverses ADR-0002 (ENU), ADR-0020 (scope), ADR-0032 (provenance), ADR-0034 (official noise), ADR-0038 or ADR-0039 (claims).

## Unresolved technical questions

| # | Question | How it gets answered |
|---|---|---|
| T1 | Is the white-pass and live line weight really different at 3 840 px? | Gate 1 captures (TF-VIS-010) |
| T2 | Cost of fat lines over 520 merged buildings | EX-1 |
| T3 | Can the scene be made deterministic enough for pixel comparison (shadow-map jitter, AO noise, particles)? | TF-VIS-010 two-run comparison |
| T4 | Marching squares over 458 k cells on the main thread | Measure in TF-VIS-053; worker if > 16 ms |
| T5 | Does `hornSlopeDeg` on the main thread cause a long task? | Perf harness with Slope on (TF-VIS-011) |
| T6 | Fixed-delta stepping of wind particles for deterministic clips | TF-VIS-062 prototype |
| T7 | WebCodecs availability in Safari and Firefox at the time of Gate 6 | Check then; fallback stays |
| T8 | Whether the WhiteboxTools repository is still the maintained distribution | Read its README at TF-VIS-007 |
