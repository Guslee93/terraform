# Identity look spec — the 3D world

**Status:** owner-approved target, 2026-11-19. Refines `docs/plans/terraform-visual-upgrade/09-VISUAL-IDENTITY-INTEGRATION.md` (§4, §7) and the owner's art-direction brief (`Terraform_Visual_Identity_FINAL.md`, kept outside the repository). Supersedes `scene-look-plan.md` (the October white-model look) for the identity style. Production keeps `NORDIC` until TF-VIS-027.

**References:** `docs/design/references/identity/ref-01.webp` … `ref-06.webp`, supplied by the owner. They are **illustrative targets, not screenshots of the product**, and probably AI-generated: their places, people, boats and details are invented. Match their *look*, never their *content*. The analysis panels in ref-01, -03 and -06 are not part of this spec.

| Ref | What to take from it |
|---|---|
| 01 Vippetangen, sun | Orthophoto ground, white blocks, dense realistic trees along streets, one cobalt proposal |
| 02 coastal village | Haze + vignette, airy speckled forest on slopes, faint white contours on hills, slate water |
| 03 harbour quarter | Warm low sun with long soft shadows (the exception, not the default) |
| 04 river valley | Valley haze, fields, rock outcrops, river, contours only on slopes |
| 05 skerries | Overcast, snow patches, conifers + bare birches, slate sea, islands fading into mist |
| 06 river district, wind | City density, white detailed blocks, data-driven flow lines in cyan on a muted world |

## 1. The look in one paragraph

A **mid-to-low-key** Nordic landscape: muted moss, granite and slate under soft overcast light, fading into grey-green haze and a darker vignette toward the frame edges. The **white buildings are the brightest thing in the frame** — that is where the image's brightness comes from, not from a light ground. Relief is real and legible. Trees are tree-shaped but airy, their crowns speckled and see-through. Colour is present but heavily muted. Nothing is theatrical: no spotlights, no visible sky, no glow.

## 2. Palette (sampled from the references)

Means of 24 × 24 px patches. Starting values for the Lab, not final tokens.

| Element | Sampled range | Note |
|---|---|---|
| Frame edges / vignette | `#1B2220`–`#1D2522` | near-black green; the brief's `#171B19` is close |
| Far haze | `#232A25`–`#2C3431` | distance fades **to this**, not to black |
| Forest | `#282E27`–`#3A4034` | deep moss |
| Fields / meadow | `#323732` | slightly lighter, warmer than forest |
| Rock | `#2E3231`–`#565752` | granite grey |
| Water | `#3E494A`–`#636968` | slate; a touch **lighter** than the forest, with a faint sheen |
| Buildings (patch mean incl. shade) | `#999999`–`#C2C2C1` | lit faces brighter (about `#E2E1DC`–`#ECEBE6`, estimated); warm off-white |
| Proposal | cobalt, as ref-01/-06 | selection/proposal only |

Luminance relationship that matters more than any hex: buildings ≈ 3–4 × the ground; ground and forest close together; haze slightly lighter than the near forest; frame edges darkest.

## 3. Elements

**Ground.** The orthophoto, ≈ 80 % desaturated, carries most of the look (fields, paths, rock, shorelines). Until its licence is cleared (TF-VIS-028a), the Lab uses the land-cover fallback re-coloured to this palette — accepted as a stand-in, not to be tuned to perfection.

**Relief.** Draw the terrain from the 1 m tile on curated sites (decimated as needed); the 16 m grid is too coarse for rock and slopes. Imports keep their own terrain.

**Contours.** Fine pale-white lines, faint, visible mainly on slopes; minor lines fade with distance; never louder than the ground texture.

**Buildings.** Matte, warm off-white, crisp edges, soft shadows, contact occlusion. Gabled roofs come from the measured roofs (already in the data). No windows, no lit interiors (ref-05's lit windows are not reproduced).

**Trees** — the main correction to Run 7/8. "Point-cloud-inspired" means **real tree shapes with airy, speckled crowns**: a trunk and crown silhouette (rounded deciduous, conical conifer, sparse birch), the crown rendered partly see-through with fine light flecks so the ground shows through and forests read as connected bodies without becoming solid blocks. Muted green, not white; slightly lighter speckle on the lit side. Static. Positions from OpenStreetMap; any forest fill is labelled illustrative.

**Water.** Slate, flat (ADR-0025 geometry unchanged), with a **static, subtle sheen** (low specular / slight roughness variation). No animation, no waves, no reflections of buildings.

**Light.** Soft overcast by default: HDRI-style ambient fill (Room environment until a licensed HDRI is chosen), the sun from the Sun card's date and time, shadows soft and readable. Low warm sun (ref-03) appears only when the Sun card's time produces it.

**Atmosphere.** Aerial perspective: with distance from the site, **everything** — ground, trees, buildings — loses contrast toward the haze colour; the frame edges darken (vignette). No hard cut, no black void, no visible tile edge. The site and the analysis circle stay crisp.

**Exposure.** One Lab control for overall exposure, so the owner sets the final brightness by eye.

## 4. Deliberately not reproduced

People, boats, trams, cars, parasols, lit windows, snow on the ground (unless a future analysis supplies it), invented landmarks, or any detail without data behind it (AGENTS.md §1.2). Our real sites — dense Oslo blocks — will look plainer than these picture-postcard references; that is expected.

## 5. Changes to existing rules

| Rule | Change |
|---|---|
| 03 §3.6 "Water: flat, no reflections, no animation" | Allow a static sheen; animation and reflections stay out (decision D22) |
| Brief "dark, higher-contrast world" | Read as mid-to-low key with bright buildings and haze, exposure owner-tuned (D22) |
| 09 §4 R4 / TF-VIS-029 "point clusters" | Tree-shaped instances with speckled, see-through crowns (D22) |
| 09 §4 R6 / TF-VIS-02A dissolve to background | Haze colour + vignette; buildings and trees fade with the ground (D22) |
