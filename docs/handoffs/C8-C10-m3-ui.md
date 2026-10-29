# C8–C10 — M3 time controls, metrics panel, constraint layers (Codex work order)

Role: implementer (frontend + 3D scene). Project: Terraform v1, milestone **M3**. Do **C8, then C9, then C10**, in this one run, on branch `m3/ui` in the main checkout. Do not commit or stage.

Read in order: `AGENTS.md`; `docs/handoffs/M3-fable-remaining.md` (**§4 is the API you build against, §5 the per-item steps**); `docs/decisions/ADR-0007-floor-level-gfa.md` §4 and `ADR-0008-height-reference.md` (both **Accepted**); `docs/design/design-contract.md` (§8 scene palette, §9 accessibility, claim policy); `docs/milestones/M3-live-analysis.md`; then `src/components/studio/{StudioShell,Inspector,MassFields}.tsx`, `src/scene/{ViewportCanvas,CameraHud,lighting}.ts(x)`, `src/scene/siteGeometry.ts` (`drapePolyline`).

## Ownership

- **You may edit:** `src/components/studio/**` (+ tests), `src/scene/ViewportCanvas.tsx`, `src/scene/CameraHud.tsx`, new `src/scene/ConstraintLayer.tsx` (+ test), new `src/components/studio/format.ts` (+ test).
- **Do not touch:** `src/features/**` (Fable's domain API is final; if something is missing, report it rather than editing), `src/lib/**`, `public/**`, `scripts/**`, `e2e/**` (DeepSeek writes the M3 e2e afterwards), `package.json`. No new dependencies.

## Shared rules

- All numbers come from the domain API, never constants. Pass **`displayedDocument(editor)`** (as `checkClearance` already gets), so hidden masses are excluded and drag previews update live.
- Claim policy: say "Concept GFA", "Concept GFA ratio", "geometric sunrise/sunset", "Illustrative constraint — not planning advice". Never "sun hours", "BRA", "BYA", "compliant", "verified".
- Accessibility: every control labelled and keyboard reachable, visible focus, `aria-live="polite"` on the sun readout and the envelope status, reduced motion respected. Reuse the existing Inspector typography and spacing (micro labels, 11.5–13 px values, existing chip/button styles). No new colour tokens beyond those named here, which are already in the design contract.
- Number format helper (`format.ts`, tested): m² and m³ as integers with a thin-space thousands separator (`1 080 m²`); metres to 1 decimal (`16.0 m`); percentages to 1 decimal (`10.8 %`); ratio to 2 decimals (`0.38`); never `-0`.

## C8 — Sun tab (FR-060, 063–066)

- Enable the Inspector **Sun** tab. `StudioShell` owns `sunTime: { date: LocalDate; minuteOfDay: number }`, defaulting to `2026-06-21`, 900 (= `DEMO_SUN_INSTANT`, so the default view is unchanged). Resolve with `localDayMinuteToInstant(date, minute, site timeZone)`, then `sunState(...)`, and pass the resulting `SunDirection` into `ViewportCanvas` as a prop. Remove the internal `DEMO_SUN_INSTANT` computation at `ViewportCanvas.tsx` (§5 of the handoff). `lightRig`, the night chip and shadows follow automatically.
- Panel contents, top to bottom:
  1. Readout: `describeSunState(state)` and the local label (`formatLocalLabel`), `aria-live`.
  2. Date: four `DATE_PRESETS` buttons (pressed state on the active one) plus a native `<input type="date">`.
  3. Time: a range slider 0–1439, step 5, with value text `HH:mm`; three `TIME_PRESETS` buttons. Shade the slider track for night using `dayModel` (sunrise/sunset); for `polar-day`/`polar-night`, show that label instead of times.
  4. Play/pause plus a speed select (30 / 60 / 120 local minutes per second); wraps at midnight. With `prefers-reduced-motion`, play steps 15 minutes per second instead of animating smoothly. Pause when the tab is hidden.
  5. Day info: "Geometric sunrise HH:mm · sunset HH:mm" (or "Polar day" / "Polar night").
  6. DST note when `kind !== 'normal'`: "This time doesn't exist on this date (clocks change); showing HH:mm." for gap-shifted, "This time occurs twice; showing the earlier (summer time)." for overlap.
  7. Method note (small, secondary): "Geometric sun direction for this site (suncalc). Not a daylight or sun-hours assessment."
- Tests: StudioShell/Sun panel component tests for a preset changing the readout, the DST gap note on 2026-03-29 02:30, polar-day text for a Tromsø-like latitude (inject site coordinates), and play/pause toggling.

## C9 — Metrics in the Model tab (FR-050–057, deliverable 2)

- Add a **Metrics** section at the top of the Model tab, fed by `scenarioMetrics(displayedDocument, normalizeRing(sitePackage.studyArea.polygon))`. It is hidden when there are no masses; show the empty state "Draw a mass to see metrics." instead.
- Cards in a 2-column grid: **Concept GFA** (`gfaM2`), **Ground footprint**, **Coverage of study area** (`coverageWithinParcel` %), **Outside study area** (only when `footprintOutsideParcelM2 > 0`, amber text `#B8822B` plus the word "outside", never colour alone), **Volume**, **Max height** (`maxHeightM`, "above site origin"), **Buildings**, **Concept GFA ratio**.
- If `gfaM2 !== gfaByBuildingM2`, a one-line hint: "Buildings overlap at some floor levels; overlap counted once."
- "About these numbers" as a native `<details>`: units, GFA vs footprint vs coverage difference, the ADR-0007 rule in one sentence, and "Concept GFA is not BRA, BYA or %-BRA."
- **Selected mass:** in the existing selection area, add a **Floors** list from `perVolume[…].storeys` (elevation in m, area in m²) and the mass's own GFA.
- Tests: the stepped fixture shows `760 m²` and 5 floors; the outside-study-area card appears only when a mass crosses the boundary; empty state.

## C10 — Constraints tab and scene layers (FR-070–076)

- Enable the Inspector **Constraints** tab. Compute `evaluateEnvelope(displayedDocument, { studyArea, heightAt, constraints: constraintsFromManifest(manifest.constraints, heightReference) })` once in `StudioShell` (with `heightReference` state, default `'grade'`).
- Panel: status headline `ENVELOPE_STATUS_LABEL[status]` (`aria-live`) with the disclaimer directly under it; read-only limits "Max height 18.0 m · Setback 4.0 m" from the manifest; a **Height measured from** select (Grade / Datum) with a hint taken from ADR-0008 ("Grade: lowest ground under the building. Datum: site origin."); then one warning button per volume with `status === 'exceeds'`: name, reasons in words ("outside the setback", "outside the study area", "1.6 m above the limit (above grade, ref −1.0 m)"). Clicking it selects the volume's ground tier (existing `select` event) and switches to the Model tab only if the user asked; otherwise stay on Constraints.
- Masses that exceed the envelope join the existing amber `warnedVolumes` tint (merge with clearance warnings; one set).
- **Scene (`ConstraintLayer.tsx`):** two new `SceneLayers` keys with Layers checkboxes, **Setback** and **Height limit**, both on by default and listed after Study boundary.
  - Setback: each `setbackPolygon` ring draped with `drapePolyline` (lift 0.6 m), dashed, `#B8822B` (design contract "Setbacks"), 2 px like the study boundary `Line`.
  - Outside-setback highlight: for warned volumes, `outsideSetbackRings` and `outsideBoundaryRings` draped as solid `#B8822B` lines (lift 0.8 m).
  - Height limit: with `datum`, one translucent plane over the study-area extent at `maxHeightM` (accent `#355E79`, opacity 0.08, `depthWrite` false, thin outline at 0.35). With `grade`, a plane only for the **selected** mass, over its footprint's bounding box expanded by 10 %, at `referenceElevationM + maxHeightM`; no selection means no plane.
  - Not raycastable (`raycast={() => null}`), so drawing and selection are unaffected.
- Legend (`CameraHud`): add **Setback** (dashed amber swatch) when the layer is on; keep D17b's spacing so it stays clear of the scale bar.
- Tests: the status headline and disclaimer render; a mass crossing the setback lists "outside the setback" and its button selects it; switching Grade/Datum changes the reported reference; ConstraintLayer renders nothing when constraints are null.

## Done when

- `npm run lint && npm run typecheck && npm run test && npm run build` pass. Write e2e only if a component test can't cover something; DeepSeek writes the M3 e2e next.
- Default view unchanged (21 June 15:00, same light), and the Sun/Constraints tabs are no longer marked "M3".
- Report per part (C8/C9/C10): files changed, tests added, deviations with reasons, anything in the domain API that was missing or awkward, and whether you could run a browser.
