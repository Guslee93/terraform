import { expect, test } from '@playwright/test'

test.use({ storageState: { cookies: [], origins: [] } })

test('first visit shows the studio guide; Esc skips it and it stays gone after reload', async ({ page }) => {
  await page.goto('/studio/compact-infill')
  const guide = page.getByRole('region', { name: 'Studio guide' })
  await expect(guide).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(guide).toBeHidden()
  await page.reload()
  await expect(page.getByRole('button', { name: /guide/i })).toBeVisible()
  await expect(guide).toBeHidden()
})
