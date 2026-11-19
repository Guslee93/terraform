# Run 5 — progress ledger

Run book: the Run 5 brief (one task — find why WhiteboxTools fills the west outlet channel, H4).
Statuses: `todo`, `in progress`, `done`, `partial`, `blocked`.

## Run summary

**T1 done. Conclusion (b) — WhiteboxTools behaviour, not an input mismatch and not a `runoff.ts`
defect.**

- **Evidence in three lines.** (1) The exported `.asc` is bit-identical to Terraform's ground (max
  |difference| = 0, 0 cells > 0.5 mm), so WhiteboxTools read the same input. (2) Terraform drains
  (626,81) north-west to the **west** edge cell (550,0) at −18.68 m (96 cells); WhiteboxTools fills
  that whole path — edge mouth included — to −18.44 m. (3) On a minimal crop (rows 500–733, cols
  0–140), WhiteboxTools v2.4.0 (macOS) still fills (626,81) to −18.44 m with/without `--fix_flats`,
  rounded-to-cm, 6-decimal, and even with a NoData fence.
- **.asc-vs-ground max difference: 0** (exact).
- **Barrier cell:** (550,0) — WhiteboxTools fills the west-edge mouth (col 0, rows 545–555) from
  −18.51…−18.68 m up to −18.44 m instead of draining off the edge; the −19.01 m south-edge cell is a
  different channel.
- **Isolation:** −18.44 m in every run (with/without `--fix_flats`, rounded, 6-decimal, NoData
  fence), all macOS v2.4.0; the Linux Run-0 build was not available.
- **Bare/offset counts:** H4 fill 12/11/11 (standard/bare/offset), H1 17/15/17, H2 14/15/15, H3 2/2/2,
  edge 1/1/1, unexplained 0/0/0.
- Corrected "south-east" → "south-west" and the −18.68 m vs −19.01 m statement in the diagnosis doc
  (and RUN4-log/agent-log). Rule-1 percentages unchanged.

**Questions for the owner:** none new — keep/widen/replace rule 1 remains the owner's call.

## Environment

- macOS arm64 (Node v22). WhiteboxTools v2.4.0 (macOS build) at `/tmp/wbt`.

## Tasks

| # | Task | Status | Commit(s) | Checks run (last lines) | Open items |
|---|---|---|---|---|---|
| T1 | TF-VIS-007 find the WhiteboxTools channel-fill cause | done | _(this branch)_ | `.asc`==ground max 0; crop isolation −18.44 m in all 5 variants | none |

## Questions for the owner

- See Run summary.

## Session notes

- 2026-11-19 — T1 **done**. Root cause is WhiteboxTools' own fill behaviour (fills the west channel
  to −18.44 m instead of draining off the west edge). `diagnose.ts` extended to `RUNOFF_VARIANT`.
  Doc corrected (south-west; −18.68 m vs −19.01 m). Run 5 complete.
