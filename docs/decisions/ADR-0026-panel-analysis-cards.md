# ADR-0026 — One card per analysis in the Parameters panel; the dock is gone

- **Status:** Accepted (owner brief, 2026-11-13 — two annotated screenshots of the studio and the frame step)
- **Related:** ADR-0016 (studio v3 card layout — superseded in part), ADR-0020 (search → analyse → export), ADR-0021 (sun analyses), ADR-0006 (site import)
- **Dependencies:** none added. No new package, route or service.

## Context

The studio had two homes for the same information. A bottom dock carried three summary cards — Sun,
Wind, Noise — with the headline figure and one quick control each, while the right Parameters panel
carried the *active* card's full controls in a group at the top. The owner annotated three problems
with that arrangement:

1. **Back left the product.** Pressing Back in the studio jumped to the site list on the landing page.
   For an imported site that is the wrong place: the site was framed on a map first, so Back should
   return to that map, on the same spot.
2. **The information was split.** The dock held the figures, the panel held the controls, and the
   window was full of chrome to hold both.
3. **The import looked inert.** "Open in 3D" listed its six steps as text; the owner asked for a
   progress bar while the tiles, buildings and streets load.

## Decision

1. **The Parameters panel holds one card per analysis.** Sun, Wind and Noise are cards at the top of
   the panel, above the Selected block, Layers, Export and Site groups. Each card shows its label, its
   headline figure (never a placeholder: `—` with a hint when the value cannot be computed) and the
   claim that goes with it.
2. **A card opens its controls.** The card header is a button (`aria-expanded`): opening the card
   reveals that analysis' full controls inside it, and the open card is the analysis on the map.
   Closing the card turns its layer off, exactly as choosing another card did before (ADR-0016 kept
   one climate layer at a time; that rule is unchanged).
3. **The bottom dock is removed.** The viewport takes the height the dock used. The dock's global
   claim, "Indicative screening — not planning advice", moves to the panel above the cards.
4. **The card's claim is not repeated inside the card.** A closed card states its claim under the
   figure; an open card states it in its controls (the legend or the sun method note). The claim is
   never absent: the number that needs a claim only appears while the card is open, except the sun
   elevation and the noise peak, whose cards keep their claim while closed.
5. **Back returns to the frame step.** For an imported site, Back is `/new?lat=…&lon=…&label=…&size=…`:
   the same place, the same frame size, the same title. The frame size is recovered from the imported
   study area, which is the frame inset 15 % on every side (70 % of the frame side). A curated site
   was never framed, so its Back still goes to the site list.
6. **The import shows a progress bar.** The six import steps stay listed; above them a determinate bar
   shows the share of steps that are settled, plus half for the step in flight.

## What moved where

| Was | Now |
|---|---|
| Dock card figure and secondary line | Card header and sub-line in the panel |
| Dock quick controls (sun time band, wind direction and speed) | Inside the open card |
| Panel "analysis" group (the active card's controls) | Inside the open card |
| Dock claim "Indicative screening — not planning advice" | Caption above the cards |
| Dock "Blocks" card (block count, draw hint) | The Selected block group (count in its header, hint and draw button in its body) |
| Dock as a row under the viewport | Nothing: the viewport takes the full height |

## Alternatives considered

- **Keep the dock and add the cards to the panel.** Rejected: the same figure would appear twice, and
  the owner asked for the dock to go.
- **A tab per analysis instead of a card.** Rejected: a tab hides the other two figures, which is the
  information the owner wanted gathered in one place.
- **Always-expanded cards.** Rejected by the owner: the panel would be three long sections, and the
  figures would be pushed below the fold.
- **Back to the frame step for curated sites too.** Rejected by the owner: a curated site was never
  framed, so there is no frame to return to.

## Consequences

- The studio has one information column. At 1440 × 900 the panel shows three cards, the open card's
  controls and the four groups; the viewport is 100 px taller than before.
- The wind flow, the noise screening, the sun analyses and the export path are unchanged. Only where
  they are shown moved.
- `dockValues.ts` is now `analysisValues.ts` and `DockStat` is now `AnalysisStat`: the values never
  belonged to the dock.
- The e2e helper `openAnalysis` now opens a card; the keyboard order changed, because the analysis
  cards are reached inside the Parameters panel rather than after it.

## Limitations

- The sun card is long when open: the time band, the analysis switch, the readout, the date and time
  controls, the playback speed and the sun-path diagram all live in one card. The panel scrolls.
- The frame size Back restores is the nearest of the three frame sizes; an import framed at an odd
  size (the importer allows 100–800 m) returns with the closest of 200, 400 or 600 m.
