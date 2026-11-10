# ADR-0020 — Simplify to search → analyse → export

- **Status:** Accepted (owner, 2026-11-10)
- **Plan:** `docs/plans/simplify-plan.md` · **Recovery:** git tag `pre-simplify`
- **Supersedes in part:** M2–M4 product scope (scenarios, comparison, planning-style checks); ADR-0011 (scenario persistence) for the UI

## Decision

The product does three things: **find a site** (address or template), **show the analysis**, and **export an image or a clip**.

**Kept (owner's list):**

- the 3D site, and the camera views;
- sun and shadows with the time slider;
- the full wind experience: live flow, Comfort/Direction/Worst case, streamlines, roof colours, the 8-direction rose, Play demo, and the expert controls (Delta/baseline, downwash, streamline height and opacity);
- noise;
- image and video export (ADR-0019);
- the "screening, not engineering" labels;
- a **minimal Add a block** (draw a footprint, set storeys/height, delete, undo/redo), which wind, sun and noise react to;
- the Geist font.

**Removed from the UI and code:**

- the scenario system (Concept A/B, autosave, recovery, notes) and Compare;
- the studio guide;
- project JSON export/import, and data notes (the data attribution line stays);
- the design check (envelope, setback, height limit, terrain checks);
- the study-boundary, setback and height-limit layers;
- the study-area facts and the area/GFA tile;
- tiers, use, storey height, base elevation and the name field;
- the manual render-quality and size controls (the automatic tiers of ADR-0018 stay);
- the old landing sections: the landing becomes one search-first screen, and `/new` merges into it.

**Blocks are session-only:** they are not saved across a reload. Saved scenarios already in browsers stay in IndexedDB but are no longer reachable.

## Consequences

- Many M2–M4 unit and e2e tests go with their features. The gate becomes the new flow: search → studio → sun/wind/noise → add a block → export.
- Claim policy unchanged: screening labels and data attribution stay visible.
