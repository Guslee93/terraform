# Terraform — Agent Operating Guide

**Status:** Simplified to search → analyse → export (ADR-0020, tag `pre-simplify` for the old scope) · Wind simulator ADR-0014/0015 · rendering spec ADR-0017–0019
**Source of truth:** `Terraform_Comprehensive_PRD_v1.md` (v1.0, 26 Oct 2026)
**Product type:** architectural portfolio prototype, not a commercial SaaS

Read this file first, then the assigned milestone brief, then only the PRD sections named in the brief. The PRD wins over any agent recommendation. Any deviation becomes an ADR in `docs/decisions/`.

---

## 1. Product guardrails (non-negotiable)

1. **Milestones in order.** M0 → M5 are the release path. M6 is optional and starts only after the M5 gate.
2. **Real features only.** No inert main-path controls, fake metrics, decorative charts or placeholder values presented as data.
3. **Domain logic is renderer-free.** Measurements, validation, solar and constraints must be testable without React or Three.js.
4. **Local East/North/Up metres.** Never use latitude/longitude as mesh vertices. One conversion pipeline for raycasts, snapping, measurement and export (ADR-0002).
5. **Truthful claims.** Do not invent Oslo parcels, regulations, daylight compliance or structural conclusions. Label constraints `Illustrative — not planning advice`.
6. **Transactional edits.** One pointer drag = one undo entry; `Esc` cancels; pointer release commits.
7. **Strong typing at boundaries.** No `any` in domain schemas. Validate site packages and persisted project files.
8. **Pinned dependencies.** New runtime dependencies need an ADR with bundle-size and licence notes.
9. **Protect the demo.** No feature displaces geometry correctness, editing stability or visual polish in M0–M5.
10. **Evidence before “done”.** Tests, build, screenshots at fixed reference views, and a written report.
11. **No scope drift.** Auth, payments, backend services, multi-tenancy, live GIS, and AI generation are out of scope for v1.
12. **Accessibility is part of the product.** WCAG 2.2 AA target for standard HTML UI; visible focus, keyboard reach, reduced motion.

---

## 2. Commands

```bash
npm run dev        # Vite dev server
npm run build      # typecheck + production build
npm run preview    # preview production build
npm run typecheck  # tsc for app and tooling configs
npm run lint       # ESLint flat config
npm run test       # Vitest unit/component suite
npm run test:watch # Vitest watch mode
npm run test:e2e   # Playwright Chromium smoke path
npm run capture    # Capture M0 reference screenshots into docs/screenshots
```

A milestone is not complete unless `npm run lint`, `npm run test`, and `npm run build` pass locally. Playwright runs when browsers are installed.

---

## 3. Repository map

```text
src/
  app/                 router, landing, about, studio entry, error boundaries
  components/
    marketing/         site chrome, cards, hero illustration
    studio/            top bar, tool rail, inspector, shell
    ui/                Button, Icon, IconButton primitives
  features/
    sites/             catalogue + future manifest loader
    editor/            (M2) tools, pointer state machine, history
    massing/           (M2) immutable geometry, factories, validation
    analysis/          (M3) areas, solar, constraints
    scenarios/         (M4) CRUD, persistence, comparison
    exports/           (reserved) PNG export dropped from v1 (ADR-0012); JSON backup lives in scenarios/
  scene/               R3F canvas, lighting, camera, future mesh factories
  data/                cached raw source data (OSM XML, elevation responses)
  lib/                 coordinates, units, shared utilities
  styles/              PRD design tokens + Tailwind entry
  test/                Vitest setup
e2e/                   Playwright specs
public/sites/          site thumbnails; M1 geometry packages
docs/
  decisions/           ADRs
  milestones/          M0–M6 briefs and gates
  design/              design contract
  data/                site package specification
  qa/                  fixtures and verification protocol
  reviews/             code review and visual gate records
  agent-log.md         which agent did what and whether it was accepted
```

---

## 4. Milestone map

| Milestone | Outcome | Gate |
|---|---|---|
| **M0** | Foundation, tokens, shell, controls, responsive inspector, blank 3D canvas | Cohesive UI at 1440×900; keyboard/focus basics; visual gate |
| **M1** | Two curated site packages, ENU contract, terrain/context/parcel layers, camera presets, compass | No live GIS; north/scale aligned; stable FPS |
| **M2** | Massing model, add/draw/transform/storeys/tiers, validation, undo/redo | QA-03–08; stepped forms correct |
| **M3** | Areas/volume/coverage, solar + shadows, date/time controls, demo envelope checks | Fixtures match; sun reference verified; disclaimers visible |
| **M4** | Scenario CRUD, autosave, migrations, matched-camera comparison | QA-09/12 after reload |
| **M5** | Landing/polish, empty/error states, case study, deployment, a11y/perf | Full 3-minute workflow in production build; final visual gate |
| **M6** | Optional AI suggestions, report, GLB, map context | Separate gate; never destabilises v1 |

Full briefs: `docs/milestones/M0-foundation.md` … `M6-optional.md`.


---

## 5. Agent operating model

These skills are **role prompts, not autonomous workers**. Value comes from a small roster, one lead per milestone and written handoffs.

### 5.1 Core roster

| Agent (skill directory) | Use |
|---|---|
| `engineering-software-architect` | Lead for M0–M2 and M4. Module boundaries, ADRs, dependency approval. |
| `engineering-senior-developer` | Primary implementer for domain logic, state, persistence, integration. |
| `engineering-frontend-developer` | UI shell, inspector controls, responsive behaviour, accessibility. |
| `gis-3d-scene-developer` | R3F/Three.js scene, terrain, camera, lighting, gizmos, raycasting, performance. |
| `engineering-code-reviewer` | Mandatory review gate for every milestone. |
| `engineering-minimal-change-engineer` | Every bug fix after M2; no opportunistic refactors. |
| `design-ux-architect` | Layout architecture, CSS system, responsive structure. |
| `design-ui-designer` | Tokens, components, visual language, motion. |
| `design-ui-finish-gate-reviewer` | Hard visual gate at M0 and M5. |
| `design-persona-walkthrough` | M5 cognitive walkthrough with a first-time visitor persona. |
| `design-ux-researcher` | M5 usability findings and demo-path friction. |
| `design-visual-storyteller` | M5 case-study narrative and storyboard. |
| `engineering-technical-writer` | README, About copy, case-study text, disclaimers. |
| `gis-spatial-data-engineer` | M1 offline terrain/context/parcel preprocessing. |
| `gis-qa-engineer` | M1/M3 CRS, topology, north orientation and geometry fixtures. |
| `gis-cartography-designer` | M1 layer legend, north arrow, plan linework. |
| `research-synthesist` | M1 licensing/provenance; M3 independent sun reference. |
| `engineering-devops-automator` / `engineering-sre` | M5 static deployment, HTTPS, performance/resilience review. |
| `engineering-section-508-specialist` | M5 one-time accessibility audit. |

### 5.2 Situational

`engineering-codebase-onboarding-engineer` after a long break; `engineering-git-workflow-master` for repo/branch policy; `engineering-developer-tooling-engineer` for CI/scripts; `gis-bim-specialist` for one M2 terminology check; `engineering-database-reliability-engineer` only if IndexedDB migrations become non-trivial; `engineering-privacy-engineer` for a local-storage/telemetry review.

### 5.3 Explicitly excluded from v1

Payments/billing, auth/identity, WordPress/Drupal, Solidity, ServiceNow, Feishu/WeChat, GaussDB, embedded/electrical, drone photogrammetry, Elasticsearch, mobile/desktop release, i18n, multi-agent orchestration, and AI generation before M6.

### 5.4 Gates

| Gate | Owner | Evidence |
|---|---|---|
| G0 Architecture | `software-architect` | Module map, ADR, dependency list |
| G1 Code | `code-reviewer` | Review record in `docs/reviews/` |
| G2 Domain | `gis-qa-engineer` + implementer | Fixture tests, independent sun reference |
| G3 Visual | `ui-finish-gate-reviewer` | Screenshots vs design contract |
| G4 Acceptance | Lead + PRD checklist | Tests/build pass, QA rows, known limitations |

A specialist consult is time-boxed to 1–2 prompts and must return a named artifact. Do not run multiple agents on the same decision in parallel.

### 5.5 Background agents

Label an issue `agent:minimax` to hand it to the background pipeline (`.github/workflows/agent-minimax.yml`). The issue title and body are the task. Only the repository owner can start a run.

- **Brief:** Claude Opus, as `terraform-lead`, writes `docs/handoffs/agent-issue-<n>.md` in the §6 format and posts it on the issue.
- **Round 1** (`agent-round.yml`): MiniMax implements the brief and commits. A separate job checks the commits and pushes them to `minimax/issue-<n>`; a job with no secrets runs lint, unit tests and build; Opus, as `engineering-code-reviewer`, reviews the diff against §7 and posts the review on the issue.
- **Round 2**, only if round 1 was not approved: MiniMax addresses the findings, then the same check, push, checks and review.
- **Publish:** a pull request is opened only when Opus approves **and** lint, tests and build pass. The owner reviews and merges it; agents never merge.

Isolation, enforced by the workflows rather than by prompts:

- MiniMax runs with a read-only token and no Anthropic credential. It commits; it cannot push. Only `minimax/issue-<n>` is ever pushed.
- A change to `.github/`, `.claude/`, `.mcp.json`, `.env*`, `vercel.json`, `package.json`, `package-lock.json` or `.npmrc` fails the round. Such changes are made by hand.
- Opus never runs repository code, so agent-written code never shares a runner with the Anthropic credential.
- MiniMax's endpoint is set on the MiniMax steps only; other steps never send a key to it.

Repository secrets: `MINIMAX_API_KEY`; `ANTHROPIC_API_KEY` or `CLAUDE_CODE_OAUTH_TOKEN` for Opus; `AGENT_PR_TOKEN` (fine-grained, this repository, Contents: read and Pull requests: write) so `ci.yml` runs on the pull request. A pull request opened without it says that CI has not run.

In any issue or pull request, the owner can write `@opus <question>` or `@minimax <question>` to get an answer in the thread (`agent-talk.yml`).

---

## 6. Standard agent brief

```markdown
Role: <skill directory, e.g. engineering-senior-developer>
Project: Terraform v1 — architectural portfolio prototype.

Read first, in order:
1. AGENTS.md
2. docs/milestones/M<N>-<name>.md
3. PRD §<only relevant sections>
4. docs/design/design-contract.md (UI work only)
5. Relevant ADRs and docs/qa/fixtures.md

Milestone: M<N> only. Do not work ahead.
Goal: <one paragraph>
In scope: <3–6 bullets>
Out of scope: auth, payments, AI, backend, live GIS, MapLibre, new dependencies without an ADR.

Constraints:
- TypeScript strict; no `any` in domain schemas.
- Local East/North/Up metres; no lat/lon mesh vertices.
- Domain logic testable without React or Three.js.
- Preserve immutable site packages and provenance.
- No fabricated regulations or compliance claims.

Deliverable:
- <files to create/modify>
- <doc or ADR>
- <tests>

Done when:
- <acceptance criteria>
- npm run lint && npm run test && npm run build pass
- fixed-camera screenshots supplied when UI changed

Report: files changed, tests run, failures, known limitations, open questions.
```

Use the PRD acceptance prompt as the closing clause for every milestone (PRD §14, lines 557–559).

---

## 7. Definition of done

A task is done only when all applicable items are true:

- [ ] Scope matches the milestone brief; nothing unrelated was changed.
- [ ] Domain behaviour has unit tests with known fixtures.
- [ ] `npm run lint`, `npm run test`, `npm run build` pass.
- [ ] No new `any`, no unchecked `as`, no unvalidated persisted data.
- [ ] UI has keyboard focus states, labels and reduced-motion behaviour.
- [ ] Every visible control works or is explicitly marked as a later milestone and hidden from the release path.
- [ ] Numbers shown in UI derive from geometry/tests, not constants.
- [ ] Disclaimers and provenance remain visible where required.
- [ ] `docs/agent-log.md` and `progress.md` record the work.
- [ ] Screenshots captured for visual changes.

### Claim policy

Use: `Curated Oslo demo · simplified context`, `Illustrative design constraints`, `Local ENU metres`, `Geometric sun direction`.
Never use: `planning compliant`, `verified daylight`, `official parcel`, `BIM-ready`, `IFC deliverable`.

---

## 8. Memory and decision records

| File | Purpose |
|---|---|
| `task_plan.md` | Milestone phases, status, decisions, errors |
| `findings.md` | Research, versions, licences, technical discoveries |
| `progress.md` | Session log, commands, test results |
| `docs/agent-log.md` | Agent, goal, artifact, accepted/rejected, rationale |
| `docs/decisions/ADR-*.md` | Durable architecture decisions |
| `docs/reviews/*.md` | Code review and visual gate evidence |

Update `task_plan.md` after each phase and `progress.md` after each session. Log failed attempts, not just successes.

---

## 9. Do not

- Do not invoke the whole skill library. Use the roster.
- Do not let design agents write production code or engineers invent visual language.
- Do not let multiple agents make the same architecture decision.
- Do not run `design-persona-walkthrough` before a real M5 interface exists.
- Do not use AI, payments, auth or backend specialists before their milestone.
- Do not generate Oslo parcel or regulation data.
- Do not add a dependency, route or feature without an ADR.
- Do not refactor while fixing a bug; use `minimal-change-engineer`.

---

## 10. Current state and next action

**Done:** M0–M5 gates complete — the Vite/React/TypeScript scaffold, design tokens, landing/About, the studio shell and its focus-managed inspector, the coordinate contract, two validated static site packages built from OSM footprints and Kartverket DTM1 terrain, local ENU rendering, terrain/context/boundary layers, camera presets, compass/scale, the massing model with undo/redo, the sun and wind analyses (ADR-0014/0015/0021), measured roofs (ADR-0022), and the search → analyse → export simplification (ADR-0020). On top of that, ADR-0023 gave the curated packages Hektar-grade context: a 200 m halo, 520 and 230 individual context buildings, 926 and 251 mapped trees including street rows, and twelve land-cover kinds on both the curated and the import path. ADR-0024 keeps every tree off the painted water on both paths. ADR-0025 makes water a surface of its own — flat across its width, lying in the ground instead of on it — on both the curated and the import path. ADR-0026 gathers the studio's information in one column: one card per analysis (Sun, Wind, Noise) in the Parameters panel, the open card being the analysis on the map; the bottom analysis dock is gone; Back in the studio returns an imported site to the frame step it came from, on the same spot and frame size; and *Open in 3D* shows a determinate progress bar. ADR-0027 fixes the water's geometry on the import path: a river is recognised as a river (Kartverket's answers spell the elevation-curve source `hoydekurver`, so ADR-0025's rule had never run and every imported river was a 16–20 m wall of ground), and the frame's water outlines and mapped trees come from one OpenStreetMap answer per frame instead of the generalised z14 tiles and the unreachable Overpass instances. ADR-0028 lifts the wind analysis, and ADR-0029 makes the lift reach every whole metre: the solver solves at 2 m and wherever a roof ends near the circle, and every metre between is the covering solve scaled by the wind profile; ADR-0030 lets wakes above 2 m refill with air from above (a flat slice could not, so calm bands lay over buildings lower than the disc), with extra solves where the gap up to the roofs halves — the 2 m field is unchanged; a red handle on the analysis circle, or the 1 m slider in the Wind card, lifts the map — terrain-following, m/s above 2 m (comfort classes stay a 2 m statement), buildings below the disc faded, the caption naming the height (`docs/reviews/wind-lift-review.md`). CI runs lint, unit tests, build and the Playwright suite in three shards on every pull request; `main` accepts changes only through a pull request with green checks, and every e2e time budget scales with the runner (`e2e/budget.ts`).

**Next:** Phase B of `docs/plans/context-fidelity-plan.md` — building **parts** and relations. The curated builder reads building ways only, so a building drawn as a multipolygon relation or with `building:part` still arrives as one plain volume; the import path is capped at z14 by the OpenMapTiles schema. Also open: the `design-ui-finish-gate-reviewer` pass over `docs/screenshots/context-*.png`, `docs/screenshots/water-*.png`, `docs/screenshots/panel-*.png` and `docs/screenshots/wind-lift-*.png`, a sloped import-site capture of the wind lift, an import-path capture of the new land-cover taxonomy, tree shadows (which changes ADR-0021's limitation wording), and the M1/M2 follow-ups in `docs/reviews/M1-code-review.md` and `docs/reviews/M0-code-review.md`.

**Watch for:** density is a complexity change. Every analysis that scales with the building count has to be re-measured — the roof-solar scan and the noise screening both did (ADR-0023 §8). A live source is a moving target: read the answer, do not trust a name — Kartverket's source names and OpenStreetMap's endpoints both changed under the studio (ADR-0027).
