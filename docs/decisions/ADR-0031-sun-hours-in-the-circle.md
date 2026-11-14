# ADR-0031 — Sun hours on every surface in the analysis circle

- **Status:** Accepted (2026-11-14, the owner's request: "implement this type of analysis on the
  particular plot … within the same circle as wind analysis", with a reference image of sun hours on
  façades, roofs and ground for 21 June, 00:00–24:00)
- **Amends:** ADR-0021 (ground sun hours and façade sun hours)
- **Relates to:** ADR-0014/0028 (the wind analysis circle), ADR-0022 (measured roofs), ADR-0026 (Sun card)
- **Dependencies:** none added.

## Context

ADR-0021 gave the studio two direct-sun layers. Ground sun hours covered the whole study-area
rectangle in 10 m cells, and façade sun hours covered only the blocks a user draws. Neither showed
what a building receives on its walls and roof, which matters most when comparing massing. The
owner asked for the familiar sun-hours view instead: every façade, every roof and the ground,
coloured by hours of direct sun for one date and a window of the day, inside the analysis circle the
wind map already uses.

## Decision

1. **One circle for wind and sun.** Sun hours use the wind analysis circle: the same centre and
   radius. Its size slider and Move circle sit in the Sun card too (`CircleControls`, shared with the
   Wind card), and the circle is drawn while Sun hours is on.
2. **What is measured** (`circleSunHours.ts`), using the same exact shadow ray as ADR-0021:
   - **Ground:** open ground inside the circle, in 2 m cells.
   - **Roofs:** every roof of every building or drawn tier that touches the circle, whole even where
     it crosses the rim, in 2 m cells. The roof does not shade itself; another tier or building can.
     Gables use their measured surface height (ADR-0022).
   - **Façades:** every wall of the same buildings, as a grid of vertices at most 2 m wide and one
     storey (3 m) high, 0.1 m outside the wall. A gable end gets a column at its peak. A wall only sees
     the sun in front of it.
3. **Date and window.** Hours are counted from the Sun card's date, within a From–To window of the
   day (30-minute steps, default 00:00–24:00), at 15-minute samples (`windowSunSamples`).
4. **Colour scale.** Continuous, from 0 h to all the sun the window offers (the hours the sun is above
   the horizon in it). A fixed 0–9 h scale would paint every open surface one colour on Oslo's 19-hour
   midsummer day. The ramp is one warm hue family, dark to light (after ColorBrewer YlOrBr, reversed,
   without its near-white step), so shade reads dark and full sun light. Neither end disappears into
   the white buildings, and lightness rises monotonically (tested).
5. **Readout.** The card shows the median hours on the ground, the roofs and the façades inside the
   circle, the date, the window, and the hours the sun is up. Its headline figure is the ground
   median. The viewport shows the colour scale and the ADR-0021 claim, word for word.
6. **Worker.** The computation runs in `circleSunWorker.ts` behind a 250 ms debounce
   (`useCircleSunHours`). The previous result stays on the map, marked "Computing…", until the new
   one arrives.
7. **Folded in:** ground sun hours over the study area, and the separate **Façade** option, are
   replaced by this. Sun hours already covers the drawn blocks' façades, and every other façade too.
   The Sun switch is now `Shadows | Sun hours | Roof solar | VSC`. Roof solar and VSC are unchanged.

## Consequences

- **Cost, measured** (Node, 21 June, full day, r = 100 m):
  - Compact Infill: 0.53 s for 56 buildings, 11,556 ground and roof cells and 15,432 façade
    vertices.
  - Sloped Edge: 0.16 s for 9 buildings.
  - The old ground layer took 22 ms on the main thread for 456 cells; the new one runs off the main
    thread.
- **What Compact Infill shows on 21 June:** median 8.8 h on the ground, 16.8 h on the roofs and
  3.8 h on the façades, of 18.8 h the sun is up. North façades still catch long grazing morning and
  evening sun at 60° N (as ADR-0021 noted), so they read orange, not dark, in midsummer.
- **Claims unchanged.** "Indicative sun hours — geometric, clear sky, buildings only. Not a daylight
  assessment." The D34 audit now also sweeps the Sun hours view. No new wording uses the words "sun
  hours".
- **Limitations, as ADR-0021:**
  - Terrain casts no shade.
  - Trees cast no shade.
  - A wall is a vertical extrusion from its building's base.
  - A drawn mass's tiers are extrusions from the ground, so a tier's lower walls lie inside the tier
    below it. They are drawn there but hidden by that tier.
  - Buildings beyond the circle still cast shadows into it but are not coloured.

## Alternatives considered

- **Keep the study-area rectangle.** The owner asked for the circle, and one circle for wind and sun
  lets the two be compared on the same ground.
- **Only the drawn blocks' façades (ADR-0021).** That misses the existing buildings the user is
  studying.
- **A fixed hour scale.** Saturates at Oslo's latitude in summer and is empty in winter.
- **Per-sample quads (the old façade layer).** A vertex grid with interpolated colour reads as a
  continuous surface and costs one draw call per surface type.
