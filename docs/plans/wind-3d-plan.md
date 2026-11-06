# Plan — 3D-looking wind (Forma reference)

**Status:** proposal, awaiting owner go-ahead · **Date:** 2026-11-06 · **Builds on:** ADR-0014, `docs/research/forma-wind-notes.md`

## 1. What the two Forma images show

| | Image 1 ("detailed" look) | Image 2 ("rapid" look) |
|---|---|---|
| Streamlines | Full 3D: climb windward faces, run over roofs, wrap round and drop into the street | Flat lines at **one chosen height** ("Streamline height" slider) + opacity slider |
| Heatmap | On **roofs** as well as the ground | Ground **and low roofs**, smooth contour bands, hard edge at the circle |
| Ramp | m/s, white → blue → purple → magenta (1–10) | same |
| Other | — | Wind rose + Weibull speed curve (needs climate data) |

## 2. How Forma most likely does it (inference, not documented internals)

- **Detailed wind** is a real 3D CFD run in the cloud (the "30–90 min" button in the video). The streamlines in image 1 are traced through that 3D velocity field.
- **Rapid wind** returns in seconds. Autodesk has described it as a machine-learning model trained on CFD results. It predicts speed on *evaluation surfaces*: ground and roofs, offset about 1.5–2 m above each. The streamlines are traced in a horizontal plane at the slider height.
- The "3D feel" therefore comes from three cheap tricks plus one expensive one. The tricks: values evaluated *above every surface* (ground and roofs), streamlines lifted to a chosen height, and smooth colour. The expensive one is real 3D CFD, and only the detailed run has it.

## 3. Terraform approach: same tricks, honest physics

We already have a 2D slice solver at pedestrian height. Extend it in layers:

### A. Height slices ("2.5D") — gets the image 2 look
- Solve the 2D flow at a few heights, e.g. z = 2, 10, 20 and 35 m. At height z, a building is an obstacle only if it is **taller than z**. So low buildings disappear from upper slices and wind passes over them — the core 3D effect.
- Scale each slice's inlet with the standard urban wind profile u(z) = u_ref · (z/10)^0.22 (power law, named constant, cited as indicative).
- Cost: N × the current 25k-cell solve. Solve the ground slice live; solve upper slices after it settles (each about 5 s in the worker), and cache them by circle and direction.
- **Roof heatmap:** colour each roof from the slice just above its height. **Streamline height slider:** trace in the nearest slice and draw the lines at that height. **Streamline opacity** slider.

### B. Pseudo-3D streamlines — gets the image 1 look
- Trace in the slice stack: horizontal velocity is interpolated between slices. When a streamline meets a building it can't pass at its height, it **rises** over the roof if the next slice up is open there, and goes round if not. After the obstacle it relaxes back down. The vertical component is a rule driven by the height field, not solved physics, so it is labelled the same way as downwash.
- Draw as tubes or thick lines coloured by speed with the Forma-like ramp. Seeds go on an upwind line across the circle at 2–30 m.

### C. Optional: real 3D "Detailed run"
- D3Q19 lattice-Boltzmann over the circle (about 96 × 96 × 24 cells at 3 m). On the CPU worker that is roughly **1–2 min** per direction (estimate from the measured 2D speed × 19/9 × cell ratio); on WebGPU it would be seconds. A "Run detailed (≈ 1–2 min)" button with progress, the same pattern as Forma.
- It gives real 3D streamlines and real downwash (the downwash *rule* could then be retired for that view). It needs an ADR (WebGPU path or long CPU run) and 3D validation cases.

### D. Look and feel, whatever we build
- Smooth heatmap: replace the 4 m instanced squares with one `DataTexture` on a terrain-draped disc (bilinear), plus optional contour banding. Roofs get the same shader.
- A Forma-like m/s ramp bar at the bottom of the viewport in Direction view (white → blue → purple → magenta). Comfort keeps the Lawson classes.
- Wind rose + Weibull curve only once real data exists (MET Norway Frost); otherwise not shown.

## 4. Phases, owners, size

| Phase | Scope | Owner | Size |
|---|---|---|---|
| W5a | Slice stack in `flowRunner` (masks by height, power-law inlet, cache) + tests (upper slice ignores low blocks; profile values) | Codex | M |
| W5b | Roof heatmap + streamline height/opacity sliders + smooth DataTexture heatmap + m/s ramp bar | Codex (after W5a) | M |
| W5c | Pseudo-3D streamlines (rise over / go round), tube rendering, labelled as a visual rule | Claude (solver-adjacent) | M |
| W5d | Validation: slice cases (wind over a low block, around a tall one), screenshots matching both Forma views | MiniMax | S |
| W6 (optional) | D3Q19 "Detailed run" + ADR + 3D validation | decide after W5 | L |

Order: W5a → (W5b ∥ W5c) → W5d. W6 only if W5 doesn't satisfy the portfolio goal.

## 5. Claims (unchanged policy)
Label: `Indicative wind screening — layered 2D flow, not engineering`. The pseudo-3D rise/fall and downwash are labelled as rules. "Detailed run" (if built) is still screening, never CFD-grade or verified.
