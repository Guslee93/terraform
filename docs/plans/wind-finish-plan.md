# Wind — finish plan (autonomous session, 2026-11-06)

**Context:** the owner is away for about 5 h, so this session must need no approvals. Codex is out of credits until 21:02, and MiniMax needs the owner to start it, so Claude does the work, with subagents for parallel read-only checks.
**Out of scope for this session (needs the owner):** pushing to GitHub, deploying to Vercel, paid services, a MET Norway Frost client ID (annual comfort), and the W6 "real 3D run" decision.
**Status key:** ☐ todo · ◐ in progress · ☑ done · ⊘ deferred (reason given)

Each item lists **what**, **why**, **how**, **done when** and **evidence**.

---

## Phase A — Make the gate reliably green

The current gate is lint ✅, 979 unit ✅, build ✅, e2e 54 passed / 9 skipped / **2 failing only under full-suite load**.

| # | Item | Why | How | Done when | Status |
|---|---|---|---|---|---|
| A1 | Fix `e2e/m3-rendering.spec.ts` load flake | A gate that is red "only sometimes" isn't a gate | Read the failure trace under load, find which wait is time-sensitive, replace fixed timeouts with state-based waits | Passes in 2 consecutive full runs | ☑ |
| A2 | Fix `e2e/massing.spec.ts` "Esc cancels a roof drag" load flake | Same | Same; check the pointer/drag timing assumptions | Same | ☑ |
| A3 | Full e2e run, twice | Proves A1/A2 | `npx playwright test` × 2 | 0 failures both times | ☑ |

## Phase B — Close the wind test gaps from the C23 review

| # | Item | Why | How | Done when | Status |
|---|---|---|---|---|---|
| B1 | Freshness regression test (C23 finding 1) | A stale result could become a baseline; fixed but untested | Fake `Worker` in jsdom: render `useWindFlow`, change inputs, deliver an old-id settled result → `isCurrent` false; deliver the current id → true | Test fails if the revision bump is removed | ☑ |
| B2 | Particle clipping test (C23 finding 6) | Fixed but untested | Extract the per-particle step into a pure function `stepParticle` in `WindParticles.tsx` (or a small domain module) and test the edge cases from the review | Head/tail never outside the circle in the tests | ☑ |

## Phase C — Wind robustness on real data

| # | Item | Why | How | Done when | Status |
|---|---|---|---|---|---|
| C1 | Roofs above 35 m | Imported Oslo sites (e.g. Bjørvika) have towers; their roofs show uncoloured | Add an optional top slice at `min(maxH + 5, 120)` only when a building in the frame is taller than 35 m; the UI height list follows the actual stack | A 60 m tower gets a coloured roof; curated sites unchanged (same 4 slices) | ☑ |
| C2 | Large/imported site sanity | Most wind testing was on the two curated sites | Unit benchmark: 2 000-building synthetic site, full stack time and main-thread `buildClimateView` time; note results | Stack ≤ 15 s in Node; view build ≤ 30 ms | ☑ |
| C3 | Direction × site sweep | Catches boundary/rotation regressions | Script: both curated sites × 8 directions; assert finite fields, no side jets (> 1.3× share ≤ 10 % on Sloped Edge W/E), and the stack completes | Table in progress.md | ☑ |

## Phase D — Accessibility, motion, responsive

| # | Item | Why | How | Done when | Status |
|---|---|---|---|---|---|
| D1 | Axe scan of the Wind panel | WCAG 2.2 AA target (AGENTS §1.12) | Extend the existing a11y e2e (`e2e/m5-a11y.spec.ts`) or a new spec: open Wind, run axe on the inspector | 0 serious/critical violations | ☑ |
| D2 | Reduced motion | Particles must become still streamlines | e2e with `reducedMotion: 'reduce'`: Play demo doesn't orbit; no particle animation (streamlines shown) | Assertions pass | ☑ |
| D3 | 390 px phone layout | Responsive inspector exists; the wind panel grew a lot | Browser at 390×844: Wind panel usable, no horizontal scroll, ramp bar and claim not overlapping | Screenshot + note | ☑ |
| D4 | Keyboard-only path | Every new control reachable | Tab through the Wind panel; circle placement via arrows + Enter | Notes in the review record | ☑ |

## Phase E — Performance

| # | Item | Why | How | Done when | Status |
|---|---|---|---|---|---|
| E1 | Frame rate with streamlines + particles + roofs | Guardrail: protect the demo | Browser `requestAnimationFrame` probe for 5 s on Compact Infill (wind on, 3D streamlines) | ≥ 30 fps in the dev browser; record the number | ☑ |
| E2 | Main-thread cost per worker message | C23 noted `buildClimateView` runs per message | Measure; if > 16 ms, memoise the circle lattice | Recorded; fixed if over budget | ☑ |

## Phase F — Docs and handover

| # | Item | Status |
|---|---|---|
| F1 | `progress.md`, `docs/agent-log.md`, `AGENTS.md` status line | ☑ |
| F2 | README: wind section (what it is, the limits, how to run the evidence capture) | ☑ |
| F3 | Final report for the owner: what was done, the evidence, what needs the owner (push/deploy, Frost ID, W6, Codex resumption) | ☑ `docs/reviews/wind-session-report-2026-11-06.md` |

## Deferred, needs the owner

- ⊘ **Push and deploy** — outward-facing; the owner confirms first. Note: the repo has **no git remote configured**, so a push needs a GitHub repo set up first.
- ⊘ **Annual Lawson comfort** — needs a MET Norway Frost client ID.
- ⊘ **W6: true 3D (D3Q19) "Detailed run"** — large; needs an ADR and an owner decision.
- ⊘ **Side-by-side proposal compare for wind (Forma 7:35)** — medium; owner priority call.
- ⊘ **Codex/MiniMax runs** — Codex credits reset at 21:02; MiniMax needs the owner.

## Execution order

A → B → C1 → D1/D2 → E → C2/C3 → D3/D4 → F. Commit after each phase, with the gate run before each commit. If a phase turns up a real bug, fix it (minimal change) and record it.
