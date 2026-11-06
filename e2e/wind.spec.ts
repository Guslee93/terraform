/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'

// X4 — wind flow e2e (docs/handoffs/X4-minimax-wind-e2e-casestudy.md).
//
// Walks the wind panel on the Compact Infill site: switch the layer on and read the disclaimer
// and legend, switch the map between comfort and direction, resize and move the analysis circle,
// toggle streamlines, then take a baseline and read the delta.
//
// Role and label queries only — never CSS classes — so the spec fails loudly when an accessible
// name changes. The baseline can only be captured from a settled field, so the wait for
// "Set baseline" is the solver catching up, not a flake.
test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
test.setTimeout(120_000)

const DISCLAIMER = 'Indicative wind screening — 2D flow, not engineering'

async function openStudio(page: Page) {
  await page.goto('/studio/compact-infill')
  await expect(page.getByRole('region', { name: /3D site viewport for Compact Infill/i })).toBeVisible()
}

/** The "Wind and noise" group is collapsed in the inspector; open it when it is. */
async function openClimateGroup(page: Page) {
  const inspector = page.getByRole('complementary', { name: 'Inspector' })
  const windButton = inspector.getByRole('button', { name: 'Wind', exact: true })
  if (!(await windButton.isVisible())) {
    await inspector.locator('summary').filter({ hasText: /^Wind and noise/ }).click()
  }
  await expect(windButton).toBeVisible()
}

test('X4: the wind layer shows its disclaimer and legend, and the baseline/delta round trip works', async ({ page }) => {
  await openStudio(page)
  await openClimateGroup(page)

  // Wind on: the screening disclaimer and a legend appear once the flow is solved.
  await page.getByRole('group', { name: 'Climate layer' }).getByRole('button', { name: 'Wind', exact: true }).click()
  await expect(page.getByText(DISCLAIMER)).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('list', { name: 'Wind comfort legend' })).toBeVisible({ timeout: 15_000 })

  // Comfort is the default map; Direction shows the speed ratio against open ground.
  const displays = page.getByRole('group', { name: 'Wind map shows' })
  await expect(displays.getByRole('button', { name: 'Comfort', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await displays.getByRole('button', { name: 'Direction', exact: true }).click()
  await expect(displays.getByRole('button', { name: 'Direction', exact: true })).toHaveAttribute('aria-pressed', 'true')

  // A wider analysis circle: the readout follows the slider.
  await page.getByRole('slider', { name: 'Analysis circle' }).fill('150')
  await expect(page.getByText('r = 150 m')).toBeVisible()

  // Move circle, then Escape: the button returns to its idle label.
  await page.getByRole('button', { name: 'Move circle', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Move circle', exact: true })).toBeVisible()

  // Streamlines on.
  const streamlines = page.getByRole('checkbox', { name: 'Streamlines' })
  await streamlines.check()
  await expect(streamlines).toBeChecked()

  // A baseline may only be taken from a settled field: wait for the solver to finish.
  const setBaseline = page.getByRole('button', { name: 'Set baseline', exact: true })
  await expect(setBaseline).toBeEnabled({ timeout: 30_000 })
  await setBaseline.click()

  // Delta appears once there is a baseline; nothing has changed, so it reads "No change".
  const delta = page.getByRole('button', { name: 'Delta', exact: true })
  await expect(delta).toBeVisible()
  await delta.click()
  await expect(page.getByRole('list', { name: /No change/ })).toBeVisible()

  // Clearing the baseline removes the Delta view again.
  await page.getByRole('button', { name: 'Clear baseline', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Delta', exact: true })).toHaveCount(0)
})
