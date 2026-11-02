# D35 — M4 persisted-document fixtures (DeepSeek work order)

Role: QA / fixtures. Project: Terraform v1, milestone **M4** (scenarios and persistence).

**Where to work:** the worktree `/Users/gustavekamanzi/Downloads/2026/Terraform-d35`, branch `deepseek/d35`, which is already created from `main` at `e4dcf8c`. Run `npm ci` there first. **Do not** work in, or switch branches in, `/Users/gustavekamanzi/Downloads/2026/Terraform`: Claude is editing it at the same time. Commit on your branch when done, with a conventional message, and don't merge.

The plan and this work order are not committed yet, so read them from the main checkout by absolute path:
1. `AGENTS.md` (in your worktree)
2. `/Users/gustavekamanzi/Downloads/2026/Terraform/docs/plans/M4-plan.md`. Its §4 decisions 1–4 and §5 contracts are your spec. Claude is writing `docs/decisions/ADR-0011-*.md` in the main checkout at the same time; if it exists when you start and disagrees with the plan, ADR-0011 wins.

Your worktree's code is the **pre-M4 (v1)** code. That's intended: `stepped-v1.json` must be real v1 serialiser output. When Claude merges your branch, the v1-parsing checks in `fixtures.test.ts` will be moved onto the new migration function; you don't need to anticipate that.
3. `docs/milestones/M4-scenarios.md`
4. `src/features/massing/{types,serialize,factories,validation}.ts`

## Goal

Create the persisted-document fixtures M4's migrations, repository and e2e tests will load. These fixtures are evidence, so they must be generated from the real code wherever possible, never typed from memory.

## Deliverables

All files go under `src/features/scenarios/__fixtures__/`, plus a `README.md` with one line per file saying what it proves.

| File | Content | How to make it |
|---|---|---|
| `stepped-v1.json` | One scenario, one volume with the stepped fixture (lower 20 × 10 m × 3 storeys at 3.2 m; upper 10 × 8 m × 2 storeys at base 9.6 m) | Write a small script, `generate.ts`, run with `npx tsx` or vitest. It builds the document with `createScenario`/`createVolume`/`createTier` (fixed ids) and writes `serializeScenario(doc)`. |
| `stepped-v0.json` | The same JSON with the `schemaVersion` key removed | Derived by the same script |
| `stepped-v2.expected.json` | What migration to v2 must produce: the v1 fields unchanged, plus `notes: ""`, `createdAt` and `updatedAt` both `"2026-11-02T00:00:00.000Z"` (the injected clock value), no `camera` key, and `schemaVersion: 2` | Write by hand from plan §4 decision 1, then read it against the plan |
| `corrupt-truncated.json` | `stepped-v1.json` cut off mid-array (invalid JSON) | Script |
| `corrupt-shape.json` | Valid JSON, but a tier with no `footprint` | Script |
| `invalid-geometry.json` | Valid shape, but a self-intersecting (bow-tie) footprint, which `validateScenario` rejects | Script; assert in the script that `validateScenario` reports an issue |
| `newer-version.json` | `stepped-v1.json` with `schemaVersion: 99` | Script |
| `project-index.json` | `ProjectRecord` v2 for `compact-infill` with two `scenarioIds`, one of which has no matching scenario file | By hand from plan §5 |
| `export-bundle.json` | The project export shape from plan §5 (`schemaVersion`, provenance `{ siteId, appVersion, exportedAt }`, project, scenarios) holding Concept A (the stepped mass) and an empty Concept B | By hand; the round-trip test will use it |

Also add `fixtures.test.ts` next to the fixtures with **only checks that work today**:
- `stepped-v1.json` parses with `parseScenarioDocument`.
- Every "corrupt" or "invalid" file is rejected by `parseScenarioDocument`, with the error path you expect.
- The v0 file is v1 minus `schemaVersion`, and nothing else differs.

Do not test migration; that code doesn't exist yet (S1).

## Rules

- **Don't touch** `src/features/**` outside `__fixtures__/`, or `src/components/**`, `src/scene/**`, `e2e/**`, `package.json`. No new dependencies; if `tsx` isn't available, generate through a vitest test that writes the files once (then delete the writer or guard it behind an env var).
- Fixed ids and timestamps only, so fixtures are deterministic.
- If the plan is ambiguous, write the question in `README.md` under "Open questions" rather than guessing.

## Done when

- `npm run lint` and `npm run test` pass.
- The README lists every file.
- Commit message ends with your attribution line.
- Add a row to `docs/agent-log.md` (agent, goal, artifact, "Pending Claude review").
