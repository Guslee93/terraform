# D24 — P3 import e2e with mocked network — DeepSeek work order

Role: test and evidence engineer. Project: Terraform v1, an architectural portfolio prototype.

Read first, in order:
1. `AGENTS.md`
2. `docs/handoffs/C6-P3-find-and-frame.md`. Its **UI contract** table gives the exact roles and names to select by.
3. `src/features/import/__fixtures__/README.md`, plus `tiles/README.md` and `terrain/README.md`
4. `e2e/smoke.spec.ts` and `e2e/m4-helpers.ts` for house style
5. `playwright.config.ts`

Codex is building the `/new` page at the same time on the branch `m6/p3-find-frame`. Write your spec against the UI contract, not against Codex's code. Work in your own worktree, `../Terraform-d24`, on the branch `deepseek/d24`, cut from `main`. Touch only `e2e/import.spec.ts` and `e2e/import-helpers.ts`.

## Goal

`e2e/import.spec.ts` drives the import flow fully offline. Every external request is intercepted with `page.route` and served from the recorded fixtures. Any unmocked external request fails the test. Route `**/*` and abort anything whose host is not localhost or 127.0.0.1, after the specific mocks are registered.

## Mocks

| Pattern | Serve |
|---|---|
| `https://photon.komoot.io/api/**` | `photon-grunerlokka.json` |
| `https://ws.geonorge.no/adresser/v1/sok**` | `kartverket-adresse.json` |
| `https://tiles.openfreemap.org/planet` | `tiles/tilejson.json`. Check that its `tiles[0]` template is the URL you mock next. |
| the tile template from `tilejson.json` | `tiles/14-x-y.pbf` when recorded, otherwise an empty 200 body with `application/x-protobuf` |
| `https://tiles.openfreemap.org/styles/**`, `fonts/**`, `sprites/**` | a minimal valid MapLibre style JSON (`{"version":8,"sources":{},"layers":[]}`), with 404 for glyphs and sprites |
| `https://ws.geonorge.no/hoydedata/v1/punkt**` | Build the response from `terrain/grunerlokka.json`. Read `terrain/README.md` for the response shape. The importer asks for a 13 × 13 grid, so the fixture may need to be shaped per request. Read `parseKartverketSamples` in `src/features/import/terrain.ts`. |
| `https://s3.amazonaws.com/elevation-tiles-prod/**` | 404 |

## Cases

1. **Happy path.** Open `/`, click the link `Start from any address`, then the quick pick `Oslo (Grünerløkka)`, then `Load in 3D`. All five progress items reach `Done` or `Skipped`. The URL matches `/studio/import/`. The studio shows the 3D canvas and the text `heights partly estimated`.
2. **Search.** Type `Thorvald Meyers` into the combobox `Search for an address or place`, choose the first option with the keyboard (ArrowDown, Enter), and assert that the listbox closes.
3. **Frame size.** Pick the `600 m` radio and assert that the readout shows `600 × 600 m`.
4. **Cancel.** Delay the tile route by 3 s, click `Load in 3D`, then `Cancel import`. Assert `Import cancelled` and that `Load in 3D` is enabled again.
5. **Terrain failure.** Return 500 from both terrain endpoints. The import either succeeds with a terrain warning or shows an `alert` with `Try again`. Assert whichever the importer does; read `assemble.ts` to know which, and do not guess.
6. **Missing import.** Open `/studio/import/does-not-exist` directly. Assert the heading `This imported site is no longer available` and the link `Import it again`.
7. **Keyboard.** From `/new`, use only Tab and Enter to reach and press a quick pick, the `400 m` radio and `Load in 3D`.

## Done when

- `npx playwright test e2e/import.spec.ts` passes after the Codex branch is merged in locally. Merge it in your worktree for the run, and do not commit the merge. If Codex has not finished, commit the spec and say it is unverified.
- No sleeps longer than the 3 s delay in case 4. Use web-first assertions.
- The existing e2e specs are unchanged.
- Commit on `deepseek/d24`. Do not push. Report in `docs/handoffs/D24-report.md`: pass/fail output, any contract mismatch you found (name the element), and anything you could not mock.
