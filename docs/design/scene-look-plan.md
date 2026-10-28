# Scene look plan — "white model" site analysis

**Status:** Phase 1 implemented (2026-10-28) · Phases 2–3 proposed · ADR-0005 pending
**Owner:** `gis-3d-scene-developer` (implementation), `design-ui-designer` (palette sign-off), `design-ui-finish-gate-reviewer` (G3)
**Touches:** `src/scene/ViewportCanvas.tsx`, `src/scene/siteGeometry.ts`, `src/scene/MassLayer.tsx`, `docs/design/design-contract.md` §8

## 1. What the references do

Six references (Forma-style site tools, an illustrated axonometric, a white architectural model) share the same recipe:

| Trait | How it is achieved |
|---|---|
| Buildings read as one material | Single near-white for **all** context, no per-use tints |
| Strong form without colour | One low sun; lit faces near-white, shaded faces mid-grey; **3:1 key-to-fill** ratio |
| Crisp, soft-edged cast shadows | Tight shadow frustum, high-res map, PCF soft filtering, shadows received **on buildings too** |
| "Physical model" depth | Ambient occlusion where walls meet ground and in courtyards |
| Clean silhouettes | Thin, low-contrast edge lines on creases (refs 1, 5) |
| Calm ground | Warm pale ground, roads one step lighter, no CAD grid |
| Colour means something | Only the proposal (and analysis overlays) carry colour |
| Scale cues | Small low-poly trees; storey bands on proposed masses |

### 1.1 Additional references (7 clay city, 8 sketch campus)

They mark the two ends of the same look, and Terraform should sit between them:

| | Ref 7 — clay render | Ref 8 — sketch model |
|---|---|---|
| Ground | near-white, same family as buildings | near-white; roads one value step **darker** grey |
| Shadows | soft, cool blue-grey, long | crisp, hard-edged, mid-grey |
| AO | heavy: contact, courtyards, under eaves | none |
| Edges | none | strong dark linework on every crease |
| Depth cue | AO + soft sky light | lines + lit/shaded face contrast |

What this changes in the plan:

- **Ground goes near-white, not warm pale.** Ground `#F0EFEC`, roads `#E2E1DD`, lit roofs `#F7F7F4`. Separation comes from shadow and lines, not hue.
- **Shadows tint cool.** Hemisphere ground colour moves to a cool grey (`#CDD0D4`) so shaded faces read blue-grey like ref 7, never brown.
- **Line weight is one knob, not a feature.** A single `edgeOpacity` constant: ~0.3 (clay, default) → ~0.7 (sketch). No style switcher in v1.
- **Road ribbons get outline edges** too, which gives the kerb reading of ref 7 without modelling kerbs.
- **No invented façade detail.** Windows, rooftop units and chimneys in refs 7–8 are modelled assets; we have no data for them, so we do not fake them. Storey bands (Phase 3) are the honest substitute for façade rhythm.

## 2. Where Terraform is today (`m2-stepped-upper-selected.jpg`)

- Context is warm grey `#D2D4CC` with per-kind tints (church/commercial/civic) → muddy, reads as colour noise.
- `ambientLight 0.45` + `hemisphere 0.35` against `sun 2.1` → fill too high, faces barely separate, low contrast.
- Context meshes `castShadow` only, never `receiveShadow` → no shadows fall across neighbouring façades.
- Shadow camera ±520 m on a 2048 map ≈ 0.5 m/texel → blurry, faint shadows.
- Sage terrain + visible grid → reads as CAD/terrain model, not site model.
- Proposal mass `#F2EFE7` is almost the same value as context → the design does not pop.

## 3. Plan, in three phases

### Phase 1 — Palette + light rig (no new dependencies, ~1 day)

1. **One context material.** Drop `BUILDING_COLORS` per-kind tints; all context `#F3F2EE`. (Kind stays in data for later layers/legends.) Matches the contract's "never colour as decoration".
2. **Ground.** Terrain near-white `#F0EFEC`, elevation tint ≤ 4% (see §1.1). Skirt `#D8D7D3`. Background and fog `#EEEDE9`, fog start pushed out so the site edge fades softly.
3. **Light rig as a pure function.** `sceneLight(direction: Vec3)` → sun + fill settings, so M3 can feed the `suncalc` direction straight in:
   - `ambientLight` 0.45 → **0.12**
   - `hemisphereLight` sky `#FFFFFF`, ground `#CDD0D4`, **0.55** (cool blue-grey shadows, never black)
   - `directionalLight` **2.6–3.0**, default azimuth SW, elevation ~35° so two façades read lit/unlit
   - Keep the R3F default ACES tone mapping; verify white façades do not clip (target lit face ≈ `#F7F7F4`, shaded face ≈ `#B9B8B3`)
4. **Edge lines.** One `EdgesGeometry(contextGeometry, 30°)` → `lineSegments`, colour `#6F6E6A`, single `edgeOpacity` constant (0.3 clay default, 0.7 sketch), fog on. One extra draw call.
5. **Hide terrain grid by default**; show it only in `TOP` preset or while drawing (snapping aid).

### Phase 2 — Shadows that read (lands with M3 solar, ~1 day)

1. Context mesh: `castShadow` **and** `receiveShadow`.
2. Fit the shadow camera to the study area + longest expected shadow (≈ study extent × 1.3), not a fixed ±520 m; `mapSize` 4096 on desktop, 2048 on low-power. Target ≤ 0.15 m/texel.
3. Soft shadows: three r186 **removed `PCFSoftShadowMap`** (it falls back to PCF with a console warning), so use PCF + `shadow-radius`, or VSM. Retune `shadow-bias` / `normalBias` against the two site packages to kill acne and peter-panning.
4. Shadow direction comes only from the M3 sun model — no "pretty" fixed sun once M3 lands. Disclaimer stays: *Geometric sun direction*.

### Phase 3 — Model depth: AO + scale cues (M3/M5 polish)

1. **Ambient occlusion.** Two options; pick one in ADR-0005:
   - **A (recommended): N8AO** via `@react-three/postprocessing` + `n8ao`. Screen-space, cheap, gives the refs' contact darkening and courtyard depth. New dependency → ADR with bundle-size + licence (both MIT) and a quality toggle that disables it on low-power / `prefers-reduced-motion` is not relevant but a "Performance" toggle is.
   - **B: baked vertex AO.** Split each wall into two vertex rows and darken the bottom 0–3 m in `createContextGeometry`. No dependency, no courtyard/ground occlusion. Fallback if A misses the FPS budget.
2. **Roads + trees from cached OSM.** `data/raw/*.osm` already holds `highway` ways (163 / 34) and `natural=tree` nodes (128 / 122). Extend the offline preprocessor to emit `roads.json` and `trees.json` into a **new package version** (M1 packages stay immutable; provenance in `attribution.md`). Render roads as flat terrain-draped ribbons one value step darker than ground (`#E2E1DD`) with outline edges; trees as one `InstancedMesh` of a low-poly icosphere, muted green `#9DB59A`. No invented data.
3. **Storey bands on proposed masses.** Draw floor lines at each storey height from the mass model — a real number, the same reading refs 2 and 4 use.
4. **Proposal colour.** Proposal is the only saturated object: mass fill from a new token (e.g. `--mass-proposal`, desaturated accent-teal), selected = darker outline. Warning/invalid colours stay semantic and keep text labels.

## 4. Design contract changes (§8)

| Element | Now | Proposed |
|---|---|---|
| Background / fog | `#E8EBE7` | `#EEEDE9` |
| Terrain | sage `#DDE3DA` | near-white `#F0EFEC`, elevation tint ≤ 4% |
| Roads (new) | — | `#E2E1DD` + outline edges |
| Shadow fill (hemisphere ground) | `#BFC7BC` | cool grey `#CDD0D4` |
| Context buildings | `#D2D4CC` + per-kind tints | single `#F3F2EE` + edge lines |
| Concept massing | `#F2EFE7` | proposal token, only coloured object |
| Grid | always on | top view / drawing only |
| Lighting | sun + soft fill | sun + **low** ambient + hemisphere fill, 3:1 |
| AO | none | N8AO (ADR-0005) |

## 5. Guardrails

- No bloom, vignette, DOF or fake PBR — the contract still applies.
- Colour only for proposal and analysis; status never by colour alone.
- Performance budget: stable 60 fps at 1440×900 on the reference machine with AO on; auto-disable AO below 45 fps.
- Light rig and shadow-fit maths are pure functions with unit tests (renderer-free rule).
- Screenshots at the fixed reference views (`ISO`, `TOP`, 1440×900, both sites) before/after each phase, into `docs/screenshots/scene-look-*`.

## 6. Phase 1 as built (differs from §3)

- Tone mapping: `NeutralToneMapping`. Under ACES, lit white faces topped out at ~215/255.
- Final rig: ambient **0.3**, hemisphere **1.6**, sun **2.4** (§3 values were too dark: shadows measured 118–145). Now shadows 170–182, lit 231–237.
- Proposal mass `#C9DBE5` pulled forward from Phase 3: the old `#F2EFE7` disappeared against the white context.
- Known gap: hiding the grid in Iso weakens Sloped Edge's slope cue → add DTM contour lines (Phase 3).

## 7. Order of work

1. ADR-0005 "Scene look" (records this palette, the N8AO decision and the milestone placement).
2. Phase 1 → before/after screenshots → G3 visual check. Small and dependency-free, so it can land beside M2 without displacing massing work.
3. Phase 2 inside M3, together with `suncalc`.
4. Phase 3 AO in M3; roads/trees/storey bands in M5 polish.
