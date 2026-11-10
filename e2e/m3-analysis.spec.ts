/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { openAnalysis, openGroup } from './studio-helpers'

// D32 — M3 live-analysis e2e (docs/plans/M3-fable-plan.md §10, docs/handoffs/C8-C10-m3-ui.md).
//
// Covers the Sun group time presets (canvas + readout), the winter night chip, the constraint-envelope
// violation flow (Exceeds demo envelope · outside the setback · warning selects the mass) and the
// DST gap disclosure. Only the canvas-compare test pins the render quality to High (via
// localStorage) — Auto would drop to Low on software GL with no shadows to compare. The DOM-only
// tests stay at Auto so the fully-parallel suite does not stack several 4096-shadow-map + AO
// scenes on SwiftShader; the compare itself needs a long timeout for the same reason.
test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
test.setTimeout(120_000)

async function openStudio(page: Page) {
  await page.goto('/studio/compact-infill')
  await expect(
    page.getByRole('region', { name: /3D site viewport for Compact Infill/i }),
  ).toBeVisible()
  await expect(page.getByRole('region', { name: /3D site viewport/ })).toBeVisible()
}

/** Clear centre clip, away from the compass, legend, presets and scale bar (smoke.spec). */
function centreClip(box: { x: number; y: number; width: number; height: number }) {
  return { x: box.x + box.width / 2 - 150, y: box.y + box.height / 2 - 100, width: 300, height: 200 }
}

/** Activate the Sun card: the time band in the dock, readout, date and presets in Parameters. */
async function openSunGroup(page: Page) {
  await openAnalysis(page, 'Sun')
}

/** The Sun group readout sentence (FR-063). */
function sunReadout(page: Page) {
  return page.getByText(/^Elevation \d+\.\d° · azimuth \d+° \([A-Z]+\)$/)
}

test('D32: Sun time presets change the rendered canvas and the sun readout', async ({ page }) => {
  // Pixels matter here: pin High so shadows + AO are actually rendered (Auto → Low on software GL).
  await page.addInitScript(() => {
    window.localStorage.setItem('terraform.renderQuality', 'high')
  })
  await openStudio(page)
  const viewport = page.getByRole('region', { name: /3D site viewport for Compact Infill/i })
  const box = await viewport.boundingBox()
  if (!box) throw new Error('The 3D site viewport region was not found')

  await openSunGroup(page)
  const readout = sunReadout(page)
  await expect(readout).toBeVisible()

  // Let the scene (and the lazy AO composer) settle before the reference frame.
  await page.waitForTimeout(3500)
  const clip = centreClip(box)
  const atDefault = await page.screenshot({ clip })
  const textDefault = await readout.textContent()

  // Noon on 21 June rotates the shadows (elevation 41.7° → 51.0°, azimuth 217° → 151°);
  // both the DOM readout and the canvas must follow.
  await page.getByRole('button', { name: 'Noon' }).click()
  await expect(readout).not.toHaveText(textDefault ?? '')
  await expect
    .poll(async () => (await page.screenshot({ clip })).equals(atDefault), { timeout: 10_000 })
    .toBe(false)

  await page.waitForTimeout(500)
  const atNoon = await page.screenshot({ clip })
  const textNoon = await readout.textContent()

  // Evening moves to the other side: the picture and the readout change again.
  await page.getByRole('button', { name: 'Evening' }).click()
  await expect(readout).not.toHaveText(textNoon ?? '')
  await expect
    .poll(async () => (await page.screenshot({ clip })).equals(atNoon), { timeout: 10_000 })
    .toBe(false)
})

test('D32: winter solstice evening shows the Sun below horizon chip and no elevation readout', async ({ page }) => {
  await openStudio(page)
  await openSunGroup(page)
  await page.getByRole('button', { name: 'Winter solstice' }).click()
  await page.getByRole('button', { name: 'Evening' }).click()

  // QA-11: the night chip on the canvas, and the readout says exactly "Sun below horizon" —
  // no elevation, no direction, no sun-hours wording.
  // (role=status names come from aria-label/labelledby, so the text is asserted via toHaveText.)
  await expect(page.getByRole('region', { name: 'Sun and shadows' }).getByRole('status')).toHaveText('Sun below horizon')
  await expect(sunReadout(page)).toHaveCount(0)
  await expect(page.getByText('Sun below horizon').first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Winter solstice' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Evening' })).toHaveAttribute('aria-pressed', 'true')
})

test('D32: a mass drawn across the study boundary exceeds the envelope and its warning selects it', async ({ page }) => {
  await openStudio(page)
  const viewport = page.getByRole('region', { name: /3D site viewport for Compact Infill/i })
  const box = await viewport.boundingBox()
  if (!box) throw new Error('The 3D site viewport region was not found')
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2

  await page.getByRole('button', { name: 'Plan', exact: true }).click()
  await page.waitForTimeout(500)

  await page.getByRole('button', { name: 'Draw building' }).click()
  // Top view has uniform metres per pixel, so 0.26 × viewport height east/west of the origin
  // lands near ±103 m: across the study boundary (±95 m; the setback sits at ±91 m) yet inside
  // the 13 × 13 terrain grid (≈ ±112 m), so every corner reliably clicks the ground.
  const step = Math.round(box.height * 0.26)
  for (const [dx, dy] of [[-step, -80], [step, -80], [step, 80], [-step, 80]]) {
    await page.mouse.click(cx + dx, cy + dy)
  }
  await page.getByRole('button', { name: 'Draw building' }).evaluate((button) => button.blur())
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('Name')).toHaveValue('Mass 1')

  await expect(page.getByRole('heading', { name: 'Exceeds demo envelope' })).toBeVisible()
  await expect(page.getByText('Illustrative constraint — not planning advice')).toBeVisible()

  // One button per problem: the setback and the study-area breach are listed separately.
  const warning = page.getByRole('button', { name: /^Mass 1 is outside the setback/ })
  await expect(warning).toBeVisible()
  await expect(page.getByRole('button', { name: /^Mass 1 is outside the study area/ })).toBeVisible()

  await warning.click()
  // The warning selects the mass: Selected mass names it.
  const selectedGroup = await openGroup(page, 'Selected mass')
  await expect(selectedGroup.locator('summary')).toContainText('Mass 1')
  await expect(page.getByLabel('Name')).toHaveValue('Mass 1')
})

test('D32: the DST gap for 2026-03-29 02:30 is disclosed in the Sun group', async ({ page }) => {
  await openStudio(page)
  await openSunGroup(page)
  await page.getByLabel('Local date').fill('2026-03-29')
  const slider = page.getByRole('slider', { name: 'Local time' })
  // 02:30 local never occurred: Europe/Oslo jumps 02:00 → 03:00 that night.
  await slider.fill('150')
  await expect(page.getByText("This time doesn't exist on this date (clocks change); showing 03:30.")).toBeVisible()
  await expect(page.getByText('2026-03-29 03:30 CEST')).toBeVisible()
})