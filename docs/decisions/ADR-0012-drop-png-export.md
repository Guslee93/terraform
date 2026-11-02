# ADR-0012 — PNG export is dropped from v1

- **Status:** Accepted (owner, 2026-11-02)
- **Date:** 2026-11-02
- **Deciders:** Project owner, `engineering-software-architect`
- **PRD references:** §10 (P0 screenshot/export image), §13 M5, §16 demo script step 6, §13 definition-of-done checklist; QA-13
- **Related:** `docs/plans/M5-plan.md`, `docs/milestones/M5-polish.md`

## Context

PRD §10 rates PNG export P0 for v1. The owner said it is not important to the portfolio story and, offered keep-minimal, keep-full or drop, chose to drop it. AGENTS.md requires any departure from the PRD to be recorded as an ADR, because the PRD wins over agent recommendations.

## Decision

PNG export is **removed from v1 scope**. It is not scheduled in M5 and not moved to M6.

- No export button, capture hook or PNG file naming is built. M5 lists nothing under "export".
- **JSON project export and import stay.** They are a recovery feature (QA-14, FR-048), built in M4, and are not the PNG export the PRD describes.
- The M5 acceptance workflow becomes: land → choose site → orbit → edit mass → change sun → duplicate → compare → reload.
- The 90-second demo script ends on the compare view and the refined overview instead of "export hero PNG" (PRD §16 step 6).
- QA-13 (screenshot) is marked **not applicable**.
- The case study states plainly that image export is not part of this prototype.

## Consequences

- About half a day of M5 work and a whole capture path (render at 2×, hide handles, caption strip, metadata) are not built; the studio snapshot code from M4 stays as it is, for comparison thumbnails only.
- A visitor cannot save an image of a design from the app; they can take a screenshot with their own tools. The case study images come from the evidence screenshots.
- Re-adding it later is straightforward (the renderer capture technique exists in `src/scene/ScenarioSnapshots.tsx`), so this is reversible.
- The PRD text is left unchanged; this ADR is the amendment.
