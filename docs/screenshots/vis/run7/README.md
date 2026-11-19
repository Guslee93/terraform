# Run 7 — Visual Lab preview screenshots

**Preview for review — not a baseline.** These are headed-Chromium captures of the Lab's identity
stages on Compact Infill, for the owner to review in the morning. They are not the pixel-identical
reference set (that stays in `docs/screenshots/vis/baseline/`, committed separately on the reference
machine).

- **Machine:** Apple MacBook (Apple M1 Pro), macOS 15.7.3, arm64.
- **Browser:** Chromium (Playwright), headed, `ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Pro)`.
- **Commit:** `70f39e3` (run7/identity-lab).
- **View:** Compact Infill, `isometric` preset, 1440×900 CSS px, canvas-only (no panel).

| File | URL |
|---|---|
| `nordic.png` | `/lab/compact-infill` |
| `stage-a.png` | `/lab/compact-infill?style=identity&stage=A` |
| `stage-b.png` | `/lab/compact-infill?style=identity&stage=B` |
| `stage-c-neutral.png` | `/lab/compact-infill?style=identity&stage=C` |
| `stage-c-wind.png` | `/lab/compact-infill?style=identity&stage=C&state=wind` |

To re-open the view, run `npm run dev` and visit the URL in the table.
