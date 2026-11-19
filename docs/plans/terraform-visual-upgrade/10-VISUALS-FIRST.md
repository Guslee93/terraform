# 10 — Visuals first

**Decided by the owner, 2026-11-19 (D23).** From now on the work is the look of the 3D world. Analysis graphics, exports, camera work and validation tasks are parked until the look is accepted. Claude Opus 5.5 implements; DeepSeek runs are paused. The target is `docs/design/identity-look-spec.md` and its six references.

## What stays true

- Production does not regress: the studio keeps `NORDIC` until the owner accepts the identity (V7). Every step is Lab-first (`/lab/:siteId`, local).
- No invented content (AGENTS.md §1.2): no fake people, boats or data. Analyses keep working; their *appearance* may change.
- No imagery is committed or published without Kartverket's permission (`docs/data/orthophoto-source.md`).

## How we work

1. One small step at a time, each ending with a **localhost preview** the owner can open (`http://localhost:5195/lab/compact-infill?style=identity…`) and a screenshot beside the closest reference.
2. The owner judges by eye and tunes with the Lab sliders; "Copy values" → Claude commits.
3. Branch `run7/identity-lab` (PR #29). Checks before every commit; NORDIC pixel safety net after scene changes.
4. The owner merges when a step is accepted; nothing is deployed until V7.

## Steps

| # | Step | What the owner sees | Builds on |
|---|---|---|---|
| **V1** | **Haze recedes** — distance darkens toward the frame edge, the tile edge disappears, trees fade with everything else (Run 10 T1–T3) | Overview with no visible edge, no glow | Runs 8–9 |
| **V2** | **Photo ground, local preview** — load an owner-made Norge i bilder screenshot of each site (allowed with credit) from a local, git-ignored folder; 80 % desaturated, aligned to the terrain | The references' look on our own sites, on the owner's machine only | V1 |
| **V3** | **Terrain and contours** — centre-aligned 1 m relief, smooth contour lines on slopes only (Run 10 T4–T5) | Clean hills, no squiggles | V1 |
| **V4** | **Trees** — speckled, see-through crowns; deciduous, conifer, birch; tuned against ref-02/-04 | Airy forest and street trees | V1 |
| **V5** | **Light** — soft overcast: a CC0 HDRI for ambient light (asset choice approved by the owner), sun from the Sun card, soft shadows, exposure | The references' calm light | V1 |
| **V6** | **Buildings, water, proposal** — warm matte white, contact shadows, slate water with a static sheen, cobalt proposal | Ref-01 / ref-06 city look | V2–V5 |
| **V7** | **Into the real studio** — the accepted look becomes the production style; charcoal frosted panel and analysis toolbar (TF-VIS-027, 047, 048); production must work first (TF-VIS-001 404 fix, merges) | The live site looks like the references | V1–V6, owner acceptance |
| V8 | Landing page imagery — licensed Nordic photography (TF-VIS-064) | Later | V7 |

Performance is measured at V1, V4 and V7 (orbit p95 within 10 % of `NORDIC`); identity code stays out of the production bundle until V7.

## Status (2026-11-19, evening)

| Step | State | Evidence |
|---|---|---|
| V1 Haze | **done, owner tuning** — tile edge invisible, mist builds gradually, background ≈ 2.4× brighter and a neutral grey-green (tone-mapping compensated) | PR #29 `1da9105`, `fc86e97`; `e2e/identity-edge.spec.ts` passes on both sites |
| V2 Photo ground | **next** — waiting for the owner's screenshots (local preview) | — |
| V3 Terrain and contours | built in Run 10 (centre-aligned relief, smoothed contours on slopes only); owner to judge | DeepSeek `138c5c8`, `3090064` |
| V4 Trees | partly: hazed, speckled crowns; still read as dark blobs at the city view | DeepSeek `93a463e` |
| V5–V8 | not started | — |

## Getting the aerial photo without paying

| Option | Cost | Quality | Can we publish it? | Status |
|---|---|---|---|---|
| **Norge i bilder, local screenshots** (terms allow screenshots with credit) | free | best (Norwegian orthophoto) | not as a 3D texture without permission | **use now for the Lab, on the owner's machine** |
| **Norge i bilder, with Kartverket's permission** | free (a request, not a purchase) | best | yes, on their terms | email drafted in `docs/data/orthophoto-source.md` |
| ArcGIS Location Platform (Esri World Imagery) free tier | free up to a monthly quota (2 M static basemap tiles at the time of writing), API key, attribution, fetched at runtime — not stored in the package | good | per Esri terms (to be checked) | fallback if Kartverket says no |
| Sentinel-2 (Copernicus) | free, open | 10 m pixels — too coarse near the site | yes, with attribution | far distance only |
| Scraping tiles or using them against their terms | — | — | **no** | ruled out |

## Next, in order

1. **V2a — local photo preview**: a git-ignored `public/local-ortho/` folder; the Lab picks up `<site>.png` if present, drapes it on the terrain, 80 % desaturated, with the credit line; nothing committed or deployed.
2. **V2b — alignment**: the owner's screenshot will not match the tile extent exactly, so the Lab gets two-point alignment (click two known corners) or a scale/offset slider, saved locally.
3. **V4 — trees** read as airy crowns at the city view (larger, lighter speckle, haze-matched).
4. **V5 — light**: soft overcast; choose a CC0 HDRI (owner approves the asset).
5. **V6 — buildings, water, proposal.**
6. **V7 — into the real studio**: needs the 404 fix, the reviewed merges and Kartverket's answer.

## Parked (not cancelled)

Gate 3 camera (030–036 except what V7 needs), Gate 4 analysis graphics (041–046, except the legend already built), Gate 5 rollout (050–055), Gate 6 exports (060–065, except 064 in V8), Gate 7 validation (070–074 run at V7 for the shipped look only), TF-VIS-021 fat lines, TF-VIS-009 visual gate of the old captures.

## Owner actions that unblock the most

1. Stop the paused DeepSeek run if it is still active (Claude takes over Run 10).
2. V2: two screenshots from norgeibilder.no, north up, covering each site's tile —
   Compact Infill centre **59.9235 N, 10.7580 E**, about **624 × 734 m**;
   Sloped Edge centre **59.89825 N, 10.77375 E**, about **652 × 790 m** —
   saved outside the repository (e.g. `~/Downloads/terraform-ortho/`).
3. Send the Kartverket request (draft in `docs/data/orthophoto-source.md`) before V7, because publishing needs it.
4. V7: the 404 fix and merging the reviewed PRs.
