# M3 — Live analysis: review and gate record

- **Date:** 2026-10-29 · **Reviewer:** Claude Code (Opus 5.5), acting as `engineering-code-reviewer` + `gis-qa-engineer`
- **Scope:** `main` at `b91bf06` (Fable F1–F5, Codex C8–C11, DeepSeek D28–D34, Claude review fixes)
- **Reviewer verdict:** **Pass with follow-ups** · **Owner sign-off:** ✅ accepted 2026-10-29

## 1. Gate criteria (PRD §13, brief, plan §11)

| Criterion | Result | Evidence |
|---|---|---|
| Calculations match known fixtures | ✅ | `docs/reviews/M3-evidence.md` §1 (expected vs actual, named tests); stepped fixture 760 m² / 5 floors; coverage 10.80 % / 10.00 %; outside-parcel case |
| Sun orientation verified against an independent reference | ✅ | NREL SPA (pvlib 0.15.2) table, suncalc Δ ≤ 0.02° above the horizon, ≤ 0.5° everywhere (`docs/qa/sun-reference/`, `sun-reference.test.ts`); NOAA-equation oracle in tests; browser check: noon 21 Jun 151° / 51.0° vs NREL 150.58° / 51.01° |
| Disclaimers visible | ✅ | D34 unit + e2e audit (`claims.test.tsx`, `e2e/m3-disclaimers.spec.ts`); no forbidden claims in rendered DOM |
| DST correct in Europe/Oslo | ✅ | `time.test.ts` against D31 `dst-oslo.json` (2026–2028 gaps and overlaps); UI note verified by e2e (2026-03-29 02:30 → 03:30 CEST) |
| QA-06 / QA-10 / QA-11 / QA-15 | ✅ | QA-06 `clearance.test.ts` + envelope e2e; QA-10 determinism tests; QA-11 no sun-hours claim when below horizon (unit + e2e); QA-15 no-WebGL fallback (`e2e/m3-rendering.spec.ts`) |
| Night / below-horizon / no-WebGL | ✅ | `lightRig` tests; `Sun below horizon` chip (browser + e2e); fallback panel |
| Visual gate (screenshots) | ✅ | 7 images in `docs/screenshots/m3-*`, viewed by Claude: shadow direction matches morning (≈100°), noon, evening (≈266°), winter noon (6.7°); night state; envelope violation (recaptured in daylight) |
| `lint`, `typecheck`, `test`, `build`, e2e | ✅ | 0 lint errors · 699 unit tests (61 files) · build ✅ · e2e 18 passed, 1 opt-in evidence spec skipped |

## 2. Deliverables

| # | Deliverable | Status |
|---|---|---|
| 1 | Metrics (FR-050–057) | ✅ level-indexed Concept GFA (ADR-0007, accepted), footprint, coverage within/outside parcel, volume, max height, buildings, Concept GFA ratio, per-floor list |
| 2 | Method disclosure | ✅ "About these numbers", per-floor note, Sun method note |
| 3 | Solar (FR-060/061) | ✅ suncalc 2 with site lat/lon, Europe/Oslo DST, ENU direction into the light rig |
| 4 | Shadows (FR-062, FR-066) | ✅ masses and context cast, terrain receives, quality profiles, night state |
| 5 | Time controls (FR-063–065) | ✅ scrubber, presets, play/pause + speed, readout, polar/DST notes |
| 6 | Demo constraints (FR-070–074) | ✅ setback (planar inset), height reference grade/datum (ADR-0008, accepted), status, clickable warnings, layers |
| 7 | Disclaimers (FR-075) | ✅ UI; **exports** pending (export path is M5) |
| 8 | Optional heatmap (FR-067) | ⏭️ skipped by plan (P1) |

## 3. Findings fixed during review

| Severity | Finding | Fix |
|---|---|---|
| Major | Envelope evidence captured at night with a ≈ 205 × 78 m slab (state carried over from the below-horizon shot) | Evidence spec resets to 21 Jun 15:00, draws a 24 × 30 m, 7-storey mass; recaptured (`b91bf06`) |
| Major | Per-mass height-limit plane hid inside tall masses (5 % rim, 0.08 opacity) | 8 m / 40 % rim, 0.18 opacity, stronger outline (`b91bf06`) |
| Minor | D28 software-renderer check inline, untested, unchecked cast | `rendererTier.ts` with tests (`d91d6d6`), later folded into render profiles (C11) |
| Minor | `capture.mjs` dropped to Low on software GL | pinned to High (C11 review) |
| Minor | ESLint scanned local Python venvs | `**/venv/**` ignored |

## 4. Follow-ups (not blocking M3)

1. **FR-075 in exports** — add the constraint disclaimer to PNG/JSON exports when M5 builds them; D34's audit should be extended then.
2. **FR-076 override panel (P1)** — editable demo limits; only the Grade/Datum switch exists.
3. **Status chip accessible name** — `role="status"` chip has no explicit name (announcements work; DeepSeek finding). Optional `aria-label`.
4. **Context triangulation artefact** — one Grünerløkka import building rendered as a fan (spike finding); check in `createContextGeometry` when the import UI lands.
5. **`DATE_PRESETS` are 2026 dates**; other years shift by up to a day (Fable handoff §6).
6. **Inspector "Max height … above site origin" vs mass "Height"** — two meanings side by side; consider a tooltip in M5 polish.
7. **Agent-log round-2 rows (D7–D13)** still unreviewed from before this session.

## 5. Process notes

- Fable 5.1 delivered F1–F5 within budget; its contracts let Codex build C8–C10 without domain changes.
- Codex attempted desktop computer use (Safari) during C8–C10; refused by the system. Work orders now forbid it.
- Agents worked in separate worktrees after `88c629d`; no file collisions since.
