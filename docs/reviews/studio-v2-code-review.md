# Review record — Studio v2 redesign (tokens, round 2, draft 4 editor layout)

- **Date:** 2026-11-02
- **Reviewer:** `engineering-code-reviewer` (Claude Opus 5.5 subagent, read-only); fixes and this record by the implementer session
- **Scope:** final state of the files touched in `ef2a92b..6e449b4` (ADR-0009, ADR-0010), plus the fixes below
- **Commands run (after fixes):** `npm run lint` 0 errors · `npx tsc` (app and node configs) ✅ · `npm run test` 710/710 ✅ · `npm run build` ✅ · `npm run test:e2e` 18 passed, 1 opt-in skipped · `SHOT_EVIDENCE=1` evidence spec ✅
- **Screenshots:** `docs/screenshots/studio-v2-*.png` (landing + both sites at 1440, 1280, 1024, 1920, 390; Plan view ≥ 1280), `docs/screenshots/m3-*.png` (evidence set recaptured on the new layout), `docs/design/ux-assessment/07-built-draft4-1440.png`

## Findings

| Severity | File / area | Issue | Recommendation | Status |
|---|---|---|---|---|
| blocker | `StudioTopBar.tsx` | Top bar said the scenario was "saved locally"; nothing persists scenarios before M4 (truthfulness rule). | Say "local session". | fixed |
| major | `StudioShell.tsx` keydown | Global handler prevented Enter on `<summary>`, so groups didn't open with Enter. | Guard `button, a, summary`; test. | fixed + unit test |
| major | `StudioShell.tsx` DOM order | Views came before the toolbar in tab order. | Render the toolbar first. | fixed |
| major | `StudioShell.tsx` heights | Hidden masses fell back to base-tier height (not above the reference); "not evaluated" envelope would show 0.0 m. | One helper for every mass. | fixed: `massSummary.ts` (+ tests) used by the list, scene labels and Tallest |
| major | list vs scene floors | List summed tier storeys; labels counted floor levels. | Use floor levels everywhere. | fixed (same helper) + unit test for a hidden two-tier mass |
| major | `SunPanel.tsx` axis | Sunrise/sunset labels sat at 25 % / 75 % regardless of time. | Position each label at its minute. | fixed |
| major | `SunPanel.tsx` | New hex values in `color-mix`. | Use sun tokens. | fixed |
| major (cleanup) | several | Dead exports, tokens, CSS and icons; stale drawer comments; `Metric.tsx` exported only `Figure`. | Remove; rename. | fixed: removed `checkValue`, `massLetter`, `formatVolume/Percent/Ratio`, `segmentClass`, `--accent-strong/-light`, `--series-2/-3`, `--gap-grid`, `--breakpoint-studio`, `.tf-hairline`, drawer CSS and keyframes, 21 unused icons; `Metric.tsx` → `Figure.tsx` |
| minor | `MassList.tsx` | Selected row's warning dot used sun yellow. | Neutral dot; text carries status. | fixed |
| minor | `ConstraintsPanel.tsx` | "Design check" was a `<p>` above an `<h3>`. | Make it `<h2>`. | fixed |
| minor | `SunPanel.tsx` | `role=status` mounted with its text, often not announced. | Keep the region mounted. | fixed |
| minor | `SunPanel.tsx` | Range `step=5` vs any-minute values. | `step=1`. | fixed |
| minor | `StudioShell.tsx` | Sun group meta always "N"; dangling separator while loading. | Reuse N/S; omit separator. | fixed |
| minor | `Inspector.tsx` | "3.2 m storey" meta implied a fixed storey height. | "Default storey 3.2 m". | fixed ("Units · 2 dp" left: inputs do show 2 dp) |
| minor | `CameraHud.tsx` | Legend swatches were hard-coded hex and no longer matched the softened scene. | Derive from scene constants. | fixed (`ACCENT`, `AMBER` exported; `soften()` for green) |
| minor | `ToolRail.tsx` | Draw/Select enabled before the package loads. | Disable until ready. | fixed |
| nit | `StudioTopBar.tsx` | 11 px text targets. | `min-h-6`. | fixed |
| nit | `MassLayer.tsx` | Comment said "north corner" (code picks north-east). | Fix comment. | fixed |
| note | amber marks | Amber squares are 2.6:1 on the panel (non-text). | Acceptable while text states the status. | accepted |
| note | type scale | `text-hero`, `text-display` unused after draft 4. | Kept as part of the contract §3 scale. | accepted |

Also changed in this pass (implementer, from the recaptured evidence): the floating warning toast was removed because the always-visible design check states the same thing (assessment #5); the toast now shows only draw instructions and errors. Small motion pass: surfaces fade in once, panel figures tween on change (`useTween`, tested), new masses rise from the ground once; all off under reduced motion.

Contrast (reviewer, computed): all text pairs pass AA; the narrowest are `ink-on-inverse/75` on accent (4.61) and "Pass" green on panel (4.63) — no headroom for token changes.

## Gate decision

- [ ] Pass
- [x] Pass with follow-ups
- [ ] Fail — re-review required

## Follow-ups (separate tasks, not sneaky edits)

1. Keyboard e2e: tab through top bar → toolbar → views → sun band → panel and press Enter on each group summary.
2. ~~Owner: accept ADR-0009 and ADR-0010~~ — accepted 2026-11-02.
3. M5 visual gate against `docs/design/design-contract.md` §0 at 1440, 1280, 1024 and 390 px.
