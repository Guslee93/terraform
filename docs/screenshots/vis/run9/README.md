# Run 9 — previews for the owner

**Preview for review — not a baseline.** These are headed, viewport-only screenshots of the current
identity look, captured for the owner to judge against the reference images. They are not pixel
baselines and will change as the identity is tuned.

- **Machine:** Apple MacBook Pro, Apple M1 Pro (Metal GPU).
- **Browser:** Chromium 156, headed, 1440 × 900.
- **Commit:** `a1c9ea3` on `run7/identity-lab`.
- **How to reproduce** (from `../Terraform-run7`, with `npm run dev`):

```text
http://127.0.0.1:5173/lab/compact-infill?style=identity&stage=C&state=neutral&preset=isometric
http://127.0.0.1:5173/lab/compact-infill?style=identity&stage=C&state=neutral&preset=overview
http://127.0.0.1:5173/lab/sloped-edge?style=identity&stage=C&state=neutral&preset=isometric
http://127.0.0.1:5173/lab/sloped-edge?style=identity&stage=C&state=neutral&preset=overview
http://127.0.0.1:5173/lab/compact-infill?style=identity&stage=C&state=wind&preset=isometric
```

| File | What it shows |
|---|---|
| `compact-infill-isometric.png` | Compact Infill, stage C, isometric |
| `compact-infill-overview.png` | Compact Infill, stage C, whole-tile overview |
| `sloped-edge-isometric.png` | Sloped Edge, stage C, isometric |
| `sloped-edge-overview.png` | Sloped Edge, stage C, whole-tile overview |
| `compact-infill-wind.png` | Compact Infill, stage C, wind state |

## Comparison against the references

This run's model has no image input, so I could not compare these previews with `ref-01` … `ref-06`
by eye. The look spec's prose and sampled palette were followed in code instead; the owner should
judge the visual match. Known differences from the references, per the look spec §4: no orthophoto
(licence not cleared — the land-cover palette stands in), no people/boats/lit windows, and the real
Oslo sites will read plainer than the picture-postcard references.
