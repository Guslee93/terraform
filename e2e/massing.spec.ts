import { expect, test, type Page } from '@playwright/test'

// D10 — M2 massing end-to-end flow (status report §15.3b D10).
//
// Draws a footprint on the compact-infill site from the deterministic top view,
// then exercises the roof-drag transaction: Esc cancels a live drag, a committed
// drag is one undo entry.
//
// Camera note: the draw deliberately happens in the `Plan` preset (per the task
// card). The roof drag happens in the `3D` preset because the top view looks
// straight down at the vertical drag plane, so the ray-plane intersection is
// degenerate and the storeys preview saturates past the 1–40 validation limit
// (any release would be rejected instead of committed). The iso view keeps the
// drag well-conditioned while the assertions stay exactly those in the card.

test.describe.configure({ mode: 'serial' })

test.use({
  viewport: { width: 1440, height: 900 },
  reducedMotion: 'reduce',
})

/** Centre of the 3D viewport, in page (viewport) coordinates. */
async function viewportCentre(page: Page): Promise<{ x: number; y: number }> {
  const box = await page
    .getByRole('region', { name: /3D site viewport for Compact Infill/i })
    .boundingBox()
  if (!box) throw new Error('The 3D site viewport region was not found')
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/** Centre of the roof handle button, in page (viewport) coordinates. */
async function roofHandleCentre(page: Page): Promise<{ x: number; y: number }> {
  const handle = page.getByRole('button', { name: /^Drag to change storeys/ })
  await expect(handle).toBeVisible()
  const box = await handle.boundingBox()
  if (!box) throw new Error('The roof handle button has no bounding box')
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/**
 * Open the compact-infill studio, switch to the top view and draw one mass.
 * The mass is selected afterwards, so the static inspector shows its fields.
 */
async function createMass(page: Page): Promise<void> {
  await page.goto('/studio/compact-infill')
  await expect(
    page.getByRole('region', { name: /3D site viewport for Compact Infill/i }),
  ).toBeVisible()
  await expect(page.getByRole('region', { name: /3D site viewport/ })).toBeVisible()

  await page.getByRole('button', { name: 'Plan', exact: true }).click()
  // The preset snaps instantly with reduced motion; allow one short settle for the renderer.
  await page.waitForTimeout(400)

  await page.getByRole('button', { name: 'Draw building' }).click()
  const centre = await viewportCentre(page)
  const step = 60
  const corners = [
    { x: centre.x - step, y: centre.y - step },
    { x: centre.x + step, y: centre.y - step },
    { x: centre.x + step, y: centre.y + step },
    { x: centre.x - step, y: centre.y + step },
  ]
  for (const corner of corners) {
    await page.mouse.click(corner.x, corner.y)
  }

  // Clicking the canvas does not move focus off the Draw building button.
  // Without the blur, Enter would re-click that button and cancel the drawing.
  await page.getByRole('button', { name: 'Draw building' }).evaluate((button) => button.blur())
  await page.keyboard.press('Enter')

  await expect(page.getByLabel('Name')).toHaveValue('Mass 1')
  // The roof handle's aria-label contains "storeys", so target the input by role.
  await expect(page.getByRole('textbox', { name: 'Storeys' })).toHaveValue('3')
}

/** Re-seat the camera in the isometric preset and return the handle centre. */
async function moveToRoofDragView(page: Page): Promise<{ x: number; y: number }> {
  await page.getByRole('button', { name: '3D', exact: true }).click()
  await page.waitForTimeout(400)
  return roofHandleCentre(page)
}

test('Esc cancels a roof drag and restores the original storeys', async ({ page }) => {
  await createMass(page)

  const handle = await moveToRoofDragView(page)
  const storeys = page.getByRole('textbox', { name: 'Storeys' })

  await page.mouse.move(handle.x, handle.y)
  await page.mouse.down()
  await page.mouse.move(handle.x, handle.y - 80, { steps: 8 })
  // The inspector follows the live drag preview.
  await expect(storeys).not.toHaveValue('3')

  await page.keyboard.press('Escape')
  await page.mouse.up()
  await expect(storeys).toHaveValue('3')
})

test('a committed roof drag is one undo entry', async ({ page }) => {
  await createMass(page)

  const handle = await moveToRoofDragView(page)
  const storeys = page.getByRole('textbox', { name: 'Storeys' })

  await page.mouse.move(handle.x, handle.y)
  await page.mouse.down()
  await page.mouse.move(handle.x, handle.y - 80, { steps: 8 })
  await page.mouse.up()

  expect(Number(await storeys.inputValue())).toBeGreaterThan(3)

  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(storeys).toHaveValue('3')
})