import { expect, test } from '@playwright/test'

test('landing page opens the primary studio', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1 })).toContainText(/explore a site/i)
  await expect(page.getByRole('heading', { name: 'Compact Infill' })).toBeVisible()

  await page.getByRole('link', { name: /open compact infill in the studio/i }).click()

  await expect(page).toHaveURL(/\/studio\/compact-infill$/)
  await expect(
    page.getByRole('heading', { name: /does not include the site model/i }),
  ).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Studio tools' })).toBeVisible()
})
