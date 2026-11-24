# ADR-0041 — the free Sentinel-2 ground and the misty, blurred vignette

**Preview for review, not a baseline.** These are headed, full-window screenshots of the Visual Lab's
IDENTITY style after ADR-0041.

- **Machine:** Apple MacBook Pro, Apple M1 Pro. **GPU:** `ANGLE Metal Renderer: Apple M1 Pro`.
- **Browser:** Playwright Chromium, headed, 1440 × 900.
- **Ground image:** *Sentinel-2* (Kartverket's cloudless mosaic, open data, CC BY 4.0). The credit is
  shown in the Ground card in every image.
- **Mist:** strength 0.6, blur 14 px, clear centre 0.45 (the defaults). The aerial haze no longer
  acts inside the tile; only the tile edge dissolves.
- **How to reproduce:** from `../Terraform-run7`, run `npm run dev`, then open the five Run 10 URLs
  (`docs/screenshots/vis/run10/README.md`) and choose *Sentinel-2* in the Ground card.

| File | What it shows |
|---|---|
| `compact-infill-isometric.png` | Compact Infill, stage C, isometric |
| `compact-infill-overview.png` | Compact Infill, stage C, whole-tile overview |
| `sloped-edge-isometric.png` | Sloped Edge, stage C, isometric: the context houses keep their volumes |
| `sloped-edge-overview.png` | Sloped Edge, stage C, whole-tile overview |
| `compact-infill-wind.png` | Compact Infill, stage C, wind state |
