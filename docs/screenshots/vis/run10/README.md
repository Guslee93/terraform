# Run 10 — previews for the owner

**Preview for review, not a baseline.** These are headed, full-window screenshots of the identity look
at the end of Run 10, captured for the owner to judge against the reference images. They will change as
the identity is tuned.

- **Machine:** Apple MacBook Pro, Apple M1 Pro. **GPU:** `ANGLE Metal Renderer: Apple M1 Pro`.
- **Browser:** Playwright Chromium, headed, 1440 × 900.
- **Commit:** `62e918b` on `run7/identity-lab`. The light-grey mist and the D41 massing fix are in.
- **Aerial photo: switched off.** The local Kartverket photo is not committed (licence pending, D13).
  The Aerial photo card is collapsed so it does not cover the view.
- **How to reproduce:** from `../Terraform-run7`, run `npm run dev`, then open these URLs:

```text
/lab/compact-infill?style=identity&stage=C&state=neutral&preset=isometric
/lab/compact-infill?style=identity&stage=C&state=neutral&preset=overview
/lab/sloped-edge?style=identity&stage=C&state=neutral&preset=isometric
/lab/sloped-edge?style=identity&stage=C&state=neutral&preset=overview
/lab/compact-infill?style=identity&stage=C&state=wind&preset=isometric
```

| File | What it shows |
|---|---|
| `compact-infill-isometric.png` | Compact Infill, stage C, isometric |
| `compact-infill-overview.png` | Compact Infill, stage C, whole-tile overview |
| `sloped-edge-isometric.png` | Sloped Edge, stage C, isometric |
| `sloped-edge-overview.png` | Sloped Edge, stage C, whole-tile overview: the outer boxes stand crisp in the mist (RUN10-log owner question 1) |
| `compact-infill-wind.png` | Compact Infill, stage C, wind state |

**Compared with Run 9:**
- the mist and background are light grey (owner, 2026-11-24) instead of dark green;
- the vignette is softer (0.1);
- the trees are airy (V4);
- the sloped-edge context houses are visible.
