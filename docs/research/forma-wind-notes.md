# Forma wind — feature extraction notes

Source: "Autodesk Forma Series – Episode 03 – Wind Analysis + Proposals" (Daniel Stine, 13 Jan 2024, 11:38). Model: downtown Austin, two native towers + Revit/Rhino import. Method: frames read directly plus narration transcript; every timestamp below was verified on screen.

## 1. Workflow steps

| t | Step | Detail |
|---|---|---|
| 0:46–1:00 | Load + Wind tool | native towers + Revit/Rhino import; rapid solver starts, real time, no settings |
| 1:07 | Comfort view | default; ramp + per-class area share (7/37/49/7 %) |
| 1:13 | Direction view | dominant-wind flow replaces comfort classes |
| 1:21 | Drag a volume | heatmap re-solves live during the drag |
| 1:36–2:01 | Wall, then move it | sheltered green pocket grows; the remaining gap re-channels wind |
| 2:19–2:47 | Detailed run | button reads "Run detailed analysis (~30-90 mins)"; goes to "Analyzing…", modelling continues in parallel |
| 2:48 | Results | "See detailed analysis"; Inspect reads the class under the cursor |
| 3:14–3:35 | Direction tab | velocity ramp in mph; streamlines toggle (importance); rose S 180° 35 %, N 0° 14 % |
| 4:06–4:20 | Baseline + area | run on "Existing Conditions"; "Custom circle" with "Wind area radius 492 ft" |
| 4:34–5:42 | Delta + Proposal 2 | west-street hotspot appears only in the proposal; rotating the towers makes it vanish live |
| 5:53 | Proposal 3 | tree windbreak, leaf density read at 0.25 m; native Tree tool |
| 6:45–7:45 | Compare + 2D plan | 2 → 3 synchronised viewports; the tree row shelters the dining patio |
| 8:21 | Criteria | comfort-scale drop-down = Lawson LDDC; changes thresholds, not the CFD |
| 9:56 | Sun hours | north façade vs neighbour tower, June + December |

Inputs visible: weather source "GNA 3.0"; per-direction share; speed in mph; criteria "Lawson LDDC" (Davenport also mentioned); streamlines by importance. The rapid run is instant; the detailed run is 30–90 min in the cloud. Radius limits are never shown, only the live value (492 ft ≈ 150 m).

## 2. Visuals

- Heatmap: flat colour fill on the ground and on rooftops, clipped to the analysis circle. **No edge fade** — the circular boundary is a hard cut; buildings outside stay white.
- Comfort ramp, five steps at the bottom of the viewport: mint/teal → green → yellow → orange → red, labelled Sitting, Standing, Strolling, Walking, Uncomfortable. The side panel repeats the ramp with each class's share of area as a percentage.
- Velocity ramp on the Direction tab: white → pale blue → cobalt → magenta, ticked 2.2 to 22.4 mph.
- No particles. Thin 3D streamlines instead: dark-blue filaments that climb tower faces, spiral round corners and dive into street canyons; toggleable, filtered by importance.
- Camera: oblique aerial over the whole site with free orbit; compare can snap to a top-down 2D plan.

## 3. Proposals

Variants of one design, each keeping its own runs. Compare opens 2–3 synchronised viewports; every panel carries a header tag naming the proposal, its own comfort legend and its own ramp, and they share one camera. Inspect reads the same coordinate in all panels at once (category plus direction). No numbers are tabulated — the read is visual, backed by the per-panel area-share donut.

## 4. Three "wow" moments

1. **4:00** — streamlines wrap the towers in visible helices and plunge into the canyon; blue filaments over white massing read as real flow, not a heatmap.
2. **7:35** — three proposals side by side in plan; the same spot is orange in one panel and green in another, so the design decision lands in a glance.
3. **5:42** — rotating the towers makes the west-street hotspot vanish live, mid-drag, so cause and effect are felt rather than read.

## 5. Gap table

| Forma feature | Terraform today (wind-simulator-prd.md §1–5) | Suggested change |
|---|---|---|
| Rapid solver re-colours while dragging | R2 wants live update; solver in a worker | Keep live update, label indicative 2D |
| Comfort ramp, five activity classes | R4 Lawson classes; R6 one ramp | Adopt Forma's class names so labels transfer |
| Share of area per class | comfort.ts planned, not built | Add a per-class area-share readout |
| Streamlines instead of particles | R7 allows static streamlines | Add importance-filtered streamlines as a toggle |
| Velocity ramp in mph | local ENU metres only | Keep m/s; mph display-only, one converter |
| Wind rose + per-direction share | typical baked rose per site, labelled | Put the rose and direction share beside the dial |
| Wind area radius slider (492 ft) | fixed 128² grid | Expose the analysed extent; keep the grid fixed |
| Detailed cloud run, 30–90 min | solver is local and instant | Out of scope — needs a backend |
| Weather data source GNA 3.0 | typical, not measured | Out of scope — paid/licensed live data |
| 2–3 synchronised compare panels | W4, scenarios reused later | Reuse scenario compare, matched cameras |
| 2D plan toggle | camera presets exist | Add an orthographic plan preset |
| Sun hours beside wind | M3 solar analysis exists | Keep separate; do not merge the panels |
