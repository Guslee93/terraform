import { expect, test } from '@playwright/test'

test('landing page opens the primary studio and the package loads', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1 })).toContainText(/explore a site/i)
  await expect(page.getByRole('heading', { name: 'Compact Infill' })).toBeVisible()

  await page.getByRole('link', { name: /open compact infill in the studio/i }).click()

  await expect(page).toHaveURL(/\/studio\/compact-infill$/)
  await expect(
    page.getByRole('region', { name: /3D site viewport for Compact Infill/i }),
  ).toBeVisible()
  await expect(page.getByRole('region', { name: /3D site viewport/ })).toBeVisible()
  await expect(page.getByRole('group', { name: 'Camera presets' })).toBeVisible()

  await page.getByRole('button', { name: 'Plan', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Plan', exact: true })).toHaveAttribute('aria-pressed', 'true')

  // Layers live in a panel group; the toolbar's Layers button opens it.
  await page.getByRole('button', { name: 'Layers', exact: true }).click()
  const contextLayer = page.getByRole('checkbox', { name: 'Context buildings' })
  await expect(contextLayer).toBeChecked()
  await contextLayer.uncheck()
  await expect(contextLayer).not.toBeChecked()
})

test('the sloped-edge package loads its own context', async ({ page }) => {
  await page.goto('/studio/sloped-edge')

  await expect(
    page.getByRole('region', { name: /3D site viewport for Sloped Edge/i }),
  ).toBeVisible()
  await expect(page.getByRole('region', { name: /3D site viewport/ })).toBeVisible()
  await expect(page.getByText(/© OpenStreetMap contributors/i).first()).toBeVisible()
})

// Regression: the AO composer once froze the canvas on its first frame under StrictMode, so
// camera presets and new masses updated the DOM but never the picture. DOM assertions alone
// cannot see that; compare what the canvas actually shows.
test('the 3D view redraws when the camera preset changes', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/studio/compact-infill')
  const viewport = page.getByRole('region', { name: /3D site viewport for Compact Infill/i })
  await expect(page.getByRole('region', { name: /3D site viewport/ })).toBeVisible()
  const box = await viewport.boundingBox()
  if (!box) throw new Error('The 3D site viewport region was not found')
  // Centre of the canvas, clear of the compass, legend and preset overlays.
  const clip = { x: box.x + box.width / 2 - 150, y: box.y + box.height / 2 - 100, width: 300, height: 200 }

  // Let the scene (and the lazy AO chunk) settle before the reference frame.
  await page.waitForTimeout(2500)
  const iso = await page.screenshot({ clip })
  await page.getByRole('button', { name: 'Plan', exact: true }).click()
  await expect
    .poll(async () => (await page.screenshot({ clip })).equals(iso), { timeout: 10_000 })
    .toBe(false)
})
