# TERRAFORM — Comprehensive Product Requirements Document

**Version:** 1.0 | **Date:** 26 October 2026 | **Status:** Implementation-ready specification | **Product type:** Architectural software portfolio showcase

## Document control

- **Owner / intended developer:** Portfolio creator, working with Claude Code and Codex.
- **Approved Stage 1 decisions:** Curated Oslo demonstration sites; advanced conceptual massing editor; minimal light-mode design; AI only in a later optional phase.
- **Primary platform:** Desktop web, with graceful small-screen read-only experience.
- **Target outcome:** A polished, credible, genuinely interactive early-stage architectural site-planning application and a compelling case study.
- **Not a commercial SaaS:** No monetisation, checkout, multi-tenant infrastructure, enterprise authentication, or production-grade regulatory certification.
- **Interpretation of priorities:** P0 = essential for portfolio release; P1 = polish/recommended extension; P2 = future exploration.
- **Source status:** Engineering and UX recommendations below are proposed specifications, not assertions about the accuracy or availability of any particular Oslo parcel data.

---

# 1. Executive summary

Terraform is a browser-based architectural design workspace that combines a visually beautiful 3D site model with direct manipulation of conceptual building massing and immediate, intelligible design feedback. A visitor chooses one of two prepared Oslo sites, studies its terrain and surroundings, creates and modifies one or more building masses, tests sunlight and shadow conditions, reviews live area and envelope metrics, and saves or compares concepts. The experience should feel professional enough to be a plausible product from a contemporary architecture-software studio while remaining explicitly a **portfolio prototype**.

**Value proposition:** *Explore a site. Shape a concept. Understand the impact.*

**Signature experience:** With a prepared urban Oslo site on screen, a visitor drags a roof handle to add two storeys. The massing grows with a soft animation; GFA and building height update immediately; a maximum-height indicator moves from within limit to exceeding a demo threshold; the sun angle changes as the visitor scrubs the time control, revealing how the taller mass shades its surroundings. The visitor duplicates the scenario, changes the geometry, and compares both concepts.

The product is not an architecture-themed dashboard. The 3D editor, analysis widgets, and scenario logic must share the same underlying model and recalculate consistently.

# 2. Goals, success, and exclusions

## 2.1 Goals

1. **Portfolio impact:** demonstrate architectural expertise, computational thinking, BIM-adjacent logic, frontend engineering, interactive graphics, and UI/UX judgment.
2. **Visual excellence:** create a distinctive minimal light-mode interface with a premium editorial aesthetic, crisp geometry, restrained color, and coherent motion.
3. **Functional credibility:** every core metric and status is driven by actual project geometry, stored assumptions, or tested algorithms—not static dashboard decoration.
4. **Narrative clarity:** a first-time visitor can complete a memorable workflow without a tutorial or login.
5. **Reliable demo:** the default project loads quickly, functions offline after assets are cached where practical, and does not depend on fragile live GIS services.
6. **Extendability:** support later exploration of analysis modes, parametric forms, richer data, and AI without major restructuring.

## 2.2 Success signals / measurable acceptance

- Visitor sees a rendered prepared site within **5 seconds on target desktop hardware** after initial asset delivery under a normal broadband connection; a loading state is visible earlier. This is an engineering target, not a guarantee.
- The site contains meaningful topography, parcel outline, street context, and neighboring building masses.
- User can create, select, move, rotate, resize, and change floors of a building; delete, duplicate, undo, and redo.
- Massing change updates area/height/coverage metrics within **150 ms** for typical site scenes, excluding GPU frame latency.
- Shadows respond to date/time and site latitude/longitude, with a clearly documented solar convention.
- At least two scenarios can be saved, switched, renamed, compared, and restored after reload.
- A reviewer can complete the walkthrough **Select site → Edit mass → Explore shadow → Compare concepts → Export image** in under 3 minutes without external help.
- No major console errors in release; no user-facing placeholder buttons; no knowingly incorrect metric labels.
- At 1440×900 or larger, visual hierarchy remains legible and the 3D canvas occupies the majority of the usable workspace.

## 2.3 Non-goals

- Detailed BIM authoring (wall layers, doors/windows, room data, IFC classification).
- Guaranteed planning / TEK17 / permit compliance; automatic interpretation of regulations.
- Nationwide address search, fully automated cadastral updates, or municipal data pipelines.
- Photorealistic ray tracing, accurate wind CFD, detailed daylight factor, acoustic simulation, embodied-carbon LCA, financial underwriting.
- Multi-user editing, role management, enterprise SSO, payments, CRM, user acquisition analytics.
- AI chat or AI-generated buildings in the v1 core.

# 3. Users and positioning

**Primary persona — concept architect:** Needs to test site massing quickly, communicate alternatives, and understand rough area and sun impact. Comfortable with architectural 3D navigation and design tools.

**Secondary persona — BIM / computational designer:** Evaluates whether geometry, calculations, coordinate conventions, scenario state, and exports form an internally coherent computational workflow.

**Portfolio viewer — recruiter / hiring manager / design lead:** Often spends 1–5 minutes evaluating visual quality, interactivity, novelty, and technical credibility. Should be able to open a preset and see a strong example with no signup.

**Positioning:** A focused architectural concept study application, *not* an alternative to all Autodesk Forma functions. The design should communicate deliberate scope and mastery.

# 4. Product structure and site content

## 4.1 Demonstration sites

Release with **two curated Oslo site packages**:

- **Site A — Compact urban infill:** Dense surrounding buildings, simple lot geometry, strong shadow interactions, clear setbacks; preferred landing demo.
- **Site B — Sloped / landscape edge:** Noticeable topography, asymmetric massing, varied surroundings, retaining-grade visual issues; showcases terrain awareness.

These are **design scenarios**, not claims about any exact property. The package may use a real, licensed location, or a simplified fictionalized parcel inspired by Oslo morphology. Do not label fabricated parcel and regulation data as official. If using a real Oslo location, record data sources, licenses, transformations, acquisition dates, and any simplifications.

Each package contains `manifest.json`, local terrain geometry/height samples, neighboring building meshes or simple footprints/heights, parcel polygon, context linework, geographic origin and CRS metadata, thumbnails, views/camera presets, sun coordinates/time zone, and **explicitly hypothetical** site constraints. Prefer static hosted assets checked into or versioned alongside the app over live web-service fetches at runtime.

### Site manifest (logical contract)

```ts
interface SiteManifest {
  id: string;
  title: string;
  subtitle: string;
  location: { latitude: number; longitude: number; timeZone: 'Europe/Oslo' };
  crs: { sourceEPSG: string; originEast: number; originNorth: number; originElevation: number };
  unit: 'm';
  assetPaths: { terrain: string; context: string; parcel: string; thumbnail: string };
  constraints: SiteConstraints;
  sources: Array<{ title: string; url?: string; license?: string; acquiredAt?: string; notes?: string }>;
  dataStatus: 'curated-demo' | 'licensed-real-world-simplified';
}
```

**Coordinate policy:** Store authored project geometry in **local metric coordinates** with `x = east`, `y = north`, and `z = up`. Renderer adapts to Three.js as needed. Never use raw longitude/latitude as mesh vertices. Preserve origin metadata and coordinate transforms to avoid floating-point imprecision. Use a single validated conversion pipeline for imports, raycasts, snapping, measurement, and export.

## 4.2 Navigation and information architecture

Main routes:

- `/` — Landing/entry: brand, concise proposition, striking interactive or lightweight preview, **Open demo** action, site cards, selected screenshots.
- `/studio/:siteId` — Full workstation, preloaded default scenario and onboarding hints.
- `/about` or contextual `About this prototype` dialog — design rationale, technical stack, assumptions, author credit, data attribution.

The main project workflow should remain within the studio rather than navigating among isolated pages.

Studio layout at desktop:

1. **Top bar (52–60 px):** logo, project/site name, scenario dropdown, autosave state, undo/redo, view controls, export, info.
2. **Left vertical tool rail (48–60 px):** Select, Add Mass, Draw Footprint, Move, Rotate, Measure, Site Layers. Tooltips and keyboard shortcuts.
3. **Central 3D canvas:** majority of width, focus of attention.
4. **Right inspector (300–360 px):** context-sensitive Properties, Analysis, Site tabs; collapsible and resizable within limits.
5. **Bottom contextual bar (48–72 px):** sun/time slider in Sun mode, alternatively scene navigation hints and measurement readout.
6. **Scenario tray:** compact dropdown or collapsible bottom/side comparison panel, not always taking up canvas space.

At < 1100 px, collapse inspector into a floating drawer and prioritize the canvas. At mobile widths, present a polished read-only project teaser rather than claiming full edit support.

# 5. Detailed interaction specification

## 5.1 Startup and onboarding

**FR-001** Open demo without login (P0).
**FR-002** Choose two sites using photographic/3D thumbnails and short labels (P0).
**FR-003** On first studio entry show a brief 3-step coach-mark overlay: orbit, select mass, change time; skippable and not repeated after dismissal (P1).
**FR-004** Ship a built-in editable starter massing and a preconfigured alternative that demonstrate results (P0).
**FR-005** Have a visible `Reset demo` button with confirmation; reset to known baseline (P0).

### Empty states

If no building exists, show tasteful inline prompt: **Draw a footprint or add a building volume**. If local data is absent/corrupt, show recoverable error and a **Reload demo data** option. Data attributions visible from info panel.

## 5.2 3D viewport and camera

**FR-010** Orbit with primary drag in navigation mode, pan with modifier/middle drag, zoom with wheel/trackpad; prevent accidental scroll of underlying page (P0).
**FR-011** Smoothly frame entire site; **Fit site** action and `F` shortcut (P0).
**FR-012** Switch between perspective and orthographic axonometric view (P0).
**FR-013** Named camera presets: Isometric, Top, North, South, Eye Level (P0).
**FR-014** Compass, scale indication, north arrow, subtle grid optional (P1).
**FR-015** Layer toggles: terrain, surrounding buildings, street lines, parcel boundary, setbacks, selected massing, shadow receivers (P0).
**FR-016** Selection by raycast; selected objects show thin outline, handles, and clear inspector; click empty canvas clears selection (P0).
**FR-017** Double-click object frames it; `Esc` cancels active edit or clears selection (P0).
**FR-018** Support web graphics fallback: reduced shadow quality, lower mesh resolution, or user-friendly WebGL notice (P0).

Orbit/navigation controls must not conflict with transforms. Captured pointer operations need clear start/preview/commit/cancel states.

## 5.3 Advanced conceptual massing editor

The word **advanced** means a coherent, flexible **parametric conceptual editor**, **not** an unrestricted NURBS/solid-modelling engine. Core building primitives: polygonal extrusions, rectangular prisms, stepped/tiered masses, and courtyards as P1. Each model is edited using handles **and** numeric inspector fields.

### Geometry requirements

**FR-020** Add rectangular mass at a clicked point with a default size (e.g., 18 m × 12 m × 12 m) and snap to local ground (P0).
**FR-021** Sketch a polygon footprint on an editable ground plane; double-click/Enter completes, Esc cancels, Backspace removes last vertex (P0).
**FR-022** Validate polygon simplicity, minimum area, min edge length and winding; refuse invalid polygon with visual feedback (P0).
**FR-023** Extrude any accepted polygon to height or number of storeys (P0).
**FR-024** Manipulate translation (horizontal), rotation about a pivot, and footprint scale with visible gizmos (P0).
**FR-025** Edit footprint vertices, drag edges where valid, and edit extrusion height by roof handle (P0).
**FR-026** Numeric inspector fields for width/depth when rectangular, general area, rotation, base elevation, total height, storey count, storey height, use/type, name, color/palette variant (P0).
**FR-027** Group multiple volumes into a conceptual building; metrics aggregate per building and whole scenario (P0).
**FR-028** Add a tier/upper-volume, independently editable, attached to a parent building; suitable for stepping back upper floors (P0).
**FR-029** Duplicate selected mass (`Cmd/Ctrl+D`), delete (`Delete`), undo/redo (`Cmd/Ctrl+Z`, `Cmd/Ctrl+Shift+Z`) (P0).
**FR-030** Optional snap to grid, parcel edge, vertex, other footprint edges, and cardinal angles; screen-space tolerance with visual indicators (P1; simple grid snap P0).
**FR-031** Boolean courtyard/hole footprints where polygon algorithm permits; otherwise present `courtyard` as two or more related masses rather than unstable CSG (P1).
**FR-032** Display a live ghost preview with dimension label during transformations; commit only on pointer release (P0).
**FR-033** Provide per-object lock and visibility, with locked objects not draggable (P1).
**FR-034** Distinguish moving mass on XY plane from changing base Z and height (P0).
**FR-035** Ground placement policy: each mass has `baseElevation`, default to sampled ground at anchor; a building footprint crossing sloped terrain **does not** automatically deform like terrain; show clearance/intersection warnings rather than silently creating variable-floor geometry (P0).

### Editing behaviors / invariants

- Model coordinates use metres; inputs show metres with at most 2 decimals where relevant.
- Default storey height = **3.2 m** (editable assumption), with `height = storeyCount × storeyHeight` in **storey-driven mode**; a switch to **free-height mode** permits arbitrary height. Never allow inspector fields to disagree silently.
- `storeyCount` integer 1–40 for v1; positive dimension limits are configurable.
- A multi-tier building may overlap in XY at different Z levels; aggregations must avoid double-counting same floor slab levels.
- Selection / drag is visually stable at all common zoom levels; no handles disappear behind geometry unexpectedly.
- Every edit is transaction-based. Continuous pointer movement updates preview state; pointer release records one undo event. `Esc` reverts the entire uncommitted drag.
- Numeric inputs use validation, keyboard focus, precise error messages, and explicit commit on Enter/blur.

## 5.4 Project and scenarios

**FR-040** Default site starts with `Concept A` and `Concept B`; user can rename and create a new scenario (P0).
**FR-041** Scenarios have isolated massing, assumptions, camera bookmarks, and notes; site terrain/context is shared immutable source data (P0).
**FR-042** Save editing state locally via IndexedDB (preferred) or versioned localStorage for lightweight JSON (P0).
**FR-043** Autosave debounced ~800 ms after committed changes, plus on scene switch/tab visibility change where possible; show saved/unsaved indicator (P0).
**FR-044** Restore scenarios after browser reload; validate persisted schema and migrate known older versions (P0).
**FR-045** Duplicate scenario and compare selected pair in side-by-side metric table with two synchronized or independent visual snapshots (P0; dual live 3D view P1).
**FR-046** Switch without losing pending edits; save before switch (P0).
**FR-047** Reset one scenario or entire demo with confirmation (P0).
**FR-048** Import/export project JSON with schema version and provenance as recoverable backup (P1).

# 6. Analysis modules: truthful computational behavior

## 6.1 Geometry and quantitative metrics

**FR-050** Calculate **footprint** as polygon area of building ground-intersection/projection, appropriately unioned for overlapping bases where necessary.
**FR-051** Calculate **total conceptual gross floor area (concept GFA)** as sum of eligible plan footprints at each storey level. For stepped/multi-tier forms, explicitly compute occupied slices rather than `height × footprint` or double-counting overlapping slab areas.
**FR-052** Calculate total **massing volume** (m³) from 3D geometry or equivalent integral of plan sections.
**FR-053** Calculate max building elevation and nominal height (m), count storeys in storey-driven mode, and report total building count.
**FR-054** Compute **site coverage percentage** = unioned footprint within parcel / parcel area × 100, marking parcel-external footprint separately.
**FR-055** Show **concept GFA / parcel area** ratio, explicitly titled `Concept GFA ratio`—**not** statutory Norwegian BRA, BYA, %-BRA, or approved utilisation, unless a separately validated definition is implemented.
**FR-056** Show numerical metrics in live compact cards, with comparison delta and sensible units/rounding.
**FR-057** Calculate and show selected mass area, height and dimensions without selecting an entire building.

### Area language warning

Norwegian `BRA`, `BTA`, `BYA` have precise context-dependent measurement rules. This portfolio prototype must **not** relabel a simple planar calculation as regulatory BRA/BYA compliance. Use labels like **Concept GFA**, **Plan footprint**, **Site coverage (approx.)**, with methodology tooltip. If future official measurement standards are implemented, version the rule and include explicit references.

### Geometry calculation tests

- Rectangle 10 m × 20 m × 3 storeys at 3.2 m: plan footprint 200 m², concept GFA 600 m², height 9.6 m, simple volume 1,920 m³.
- Polygon vertex order reversal produces same absolute area.
- Duplicate overlapping masses on the same parcel level must not automatically double-count ground coverage.
- A two-tier mass with 200 m² ground floor for two storeys and 100 m² upper mass for two additional storeys yields **600 m²** total conceptual GFA, if volumes represent disjoint floor ranges and no duplicated levels.
- Shape partially outside parcel flags out-of-bounds; outside area is not silently included as site coverage.

## 6.2 Sun and shadow

**FR-060** Set date and time in Oslo's local time zone; support year round and Daylight Saving Time (DST) correctly (P0).
**FR-061** Calculate sun azimuth/altitude using site coordinates and timestamp (SunCalc or validated equivalent) and transform consistently into local axes and Three.js lighting (P0).
**FR-062** Light scene and cast shadows from user masses **and context buildings**, with terrain as receiver (P0).
**FR-063** Time scrubber 00:00–23:59, time presets morning/noon/evening, current displayed solar elevation and direction (P0).
**FR-064** Play/pause animation through selected time span with controllable speed (P0).
**FR-065** Date presets: spring equinox, summer solstice, autumn equinox, winter solstice; avoid suggesting identical daylight duration across seasons (P0).
**FR-066** Night/below-horizon state disables direct sun and displays a clear `Sun below horizon` indication (P0).
**FR-067** Optional **qualitative** ground heatmap from sampled rays across specified hourly intervals, with resolution and assumptions visible (P1).

**Accuracy boundary:** The tool simulates geometric sun direction and 3D cast shadows for an ideal clear sky. It does **not** claim certified daylight factor, EN daylight compliance, cumulative insolation to a regulatory standard, atmospheric effects, or detailed tree canopy shading. Avoid labels such as `8 hours verified sunlight` unless backed by a specified sampling and occlusion method.

## 6.3 Demo site constraints

**FR-070** Render parcel boundary, custom setback polygon, and reference maximum height plane as distinct toggleable layers (P0).
**FR-071** Inspector displays live status: `Within demo envelope`, `Exceeds demo envelope`, or `Not evaluated` (P0).
**FR-072** Detect footprint intersection/out-of-bounds via reliable 2D polygon containment/intersection functions (P0).
**FR-073** Validate configured max height relative to explicitly defined reference elevation; state whether grade or datum is used (P0).
**FR-074** Clicking a warning identifies the offending mass and highlights problematic geometry in the viewport (P0).
**FR-075** Attach `Illustrative constraint — not planning advice` notice within constraint tooltips and exported reports (P0).
**FR-076** Optional override panel allows changing demo limits and instantly seeing effects (P1).

Status colors are informative and accessible, never just decorative. The interface must not equate a pass on these three geometric checks with legal compliance.

## 6.4 Scenario comparison

**FR-080** Compare scenarios using fixed consistent metrics: concept GFA, ground footprint, coverage, max height, total volume, building count, envelope status, and notes (P0).
**FR-081** Show clear deltas with direction but do not assume a larger value is always better (P0).
**FR-082** Side-by-side matched-camera thumbnails or two static offscreen renders, respecting equal camera scale (P0).
**FR-083** Ability to activate a compared scenario for editing (P0).
**FR-084** Shadow comparison uses the same date, time, and camera orientation across both options (P1).

# 7. Visual identity and UI design system

## 7.1 Design principles

- **Canvas first:** ~70% or more of working width available for the model when side panels are closed; central 3D dominates.
- **Architectural calm:** precise linework, quiet surfaces, measured negative space, sophisticated typography.
- **Data legibility:** user sees parameters, units, methods and constraints without drowning in technical panels.
- **Quiet confidence:** micro-motion is subtle, no bouncy SaaS animations or excessive gradients.
- **Meaningful semantic color:** warnings are amber, out-of-range errors red, valid checks subdued green, selections a distinctive indigo/blue-grey.

## 7.2 Proposed design tokens (editable)

```css
:root {
  --bg-app: #F5F5F1;
  --surface: #FFFFFF;
  --surface-muted: #EFEFEA;
  --surface-viewport: #E8EBE7;
  --ink-primary: #202521;
  --ink-secondary: #69716C;
  --border: #DDE1DA;
  --accent: #355E79;
  --accent-soft: #E1EBF0;
  --positive: #477D65;
  --warning: #B8822B;
  --danger: #B9584F;
  --focus: #245F93;
  --radius-card: 12px;
  --radius-control: 8px;
}
```

**Typography:** Inter (or system fallbacks) for functional UI; restrained weights 400/500/600, rarely 700. Brand wordmark may use more editorial tracking. Scale: 11–12 px micro labels, 13–14 px control labels, 15–16 px body, 22–28 px panel/landing titles, 48–64 px landing hero depending on viewport. Keep WCAG contrast.

**3D scene palette:** terrain warm desaturated sage/stone; neighboring buildings matte warm grey; project massing off-white/clay or subtle blue-grey; parcel boundary dark muted cyan; setbacks dashed bronze; valid handles desaturated blue; selection outline dark blue. Shadows soft and readable; no overly stylized fake realistic materials.

## 7.3 Components

- Icon-only tool buttons with 40–44 px hit targets and tooltips.
- Floating layer popover with visibility and opacity controls.
- Inspector card: title / short subtitle, control grid, dimensional input with suffix, optional tooltip, clear focused state.
- Compact analytics card with key figure, unit, and explanation.
- Collapsible details with conservative animation (120–200 ms).
- Segmented control for `Model / Sun / Constraints / Compare` analyses.
- Sun scrubber with labeled times, date selector, play/pause, sun altitude.
- Scenario picker with duplicate, rename, delete and comparison actions.
- Toast and snackbar: saved, export complete, invalid polygon, unsupported browser, storage quota warning.
- Modal only when needed for destructive confirmation, methodology, or export options.

## 7.4 Accessibility and keyboard

- WCAG 2.2 AA **target** for standard HTML UI; explain that immersive 3D editing is not fully keyboard-equivalent in v1.
- Visible focus indicators; meaningful aria-labels; keyboard reachable inspector, toolbars, menus.
- Minimum 4.5:1 contrast for ordinary text and 3:1 for essential non-text controls where applicable.
- Do not rely solely on color for pass/fail; add icons/labels.
- Respect reduced-motion preference, disable nonessential transitions.
- Tab order does not vanish into canvas; canvas has accessible instructions and alternative numeric inspector controls.

# 8. Technical architecture

## 8.1 Recommended stack

- **TypeScript + React + Vite:** single-page application, low-friction static hosting, no SSR need.
- **Three.js + React Three Fiber + Drei:** geometry scene, lights, shadows, camera, gizmos. Choose versions compatible with installed React rather than blindly selecting R3F alpha.
- **Zustand (or equivalent):** editor state and transient selection/navigation UI; document reducers/command objects for undo/redo.
- **Tailwind CSS + CSS variables + accessible headless primitives:** customized premium UI design without dependency on heavy component aesthetic.
- **IndexedDB (Dexie optional):** persisted scenario documents, migration support.
- **SunCalc or equivalent:** solar position with tested azimuth conventions.
- **Turf or robust polygon geometry library:** area, point-in-polygon, intersections; select an appropriate robust clipping package for polygon union/difference.
- **GLTFExporter:** 3D export as GLB/glTF (P1), optional screenshot using canvas capture (P0).
- **Vitest + React Testing Library + Playwright:** unit, component, and end-to-end tests.
- **Optional MapLibre:** use only for a separate contextual overview map or future geolocation features. Do not begin with a synchronized MapLibre + R3F dual-rendering architecture for static demo sites.

The combination of React Three Fiber and Three.js is supported by official docs. Choose stable, mutually compatible releases and lock versions. A future geographic map integration can use MapLibre, but it is not a P0 dependency.

## 8.2 Modules and boundaries

```text
src/
  app/                  # router, initialization, error boundaries
  features/
    sites/              # manifest loader, geometry, attribution
    editor/             # tools, interactions, gizmos, history
    massing/            # immutable domain geometry, factories, validation
    analysis/
      areas/            # geometric metrics
      solar/            # sun vector, shadows, optional sampling
      constraints/      # demo setbacks / height validation
    scenarios/          # CRUD, compare, persistence
    exports/            # screenshots, JSON, glTF
  components/
    studio/             # shell, panels, toolbars
    ui/                 # reusable accessible primitives
  scene/                # R3F canvas, mesh factories, cameras, lighting
  data/                 # curated manifests and assets
  lib/                  # coordinate transforms, geometry utils, units
  tests/                # unit fixtures + integrated workflows
```

Keep domain calculations independent of React components and Three.js meshes whenever practical. A geometry model or calculation should be unit-testable without mounting a canvas.

## 8.3 Data model (minimum)

```ts
type UUID = string;
type Vec2 = [number, number]; // local East, North (m)
type Vec3 = [number, number, number]; // East, North, Up (m)

type Footprint = { outer: Vec2[]; holes?: Vec2[][] };
type HeightMode = 'storeys' | 'free';

type MassVolume = {
  id: UUID;
  buildingId: UUID;
  name: string;
  footprint: Footprint;
  baseElevation: number;
  storeyCount: number;
  storeyHeight: number;
  freeHeight?: number;
  heightMode: HeightMode;
  rotationDegrees: number;
  pivot: Vec2;
  useCategory: 'residential' | 'office' | 'mixed' | 'other';
  styleId: string;
  visible: boolean;
  locked: boolean;
};

type Scenario = {
  id: UUID;
  name: string;
  siteId: string;
  masses: MassVolume[];
  assumptions: { maxHeightMeters?: number; minSetbackMeters?: number };
  notes: string;
  cameraBookmark?: CameraBookmark;
  createdAt: string;
  updatedAt: string;
};

type ProjectDocument = {
  schemaVersion: 1;
  projectId: UUID;
  activeSiteId: string;
  activeScenarioId: UUID;
  scenarios: Scenario[];
};
```

**Important refinement:** To accurately handle tier volumes, add an explicit **floor elevation range or discrete floor levels** in the production domain model. The simplified example above deliberately does not solve stacked floor aggregation. Before FR-051 ships, implement `floorLevels` or level-indexed occupied polygons with union per elevation plane. Do not infer exact floor count purely from vertical mesh overlaps.

## 8.4 State topology

- **Immutable:** site source geometry, source metadata, site coordinate origin.
- **Persisted editable:** scenarios, footprints, height/rotation, assumptions, names, notes.
- **Transient:** selected objects, hover target, active tool, camera during movement, gizmo drag preview, active inspector tab, unsaved changes.
- **Derived:** GFA, footprint unions, constraints, selected-object bounding boxes, sun position; never persist derived values as authoritative truth.
- **Undo stack:** structured commands with before/after snapshots for one logical edit, capped e.g. 100 actions; scenario-specific.

## 8.5 Interaction performance

- Use instancing or merged geometries for static surroundings.
- Separate context meshes from editable massing meshes to avoid unnecessary updates.
- Cache triangulated terrain and polygon geometry until changed.
- Recompute derived metrics on commits and request-animation-frame-throttled previews; do not write persistence on every pointermove.
- Shadows: dynamic quality profiles, limit shadow-casting context meshes to relevant nearby buildings when needed.
- Profile baseline at 1440×900, ~30–100 contextual meshes plus 1–20 editable masses. Target > 45 fps typical desktop at balanced settings, with 60 fps as preferred goal.
- Introduce performance budgets and visual regression snapshots after the UI is functional.

# 9. Data pipeline and responsible source use

**Preferred v1 ingestion pipeline (preprocessing, not live runtime):**

1. Select or fictionalize demonstration locations.
2. Obtain terrain / building / streets / parcel data only from legally usable sources.
3. Record licenses, attribution and access dates.
4. Transform to a **single georeferenced local metre grid**, with explicit `EPSG` origin and vertical units.
5. Simplify surrounding buildings, decimate terrain, repair polygons and align elevations.
6. Export compact glTF/GLB or custom typed data plus parcel JSON.
7. Review geometry visually against original maps; validate North orientation and solar site coordinate.
8. Include assets as versioned static package in deployment.

Candidate data discovery starting points: Kartverket terrain APIs and downloadable elevation data, and suitably licensed city or national geodata sources. Availability and license **must be verified per selected dataset**. A source offering a data viewer does not automatically permit republishing its imagery or derived meshes.

**Avoid at launch:** asserting specific official Oslo parcel boundaries or legally binding setbacks unless they are sourced, checked and labeled accurately. Preferred on-screen language: `Curated Oslo demo · simplified context` and `Illustrative design constraints`.

# 10. Exports and presentation

**P0 — Screenshot/export image**

- Export PNG at selectable resolution (at least viewport scale and 2× if GPU supports).
- Hide selection gizmos and hover outlines in final render; allow optional north arrow, site title, date/time, and legend.
- Include clear data attribution or link in metadata/report where required by license.
- PNG output filename: `terraform_<site>_<scenario>_<yyyymmdd>.png`.

**P1 — Concept report**

- Printable HTML-to-PDF or browser print stylesheet; cover with hero render, project basics, concept metrics, shadow study snapshots, assumptions, site source note, and disclaimer.
- Test PDF page breaks, font loading and image sharpness. No legal/compliance certification claims.

**P1 — 3D interchange**

- Export conceptual GLB with mass geometry and basic names; clear that it is a **concept mesh**, not BIM/IFC deliverable.
- Project JSON export/import for editing continuity.
- IFC or Rhino exports are **not P0**, and should only be included later if reliable, properly structured outputs can be demonstrated.

# 11. Motion, micro-interactions, and visual storytelling

- Site-entry camera easing ~700–1000 ms; no forced long intro, respect reduced motion.
- Editing gizmo hover changes scale/opacities gently; precise drag response, never an animation that lags pointer.
- Selected mass outline 1–2 px equivalent with slight shading shift; inspector highlights changed metric without flashing.
- Sun scrubber smoothly interpolates light/shadow where renderer allows; date changes indicate status but never hide calculation errors.
- Scenario switch crossfades non-interactive scene imagery briefly, then mounts edit-ready model; if this causes selection bugs, use instant switch instead.
- At all times a screenshot should look like an actual architectural product, not a prototype full of debug overlays.

# 12. Quality requirements and verification

## 12.1 Functional test matrix

| ID | Test | Expected result |
|---|---|---|
| QA-01 | Launch default demo | Valid terrain, context, parcel, camera and starter masses load |
| QA-02 | Orbit, pan, zoom, preset | Smooth stable camera, no lost context or accidental page scrolling |
| QA-03 | Create valid polygon | New extruded mass visible, selectable and persisted |
| QA-04 | Create self-intersecting polygon | Clear validation; model stays unchanged |
| QA-05 | Change storeys 3→5 | Height and concept GFA update based on geometry and storey model |
| QA-06 | Move footprint across boundary | Warning appears; offending geometry highlighted |
| QA-07 | Drag roof and press Esc | Reverts to exact pre-drag dimensions, no history entry |
| QA-08 | Undo/redo duplicate, delete, rotate | Exact state and selection behavior restored |
| QA-09 | Switch two concepts, refresh browser | Both remain distinct and recoverable |
| QA-10 | Same datetime, same lat/lon | Sun vector repeatable after reload; shadows aligned with North |
| QA-11 | Winter date/no sun | Correct low/no-sun state without misleading sun-hours claim |
| QA-12 | Compare A/B | Correct deltas and matched camera compositions |
| QA-13 | Screenshot | File created, correct view, no gizmos, optional legend works |
| QA-14 | Bad persistent schema / storage full | No crash; actionable recovery and data export if possible |
| QA-15 | No WebGL | Accessible explanation and preview/static fallback |
| QA-16 | Numeric input invalid/negative | Rejected with specific error and preserved prior valid value |
| QA-17 | Reduced-motion | No unnecessary camera transitions or animated decorative effects |
| QA-18 | Reload curated site with missing asset | Graceful error state, no indefinite spinner |

## 12.2 Automated coverage

- Unit tests for polygon area, shape validity, coordinate transform round-trip, footprint union, storey aggregation, bounds, constraint checks, sun direction conversion, datetime/DST behavior, and serialization migrations.
- Component tests for inspector controls, scenario selector, mode tabs, error messages, and keyboard navigation.
- E2E Playwright for create/edit/undo/redo/save/reload/compare/export smoke path in Chromium; add WebKit and Firefox support if practical.
- Deterministic golden visual screenshots at a fixed camera, date, time and viewport. Allow known nondeterministic GPU differences with sensible tolerance.

## 12.3 Performance, resilience, accessibility

- Main workstation at 1440×900 should remain usable without panel overlap; desktop targets 1280×800 and 1920×1080 also checked.
- Static data assets compressed and lazy-loaded per site; preserve visible skeleton/preview while scene initializes.
- Autosave never blocks rendering; corrupted storage yields recoverable warning.
- Public deployment served over HTTPS; no exposed secrets or unnecessary telemetry.
- All external dependencies documented with licenses.
- Attributions accessible from studio interface and exports as required.

# 13. Build sequence and definition of done

## M0 — Foundation and visual shell

Deliver: routing, typography/tokens, layout shell, reusable controls, site cards, loading states, responsive inspector, a blank 3D canvas. **Gate:** interface looks cohesive at target viewport and navigation/accessibility basics work.

## M1 — Site packages and camera

Deliver: two processed Oslo-inspired site packages, local coordinate contract, static terrain/context, parcel and layers, camera presets, compass/north orientation. **Gate:** no live GIS dependencies needed; geometry aligned; stable 3D at target FPS.

## M2 — Massing engine

Deliver: add/select/transform/draw footprint/edit vertices/storeys/tier volumes, numeric property controls, validation, undo/redo. **Gate:** QA-03–08 pass; model survives repetitive edits; derived geometry is correct for simple and stepped forms.

## M3 — Live analysis

Deliver: area/volume/coverage metrics, solar calculations + shadows, time/date controls, demo setbacks/height thresholds, warning highlights. **Gate:** calculations match known fixtures; sunlight orientation verified against independent reference values; disclaimers visible.

## M4 — Scenarios and comparison

Deliver: scenario CRUD, persistence, autosave, matched-camera comparison, metric deltas, reset. **Gate:** QA-09 and QA-12 pass after reload.

## M5 — Portfolio polish and presentation

Deliver: refined illustrations, complete empty/error states, export PNG, landing page, tutorial hints, about/source disclosures, case-study capture, performance/accessibility passes. **Gate:** complete 3-minute workflow works cleanly without intervention in a production build.

## M6 — Optional extensions (not required for release)

Courtyards and richer parametric editing, ground sun-hours heatmap, print report, GLB exports, dual live viewport comparison, more sites, MapLibre context, and eventual AI concept suggestions with preview/accept/reject. Add only after M5 quality gate.

**Quality guardrail:** No new feature should displace fixing geometry correctness, editing stability, or visual polish in M0–M5.

# 14. Engineering implementation rules for AI coding agents

1. **Implement milestones in order.** Do not start AI integration or a full geographic backend during M0–M5.
2. **Make real features.** All buttons and metrics must function; placeholders are explicitly marked as future and hidden from the main demo.
3. **Separate domain logic from 3D renderers.** Domain modules own measurements and constraints; scene consumes derived geometry and statuses.
4. **Write tests before complex geometry.** Use known fixtures for polygon operations, storey unioning, and transforms.
5. **Strong typing and validation.** No `any` for domain schemas; validate incoming site packages and persisted project files.
6. **Atomic edits.** A pointer drag is one command; Esc cancels, release commits, undo restores exact previous state.
7. **Constrain dependencies.** Pick mature, well-documented packages; lock versions; audit licenses and bundle size.
8. **Do not fabricate regulations or measurement compliance.** Attribute curated assumptions in UI and any reports.
9. **Prioritize screenshots and interaction design.** At the end of each milestone capture standardized views for visual comparison.
10. **Maintain a decision log.** Document deviations, known technical debts, perf notes, and unresolved accuracy questions.
11. **Use feature flags for optional work.** Do not destabilize v1 to show advanced but unfinished features.
12. **Protect demo quality.** New functionality must meet baseline performance and no-regression tests before merging.

### Suggested acceptance prompt for agents

> Implement only the currently assigned milestone of Terraform PRD v1. Preserve the local East/North/Up metre coordinate model and immutable site packages. Treat geometry, solar data, assumptions, and UI labels truthfully. Before declaring the milestone complete, list the implemented acceptance criteria, run relevant tests/build, report failures and known limitations, and provide screenshots of the fixed reference scenes when tools allow. Do not add payment, authentication, AI generation, regulatory interpretation, or backend services unless explicitly requested.

# 15. Known uncertainties and decisions to resolve during implementation

| Decision | Proposed default | Resolution checkpoint |
|---|---|---|
| Exact Site A/B geography | Curated Oslo-inspired parcels with verified license if real | Before M1 |
| Static site asset format | glTF/GLB + parcel JSON + manifest | M1 prototype benchmark |
| Terrain mesh resolution | LOD based on viewport/budget | M1 perf testing |
| Editable footprint library | Robust clipping + validation library after benchmark | M2 spike |
| Tier floor aggregation | Explicit floor levels and union polygons per level | Before M2 GFA implementation |
| Renderer/mapping architecture | R3F primary; MapLibre optional separate overview | M1 |
| Shadow fidelity/performance | Tunable cascade or single sun shadow map | M3 benchmark |
| Scenario persistence | IndexedDB with versioned JSON serialization | M4 |
| Export options | PNG P0; report/GLB P1 | M5–M6 |
| Exact UI colors/typeface | Tokens above, adjusted by visual review | M0 / M5 |

# 16. Portfolio case study and demonstration script

Build the portfolio presentation alongside software delivery.

**Case study sections:** Challenge → design intent → interaction sketches → system diagram → polished UI views → live demo / motion clips → computational analysis proof → lessons learned and limitations. Explain that you combined professional architectural knowledge with modern development tooling and AI-assisted software implementation; avoid suggesting unverified regulatory or structural expertise.

**Suggested 90-second recorded walkthrough:**

1. **0–12 s:** landing hero, choose Compact Infill Oslo demo, glide into 3D context.
2. **12–28 s:** inspect terrain/parcel and toggle surrounding buildings/constraints.
3. **28–48 s:** select building, drag roof, adjust footprint, show live area and height changes.
4. **48–65 s:** enter Sun mode, scrub from morning to afternoon, show long shadows and context response.
5. **65–82 s:** duplicate concept, revise upper tier, compare scenario metrics and visuals.
6. **82–90 s:** export hero PNG, close on refined product overview.

**What portfolio viewers should remember:** You designed a coherent architectural tool—not just a beautiful render—and were able to translate spatial expertise into functional interactive software.

# 17. Risk register

| Risk | Impact | Mitigation |
|---|---|---|
| Scope creep into Forma-like platform | High | Strict milestone gates; AI and high fidelity analysis excluded |
| Area calculations subtly wrong | High | Define names, storey-level unions, test fixtures, methodology tooltips |
| Sun azimuth inverted / incorrect DST | High | Independent sun reference checks at known Oslo times, coordinate validation |
| Sloped terrain causes mass intersections | Medium | Anchor elevation + explicit clearance warning, no hidden auto-warp |
| 3D performance poor | High | Preprocessed assets, cached triangulation, mesh instancing, quality toggles |
| Editor controls fight camera controls | High | Tool-state machine, pointer capture, precise commit/cancel UX |
| Licensing / attribution uncertain | High | Dataset-level provenance and license validation prior to publication |
| Regulatory implication misleads | High | Only hypothetical demo limits; disclaimers in inspector and exports |
| AI-assisted code becomes brittle | High | Typed architecture, tests, decision log, small milestone PRs |
| Beautiful UI without functional depth | High | End-to-end demo and geometry-first acceptance criteria |

# 18. Release definition — Terraform v1

Terraform v1 is **done** only when the following are all true:

- [ ] Two deliberately prepared Oslo demonstration site packages load with reliable origin and North orientation.
- [ ] Site viewer supports robust orbit/pan/zoom, camera presets, layer controls and contextual selection.
- [ ] At least one complex footprint and an upper-tier stepped mass can be created and edited interactively.
- [ ] Properties support numeric changes and consistent storey/free-height handling.
- [ ] Undo, redo, duplicate, delete and cancel-drag work reliably.
- [ ] Concept areas, volume, height and coverage match verified geometry test fixtures.
- [ ] Sun and shadow are driven by Oslo coordinates and time, including seasonal changes and night states.
- [ ] Demo parcel/setback/height constraints correctly detect and highlight violations.
- [ ] Two scenarios can be saved, reloaded and compared with accurate deltas.
- [ ] High-quality PNG export works, with no accidental debug controls.
- [ ] Light-mode UI meets visual system and responsive desktop layout spec.
- [ ] No inactive main-path controls; sensible loading, empty and error experiences.
- [ ] Accessibility basics, performance baseline and automated smoke tests pass.
- [ ] Data provenance and limitations are disclosed; no false professional compliance claims.
- [ ] Production deployment includes an elegant entrance screen and straightforward live-demo access.
- [ ] Portfolio case study demonstrates the product and distinguishes actual functionality from concept or future work.

---

# Appendix A — Source and documentation references

These are **engineering reference starting points**, not endorsements of any specific deployment implementation:

- React Three Fiber: https://r3f.docs.pmnd.rs/
- Three.js documentation: https://threejs.org/docs/
- MapLibre GL JS (optional later mapping): https://maplibre.org/maplibre-gl-js/docs/
- SunCalc package: https://www.npmjs.com/package/suncalc
- Kartverket terrain data / licensing and access starting point: https://www.kartverket.no/en/api-and-data/terrengdata
- Kartverket API and data: https://kartverket.no/api-og-data

# Appendix B — Stage 1 decisions preserved

- Portfolio impact and functional polish take precedence over business viability.
- Curated Oslo demo sites, not national parcel search.
- Advanced *conceptual*, parametric massing editing—not full BIM or CAD authoring.
- Minimal light-mode visual language and model-first UI.
- No AI-generated alternatives until the base tool is finished and stable.
