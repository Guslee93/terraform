import { expect, test } from '@playwright/test'
import { budget } from './budget'

// Visual Lab smoke (TF-VIS-015, ADR-0040). The Lab route exists in dev, so this spec is opt-in:
//   LAB=1 npx playwright test e2e/visual-lab.spec.ts
test.skip(process.env.LAB !== '1', 'Opt-in: LAB=1')

test('the Visual Lab opens /lab/compact-infill with a live canvas', async ({ page }) => {
  await page.goto('/lab/compact-infill')
  await expect(page.getByRole('region', { name: /3D site viewport/ })).toBeVisible({ timeout: budget(120_000) })
  await expect(page.locator('canvas').first()).toBeVisible()
  // The tweak panel is plain HTML and lists the one style available today.
  await expect(page.getByRole('heading', { name: 'Visual Lab' })).toBeVisible()
})
