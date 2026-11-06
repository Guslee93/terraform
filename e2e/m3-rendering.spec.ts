/// <reference lib="dom" />
import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 1440, height: 900 } })

test('no WebGL leaves an accessible fallback and the inspector available', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value: function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
        if (type === 'webgl' || type === 'webgl2') return null
        return Reflect.apply(original, this, [type, ...args])
      },
    })
  })
  await page.goto('/studio/compact-infill')
  await expect(page.getByRole('heading', { name: '3D view unavailable' })).toBeVisible()
  await expect(page.getByRole('region', { name: /3D site viewport/ })).toBeVisible()
  await expect(page.locator('canvas')).toHaveCount(0)
  // Layers live in a panel group; the toolbar's Layers button opens it.
  await page.getByRole('button', { name: 'Layers', exact: true }).click()
  const contextLayer = page.getByRole('checkbox', { name: 'Context buildings' })
  await contextLayer.uncheck()
  await expect(contextLayer).not.toBeChecked()
})

test('quality changes the rendered canvas both ways and persists after reload', async ({ page }, testInfo) => {
  // Canvas screenshots under software GL exceed 30 s when the suite runs in parallel.
  test.slow()
  // Balanced has shadows but no AO, making this comparison practical on software GL too.
  await page.goto('/studio/compact-infill')
  await expect(page.getByRole('region', { name: /3D site viewport/ })).toBeVisible()
  // Layers live in a panel group; the toolbar's Layers button opens it.
  await page.getByRole('button', { name: 'Layers', exact: true }).click()
  const quality = page.getByRole('combobox', { name: 'Render quality' })
  await quality.selectOption('balanced')
  const viewport = page.getByRole('region', { name: /3D site viewport for Compact Infill/i })
  await expect(viewport.locator('canvas')).toBeVisible()
  const box = await viewport.boundingBox()
  if (!box) throw new Error('The 3D site viewport region was not found')
  const clip = { x: box.x + box.width / 2 - 150, y: box.y + box.height / 2 - 100, width: 300, height: 200 }
  await page.waitForTimeout(2500)
  const balanced = await page.screenshot({ clip })
  await testInfo.attach('balanced-isometric', { body: balanced, contentType: 'image/png' })

  await quality.selectOption('low')
  await expect.poll(async () => (await page.screenshot({ clip })).equals(balanced), { timeout: 10_000 }).toBe(false)
  await page.waitForTimeout(1000)
  const low = await page.screenshot({ clip })
  await testInfo.attach('low-isometric', { body: low, contentType: 'image/png' })

  await quality.selectOption('balanced')
  await expect.poll(async () => (await page.screenshot({ clip })).equals(low), { timeout: 10_000 }).toBe(false)
  await page.reload()
  await expect(page.getByRole('region', { name: /3D site viewport/ })).toBeVisible()
  await page.getByRole('button', { name: 'Layers', exact: true }).click()
  await expect(quality).toHaveValue('balanced')
})
