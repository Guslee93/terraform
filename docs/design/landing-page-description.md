# Terraform main page — description

Written 3 November 2026 from the live production page (terraform-studio-murex.vercel.app) at 1440 × 900 and 375 px wide, plus `src/app/LandingPage.tsx` and its components. It describes the page exactly as it is today, as a starting point for changes. The last section lists things that stood out.

---

## 1. Purpose and tone

The main page is the front door to a portfolio prototype. It has three jobs:

1. Say what the tool is in one sentence.
2. Get the visitor into the studio in one click.
3. Be honest about what is simulated.

The tone is calm, editorial and architectural: lots of space, thin type, grey on grey, and almost no colour or imagery apart from line drawings.

---

## 2. Global style on this page

- **Background:** one flat warm grey (`#E4E4E1`) for the whole page. Sections are separated only by thin horizontal hairlines (`#D9D9D5`) that run the full width.
- **Content width:** 1200 px maximum, centred, with 28 px side padding (16 px on phones).
- **Cards:** slightly lighter grey (`#F1F1EF`) with a 10 px radius, no shadow, and a slightly lighter hover colour.
- **Type** (Geist and Geist Mono):
  - **Headline:** 64 px, weight 300 (light), very tight letter spacing (−6 %).
  - **Section headings:** 28 px, weight 300.
  - **Card titles:** 17 px, medium weight.
  - **Body:** 13–14 px, in secondary grey `#646461`.
  - **Eyebrows / small labels:** 11 px, in sentence case, not uppercase.
- **Buttons:** the primary button is a solid black pill (8 px radius) with white text and a ↗ arrow. Secondary actions are underlined text links.
- **Colour:** essentially none. Black, white and greys, with a faint blue on the hero drawing's parcel and pale green and blue in the site thumbnails.
- **Motion:** colour transitions on hover only (200 ms). No scroll animations.

---

## 3. Section by section (top to bottom)

### 3.1 Skip link

A visually hidden "Skip to content" link appears top-left when you press Tab, as a black chip.

### 3.2 Header (72 px tall, same grey as the page, no border)

- **Left:** a black diamond (a rotated square) followed by **Terraform** in 14 px medium. It links home.
- **Right:** a primary nav with three items:
  - **Sites:** grey; jumps to the site cards.
  - **About:** grey; goes to the About page.
  - **Open demo ↗:** black and underlined; opens the Compact Infill studio.

### 3.3 Hero (two columns on desktop, stacked on phones)

**Left column:**

- **Eyebrow:** "Oslo · Architectural site study" (11 px, grey).
- **Headline,** on three lines, very large and light:
  > Explore a site.
  > Shape a concept.
  > Understand the impact.

  At 1440 px wide, "Understand the impact." wraps onto two lines.
- **Intro paragraph** (grey, about 46 characters wide): "A browser workspace for testing conceptual massing against terrain, daylight and clearly labelled demo constraints. No login, no black box."
- **Buttons:**
  - **Open Compact Infill ↗:** black primary button.
  - **About the prototype:** an underlined text link next to it. On phones the two stack and become full width.
- **Footer line:** a thin hairline, then "Curated Oslo demo · simplified context" in small grey text.

**Right column: the hero figure.** A rounded light-grey card that looks like a sheet from a drawing set:

- **Card header row:** "Site study · Concept A" on the left and "Isometric" on the right, separated from the drawing by a hairline.
- **Drawing area (4:3):** a hand-authored **SVG line drawing**, not a live 3D render. It shows:
  - an isometric cluster of off-white boxes, the context buildings;
  - a taller stepped block labelled "CONCEPT A · 6 STOREYS";
  - a dashed blue footprint labelled "CURATED PARCEL 01";
  - wavy contour lines across the bottom for terrain;
  - a small round **north arrow** top-right;
  - the title block text "OSLO / SITE STUDY · CURATED DEMONSTRATION" in tiny mono capitals, top-left.
- **Card footer row:** "Terrain · Parcel · Massing" on the left and "Illustrative — not surveyed" on the right.

### 3.4 Demonstration sites (`#sites`)

A hairline, then:

- **Header row:**
  - **Left:** the eyebrow "Demonstration sites" and the heading **"Choose a site to begin."**
  - **Right:** a short grey paragraph: "Both packages are prepared offline and shipped with the app. Each includes terrain, simplified context, a parcel boundary and explicitly hypothetical constraints."
- **Two site cards side by side** (stacked on phones). The whole card is one link into the studio, and each has:
  - a **thumbnail** (16:10): a plan-view SVG of the site. Compact Infill shows grey-green blocks, a pale blue parcel and a dashed boundary. Sloped Edge shows contour lines, stepped boxes and a dashed boundary. Both have a north arrow and a tiny mono caption, "COMPACT INFILL · CURATED DEMO · OSLO BLOCK";
  - an **eyebrow** naming the type of site: "Urban infill" or "Landscape edge";
  - a **title** with a ↗ arrow on the right: "Compact Infill" or "Sloped Edge";
  - a **subtitle**: "Dense Oslo block · strong shadow study" or "Topography · stepped massing";
  - a **description** of 2–3 lines:
    - **Compact Infill:** "A tight urban study area surrounded by mature apartment blocks. Clear setbacks, a simple lot edge and long seasonal shadows make it the primary demonstration site."
    - **Sloped Edge:** "A study area at the city edge where the ground begins to fall away. Noticeable relief and asymmetric surroundings reward a stepped, terrain-aware concept.";
  - a **footer:** a hairline, then "Open studio" underlined.
- **"Start from any address" card:** below the two cards, a full-width card with a **dashed dark border**, linking to `/new`.
  - **Left:** "Start from any address ↗", then "Pick a block anywhere in the Nordics and load open map data in 3D. Context is simplified and partly estimated."
  - **Right:** "Live open data · needs a connection" in small grey text.

### 3.5 My sites (shown only after you import a site)

A hairline, then:

- The heading **"My sites"**, the same size as the other section headings, with no eyebrow.
- A list with hairlines between rows. Each row shows:
  - **Left:** the site title (e.g. "Oslo (Grünerløkka)") and "Imported 03/11/2026 · 187 buildings". The date follows the browser's locale.
  - **Right:** **Open** (an underlined link) and **Delete** (a ghost button). Delete asks for confirmation: "Delete Oslo (Grünerløkka)? This removes the imported site and its saved scenarios from this browser."
  - A saved site that can't be read says so, and offers Delete.
- After a delete, focus moves to the "My sites" heading. If the list is now empty, the section disappears and focus moves to "Start from any address".

### 3.6 Method

A hairline, then:

- **Header row:** the eyebrow "Method" and the heading **"One model. Three consequences."** On the right: "Geometry, metrics and feedback share a single source of truth. If a number changes, the model changed."
- **A three-column strip** framed by top and bottom hairlines, with vertical hairlines between the columns:
  - **Site:** "Terrain, context buildings, parcel linework and demo constraints arrive as static, versioned packages with provenance."
  - **Massing:** "Draw footprints, stack storeys and step upper volumes. Areas, heights and envelope checks derive from the edited geometry."
  - **Impact:** "Move the sun, read shadows, test the illustrative envelope, then compare two concepts against the same camera and time."
- The section is text only, with no icons or images.

### 3.7 Portfolio prototype (closing call to action)

A hairline, then one row:

- **Left:** the eyebrow "Portfolio prototype", the heading **"Designed to be examined, not just admired."**, and "The studio is deliberately explicit about what it simulates: geometric massing, conceptual metrics, geometric sun direction and illustrative demo limits."
- **Right:** **Enter the studio ↗**, a black button that opens Compact Infill.

### 3.8 Footer

A hairline, then one small grey line (11 px):

> A portfolio prototype for architectural site study. Sites are curated demonstrations; constraints are illustrative and not planning advice. · Buildings © OpenStreetMap contributors (ODbL) · Terrain © Kartverket (CC BY 4.0) · Data

The OpenStreetMap, Kartverket and Data parts are underlined links.

---

## 4. Phone layout (375 px)

- The header stays on one row: the wordmark on the left, and Sites, About and Open demo on the right, at 14 px.
- The headline shrinks to 28 px and fits on three lines.
- The two buttons become full width and stack: first the black button, then the centred underlined link.
- The hero figure moves under the text at full width.
- The site cards stack. The "Start from any address" card stacks its two text blocks.
- The Method columns stack, with hairlines between them.

---

## 5. Links on the page

| Element | Goes to |
|---|---|
| Wordmark | `/` |
| Sites (nav) | `/#sites` |
| About (nav), About the prototype | `/about` |
| Open demo, Open Compact Infill, Enter the studio, Compact Infill card | `/studio/compact-infill` |
| Sloped Edge card | `/studio/sloped-edge` |
| Start from any address | `/new` |
| My sites → Open | `/studio/import/<id>` |
| Footer → Data | `/about#data` |

---

## 6. Observations for the redesign

These are what stood out, offered as input rather than decisions:

1. **Four buttons go to the same place.** "Open demo", "Open Compact Infill", the Compact Infill card and "Enter the studio" all open the same studio.
2. **The address feature is the most impressive capability, and the page undersells it.** It sits as a dashed card under the curated sites, but the hero eyebrow still says "Oslo" and the hero button opens a fixed demo.
3. **The hero shows a drawing, not the product.** The SVG is elegant, but a visitor never sees the real 3D studio (trees, shadows, the sun band) until they click.
4. **There's very little contrast between sections.** Every section has the same background, the same 28 px light heading and the same eyebrow pattern, so the page reads as one long, even column.
5. **The copy is careful and honest, but repetitive about limits.** "Curated", "illustrative" and "not planning advice" appear in the hero, the figure, the cards, the Method section, the closing section and the footer.
6. **My sites appears between the site cards and Method,** so a returning visitor has to scroll past the curated cards to reach their own imports.
7. **The page has no images or motion,** apart from line drawings. A short loop or still of the studio would show the sun and shadows, which are the core "impact" story.
8. **The closing call to action repeats the hero's call to action** rather than offering a next step, for example "Start from any address" or "Read the case study".
