# M6 — Optional extensions

- **Status:** Not started — blocked until the M5 gate
- **PRD gate:** Separate release gate; must not destabilise v1 (§13)
- **Lead:** `engineering-ai-engineer` (AI features) or `engineering-software-architect` (non-AI extensions)

## Goal

Explore extensions that strengthen the portfolio story without weakening the reliable v1 demo.

## Candidate work

1. **AI concept suggestions** — preview/accept/reject, never auto-apply; explicit provenance; no fabricated compliance.
2. **Ground sun-hours heatmap** — qualitative, sampling method and resolution visible.
3. **Concept report** — printable HTML-to-PDF with metrics, shadow snapshots, assumptions and disclaimers.
4. **GLB export** — clearly labelled concept mesh, not BIM/IFC.
5. **Dual live comparison** — only if performance and selection stability hold.
6. **More sites / MapLibre context** — optional overview only, not synchronized dual rendering.
7. **Courtyards and richer parametric editing** — only with robust polygon handling.

## Agents

`engineering-ai-engineer`, `engineering-prompt-engineer`, `engineering-rag-pipeline-engineer` for AI; `engineering-pdf-engine-architect` for reports; `gis-web-gis-developer` for MapLibre context; `engineering-multi-agent-systems-architect` only if the product itself needs orchestration (not for the development workflow).

## Rules

- Feature flags for every extension; default off in the portfolio demo until accepted.
- No new runtime dependency without an ADR.
- Re-run the full v1 acceptance suite before and after.
- Any AI output is labelled as a suggestion and requires explicit user acceptance.
- Do not imply regulatory, structural or certified environmental accuracy.

## Gate

- v1 workflow unaffected with flags off.
- Extension has its own acceptance criteria, tests, screenshots and limitations.
- Performance and accessibility baselines unchanged or improved.
