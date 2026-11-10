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
  const contextLayer = page.getByRole('checkbox', { name: 'Context buildings' })
  await contextLayer.uncheck()
  await expect(contextLayer).not.toBeChecked()
})
