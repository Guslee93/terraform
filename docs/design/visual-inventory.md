# Visual inventory (TF-VIS-016)

Every scene colour, line, ramp, legend and floating UI surface in the studio today, with its
source and `file:line`. Each entry is marked against the identity plan (`09-VISUAL-IDENTITY-INTEGRATION.md`
§4 matrix R1–R12):

- **kept** — unchanged by the identity.
- **changes** — a value or ramp is re-derived/tuned (via `style.ts` or the registry), not removed.
- **replaced** — the item itself is superseded (e.g. land-cover tint → orthophoto).

Values are quoted from the code; nothing here is invented.

## 1. Scene style — `src/scene/style.ts` (`NORDIC`)

| Value | Today | file:line | Marking | 09 row |
|---|---|---|---|---|
| background | `#F1F1EF` | style.ts:34 | **replaced** (dark `#171B19`) | R6 |
| ground (floor grid plane) | `#EBEBE8` | style.ts:35 | **replaced** (dark ground) | R6 |
| context color / roughness | `#FAF9F6` / `0.9` | style.ts:36 | **kept** (matte white massing; AO/shadows tuned) | R3 |
| road | `#C1BEB7` | style.ts:37 | **changes** (re-tuned to read on the orthophoto; removal not decided — TF-VIS-020) | R1/R6 |
| water | `#D3E0E8` (= `soften('#CBE1EE')`) | style.ts:39 | **changes** (reads on orthophoto/dark ground) | R1/R6 |
| skirt | `#DCD8D1` | style.ts:40 | **replaced** (hidden in the identity) | R6 |
| grid minor / major | `#DDDDD9` / `#D8D8D3` | style.ts:42–43 | **replaced** (floor grid hidden) | R6 |
| grid terrain (colour / opacity) | `#7C8E7D` / `0.22` | style.ts:44 | **changes** (line colour/opacity via `style.ts`) | R2 |
| line crease (colour / opacity) | `#7E7D7A` / `0.85` | style.ts:48 | **kept** (crisp massing edges) | R3 |
| line silhouette | `null` | style.ts:49 | **kept** (none today) | R3 |
| contour minor (colour / opacity) | `#7E7D7A` / `0.14` | style.ts:50 | **replaced** (fine light-white) | R2 |
| contour major (colour / opacity) | `#7E7D7A` / `0.32` | style.ts:51 | **replaced** (fine light-white) | R2 |
| line parcel (colour / opacity) | `#374151` / `0.55` | style.ts:54 | **kept** (geography recognisable) | R7 |
| line section (colour / opacity) | `#1F3BD6` / `1` | style.ts:55 | **kept** (accent) | R7 |
| AO intensity / radius / colour | `1.6` / `4` m / `#2B3138` | style.ts:57 | **changes** (AO tint on dark ground) | R3 |

## 2. Analysis graphics — `src/features/analysis/graphics.ts` (`GRAPHICS`)

All ramps and bands are renderer-free; labels stay in their domain modules. Class: `calculated`
(C), `screening` (S), `mapped` (M).

| Analysis | Class | Scale | Values | file:line | Marking | 09 row |
|---|---|---|---|---|---|---|
| sun-hours | C | ramp `share of possible sun hours` | `#662506 #993404 #CC4C02 #EC7014 #FE9929 #FEC44F #FEE391` at 0…1 | graphics.ts:47–58 | **changes** (re-derived on dark ground) | R7 |
| roof-solar | S | bands kWh/m²/yr | `#E7E1D2` 300, `#E8D48A` 600, `#E0B25C` 900, `#CC7340` 1200, `#9C2F2F` ∞ | graphics.ts:60–72 | **changes** | R7 |
| vsc | S | bands % | `#9C2F2F` 15, `#E0B25C` 27, `#E8D48A` ∞ | graphics.ts:74–80 | **changes** | R7 |
| wind-speed | S | ramp m/s | `#F5F7FB` 0, `#BFD3F2` 2, `#5B8DEF` 4, `#2F49D1` 6, `#7B2FD1` 8, `#C21FB3` 10 | graphics.ts:82–96 | **changes** | R7 |
| wind-comfort | S | bands Lawson | `#3B6EA8`, `#4FA3A5`, `#E6DC9C`, `#E39A4C`, `#C2452F`, `#962838` | graphics.ts:98–111 | **changes** | R7 |
| wind-delta | S | bands | `#1E3A8A`, `#93C5FD`, `#E5E7EB`, `#FCA5A5`, `#B91C1C` | graphics.ts:113–125 | **changes** | R7 |
| noise | M | bands dB | `#C4D3C6` 50, `#9DB8A0` 55, `#D4D08A` 60, `#E0B25C` 65, `#CC7340` 70, `#9C2F2F` 75, `#6E1A2A` ∞ | graphics.ts:127–141 | **changes** | R7 |
| slope | C | bands ° | `#E5E7EB` 5, `#E6DC9C` 15, `#E39A4C` 30, `#962838` ∞ | graphics.ts:143–154 | **changes** | R7 |
| runoff | S | bands | `#93C5FD` 500 m², `#3B6EA8` 5000, `#1E3A8A` ∞ | graphics.ts:156–166 | **changes** | R7 |
| streamlines (illustrative) | — | `slow #1E3A8A`, `fast #7B2FD1` | — | graphics.ts:188 | **changes** (distinct from vegetation) | R7 |

Shared hexes used by more than one analysis: `sharedColours()` (graphics.ts:195) — snapshotted in
`graphics.test.ts` (11 values); Gate 5 is expected to empty it.

## 3. Floating UI surfaces over the canvas

These sit over the viewport (not in the Parameters panel); the identity keeps their claim policy
but re-themes the chips (R8).

| Surface | Location | file:line | Marking |
|---|---|---|---|
| Wind ramp bar (`WindRampBar`) — `role=img` "Wind speed colour scale" | `ViewportCanvas.tsx:649`; `WindRampBar.tsx:3–9` | — | **changes** (ramp re-derived) |
| Wind claim (`windCaption`) | `ViewportCanvas.tsx:650` | — | **kept** (claim policy) |
| Runoff claim (`runoff.caption`) | `ViewportCanvas.tsx:656` | — | **kept** |
| Noise claim (`noise.caption`) | `ViewportCanvas.tsx:662` | — | **kept** |
| Sun hours ramp bar (`SunHoursRampBar`) + claim | `ViewportCanvas.tsx:668–669`; `SunHoursLayer.tsx:143–153` | — | **changes** (ramp re-derived) |
| Compass "N", scale bar, "Green space" | `ViewportCanvas.tsx` HUD (`CameraHud.tsx:16–32`; green `soften('#D3DCCB')` at CameraHud.tsx:6) | — | **kept** (R11) |

## 4. UI tokens — `src/styles/tokens.css`

| Group | Values | file:line | Marking | 09 row |
|---|---|---|---|---|
| Surfaces | `--bg-app #e4e4e1`, `--surface #f1f1ef`, `--surface-paper #fafaf8`, `--surface-inverse #141414` | tokens.css:5–10 | **replaced** (charcoal theme) | R8 |
| Ink | `--ink-primary #141414`, `--ink-secondary #646461`, `--ink-disabled #a3a3a0` | tokens.css:13–15 | **replaced** | R8 |
| Lines | `--border #d9d9d5`, `--border-strong #141414` | tokens.css:20–21 | **replaced** | R8 |
| Accent | `--accent #1f3bd6`, `--accent-soft #e6e9fb` | tokens.css:25–26 | **kept** (`#1f3bd6` until contrast checks, D17) | R3/R8 |
| Sun marks | `--sun-low #f7c948`, `--sun-high #e8590c`, `--sun-mid #f08c00`, `--sun-dot #f59f00`, `--sun-winter #e0a800`, `--sun-glow #ffd43b` | tokens.css:29–34 | **kept** (sun data marks) | R7 |
| Status | `--positive #2f7a4c`, `--warning #c98a16`, `--warning-ink #8a5a00`, `--danger #b4372e` | tokens.css:37–41 | **kept** | R12 |
| Canvas/card (ADR-0016) | `--canvas #eeeeee`, `--card #f7f7f6`, `--card-line #e1e1de`, `--frost rgb(247 247 246 / 72%)` | tokens.css:46–53 | **replaced** (charcoal glass) | R8 |
| Type | `--typeface-sans 'Geist Variable'`, `--typeface-mono 'Geist Mono Variable'` | tokens.css:58–59 | **kept** (no new dependency) | R12 |

## 5. Cross-cutting notes

- **`palette.ts`** `SCENE_SATURATION = 0.6` (palette.ts:4) and `soften()` desaturate the scene tints;
  the land-cover tints (`landCoverTexture.ts:9–22`, water `#CBE1EE` → `#D3E0E8`) are the ground look
  that **R1 replaces with the ~80 %-desaturated orthophoto**, kept as the no-imagery fallback.
- **Mass / proposal** tint `soften('#C9DBE5')` (`MassLayer.tsx:23`), selection edge `#3550E0` and
  storey lines `#355E79` (`MassLayer.tsx:31–35`) are **kept** (proposal stays cobalt) — R3.
- **Vegetation** `foliage.ts` greens (`soften('#A9CBA0') …`) and the instanced mesh trees
  (`Trees.tsx`) are **replaced** by point clusters — R4, kept for the Low tier until 029.
- **Lighting** lives in `lighting.ts` `lightRig()`: day rig ambient `0.08`, environment `0.22`,
  hemisphere `#EEF3FA` / `#D2D5D8` @ `1.35`, sun `3.2 × min(elevation/6, 1)` (lighting.ts:25–35);
  night rig ambient `0.2`, environment `0.6`, hemisphere `#C9D3E0` / `#B9BEC4` @ `0.7`
  (lighting.ts:16–23). `EnvironmentLight` bakes a `RoomEnvironment` PMREM at blur `0.04`
  (`ViewportCanvas.tsx` `EnvironmentLight`). These gain an `atmosphere` argument in TF-VIS-025 —
  **changes** (R5), sun position provably untouched.
