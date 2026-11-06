# Terraform studio — what it looks like and what it does

Written 3 November 2026 from the live production build (terraform-studio-murex.vercel.app) at 1440 × 900, plus the source code. It describes the tool as it is today, as a starting point for UI/UX changes. Section 10 lists things that stood out while looking at it.

---

## 1. What the tool is

Terraform is a browser workspace for early-stage architectural site studies. You open a site in 3D, draw simple building masses on it, stack storeys, and immediately see:

- floor area, footprint, volume and site coverage,
- whether each mass stays inside an illustrative height limit, setback and study area,
- the sun position and shadows for any date and time,
- a side-by-side comparison of two design concepts.

There is no login, no server and no AI. Everything runs in the browser and is saved in the browser (IndexedDB). It is a portfolio prototype, so the interface is careful to label what is simulated: constraints are "Illustrative — not planning advice", the sun is a "Geometric sun direction", imported heights are "partly estimated".

**Three ways into a site:**

| Route | What opens |
|---|---|
| `/studio/compact-infill` | Curated demo: a dense Oslo block (137 context buildings, park with trees) |
| `/studio/sloped-edge` | Curated demo: a sloping city-edge site with noticeable terrain |
| `/new` → `/studio/import/<id>` | Any address in the Nordics, loaded live from open map data and saved under "My sites" |

---

## 2. Overall visual language

- **Palette:** warm light greys, almost no colour. App background `#E4E4E1`, panels `#F1F1EF`, ink `#141414`, secondary text `#646461`, hairline borders `#D9D9D5`.
- **Accent colours** are reserved for meaning:
  - Blue `#1F3BD6` for the selected mass and focus rings.
  - Orange/amber for the sun (the day "barcode" and the sun dot).
  - Green `#2F7A4C` for "Pass" and amber for "needs attention".
  - Red `#B4372E` for errors.
- **Type:** Geist (sans) for text and Geist Mono for numbers and inputs. Big numbers are thin (weight 300) and tightly tracked, for example the "4 699 m²" floor-area figure. Most interface text is small: 13–14 px body and 11 px captions.
- **Shapes:** cards with a 10 px radius, controls with 8 px, and chips with 4 px. Sections are separated by hairlines rather than shadows. Mostly flat.
- **Controls are text-first.** Most buttons are plain words (Select, Undo, Layers, 3D, Plan, Compare, Guide, Fit site) with an underline marking the active one. The only filled button in the studio is the black "Draw building" pill. There are very few icons.
- **The 3D scene** is a white "architectural model" look: off-white extruded buildings with thin dark edges, soft shadows, pale green ground for parks and grass, pale blue water, and green low-poly trees. Your own masses render solid blue.

---

## 3. Page layout (desktop, ≥ 1024 px)

```
┌───────────────────────────────────────────────────────────────────────────────┐
│ ◆ Terraform  Compact Infill  Dense Oslo block…   Concept A ▾ Saved  Compare  Guide  Fit site  About │  top bar
├───────────────────────────────────────────────────────────────────────────────┤
│ Studio guide · 1 of 3   Choose Draw building…        Show control  Next  Skip │  guide strip (first visit)
├──────────────────────────────────────────────────────┬────────────────────────┤
│ [Select][Draw building]  Undo Redo | Layers   3D Plan North South Street (⊙) │ Design check           │
│                                                      │ Scenario metrics       │
│                  3D viewport                         │ Buildings list         │
│                                                      │ Selected mass fields   │
│ ─── 50 m  ┄ Study boundary ┄ Setback ▢ Green space   │ Notes                  │
├──────────────────────────────────────────────────────┤ ▸ Sun                  │
│ ● Sun · 21 Jun                         ‖‖‖‖‖‖‖‖‖     │ ▸ Layers and quality   │
│ 15:00   Mar Jun Sep Dec   00 03:53 12 22:43 24   Az/Alt (▶) │ ▸ Site and sources │
└──────────────────────────────────────────────────────┴────────────────────────┘
       viewport card (flexible width)                     inspector (392 px)
```

- The page fills the window (100 dvh) with a 16 px gutter. There are two rounded cards: the **viewport card** on the left and the **inspector** on the right, which is 392 px wide and scrolls on its own.
- Between 640 and 1023 px the inspector stacks under the viewport.
- **Below 640 px (phones) the studio is read-only.** You can look, orbit and change the sun, but not draw or edit. The inspector says "Massing is read-only on small screens."

---

## 4. Top bar

Left to right:

1. **◆ Terraform** wordmark: links home.
2. **Site title** (e.g. "Compact Infill"), followed by a grey subtitle (e.g. "Dense Oslo block · strong shadow study"). For imports the subtitle is "OpenStreetMap context · heights partly estimated · not survey data".
3. **Scenario menu**, "Concept A ▾". This is the active design option. The menu lets you:
   - switch scenarios, add a **New scenario**, **Duplicate**, **Rename**, **Delete**, or **Reset** the scenario (clears its buildings and notes);
   - **Reset demo…** (removes all scenarios for the site and starts again with empty Concept A and B).
   - Every scenario keeps its own undo history.
4. **Save status:** "Saved", "Unsaved changes", "Not saved — storage is full" or "Not saved — storage unavailable". It autosaves after each committed edit.
5. **Compare:** opens the comparison panel. It needs at least two scenarios.
6. **Guide:** reopens the 3-step studio guide.
7. **Fit site:** resets the camera to the isometric overview. The shortcut is **F**.
8. **About:** goes to the About page.

If browser storage is broken, a **recovery strip** appears at the top of the inspector. It explains what happened and offers Try again, Export, or Discard for a corrupt saved record.

---

## 5. Studio guide (first visit)

A full-width strip under the top bar shows "Studio guide · 1 of 3" and one instruction. Its buttons are **Show control** (moves keyboard focus to the control it's talking about), **Next** (labelled **Finish** on the last step) and **Skip**. Esc also skips it.

1. "Choose Draw building in the toolbar to draw a mass on the site."
2. "Move the Local time slider below the scene to move the sun."
3. "Open the concept menu in the top bar, choose Duplicate, then choose Compare."

Once skipped or finished, the guide stays hidden after reloads. It comes back only through **Guide** in the top bar.

---

## 6. Viewport card

### 6.1 Toolbar (top-left, floating)

- **Select:** the default tool. Click a mass to select it. Drag a mass to move it, or drag its roof handle up or down to add or remove whole storeys.
- **Draw building** (black pill): click the ground to place corners. **Enter** finishes, **Backspace** removes the last point and **Esc** cancels. While drawing, a dark hint chip at the top of the viewport repeats these keys. Errors appear in the same chip with a red warning icon.
- **Undo / Redo:** greyed out when there's nothing to undo. Shortcuts are ⌘/Ctrl+Z, ⇧⌘Z and Ctrl+Y. One drag counts as one undo step, and **Esc** during a drag cancels it.
- **Layers:** jumps to the "Layers and render quality" section in the inspector.

### 6.2 Views (top-right, floating)

- **3D** (isometric), **Plan** (top view), **North**, **South** and **Street** (eye level). The active one is underlined.
- **Compass (⊙):** a small round dial whose needle turns with the camera to show north. It's a display only, not a button.

### 6.3 The scene

- **Terrain:** a 13 × 13 height grid draped with land cover: green for parks, grass and woods, blue for water.
- **Context buildings:** white extrusions with dark edges.
- **Streets:** pale bands.
- **Trees:** green low-poly trees.
  - Curated sites use real mapped tree points.
  - Imported sites use mapped trees when the Overpass service answers. Otherwise they get illustrative trees in parks, gardens, woods and cemeteries, and the import notes say so.
- **Overlays:**
  - dashed blue/dark line: **Study boundary**, which is not a cadastral parcel;
  - dashed amber line: **Setback** (4 m);
  - translucent box: **Height limit** (18 m), shown when a mass is selected.
- **Your masses:** solid blue when selected. Each has a floating label, for example "● Mass 1 · 3 fl · 9.6 m", with a green dot when it passes the checks and an amber dot when it needs attention.
- **Sun shadows:** these update live as the time and date change.
- **Bottom-left legend pill:** a scale bar ("50 m") and keys for Study boundary, Setback and Green space.
- **Mouse:** drag to orbit, right-drag or two fingers to pan, and scroll to zoom.
- **Without WebGL:** the viewport shows an accessible message instead, and the inspector still works.

### 6.4 Sun band (bottom of the viewport card)

- **Left:** "● Sun · 21 Jun" with a large mono clock ("15:00"), and date presets underneath: **Mar**, **Jun**, **Sep** and **Dec** (equinoxes and solstices).
- **Centre:** a **day barcode**. It's a row of vertical ticks, one per time step, whose height and colour follow the sun's altitude, from yellow at low sun to deep orange at high sun. A blue marker shows the current time. The axis is labelled 00, sunrise (e.g. 03:53), 12, sunset (e.g. 22:43) and 24. It works as the **Local time** slider: drag it, or use the arrow keys.
- **Right:** a live readout, "Azimuth 217° / Altitude 49°", and a round black **Play** button that animates the day.
- The **Sun** section in the inspector adds more options:
  - an exact local date field;
  - **Morning / Noon / Evening** time presets;
  - playback speed **30 / 60 / 120** minutes per second;
  - a reduced-motion note: playback steps 15 minutes each second;
  - handling for polar day and polar night;
  - the disclaimer "Geometric sun direction for this site (suncalc). Not a daylight or sun-hours assessment."

---

## 7. Inspector (right panel), top to bottom

### 7.1 Design check

- **Empty:** "Draw a building to check it against the demo limits."
- **With masses:** a big thin number showing how many checks need attention, followed by "● All checks pass" in green or a count of items needing attention in amber.
- **"Within demo envelope"** carries the sub-label "Illustrative constraint — not planning advice". Four check rows each end in a **Pass** or **Needs attention** tag:
  - Height ≤ 18.0 m above grade
  - Inside the 4.0 m setback
  - Inside the study area
  - Sits on the terrain
- **Height measured from:** a **Grade / Datum** dropdown with a short explanation ("Grade: lowest ground under the building. Datum: site origin. Limits: 18.0 m height, 4.0 m setback.").
- Clicking a failing mass in the check list selects it.

### 7.2 Scenario metrics

- The header reads "Scenario · 1 building".
- There are four figure tiles in a 2 × 2 grid. Each has a large thin number with a small unit:
  - **Floor area:** e.g. 4 699 m², with "Concept GFA · ratio 0.10" underneath.
  - **Tallest:** e.g. 9.6 m, with a small bar against the limit and "Limit 18 m above grade".
  - **Footprint:** e.g. 1 566 m², with a bar showing "3.4 % of study area".
  - **Volume:** e.g. 15 037 m³.
- A per-floor breakdown and the note "Concept GFA is not BRA, BYA or %-BRA" appear with the selected mass.
- When masses overlap, a note says "overlap counted once". Area outside the study area is flagged as "Outside study area".

### 7.3 Buildings

- Header: "Buildings", "1 selected" and **Draw another**.
- **Mass list:** one row per mass with its name, "3 floors · 9.6 m" and its floor area. The selected row is filled solid blue with white text. Rows can also be tagged **Hidden** or **Needs attention**.
- **Action row** for the selected mass: **Duplicate**, **Add tier** (stacks a stepped upper volume), **↺ 15°** and **↻ 15°** (rotate), and **Delete**.
- **Tiers:** if a mass has several tiers, a tier switcher appears.
- **Fields** for the selected mass. Inputs use the mono font and commit on Enter or blur; Esc reverts.
  - Name
  - Storeys and Storey height (m)
  - Base elevation (m) and Use (Residential, Commercial, Mixed, Civic or Other)
  - Visible and Locked checkboxes
  - Read-only Height and Footprint values
  - Footnote: "Base elevation is relative to the site origin. Values derive from the model geometry."
- **Clearance warnings:** any of these for the selected mass are listed under the fields, marked "Illustrative check · not planning advice".

### 7.4 Notes

A free-text box for the scenario with a character counter ("0 / 2,000 characters"). It saves with the scenario.

### 7.5 Collapsible sections

Each one is a row with a title, a grey summary on the right and a chevron:

| Section | Summary | Contents |
|---|---|---|
| **Sun** | "21 Jun · 59.9° N" | The date, time, presets, playback and disclaimer described in §6.4 |
| **Layers and render quality** | "auto" | Toggles for Terrain, Context buildings, Streets, Trees, Study boundary, Setback and Height limit. Render quality is Auto, Low, Balanced or High, and is remembered. |
| **Site and sources** | "137 buildings" | Site, Morphology, Data (Curated demo or "Imported · open map data"), Frame, Terrain, Buildings and Constraints. Imports add a list of **Import notes**, such as estimated heights, flat roofs and illustrative trees. Also **Export project** / **Import project** to save all scenarios to a JSON file and restore them. |
| **Assumptions** | "Default storey 3.2 m" | Units, height mode and default storey height |
| **About these numbers** | "Method" | How areas, coverage and elevations are calculated |

At the very bottom is a source attribution line, for example "Buildings © OpenStreetMap contributors (ODbL) · Terrain © Kartverket".

---

## 8. Compare mode

**Compare** in the top bar replaces the inspector with a comparison panel:

- The title "Compare" and a **Close** button. Esc also closes it, and focus returns to the Compare button.
- Two scenario pickers, **A** and **B**.
- Two **thumbnails** rendered with the **same camera and the same sun time**, labelled "Same camera · same sun time". If thumbnails can't be rendered, it shows "Thumbnail unavailable in this browser".
- A **metrics table** with rows for floor area, footprint, coverage, volume, tallest and so on. It has columns A, B and **B − A**, under the note "Scenario metrics; differences are B minus A".
- An **Envelope** row showing pass or attention for each scenario.
- Each scenario's **Notes**.
- **Edit B:** makes B the active scenario and closes Compare.

---

## 9. "Start from any address" page (`/new`)

- **Map:** a full-screen grey MapLibre street map (OpenFreeMap "positron" style) with zoom controls bottom-right and attribution.
- **Floating left panel**, about 380 px wide, rounded and light grey:
  - **Top link:** "Terraform · back to the sites".
  - **Heading:** "Start from any address", with the instruction "Move the map to place the frame, then load open map data in 3D."
  - **Search box:** "Search for an address or place". Results appear in a keyboard-friendly dropdown, using Kartverket addresses for Norway and Photon elsewhere.
  - **Quick picks:** nine city-district chips: Oslo (Grünerløkka), Bergen (Bryggen), Trondheim (Bakklandet), Stockholm (Södermalm), Göteborg (Haga), Malmö (Möllevången), Copenhagen (Nørrebro), Aarhus (Latinerkvarteret) and Helsinki (Kallio).
  - **Frame size:** a segmented control with **200 m**, **400 m** and **600 m**, followed by a readout ("400 × 400 m · 16 ha") and "Oslo (Grünerløkka) · Study area — not a cadastral parcel".
  - **Load in 3D:** a big black button.
  - **Footer:** "OpenStreetMap context · heights partly estimated · not survey data. Imported sites are saved in this browser only."
- **Frame:** a dark square outline centred on the visible map shows the area that will be imported.
- **While loading:** a progress list replaces the button. Its five steps are Map tiles, Buildings, Streets and green space, Terrain and Site package. Each step shows Waiting, Loading, Done, Skipped or Failed, and a **Cancel import** button is available.
- **When it fails:** an alert with **Try again**. If saving fails, there's also **Open without saving**.
- **When it succeeds:** the studio opens at `/studio/import/<id>` and the site appears on the landing page under "My sites". An import typically takes 1–10 s.

---

## 10. Observations for the redesign

These are what stood out in the screenshots, offered as input rather than decisions:

1. **The inspector is very long.** With one mass selected you scroll through check, metrics, list, fields, notes and five collapsibles. The most-used controls, the mass fields, sit well below the fold at 900 px tall.
2. **Two places for the same thing.** The sun appears both in the band under the viewport and in the inspector's Sun section, and the layer toggles are reached from both the toolbar's Layers button and the inspector.
3. **The top bar is all small text links:** Compare, Guide, Fit site and About look alike, although Compare is a mode switch and About leaves the app.
4. **Floating toolbar and views.** The tools (top-left) and views (top-right) are text-only and sit on the scene. They're easy to miss against light buildings.
5. **The empty state is quiet.** Before any mass exists, the inspector says "Draw a mass to see metrics" three times in different places.
6. **The scene's colour story.** Context is white, your mass is saturated blue, and overlays are dashed blue and amber. The amber setback line and the orange sun barcode are close in colour.
7. **Imported sites look denser than the curated ones** at the default camera, because a 400 m frame fits a lot of city in the view. The default isometric camera may want to start closer.
8. **Mobile is a read-only preview.** That's a deliberate scope decision (M0 gate), but worth revisiting if phone visitors matter for the portfolio.
9. **Keyboard and accessibility are strong points worth keeping.** Every control is reachable by keyboard with visible focus, and the app respects reduced motion. Two known gaps are still open in the automated checks:
   - The studio page has no visible h1.
   - The sun's Morning/Noon/Evening and 30/60/120 buttons are smaller than the 24 × 24 px minimum (A11Y-2).
