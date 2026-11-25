# Review — Run 1 T8–T10 (PR #25 @ `d9065b4`)

- **Reviewer:** Claude Opus 5.5 (independent of the implementer, DeepSeek V4 Pro via Cline)
- **Date:** 2026-11-18
- **Scope:** `d2ca2ea` TF-VIS-015 Visual Lab + ADR-0040; `517e3b4` TF-VIS-034 ground-click arbitration; `57e5436` TF-VIS-016 design inventory. T0–T7 were not re-reviewed here.

## Checks re-run by the reviewer

| Check | Result |
|---|---|
| `npm run typecheck` | pass |
| `npm run lint` | pass |
| `npx vitest run` | 1 234 passed, 4 skipped, 1 todo (matches the ledger) |
| `npm run build` | pass |
| `node scripts/check-no-lab-chunk.mjs` | "No LabPage reference in 70 production files"; no Lab file in `dist/assets` |
| `LAB=1` e2e, VISUAL=1 specs | **not re-run** (ledger reports `visual-lab.spec.ts` 1 passed) |

## Verdict

**Approve with minor follow-ups.** No correctness defect found.

## Findings

1. **TF-VIS-034 is behaviour-preserving.** Traced all 16 input combinations against the old `onGroundClick`: same calls in the same order, including "pick parcel then deselect" when the parcel layer is on, not drawing and editable. No action.
2. **Minor — the Lab gate test checks a copy, not the gate.** `isLabEnabled()` in `src/app/App.tsx` repeats the inline `import.meta.env.DEV || import.meta.env.VITE_LAB === '1'` that actually guards the route (the inline form is needed for tree-shaking). `lab.test.tsx` tests the copy, so the two can drift. The real production guard is `scripts/check-no-lab-chunk.mjs`, which is not in `package.json` or CI. **Fix:** run the script in CI after the build step (or as `postbuild`), so a regression fails a pipeline instead of relying on someone running it.
3. **Minor — the chunk check reads file contents only.** It would also be cheap to fail on any `dist/` file whose *name* contains `LabPage`. Optional.
4. **Doc accuracy — `docs/design/visual-inventory.md` road row.** Marks the road colour "replaced (roads as a layer)". 09 does not decide that roads are removed; mark it **changes** (R1/R6) until TF-VIS-020 shows roads on the orthophoto.
5. **Note — the Lab reuses `aria-label="Studio viewport"`.** `ExportVisuals` finds the canvas by that selector (01 §7). Harmless while the Lab and the studio are separate routes; keep it that way, or rename if the Lab ever embeds studio exports.

## Answers proposed to the run's owner questions

1. T0 attribution: keep "Claude (Cline)" — it is what ran.
2. Lawson "Uncomfortable" labels: owner decision D2 (08); the `it.todo` is the right holding state.
3. Lab local-only: yes, per 09 D19 until the orthophoto licence (D13) clears.

## Still the owner's

The M1 Pro commands in `docs/handoffs/RUN1-log.md` (reference captures twice + compare; VISUAL=1 baselines). PR #25 stays a draft until those run and the owner merges it into `build/foundation`.

## Follow-ups applied (2026-11-18)

- Finding 2: `.github/workflows/ci.yml` runs `node scripts/check-no-lab-chunk.mjs` after `npm run build`.
- Finding 4: inventory road row marked **changes** (R1/R6).
- Finding 3 left optional; finding 5 is a note.
