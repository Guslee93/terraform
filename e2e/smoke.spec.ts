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
  await expect(page.getByText('137 simplified')).toBeVisible()
  await expect(page.getByRole('group', { name: 'Camera presets' })).toBeVisible()

  await page.getByRole('button', { name: 'Top' }).click()
  await expect(page.getByRole('button', { name: 'Top' })).toHaveAttribute('aria-pressed', 'true')

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
  await expect(page.getByText('33 simplified')).toBeVisible()
  await expect(page.getByText(/© OpenStreetMap contributors/i).first()).toBeVisible()
})
