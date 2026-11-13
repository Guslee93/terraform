/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { openAnalysis, parameters } from './studio-helpers'
import { budget } from './budget'

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
test.setTimeout(budget(120_000))

const DISCLAIMER = 'Indicative wind screening — 2D flow, not engineering'

async function openStudio(page: Page) {
  await page.goto('/studio/compact-infill')
  await expect(page.getByRole('button', { name: 'Add a block' })).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByRole('region', { name: /3D site viewport for Compact Infill/i })).toBeVisible()
}

/** Open the wind card: the wind layer turns on and its controls open in the panel. */
async function openClimateGroup(page: Page) {
  await openAnalysis(page, 'Wind')
  await expect(page.getByRole('group', { name: 'Wind map shows' })).toBeVisible()
}

test('X4: the wind layer shows its disclaimer and legend, and the baseline/delta round trip works', async ({ page }) => {
  await openStudio(page)
  await openClimateGroup(page)

  // Wind on: the claim shows on the viewport (C23 review finding 3) and in the wind card of the
  // Parameters panel with the legend once the flow is solved.
  await expect(page.getByRole('region', { name: /3D site viewport/ }).getByText(DISCLAIMER)).toBeVisible({ timeout: budget(15_000) })
  await expect(page.getByRole('region', { name: 'Wind card' }).getByText(DISCLAIMER)).toBeVisible()
  await expect(parameters(page).getByText(DISCLAIMER)).toBeVisible({ timeout: budget(15_000) })
  await expect(page.getByRole('list', { name: 'Wind comfort legend' })).toBeVisible({ timeout: budget(15_000) })

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
  await expect(setBaseline).toBeEnabled({ timeout: budget(30_000) })
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

test('ADR-0015: the all-directions sweep fills the rose, opens Worst case, and a wedge sets the dial', async ({ page }) => {
  test.slow() // eight solves (~15–30 s under load)
  await openStudio(page)
  await openClimateGroup(page)
  const section = page.getByRole('region', { name: 'All wind directions' })
  await section.getByRole('button', { name: 'Analyse 8 directions' }).click()
  await expect(section.getByText(/Worst direction:/)).toBeVisible({ timeout: budget(60_000) })
  await expect(section.getByText(/directions solved/)).toHaveCount(0, { timeout: budget(60_000) })
  await expect(section.getByRole('button', { name: /^Wind from/ })).toHaveCount(8)
  await expect(section.getByText(/weighted equally — not measured climate frequency/)).toBeVisible()

  await page.getByRole('group', { name: 'Wind map shows' }).getByRole('button', { name: 'Worst case' }).click()
  await expect(page.getByRole('list', { name: 'Worst-case comfort legend' })).toBeVisible()

  await section.getByRole('button', { name: /^Wind from E \(90°\)/ }).click()
  await expect(page.getByLabel('Wind blows from')).toHaveValue('90')
  await expect(page.getByRole('group', { name: 'Wind map shows' }).getByRole('button', { name: 'Comfort' })).toHaveAttribute('aria-pressed', 'true')
})

test('ADR-0028: the wind map lifts to 20 m above terrain, shows m/s there, and returns to comfort at 2 m', async ({ page }) => {
  await openStudio(page)
  await openClimateGroup(page)
  await expect(page.getByRole('list', { name: 'Wind comfort legend' })).toBeVisible({ timeout: budget(15_000) })

  // Upper slices arrive after the ground field; the stops above 2 m unlock once they are solved.
  const height = page.getByRole('slider', { name: 'Height above terrain' })
  await expect(page.getByText(/Upper heights computing/)).toHaveCount(0, { timeout: budget(60_000) })
  await height.fill('4') // the 20 m stop
  await expect(height).toHaveAttribute('aria-valuetext', '20 metres above terrain')

  // Comfort classes are pedestrian criteria: above 2 m the legend is speed in m/s and says why.
  const displays = page.getByRole('group', { name: 'Wind map shows' })
  await expect(page.getByRole('list', { name: 'Wind direction legend' })).toBeVisible()
  await expect(page.getByText('Wind speed at 20 m above terrain, in m/s. Comfort classes apply at 2 m only.')).toBeVisible()
  await expect(displays.getByRole('button', { name: 'Comfort', exact: true })).toBeDisabled()

  // The lift handle in the scene holds the same height, and steps it from the keyboard.
  const handle = page.getByRole('slider', { name: 'Lift the wind map' })
  await expect(handle).toHaveAttribute('aria-valuetext', '20 metres above terrain')
  await handle.focus()
  await page.keyboard.press('ArrowUp')
  await expect(height).toHaveAttribute('aria-valuetext', '25 metres above terrain')

  // A drag moves the map through the solved heights; Esc returns it to where the drag started.
  const box = await handle.boundingBox()
  if (!box) throw new Error('The lift handle has no bounding box')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 160, { steps: 8 })
  await expect(handle).not.toHaveAttribute('aria-valuetext', '25 metres above terrain')
  await page.keyboard.press('Escape')
  await page.mouse.up()
  await expect(height).toHaveAttribute('aria-valuetext', '25 metres above terrain')

  // Home on the handle returns to the pedestrian height and the comfort map.
  await handle.focus()
  await page.keyboard.press('Home')
  await expect(height).toHaveAttribute('aria-valuetext', '2 metres above terrain')
  await expect(page.getByRole('list', { name: 'Wind comfort legend' })).toBeVisible()
  await expect(displays.getByRole('button', { name: 'Comfort', exact: true })).toHaveAttribute('aria-pressed', 'true')
})
