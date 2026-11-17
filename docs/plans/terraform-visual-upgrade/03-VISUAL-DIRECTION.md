# 03 — Visual direction

**Status:** design proposal. Nothing here is implemented, and no visual asset was generated. Every value is a starting point to be tested in the Visual Lab (04 §2) on a real site package before the owner chooses.

**What this builds on.** The current look is an accepted decision, not a blank page: a white architectural model with crease edges, soft ambient occlusion, neutral tone mapping and colour reserved for the proposal (ADR-0005, ADR-0017, design contract §8). Feasibility 07 adds one requirement that is not yet met: mapped facts, calculated results, screening and illustrative motion must each have their own visual grammar.

## 1. What is wrong with the picture today

Read from the code (01 §2, §4), to be confirmed in the Gate 1 captures:

1. **Line weight has no hierarchy.** Every context edge is one device pixel at 0.85 opacity; contours are the same line at 0.14 and 0.32. Silhouette, crease and contour differ only in opacity, and the weight changes with the display's pixel ratio and in the 4K export.
2. **Analysis colours collide.** Slope, wind and runoff reuse the same hex values for unrelated meanings (`#E6DC9C`, `#E39A4C`, `#3B6EA8`, `#1E3A8A`).
3. **All draped overlays look alike.** Official noise bands, slope and runoff screening are the same translucent texture on the same surface.
4. **The sun-hours ramp ends in pale yellow** (`#FEE391`) on a near-white model, so the sunniest surfaces have the least contrast against unanalysed ground.
5. **Overlays appear and disappear instantly**, and a result swap is a hard cut.
6. **Legends are scattered**: a caption chip in the viewport, a ramp bar for two of the analyses, and a different legend in each panel.
7. **Camera transitions are straight-line tweens that cannot be interrupted** and "Plan" is a perspective view.
8. **The landing page shows no image of the product.**

## 2. Three directions for the same site

All three use the same geometry, the same analyses and the same data. They differ in surface, line, light and how overlays sit on the model. Reference site for all comparisons: **Compact Infill**, with **Sloped Edge** as the terrain test.

### Direction A — Nordic white model (restrained)

*The current look, finished properly.*

| Aspect | Treatment |
|---|---|
| Surfaces | Warm-white matte context; paper-toned ground one step darker; roads a quiet warm grey; land cover at low saturation; water flat and pale |
| Line | Graphite, in four weights (§3.3). Silhouettes read first, creases second, contours last |
| Light | One sun from the Sun card's time; cool shadow tint; ambient occlusion as contact shadow, not as grime |
| Proposal | The only tinted built object, in the accent blue |
| Overlays | The only saturated colour in the frame. When an analysis is open, context edges drop one step in opacity so the overlay leads |
| Mood | A card model on a studio table in north light |
| Cost | Lowest. Everything exists; the work is tuning and the line system |
| ADR impact | None. Consistent with ADR-0005 and ADR-0017 |

### Direction B — Technical diagram (high contrast)

*A drawing rather than a model.*

| Aspect | Treatment |
|---|---|
| Surfaces | Near-flat: white faces with very little shading; ground pure paper; no land-cover tint, or one grey hatch for green space |
| Line | Ink black. Heavy silhouettes, fine creases, contours with index labels. Section cuts shown as solid poché |
| Light | Shadows as a single flat grey tone with a hard edge; ambient occlusion off or minimal |
| Proposal | Accent outline with a light fill |
| Overlays | Flat printed bands with crisp boundaries, like a plan sheet; no gradients. Screening shown as hatch |
| Camera | Orthographic plan and axonometric by default |
| Mood | A competition diagram or a planning drawing |
| Cost | Low on the GPU (ambient occlusion can go). Medium in work: needs the line system, an orthographic camera and hatch patterns |
| ADR impact | ADR-0019 declined a screen-space edge pass; this direction uses geometric edges, so no conflict. An orthographic default would amend the camera preset contract in the site manifest |
| Risk | Continuous results (wind speed, sun hours) lose nuance as flat bands. Shadows as a flat tone must still match the Sun card exactly |

### Direction C — Atmospheric study (editorial)

*An environmental photograph of a model.*

| Aspect | Treatment |
|---|---|
| Surfaces | Mid-tone: warm grey ground, off-white buildings, deeper land cover |
| Line | Soft, low contrast; form comes from light |
| Light | Sky gradient and distance haze that follow sun elevation; long soft shadows; warm sun and cool shade |
| Proposal | Accent tint, slightly luminous |
| Overlays | Luminous on the darker ground; trails and streamlines carry the image |
| Mood | Low winter sun over a model in a dim room |
| Cost | Highest: a sky, softer shadows, possibly depth of field; all overlay ramps must be re-checked on a darker ground |
| ADR impact | **Changes ADR-0017** (flat background, light scene, white-model albedo) and brushes against **ADR-0018** (bloom removed because it bleached lines on a light scene — a dark ground reopens that question). Needs an ADR change proposal before any production work |
| Risk | The most likely to look like a generic render. Sun-hours and noise legibility on a mid-tone ground is unproven. Heaviest on integrated GPUs |

### 2.1 How overlays stay legible in each

| | A | B | C |
|---|---|---|---|
| Ground luminance | high | highest | medium |
| Overlay ramp requirement | must not end in pale values | any, banded | must not start in dark values |
| Edge treatment when an analysis is open | edges dim one step | edges stay | edges dim two steps |
| Trails and streamlines | dark ink on pale map (as today) | ink | light on dark |
| Screening grammar | hatch over a soft fill | hatch only | hatch, lower luminance |

### 2.2 Provisional recommendation

**Direction A as the product's look, with Direction B's line system and orthographic views built into it as a "Diagram" style for plan and export.** Direction C is tested in the Lab as an export atmosphere only, not as the working view.

Reasons:

1. A is the accepted decision (ADR-0005, ADR-0017) carried through; it needs no ADR change and puts no existing evidence at risk.
2. The line system, the graphic grammar and the camera work are needed by A and B alike, so most of the plan is direction-independent. The choice can be made late and cheaply.
3. The product's claim is honesty. A white model with printed overlays reads as a study; an atmospheric render reads as a promise.
4. A is the cheapest to render, which protects the frame budget on the laptops visitors use.

This is provisional. The owner chooses after TF-VIS-026.

### 2.3 What the Visual Lab must show before the owner chooses

For each direction, on Compact Infill and Sloped Edge, at the same camera, browser, canvas size, date and time:

1. Neutral scene at the `isometric`, `top` and `eyeLevel` presets.
2. Each of the five analyses open, plus slope and a section.
3. A drawn mass, selected and unselected.
4. 21 December 12:00 (sun about 6.7° above the horizon at Oslo's latitude: 90° − 59.9° − 23.4°) and 21 June 15:00.
5. The 4K still, the white pass and the analysis pass, side by side with the viewport.
6. Frame p95 while orbiting and draw calls, against the Gate 1 baseline.
7. Greyscale conversion of each analysis view (does the legend still work without hue?).
8. A colour-vision check of every ramp (deuteranopia and protanopia simulation).

A direction is eligible only if it passes 6, 7 and 8. Among eligible directions the owner chooses by eye.

## 3. Design system specification (proposal)

### 3.1 Principles

1. **The model is neutral; the analysis is the colour.** One analysis leads at a time.
2. **One accent** (`--accent`, `#1f3bd6`) for the proposal and selection. No second accent (contract §11).
3. **Grammar before palette.** A reader should know what kind of claim they are looking at before they read the legend (§5).
4. **Same picture everywhere.** Viewport, still and clip use the same style values; only quality settings differ.
5. **Nothing moves without a reason.** Motion explains a change of state or shows computed flow. Nothing else.

### 3.2 Colour

**UI tokens stay as they are** (`src/styles/tokens.css`). Two additions are proposed:

| Token | Purpose | Proposed value |
|---|---|---|
| `--screening` | Hatch and outline colour for screening outputs | `#646461` (the existing `--ink-secondary`) |
| `--no-data` | "Not mapped" and "not available" swatch | a diagonal hatch of `--border` on `--surface` |

**Scene palette** moves from constants in `ViewportCanvas.tsx` into one typed style object (04 §3). Direction A starting values are today's values, so the first step changes no pixel:

| Role | Today (code) | Direction A proposal |
|---|---|---|
| Background, fog | `#F1F1EF` | keep |
| Ground disc | `#EBEBE8` | keep |
| Context | `#FAF9F6` | keep |
| Edge ink | `#7E7D7A` at 0.85 | `#5F5E5B`, weight carries hierarchy instead of opacity |
| Roads | `#C1BEB7` | keep; test one step lighter when an analysis is open |
| Ambient-occlusion tint | `#2B3138` | keep |
| Shadow tint | from the hemisphere light | test a slightly cooler ground bounce |

### 3.3 Line

Weights are in CSS pixels and hold across pixel ratios and in the export (02 §2.2).

| Line | Weight | Opacity | Notes |
|---|---|---|---|
| Proposal outline | 2.0 | 1.0 | accent |
| Context silhouette | 1.25 | 0.9 | outer edges only, if a silhouette test proves affordable; otherwise same as crease |
| Context crease (> 30°) | 0.75 | 0.75 | |
| Major contour (5 m) | 0.75 | 0.45 | index labels optional (TF-VIS-053) |
| Minor contour (1 m) | 0.5 | 0.2 | hidden when relief is under 2 m, as today |
| Parcel | 1.0 | 0.8 | today's weight is a placeholder (build report §7) |
| Section line | 1.5 | 1.0 | ink, with end ticks |
| Analysis circle | 1.5 on a 5 px white halo | as today | |

### 3.4 Type

No change to families or scale. Additions for the map:

- Legend labels: `text-label` (Geist Mono, 11 px, uppercase) for band names; `text-caption` for the claim sentence.
- Numbers on the map (contour labels, section ends): Geist Mono, tabular.
- Never set the sun marks colours as text below 24 px (existing rule in `tokens.css`).

### 3.5 Surfaces, spacing, elevation

Existing card tokens stay (`--card`, `--shadow-card`, `--shadow-float`, `--frost`, radii in `global.css`). One rule is added: **everything that floats over the canvas uses `--frost` with `backdrop-blur`, one radius (`--radius-control`) and `--shadow-float`.** Today the caption chips use `bg-surface/90` with `rounded-chip` while the legend pill uses frost.

### 3.6 Materials

| Element | Treatment |
|---|---|
| Context | Matte, roughness 0.9, no specular highlights. No per-use tints |
| Terrain | Matte; elevation tint kept subtle; optional hillshade from the 1 m tile on curated sites (TF-VIS-023) |
| Water | Flat, slightly smoother than ground; no reflections, no animation |
| Trees | As today; canopy saturation follows `SCENE_SATURATION` |
| Proposal | Accent tint, storey bands, outline. Invalid and warning states stay semantic |
| Faded buildings (under the wind disc) | As today (opacity 0.22), reviewed with the wind pilot |

No glass, no reflections, no façade detail. The model does not pretend to be a building.

### 3.7 Terrain and contours

- Contours remain the primary terrain graphic. Weights per §3.3.
- On curated sites, contours can be generated from the 1 m tile rather than the 16 m grid (build report deviation 11), using the existing marching-squares code in `features/sites/contours.ts`. Measure before adopting: the 1 m raster has about 458 000 cells.
- Optional hillshade: a single multiply-style tone from a fixed north-west light, baked once into a texture. It is a cartographic convention, not the Sun card's light, and the legend says so. Off by default until the Lab shows it helps Sloped Edge.
- Slope bands and the section keep their content; their colours move into the ramp registry (04 §4).

## 4. Lighting atmospheres

**The rule that makes this safe:** the sun's direction on screen is always the Sun card's date and time. An atmosphere never changes it.

An atmosphere is a named set of *display* values only:

| Atmosphere | Changes | Does not change |
|---|---|---|
| **Overcast** | Sun intensity low, ambient and hemisphere high, shadows very soft and faint, cool neutral fill | Sun direction; any analysis |
| **Low winter sun** | Warm sun colour, cool long-shadow fill, slightly stronger ambient occlusion, light haze | Sun direction; any analysis |
| **Summer afternoon** | Neutral-warm sun, today's rig | Sun direction; any analysis |

Two consequences:

1. "Low winter sun" at a June date would show a high sun with winter colouring. To avoid that, each atmosphere offers a separate, explicit action — **"Set the Sun card to 21 Dec, 12:00"** — that goes through the same `sunTime` state the Sun card uses. The visitor sees the Sun card change. The atmosphere itself never touches it.
2. The legend or the export credit states when an atmosphere other than the default is on: "Display lighting: overcast. Shadows show the sun at the stated time."

Under "Overcast" the cast shadows are faint by design. The Sun card's shadow analysis must override the atmosphere while it is the active analysis, so shadows are always readable when shadows are the subject.

This needs a decision record (ADR-0042, 04 §5).

## 5. Analysis graphic language

### 5.1 Four output classes

From feasibility 07 and 08. Each analysis belongs to exactly one.

| Class | Meaning | Visual grammar | Legend must state |
|---|---|---|---|
| **Mapped** | Published by an authority; shown as published | Flat opaque-ish bands, crisp boundaries, no blending between bands | Owner, dataset, year, the publisher's limitation |
| **Calculated** | Deterministic geometry from the model | Continuous ramp, units, smooth | Method, inputs (measured or estimated heights), precision |
| **Screening** | Simplified on purpose | Hatch or stipple over a soft fill; bands, never decimals | "Screening", what the model leaves out |
| **Illustrative** | Motion that shows a field | Moving or traced lines; no numeric colour claim beyond the map beneath | What it illustrates; that it is not a measurement |

| Analysis | Class | Notes |
|---|---|---|
| Noise | Mapped | Statens vegvesen 2021, 5 dB bands |
| Hazard facts | Mapped | Panel chips; no polygons on the map today |
| Parcels | Mapped | Lines; "eiendomskart, not a surveyed boundary" |
| Sun hours, shadows | Calculated | 0.5 h steps |
| Slope, section | Calculated | from Kartverket DTM1 |
| Roof solar, VSC | Screening | clear-sky upper bound; overcast-sky geometry |
| Wind map | Screening | 2D flow |
| Wind trails, streamlines | Illustrative | drawn from the solved field |
| Runoff | Screening | no drains, kerbs or rainfall |
| Snow | Mapped context | panel only; a 1 km cell has no meaningful drape on a 600 m site |

### 5.2 Ramps

Rules, then candidates. Final values are chosen in the Lab with the checks in §2.3.

1. Each analysis has its own hue family. No hex value means two things.
2. Sequential ramps run from light to dark on a light ground, so "more" is "darker" and nothing important is pale on white.
3. Diverging ramps (wind delta) have a neutral midpoint that matches the ground.
4. Every ramp passes a colour-vision simulation and a greyscale check.
5. Banded outputs have at most seven bands.

| Analysis | Today | Proposal to test |
|---|---|---|
| Sun hours | dark brown → pale yellow (few → many hours) | Reverse the luminance: pale → deep amber, so the sunniest surfaces carry the most colour. Keep 0.5 h legend steps |
| Wind speed | white → blue → violet → magenta | Keep the family; check the pale end on white ground |
| Wind comfort bands | blue → teal → sand → orange → red, with Lawson activity names | Decide the names first (PR #18 decision 3). If dropped, relabel as speed bands |
| Wind delta | blue ↔ red | Keep |
| Noise | existing swatches (called "old swatches" in the build report) | A yellow → orange → red → purple sequence in 5 dB steps. **Do not adopt the yellow and red of the planning guideline's zones as if the bands were those zones** unless they are mapped to it exactly and labelled (08, D7) |
| Slope | grey → sand → orange → dark red | An earth family distinct from wind and noise |
| Runoff | three blues | One blue-grey for paths with weight by class; depressions as hatch, not as a blue fill (§5.3) |

### 5.3 Per-analysis notes

**Sun.** Shadows are the Sun card's light and must be crisp enough to read at the default zoom. Sun hours remain per surface (ground, roofs, façades). The existing playback is the "day transition"; it stays optional and stops under reduced motion (already implemented).

**Wind.** The map is screening; trails and streamlines are illustrative. The map and the motion must not look like two different claims about the same thing: trails take their colour from the map beneath, as today. The lifted disc, its ring and the faded buildings beneath it are one object and should read as one. No vectors or arrows that the solver did not produce.

**Water.** The largest grammar change in the plan. Today depressions are a pale blue fill and paths are blue lines, which reads as "water here". Proposed:

- Flow paths as lines whose **weight** is the accumulation class (two or three weights), in one blue-grey.
- Depressions and enclosed courtyards as a **hatch**, not a fill, in the screening colour.
- A legend that leads with what is absent: no rainfall, no drains, no depth.
- Courtyards closed in by buildings are named as such in the legend, as the card already does.

If paths are drawn as vector lines traced from the D8 result rather than as raster pixels, that tracing is a re-drawing of the same cells and is documented as such (04 §4.4).

**Noise.** Mapped grammar: flat bands, crisp edges, the source and year in the legend, "not for assessing individual buildings" always visible with the layer. It never reacts to a drawn mass, and the card says why.

**Snow.** Stays in the panel. A small chart of winters (median, fewest, most) is honest; a white drape over the site would imply snow at the site. No roof, no drift, no load.

**Terrain.** Slope bands, section profile and contours share the terrain hue family and the line weights of §3.3.

### 5.4 One active analysis

- Opening a card puts that analysis on the map; the others leave (already the behaviour, ADR-0026).
- When any analysis is open: context edges dim one step, land cover drops to half saturation, roads lighten. When none is open the neutral scene returns. This is a style state, not a new feature.
- A single legend component sits in one place (bottom right, above the compass row), with four parts: title and class badge, ramp or bands, claim sentence, source line. It has explicit states: computing, not mapped, not available on imported sites.

## 6. Motion and interaction choreography

Constraints from the design contract §7: CSS and `requestAnimationFrame` only; reduced motion turns everything off; never animate a control that tracks the pointer.

| Event | Motion | Duration | Reduced motion |
|---|---|---|---|
| Open an analysis card | Overlay fades in; edges dim | 160 ms | instant |
| Result replaced (same analysis) | Cross-fade old → new | 160 ms | instant |
| Computing | Overlay holds at reduced opacity; legend shows "Computing…" (no spinner on the map) | — | same |
| Camera preset | Arc around the target (spherical interpolation), ease-out | 500–900 ms by angular distance | snap |
| Any pointer or wheel input during a camera move | The move stops at once and the visitor has control | 0 | — |
| Mass drag | No animation; ambient occlusion off while dragging (existing) | — | — |
| First visit | One settle from a slightly wider view to the default preset; any input cancels it | ≤ 1.2 s | none |
| Figures in cards | Existing `useTween`, 400 ms | 400 ms | jump |

The contract's "under 200 ms except the site-entry camera" is kept for UI motion. Camera preset moves are longer than 200 ms today (0.75 s) and stay within the same order; 08 lists this as a contract clarification, not a breach.

No guided tour. ADR-0020 removed the studio guide on purpose.

## 7. Reference captures

Used for every before-and-after claim in this plan (07 §3).

| Parameter | Value |
|---|---|
| Sites | `compact-infill`, `sloped-edge` |
| Browser | Chromium (Playwright's pinned build), headed, on the reference machine |
| Canvas | 1440 × 900 CSS px at device scale 2 |
| Presets | `isometric`, `top`, `eyeLevel` |
| Date and time | 21 June 15:00 and 21 December 12:00, site time zone |
| States | neutral; Sun (sun hours); Wind (direction view, 2 m); Noise (Lden); Water; Slope on; one drawn mass |
| Motion | `prefers-reduced-motion: reduce`, so trails are traced once and static |
| Render quality | High, forced (not Auto) |
| Exports | still, white, depth, analysis for the `isometric` preset of each state |
| File naming | `docs/screenshots/vis/<gate>/<site>-<preset>-<state>-<date>.png` |

A capture set is valid only if two consecutive runs on the same machine match within the comparison threshold (02 §2.4).

## 8. Norwegian differentiation

What a focused Norwegian tool can show that a general one does not, using only data already in the packages:

1. **Low winter sun.** At Oslo's latitude the midwinter noon sun is under 7° high. Sun hours on 21 December and the shadow of a new block across a courtyard are the most persuasive images the tool can make, and they come from tested geometry.
2. **Terrain that matters.** Sloped Edge has real relief; the 1 m Kartverket tile gives slope, sections and runoff paths at a resolution a schematic massing tool does not carry.
3. **Official facts in one registered frame.** Statens vegvesen noise bands, Kartverket parcels and NVE hazard mapping, each with owner, year and limitation, registered to within a metre of the buildings (feasibility 09).
4. **Screening that says what it is.** Runoff with no drains, wind in 2D, snow at 1 km. The honesty is the product's distinguishing feature, and the visual grammar in §5 is how a visitor sees it.

What it does not do, and must not look as if it does: wind comfort or safety ratings, façade noise levels, flood depths, snow loads, zoning or compliance. These are Tier 3 in feasibility 07.

Beside Autodesk Forma and the public NVE and Geonorge map services, Terraform's place is narrow and clear: no account, no installation, open data with its provenance on the image, and an export that is ready for a presentation. It does not compete on analysis depth and should not be styled as if it did.
