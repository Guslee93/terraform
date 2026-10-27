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

## Design-analysis candidates (added 2026-10-27)

Shortlisted for "interesting, a little innovative, not feature-heavy". Each reuses data v1 already has (terrain, context buildings, sun vector) or adds one clearly sourced dataset. All results are geometric or illustrative; none is a planning, daylight, acoustic or wind assessment.

**Recommended trio:** 8 + 10 + 12 — design a mass, see who it shades, cut a section, share the link.

| # | Candidate | What it shows | Builds on | Honesty label | Effort |
|---|---|---|---|---|---|
| 8 | **Shadow impact on neighbours** | Ground and context buildings that lose sun because of the scenario: shadow with massing minus shadow without, for the chosen date/time or a day sweep | M3 solar + shadows | `Geometric shadow difference — not a sun/shadow assessment` | Low–medium |
| 9 | **Solar envelope** | Ghost of the largest volume that would not shade neighbours beyond a user-set limit (after Ralph Knowles); design inside it | M3 sun vectors, study boundary | `Illustrative solar envelope` | Medium–high |
| 10 | **Section cut** | Draggable clipping plane through terrain, context and masses with a live section outline | Scene layer; Three.js clipping planes | — (pure geometry) | Low |
| 11 | **Cut and fill estimate** | Earth volume to excavate/fill to seat a mass at its base elevation on sloped terrain | Terrain grid, tier base elevation | `Estimate from 13 × 13 terrain — not a groundworks quantity` | Low |
| 12 | **Shareable design link** | Scenario encoded in the URL (compressed `serializeScenario` JSON in the hash); opening the link restores the design. No backend | `serialize.ts`, M4 import path | Validate with `parseScenarioDocument`; reject unknown schema | Low |
| 13 | **Sky view / openness** | Share of visible sky from a ground point (sky view factor), showing how enclosed a courtyard or street feels | Raycasts against terrain, context, masses | `Geometric sky view factor` | Medium |
| 14 | **Eye-level walk mode** | First-person view at 1.6 m to read massing at human scale | Camera rig, terrain height sampling | — | Medium |
| 15 | **Wind and noise (illustrative)** | Wind: prevailing directions and exposed façades/gaps. Noise: distance fall-off from main roads and façades facing the source | New datasets (wind statistics, OSM roads) — licence check by `research-synthesist` first | `Illustrative — not a wind or noise assessment` | Medium–high each |

Notes:

- 8 and 10 sit close to M3/M5 work. Pulling either into v1 is scope change and needs an ADR plus the user's approval; otherwise they wait for M6.
- 9 depends on 8's shadow-difference machinery; do 8 first.
- 12 must keep URLs within browser limits; measure the encoded size of both demo scenarios before committing to the format.
- **Deliberately not shortlisted:** embodied carbon and cost estimates. They need cited factors that are easy to misstate, which conflicts with the truthfulness guardrails.

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
