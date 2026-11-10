# ADR-0018 — Rendering spec Phase 2: quality tiers, auto-downgrade, no bloom

- **Status:** Accepted
- **Date:** 2026-11-10
- **References:** "Terraform Rendering Spec" (10 Nov 2026) Phase 2, ADR-0005, ADR-0017

## Decision

1. **Tiers** (`RENDER_PROFILES`, `src/scene/renderQuality.ts`). Balanced is the spec's Medium.

   | Tier | Shadows | AO |
   |---|---|---|
   | High | 4096 PCF | N8AO full resolution |
   | Balanced | 2048 PCF | N8AO **half resolution** (new; was off) |
   | Low | off | off |

   Low keeps shadows off instead of the spec's 1024 hard shadows: Low is what Auto picks on software GL, where shadows cost the most. No render-scale change (dpr stays `[1, 1.75]`).

2. **Auto-downgrade.** With the Auto preference, `FrameBudgetWatch` feeds frame deltas to `createFrameBudget` (pure, tested): when a full 3 s window averages over 33 ms, the profile drops one tier (`downgrade`). The first window after start or after a drop is skipped (shader compile); deltas over 0.25 s (hidden tab) are ignored. The drop lasts for the session. Explicit High/Balanced/Low never change.

3. **Interaction beats polish.** While a mass is dragged (`cameraLocked`), the AO pass is disabled; it fades back over 300 ms after release.

4. **No bloom.** A selective bloom on a glow layer (wind particles, selected outline) was built and tested, then removed. On Terraform's light scene, additive bloom bleaches dark-blue wind lines toward white instead of making them glow (verified at intensity 0.9 and 6 on the Direction view). The spec's "glow" assumes a dark ground. Revisit only with a dark wind-view ground, which would contradict the spec's own "light scene" rule.

## Evidence (2026-11-10, Apple M1 Pro, Chromium ANGLE Metal, 1440×900, wind Comfort + particles)

- High 51 fps, Balanced 60 fps (rAF cap), Low 60 fps. Balanced looks almost identical to High.
- Not measured on the spec's target, a 2022 integrated-GPU laptop. The auto-downgrade is the safety net there.
- lint, 1035 tests, build pass. Composer chunk 96.1 kB gzip (unchanged).
