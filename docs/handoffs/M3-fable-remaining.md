# M3 domain core — Fable handoff

- **Branch:** `m3/domain` (worktree `../Terraform-m3`), 5 commits on top of `3aff4b6`
- **Date:** 2026-10-29
- **State:** F1–F5 all delivered. `npm run typecheck`, `npm run test` (669 tests, 55 files; was 445) and `npm run build` pass. `npm run lint` reports one **pre-existing** error in `scripts/capture.mjs:49` (`window` undefined under the node globals config); the file is outside this session's remit and unchanged on this branch. Fix: add `/* global window */` or `globals.browser` for that file in `eslint.config.js`.
- **Files touched:** `src/features/analysis/**`, `src/features/massing/{aggregate,clearance,metrics}.ts` (+ tests), `src/lib/clip.ts` (+ test), `docs/decisions/ADR-0007`, `ADR-0008`, `docs/qa/fixtures.md`, this file. No dependency added; `@types/geojson` (already transitive via turf) is used type-only in `lib/clip.ts`.
- **Not done by me (per brief):** `docs/agent-log.md` and `progress.md` entries, `docs/reviews/M3-*`, any UI.

## 1. What is done

| Item | Commit | Where |
|---|---|---|
| F4 time model, sun state, day model, QA-10/11 | `737de0e` | `analysis/time.ts`, `analysis/sun.ts` |
| F1 level-indexed GFA, metrics, ADR-0007 | `baa8989` | `massing/metrics.ts`, `lib/clip.ts`, `ADR-0007-floor-level-gfa.md` |
| F3 setback envelope, height reference, ADR-0008 | `6bdb146` | `lib/clip.ts` (`insetPolygon`), `analysis/constraints.ts`, `ADR-0008-height-reference.md` |
| F2 parcel coverage fixtures | `70d19fd` | `massing/metrics.ts` (`parcelCoverage`, already in F1), tests |
| F5 NOAA oracle + NREL comparison | `49b5b4b` | `analysis/__fixtures__/noaa-oracle.ts`, `analysis/sun-reference.test.ts` |

Every fixtures §2–§4 row names its test in `docs/qa/fixtures.md`; §7 QA-10 and QA-11 are now covered.

## 2. Decisions you need to make

1. **ADR-0007 (floor-level GFA)** — accept or amend before C9 shows the number. Key choices: one plate per storey at the storey's base; 0.1 m level tolerance; union per level; scenario `gfaM2` is the union across buildings and `gfaByBuildingM2` is the additive sum (they differ only when buildings interpenetrate). Mixed storey heights on *overlapping* tiers over-count and are declared out of scope.
2. **ADR-0008 (height reference)** — default `grade` = lowest terrain sample under the ground tier(s); `datum` = site origin. Alternative (mean terrain) is listed and rejected. The manifest has no reference field; `constraintsFromManifest(manifest, 'grade' | 'datum')` is where the UI picks.
3. **`buildingCount` counts every volume**, hidden ones included. `StudioShell` already passes the displayed document (`displayedDocument(editor)`) to `checkClearance`; pass the same to `scenarioMetrics` and `evaluateEnvelope` and hidden masses are excluded consistently. Decide whether hidden masses should count in exports.
4. **Overlap default**: `resolveLocalTime` returns the *earlier* (CEST) occurrence during the autumn overlap and exposes `alternateInstant`. The scrubber could offer a toggle; the fixture file fixes the semantics.
5. **`TIME_PRESETS.noon` is 12:00 wall-clock**, not solar noon. `dayModel().solarNoon` is available if the design wants the alternative.

## 3. Contract changes vs plan §6

- `sunState(instant, lat, lon, timeZone = 'Europe/Oslo')` — zone has a default. Added `describeSunState`, `compassPoint`, `sunDirectionEnu`, `SUN_BELOW_HORIZON_LABEL`.
- `resolveLocalTime` returns `kind: 'normal' | 'gap-shifted' | 'overlap-earlier' | 'overlap-later'` plus `alternateInstant`; takes `prefer: 'earlier' | 'later'`.
- `dayModel` `normal` variant also carries `solarNoon` and `daylightMinutes` (geometric; label it as such, never "sun hours").
- `scenarioMetrics(document, parcelRing)` takes the **open study-boundary ring**, not an area, and returns `parcelAreaM2`, `conceptGfaRatio`, `gfaByBuildingM2`, `footprintWithinParcelM2` as well.
- `evaluateEnvelope(document, site)` — `site` is `SiteContext & { constraints: EnvelopeConstraints | null }` (same `studyArea`/`heightAt` already built in `StudioShell`). Per-mass result adds `outsideBoundaryRings`, `heightM`, `referenceElevationM`; `setbackPolygon` is `Ring[] | null` (null when no setback configured). Result carries `disclaimer` and `heightReference`.
- `aggregate.ts` keeps all M2 helpers unchanged; its union now routes through `lib/clip.ts`.

## 4. Final public API (build C8–C10 against this)

```ts
// src/features/analysis/time.ts
type LocalDate = `${number}-${number}-${number}`; type LocalTime = `${number}:${number}`
type LocalWallClock = { date: LocalDate; time: LocalTime; offsetMinutes: number; zoneName: string }
type ResolvedLocalTime = { instant: Date; kind: 'normal' | 'gap-shifted' | 'overlap-earlier' | 'overlap-later'; alternateInstant: Date | null }
resolveLocalTime(date: string, time: string, timeZone: string, prefer?: 'earlier' | 'later'): ResolvedLocalTime  // throws on malformed input
toLocalWallClock(instant: Date, timeZone: string): LocalWallClock
formatLocalLabel(instant: Date, timeZone: string): string            // "2026-03-29 03:30 CEST"
utcOffsetMinutes(instant: Date, timeZone: string): number
minutesOfLocalDay(instant: Date, timeZone: string): number           // 0–1439 for the scrubber
localDayMinuteToInstant(date: string, minuteOfDay: number, timeZone: string): ResolvedLocalTime  // clamps

// src/features/analysis/sun.ts
DEMO_SUN_INSTANT: Date; DEFAULT_TIME_ZONE = 'Europe/Oslo'; SUN_BELOW_HORIZON_LABEL = 'Sun below horizon'
type SunDirection = { azimuthDeg: number; elevationDeg: number }
type SunState = SunDirection & { instant: Date; localLabel: string; belowHorizon: boolean; directionEnu: Vec3 | null }
sunDirection(instant, latitude, longitude): SunDirection
sunDirectionEnu(direction: SunDirection): Vec3                      // unit vector towards the sun, ENU
sunState(instant, latitude, longitude, timeZone?): SunState          // belowHorizon ⇔ elevationDeg <= 0 (matches lightRig)
describeSunState(state): string                                      // "Elevation 29.9° · azimuth 173° (S)" | "Sun below horizon"
compassPoint(azimuthDeg): 'N' | 'NNE' | … | 'NNW'
type DayModel = { kind: 'normal'; sunrise: Date; sunset: Date; solarNoon: Date; daylightMinutes: number }
              | { kind: 'polar-day'; solarNoon: Date } | { kind: 'polar-night'; solarNoon: Date }
dayModel(date: string, latitude, longitude, timeZone?): DayModel
DATE_PRESETS: { id: 'spring-equinox' | 'summer-solstice' | 'autumn-equinox' | 'winter-solstice'; label; date: LocalDate }[]
TIME_PRESETS: { id: 'morning' | 'noon' | 'evening'; label; time: LocalTime }[]   // 09:00, 12:00, 18:00

// src/features/massing/metrics.ts  (ADR-0007)
LEVEL_TOLERANCE_M = 0.1
type FloorLevel = { elevation: number; areaM2: number }
type VolumeMetrics = { volumeId; name; gfaM2; groundFootprintM2; volumeM3; maxHeightM; storeys: FloorLevel[] }
type ScenarioMetrics = { gfaM2; gfaByBuildingM2; groundFootprintM2; footprintWithinParcelM2; footprintOutsideParcelM2;
                         parcelAreaM2; coverageWithinParcel /* ratio */; conceptGfaRatio; volumeM3; maxHeightM; buildingCount; perVolume: VolumeMetrics[] }
floorLevels(tiers: readonly MassTier[]): FloorLevel[]
volumeMetrics(volume: MassVolume): VolumeMetrics
scenarioLevelGfa(document): number
parcelCoverage(ground: MultiPolygonRings, parcel: readonly Vec2[]): { withinM2; outsideM2; parcelAreaM2 }
scenarioMetrics(document: ScenarioDocument, parcel: readonly Vec2[]): ScenarioMetrics   // parcel = normalizeRing(studyArea.polygon)

// src/features/massing/aggregate.ts (additions)
footprintUnion(footprints): MultiPolygonRings

// src/features/analysis/constraints.ts  (ADR-0008)
CONSTRAINT_DISCLAIMER = 'Illustrative constraint — not planning advice'
ENVELOPE_STATUS_LABEL: Record<EnvelopeStatus, 'Within demo envelope' | 'Exceeds demo envelope' | 'Not evaluated'>
type HeightReference = 'grade' | 'datum'
type EnvelopeConstraints = { maxHeightM?: number; setbackM?: number; heightReference: HeightReference }
type EnvelopeSite = SiteContext & { constraints: EnvelopeConstraints | null }   // SiteContext from massing/clearance
type EnvelopeStatus = 'within' | 'exceeds' | 'not-evaluated'
type EnvelopeReason = 'outside-boundary' | 'outside-setback' | 'too-tall'
type VolumeEnvelope = { volumeId; status; reasons: EnvelopeReason[]; outsideBoundaryRings: Ring[]; outsideSetbackRings: Ring[];
                        heightM; referenceElevationM; heightExcessM }
type EnvelopeResult = { status; heightReference; setbackPolygon: Ring[] | null; perVolume: VolumeEnvelope[]; disclaimer }
evaluateEnvelope(document, site: EnvelopeSite): EnvelopeResult
referenceElevation(volume, site, reference): number
constraintsFromManifest({ maxHeightMeters, setbackMeters }, heightReference = 'grade'): EnvelopeConstraints

// src/lib/clip.ts (planar, ENU metres; never turf.buffer/area here)
type Ring = readonly Vec2[]; type PolygonRings = readonly Ring[]; type MultiPolygonRings = readonly PolygonRings[]
unionPolygons / intersectPolygons / differencePolygons / multiPolygonArea / outerRings
insetPolygon(ring: Ring, distance: number): MultiPolygonRings      // inward offset; may split or be empty

// src/features/massing/clearance.ts (addition)
footprintSamplePoints(footprint): Vec2[]
```

## 5. Exact next steps for Codex

- **C8 time controls:** state = `{ date: LocalDate; minuteOfDay: number }`; derive `instant` with `localDayMinuteToInstant(date, minute, 'Europe/Oslo')`, show a note when `kind !== 'normal'`; feed `sunState(instant, lat, lon)` into `lightRig` (`belowHorizon` already matches `elevationDeg <= 0`); readout = `describeSunState`; use `dayModel` to shade night on the scrubber and to show `Polar day` / `Polar night`; `daylightMinutes` may be shown only as "geometric sunrise–sunset", never "sun hours". Presets: `DATE_PRESETS`, `TIME_PRESETS`. Replace the `DEMO_SUN_INSTANT` use in `ViewportCanvas.tsx:315` with the resolved instant (default stays `DEMO_SUN_INSTANT`).
- **C9 metrics panel:** `scenarioMetrics(displayedDocument, normalizeRing(sitePackage.studyArea.polygon))`; cards: `gfaM2` (`Concept GFA`), `groundFootprintM2`, `coverageWithinParcel` as %, `footprintOutsideParcelM2` when > 0, `volumeM3`, `maxHeightM`, `buildingCount`, `conceptGfaRatio` titled exactly `Concept GFA ratio`. Per-building: `perVolume[i].storeys` list. Tooltips: ADR-0007 §4 wording.
- **C10 constraint layers:** `evaluateEnvelope(displayedDocument, { studyArea, heightAt, constraints: constraintsFromManifest(manifest.constraints) })`; draw `setbackPolygon` rings at ground; max-height plane at `referenceElevationM + maxHeightM` per selected mass (or at `maxHeightM` above datum for the global plane, labelled); inspector shows `ENVELOPE_STATUS_LABEL[status]` and `heightReference`; clicking a warning selects `volumeId` and highlights `outsideSetbackRings` / `heightExcessM`; `disclaimer` on every tooltip/export (D34 audit).

## 6. Known limitations

- `insetPolygon` approximates round reflex corners with a 48-gon (≤ 0.2 % short of the true arc).
- Offending rings are **outer rings only**; a footprint that encloses a setback island would lose the hole in the highlight (not possible with a convex setback; rare otherwise).
- Zone names come from `Intl` (`en-GB` locale → `CET`/`CEST` in Node 22 and modern browsers); an older ICU may print `GMT+1`. Tests assert the full label, so a CI image with a reduced ICU would need `--icu-data-dir` or `full-icu`.
- `DATE_PRESETS` are the 2026 dates; other years shift by up to a day.
- `grade` depends on the terrain sampler, so the height status can change when the terrain layer changes; `datum` does not.
