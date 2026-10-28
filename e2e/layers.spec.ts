import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

test.use({ viewport: { width: 1440, height: 900 } })

test('Streets and Trees checkboxes exist on compact-infill', async ({ page }) => {
  await page.goto('/studio/compact-infill')
  await expect(
    page.getByRole('region', { name: /3D site viewport for Compact Infill/i }),
  ).toBeVisible()
  await expect(page.getByText('137 simplified')).toBeVisible()

  await expect(page.getByRole('checkbox', { name: 'Streets' })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Trees' })).toBeVisible()
})

test('Streets and Trees checkboxes exist on sloped-edge', async ({ page }) => {
  await page.goto('/studio/sloped-edge')
  await expect(
    page.getByRole('region', { name: /3D site viewport for Sloped Edge/i }),
  ).toBeVisible()
  await expect(page.getByText('33 simplified')).toBeVisible()

  await expect(page.getByRole('checkbox', { name: 'Streets' })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Trees' })).toBeVisible()
})

test('the 3D view changes when Trees is toggled off then on', async ({ page }) => {
  await page.goto('/studio/compact-infill')
  const viewport = page.getByRole('region', { name: /3D site viewport for Compact Infill/i })
  await expect(page.getByText('137 simplified')).toBeVisible()
  const box = await viewport.boundingBox()
  if (!box) throw new Error('The 3D site viewport region was not found')
  const clip = { x: box.x + box.width / 2 - 150, y: box.y + box.height / 2 - 100, width: 300, height: 200 }

  // Let the scene settle.
  await page.waitForTimeout(2500)
  const withTrees = await page.screenshot({ clip })

  // Uncheck Trees and wait for the canvas to change.
  await page.getByRole('checkbox', { name: 'Trees' }).uncheck()
  await expect
    .poll(async () => (await page.screenshot({ clip })).equals(withTrees), { timeout: 10_000 })
    .toBe(false)

  const withoutTrees = await page.screenshot({ clip })

  // Re-check Trees and wait for the canvas to change back.
  await page.getByRole('checkbox', { name: 'Trees' }).check()
  await expect
    .poll(async () => (await page.screenshot({ clip })).equals(withoutTrees), { timeout: 10_000 })
    .toBe(false)
})

test('the 3D view changes when Streets is toggled off then on', async ({ page }) => {
  await page.goto('/studio/compact-infill')
  const viewport = page.getByRole('region', { name: /3D site viewport for Compact Infill/i })
  await expect(page.getByText('137 simplified')).toBeVisible()
  const box = await viewport.boundingBox()
  if (!box) throw new Error('The 3D site viewport region was not found')
  const clip = { x: box.x + box.width / 2 - 150, y: box.y + box.height / 2 - 100, width: 300, height: 200 }

  // Let the scene settle.
  await page.waitForTimeout(2500)
  const withStreets = await page.screenshot({ clip })

  // Uncheck Streets and wait for the canvas to change.
  await page.getByRole('checkbox', { name: 'Streets' }).uncheck()
  await expect
    .poll(async () => (await page.screenshot({ clip })).equals(withStreets), { timeout: 10_000 })
    .toBe(false)

  const withoutStreets = await page.screenshot({ clip })

  // Re-check Streets and wait for the canvas to change back.
  await page.getByRole('checkbox', { name: 'Streets' }).check()
  await expect
    .poll(async () => (await page.screenshot({ clip })).equals(withoutStreets), { timeout: 10_000 })
    .toBe(false)
})