import { expect, test } from '@playwright/test'

// Fresh visit (guide not dismissed) but with the building tools on: the guide belongs to "Test a building".
test.use({
  storageState: {
    cookies: [],
    origins: [{ origin: 'http://127.0.0.1:5173', localStorage: [{ name: 'terraform:test-building:v1', value: 'true' }] }],
  },
})

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
