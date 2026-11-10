# Plan — Simplify Terraform to "search → analyse → export"

**Status:** implemented 2026-11-10 (ADR-0020; owner kept Add a block, Noise, Geist and the wind expert controls) · **Date:** 2026-11-10
**Owner's direction:** value = the wow effect. The tool should only (1) find an address or a ready-made site, (2) show the analysis, (3) export an image or a video. No concepts, comparisons, project files or planning-style boundaries.

## 1. What the app has today (inventory)

| Area | Features found |
|---|---|
| Landing `/` | Hero + illustration · 2 demo-site cards · "Start from any address" card · "Method: one site, four readings" · "Honest by design" · My sites |
| Address page `/new` | Search box · 9 city shortcuts · map with frame · frame size 200/400/600 m · Load in 3D |
| About `/about` | Long page: scope, sources, method, technical stack |
| Studio top bar | Back · **Concept A** (scenario menu) · Saved · **Test a building** · **Compare** · **Guide** · Fit site · About |
| Studio tools | Select · Draw · Delete · Undo/Redo · **Export** |
| Parameters panel | Draw · **Selected mass** (storeys, tiers, height, use) · **Design check** (study area, setback, height limit, terrain) · Site (137 buildings) · **Export project / import** (JSON) · **Data notes** · View (render quality, size S/M/L) · camera presets · **Image passes** · **Record 6 s clip** · **Notes** |
| Analysis dock | Draw/Area tile · Sun · Wind · Noise · Area |
| Wind panel | Direction dial · circle radius + move · Comfort/Direction/Worst case/**Delta** · Play demo · Streamlines · streamline height + opacity · wind speed · **downwash checkbox** · **Set/Clear baseline** · Analyse 8 directions + rose |
| Sun panel | Date, time, seasons, play |
| Scene layers | Terrain · context buildings · streets · trees · **study boundary** · **setback** · **height limit** · green space |

## 2. Recommendation

### Cut (fluff for the new goal)

| Feature | Why it goes |
|---|---|
| **Concept A/B scenarios**, scenario menu, autosave, recovery, notes | Design-option management; not "search → analyse → export" |
| **Compare** (side-by-side scenarios) | Depends on scenarios |
| **Export/import project JSON** | Data plumbing, not a visual |
| **Design check / demo envelope** (study area, setback, height limit, terrain checks) | Planning-style checks; you asked to remove the boundaries |
| **Study boundary + setback + height-limit layers** | As requested; the wind circle already shows the area being analysed |
| **Study-area facts** (area, coverage, footprint "in study area") | Meaningless without the study boundary |
| **Tiers, use, storey height, selected-mass inspector** | Detailed massing editing |
| **Studio guide** (first-visit tour) | Not needed once the studio is simple |
| **Wind: Delta / baseline** | Only meaningful with design options |
| **Wind: downwash checkbox, streamline height + opacity selects** | Expert knobs; keep sensible defaults (downwash on, 3D streamlines) |
| **Render quality / size S·M·L controls** | Keep the automatic tiers (ADR-0018), hide the knobs |
| **Data notes**, long About page | Fold the essentials into one line + a short "About" sheet |
| **Landing sections**: Method, Honest by design, illustration, site cards, My sites | Replaced by the search-first page |

### Keep (the wow)

| Feature | Notes |
|---|---|
| Address search + framing | Becomes the landing page |
| Curated sites as **templates** | Shown as chips/suggestions in the search |
| 3D site (terrain, buildings, streets, trees) | Core |
| **Sun & shadows** (time slider, play) | Core wow |
| **Wind**: live flow in the circle, Comfort/Direction/Worst case, particles + 3D streamlines, roofs, dial, speed, Analyse 8 directions + rose, Play demo | Core wow |
| **Export**: image passes + recorded clip | The output |
| Camera presets (3D / Plan / Street), Fit site | Navigation |
| Screening labels | Required by the claim policy |

### Your call (I'd decide these before building)

| Feature | Option A (simplest) | Option B (keeps a wow) | My pick |
|---|---|---|---|
| **Test a building** (draw a block, set height) | Remove entirely | Keep a minimal "Add a block": draw + height only. Wind/sun react live; no tiers, checks or scenarios | **B**: drawing a tower and watching the wind change is the strongest wow moment |
| **Noise** layer | Remove | Keep as a plain layer | **A** (cut): flat, low wow, and its own disclaimer |
| **About** page | Remove | One short sheet | **B** |

## 3. New main page (search-first)

Inspiration: your four references (soft gradient hero + centred headline + search card with chips; Outfit typography with lime #F3FFAC / grey #C7D0D2 / ink #202020; a calm, airy grid; a full-bleed landscape behind a frosted search bar).

```
┌──────────────────────────────────────────────────────────────────┐
│ ◆ Terraform                                              About   │
│                                                                  │
│        [full-bleed Oslo aerial / soft gradient, slowly moving]   │
│                                                                  │
│              See the wind and sun on any site.                   │
│     Search an address. Watch the flow. Export the image.         │
│                                                                  │
│   ┌──────────────────────────────────────────────────────────┐   │
│   │ ⌕  Search an address in the Nordics…                  →  │   │  frosted glass card
│   │  [Oslo · Compact Infill] [Oslo · Sloped Edge] [Bergen]…  │   │  template chips
│   └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│   Screening from open map data — not engineering.                │
└──────────────────────────────────────────────────────────────────┘
```

**Flow:** type an address (or pick a template) → the map opens **in place** under the search with the square frame (200/400/600 m) → **Open in 3D** → studio. Templates skip the frame and open directly.

**Design:** one screen, no scrolling sections. A frosted search card over a full-bleed image (a render of our own Oslo wind view works and shows the product). Outfit as the display font needs an ADR (new font dependency, ~30 KB WOFF2, OFL licence); otherwise keep Geist.

## 4. Studio after simplification

- **Top bar:** Back · site name · Add a block (if B) · Export · About
- **Right panel:** one card per analysis: **Sun** · **Wind** (Comfort / Direction / Worst case, dial, speed, Analyse 8 directions, Play demo) · **Export** (Image · Clip)
- **Dock:** Sun · Wind tiles only

## 5. How it would be built

| Phase | Work | Who |
|---|---|---|
| S0 | ADR-0019 (scope cut + main page; Outfit if chosen); tag `pre-simplify` so everything is recoverable | Claude |
| S1 | New search-first landing that reuses the `/new` geocoder and frame; templates as chips; `/new` redirects to `/` | Codex (UI) + Claude review |
| S2 | Studio cuts: scenarios, compare, guide, notes, project JSON, design check, boundaries/setback/height-limit layers, study facts, tiers/inspector, delta/baseline, expert wind knobs, render knobs, noise (if A) | Codex, in 2 PRs-sized batches, with dead-code and test removal |
| S3 | Minimal "Add a block" (if B): draw + height, one undo entry per drag | Claude |
| S4 | Gate: lint/test/build, e2e trimmed to the new flow, screenshots, case-study update, deploy on your OK | Claude |

**Risks:** the cut removes about a third of the e2e specs (M2–M4) and many unit tests; that's expected and goes in the ADR. Saved scenarios in people's browsers become unreachable (IndexedDB stays, nothing is deleted). Nothing is pushed or deployed without your OK.
