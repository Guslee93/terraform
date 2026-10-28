# QA fixtures and verification protocol

- **Status:** Geometry fixtures active; solar values to be recorded in M3
- **Used by:** `engineering-senior-developer`, `engineering-code-reviewer`, `gis-qa-engineer`
- **PRD references:** §6.1, §6.2, §12.1, §12.2

Fixtures are the source of truth for domain tests. If an implementation disagrees with a fixture, the implementation is wrong until the fixture is formally revised by ADR.

## 1. Coordinate fixtures

| Case | Input | Expected |
|---|---|---|
| ENU → Three | `[120, -45, 9.6]` | `[120, 9.6, 45]` |
| Round trip | `[1234.567, -890.123, 42.5]` | identical ENU output |
| Horizontal distance | `[0,0]` → `[30,40]` | `50.000` m |
| Non-finite rejection | `[1, NaN]` | invalid |
| Comma decimal input | `"3,2"` | `3.2` |
| Partial input | `"3.2m"` | rejected |

## 2. Area, height and volume fixtures

### Rectangle

- Footprint: 18 m × 12 m
- Storeys: 3 × 3.2 m
- Expected footprint: **216.00 m²**
- Expected height: **9.60 m**
- Expected GFA: **648.00 m²**
- Expected volume: **2 073.60 m³**

### L-shaped footprint

- Bounding rectangle 20 m × 10 m minus a 10 m × 5 m notch
- Expected footprint: **150.00 m²**
- Storeys: 2 × 3.2 m
- Expected height: **6.40 m**
- Expected GFA: **300.00 m²**
- Expected volume: **960.00 m³**

### Stepped mass (tier inside lower footprint)

- Lower volume: 20 m × 10 m, 3 storeys × 3.2 m
- Upper volume: 10 m × 8 m, 2 storeys × 3.2 m, base elevation 9.6 m, set back inside the lower footprint
- Lower footprint: 200.00 m²; upper footprint: 80.00 m²
- Ground footprint union: **200.00 m²** (upper does not add ground coverage)
- Total GFA: `200×3 + 80×2` = **760.00 m²**
- Total volume: `200×9.6 + 80×6.4` = **2 432.00 m³**
- Max height: **16.00 m**
- Floor-level aggregation must not double-count the shared slab at 9.6 m.

### Site coverage

- Parcel area: 40 m × 50 m = **2 000.00 m²**
- Rectangle footprint 216 m² → coverage **10.80%**
- Stepped mass ground footprint 200 m² → coverage **10.00%**

## 3. Validation fixtures

| Case | Expected |
|---|---|
| Self-intersecting bow-tie polygon | rejected, model unchanged |
| 2-point polygon | rejected |
| Zero-area polygon | rejected |
| Negative width / storey count | rejected with field-specific error |
| Storey count 0 or 41 | rejected; v1 range 1–40 |
| Footprint fully inside parcel | `Within demo envelope` |
| Footprint crossing parcel edge | `Exceeds demo envelope`, offending mass highlighted |
| Footprint fully outside parcel | `Exceeds demo envelope`, outside area not counted as coverage |
| Height 9.6 m vs 12 m limit | `Within` |
| Height 16.0 m vs 12 m limit | `Exceeds` |
| No constraint configured | `Not evaluated` |

## 4. Solar verification protocol

SunCalc is the implementation library, but it is not its own reference. For each timestamp below, record the independent NOAA Solar Calculator (or an equivalent published reference) azimuth and elevation in this table during M3.

| Timestamp (Europe/Oslo) | Independent azimuth | Independent elevation | SunCalc azimuth | SunCalc elevation | Δ |
|---|---|---|---|---|---|
| 2026-03-20 12:00 | to record | to record | to record | to record | ≤0.5° |
| 2026-06-21 12:00 | to record | to record | to record | to record | ≤0.5° |
| 2026-09-22 12:00 | to record | to record | to record | to record | ≤0.5° |
| 2026-12-21 12:00 | to record | to record | to record | to record | ≤0.5° |
| 2026-12-21 23:00 | n/a (below horizon) | negative | must be below horizon | negative | n/a |

Additional checks:

- DST boundary `2026-03-29T01:30:00Z` resolves to 03:30 local, not 02:30.
- Same site/date/time after reload produces the identical sun vector (QA-10).
- Shadow direction aligns with the north arrow; a mass south of another casts northward at noon.
- Night/below-horizon state never displays a positive sun-hours claim (QA-11).

## 5. Persistence fixtures

| Case | Expected |
|---|---|
| Two scenarios saved, reload | both restored distinctly (QA-09) |
| Corrupt JSON record | recoverable warning + export/reset option |
| Unknown newer schema | rejected, no data loss, export offered |
| Quota exceeded | non-blocking warning, editing continues |
| Export → import | geometry, assumptions and notes identical |
| Migration v0 → v1 | deterministic converted document |

## 6. M1 package fixtures

These values are the generated-package baseline. The automated package test reads the real JSON and cross-checks manifest statistics, so source regeneration must keep these relationships true.

| Fixture | Compact Infill | Sloped Edge |
|---|---|---|
| Package id | `compact-infill` | `sloped-edge` |
| Origin latitude / longitude | 59.9235 / 10.7580 | 59.89825 / 10.77375 |
| Origin elevation | 20.42 m | 137.20 m |
| Study area | 190 × 240 m = 45 600 m² | 230 × 310 m = 71 300 m² |
| Terrain grid | 13 × 13 | 13 × 13 |
| Terrain range (relative) | −4.38 … +5.98 m | −26.98 … +4.01 m |
| Buildings | 137 | 33 |
| Buildings inside study area | 65 | 20 |
| Sources | OSM ODbL 1.0 · Kartverket CC BY 4.0 | same |
| Boundary label | not a cadastral parcel | same |

Geometry checks: every building footprint must be a simple ring with positive area and finite coordinates. The first M1 build failed this check for 12 footprints; the repair pass and runtime validator now enforce it.

## 7. PRD QA matrix mapping

| QA | Fixture / test | Covered by |
|---|---|---|
| QA-01 | M1 package load smoke | `e2e/smoke.spec.ts` — "landing page opens the primary studio and the package loads"; "the sloped-edge package loads its own context"; `src/features/sites/package.test.ts` — "parses the manifest and all three assets" |
| QA-02 | Camera presets and orbit test | `e2e/smoke.spec.ts` — "landing page opens the primary studio and the package loads" (Top preset clicked, `aria-pressed` asserted). Orbit-drag behaviour has no automated test. |
| QA-03 | Rectangle/polygon creation | `src/features/editor/interaction.test.ts` — "adds points on click, removes with Backspace, and creates a mass on Enter"; `src/features/editor/commands.test.ts` — "adds a volume and selects it" |
| QA-04 | Self-intersection rejection | `src/features/editor/interaction.test.ts` — "QA-04: rejects a self-intersecting footprint and keeps the points to fix"; `src/lib/polygon.test.ts` — "rejects a crossing bow-tie"; `src/features/massing/validation.test.ts` — "rejects a self-intersecting bow-tie and leaves it unchanged" |
| QA-05 | 3→5 storeys recalculation | `src/features/editor/commands.test.ts` — "updates height and concept GFA from the geometry"; `src/features/editor/interaction.test.ts` — "QA-05 via roof drag: 3 → 5 storeys commits a 16 m tier" |
| QA-06 | Boundary crossing warning | `src/features/massing/clearance.test.ts` — "flags a mass crossing the boundary"; "flags a mass fully outside"; "flags a crossing upper tier even when the base tier is inside"; "reports nothing for a mass fully inside"; "flags a mass cutting into a slope with the depth"; "flags a mass floating above the ground with the gap"; "accepts a mass seated on flat ground" |
| QA-07 | Drag + Esc restores exact dimensions | `src/features/editor/commands.test.ts` — "reverts to the exact pre-drag dimensions with no history entry"; `src/features/editor/interaction.test.ts` — "QA-07: roof drag then Esc restores the exact document with no entry"; `src/features/editor/history.test.ts` — "cancels back to the exact base with no entry" |
| QA-08 | Undo/redo duplicate/delete/rotate | `src/features/editor/commands.test.ts` — "duplicates with fresh ids, selects the copy, and undoes exactly"; "deletes, clears selection, and restores the volume in place on undo"; "rotates every tier about one pivot and undoes to exact vertices"; `src/features/editor/history.test.ts` — "restores document and selection on undo and redo"; `src/components/studio/ToolRail.test.tsx` — "undoes and redoes when available"; `src/components/studio/MassFields.test.tsx` — "duplicates the mass beside the original"; "deletes the mass"; "rotates by 15° steps (clockwise is negative in ENU)" |
| QA-09 | M4 reload fixture | Not yet covered |
| QA-10 | Deterministic sun vector | Not yet covered |
| QA-11 | Winter/no-sun state | Not yet covered |
| QA-12 | Comparison deltas | Not yet covered |
| QA-13 | PNG export contents | Not yet covered |
| QA-14 | Corrupt schema/quota | `src/features/massing/serialize.test.ts` — "rejects malformed JSON"; "rejects unknown schema version"; "rejects structurally broken documents with a path"; "rejects semantically invalid values after decoding". Quota-exceeded handling (IndexedDB) is M4 — Not yet covered. |
| QA-15 | No WebGL fallback | Not yet covered |
| QA-16 | Invalid numeric input | `src/features/editor/inspectorInput.test.ts` — `parseStoreys` "parses %j as %d" / "rejects %j" (incl. `''`, `3.5`, `-1`, `3 storeys`, `1e2`) and `formatInputValue` "shows two decimals without a unit", "never shows negative zero", "returns an empty string for non-finite values"; `src/features/editor/commands.test.ts` — "rejects invalid numeric updates without an entry (QA-16)"; `src/components/studio/MassFields.test.tsx` — "QA-16: rejects non-numeric input, keeps the prior value and says why"; "QA-16: shows the domain error and keeps the prior value when a command is refused"; "QA-16: rejects a non-number in metres"; "parses metres with a comma decimal"; `src/lib/coordinates.test.ts` — "accepts whole and decimal values, including comma decimals"; "rejects empty, partial and non-numeric values" |
| QA-17 | Reduced motion | Not yet covered |
| QA-18 | Missing site asset | `src/features/sites/useSitePackage.test.tsx` — "reports a load failure as error with a retry action"; `src/features/sites/fetchJson.test.ts` — "fails with a timeout error naming the URL when a request stalls" |
