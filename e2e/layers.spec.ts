import { expect, test, type Page } from '@playwright/test'
import { canvasSignature, expectCanvasChanged, openAnalysis, openGroup } from './studio-helpers'
import { budget } from './budget'

test.describe.configure({ mode: 'serial' })

test.use({ viewport: { width: 1440, height: 900 } })

/** Wait for the studio canvas and let the first frames render. */
async function openStudioCanvas(page: Page) {
  await page.goto('/studio/compact-infill')
  await expect(page.getByRole('region', { name: /3D site viewport/ })).toBeVisible()
  await page.waitForTimeout(2500)
}

test('Streets and Trees checkboxes exist on compact-infill', async ({ page }) => {
  await page.goto('/studio/compact-infill')
  await expect(
    page.getByRole('region', { name: /3D site viewport for Compact Infill/i }),
  ).toBeVisible()
  await expect(page.getByRole('region', { name: /3D site viewport/ })).toBeVisible()

  await expect(page.getByRole('checkbox', { name: 'Streets' })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Trees' })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: /Study boundary|Setback|Height limit/ })).toHaveCount(0)
})

test('Streets and Trees checkboxes exist on sloped-edge', async ({ page }) => {
  await page.goto('/studio/sloped-edge')
  await expect(
    page.getByRole('region', { name: /3D site viewport for Sloped Edge/i }),
  ).toBeVisible()
  await expect(page.getByRole('region', { name: /3D site viewport/ })).toBeVisible()

  await expect(page.getByRole('checkbox', { name: 'Streets' })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Trees' })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: /Study boundary|Setback|Height limit/ })).toHaveCount(0)
})

test('the 3D view changes when Trees is toggled off then on', async ({ page }) => {
  await openStudioCanvas(page)
  const withTrees = await canvasSignature(page)

  // Uncheck Trees and wait for the canvas to change.
  await page.getByRole('checkbox', { name: 'Trees' }).uncheck()
  await expectCanvasChanged(page, withTrees)

  const withoutTrees = await canvasSignature(page)

  // Re-check Trees and wait for the canvas to change back.
  await page.getByRole('checkbox', { name: 'Trees' }).check()
  await expectCanvasChanged(page, withoutTrees)
})

test('the 3D view changes when Streets is toggled off then on', async ({ page }) => {
  await openStudioCanvas(page)
  const withStreets = await canvasSignature(page)

  // Uncheck Streets and wait for the canvas to change.
  await page.getByRole('checkbox', { name: 'Streets' }).uncheck()
  await expectCanvasChanged(page, withStreets)

  const withoutStreets = await canvasSignature(page)

  // Re-check Streets and wait for the canvas to change back.
  await page.getByRole('checkbox', { name: 'Streets' }).check()
  await expectCanvasChanged(page, withoutStreets)
})

test('the 3D view changes when Land cover is toggled off then on', async ({ page }) => {
  // The default noise overlay covers the ground; Sun leaves the park tint in view.
  await openStudioCanvas(page)
  await openAnalysis(page, 'Sun')
  await openGroup(page, 'Layers')
  const withTint = await canvasSignature(page)

  await page.getByRole('checkbox', { name: 'Land cover' }).uncheck()
  await expectCanvasChanged(page, withTint)

  const withoutTint = await canvasSignature(page)

  await page.getByRole('checkbox', { name: 'Land cover' }).check()
  await expectCanvasChanged(page, withoutTint)
})

test('the viewport HUD items never overlap and the page never scrolls sideways', async ({ page }) => {
  // The WebGL scene (with postprocessing) makes resize-based checks slow on some
  // machines; the default 30 s per-test budget is too tight for five viewports.
  test.setTimeout(budget(60_000))

  const viewports = [
    { width: 1024, height: 800 },
    { width: 1280, height: 800 },
    { width: 1440, height: 900 },
    { width: 1680, height: 1050 },
    { width: 1920, height: 1080 },
  ]

  // The HUD layout is pure CSS, so load the scene once and resize per viewport.
  await page.setViewportSize(viewports[0])
  await page.goto('/studio/compact-infill')
  await expect(
    page.getByRole('region', { name: /3D site viewport for Compact Infill/i }),
  ).toBeVisible()

  type Box = { x: number; y: number; width: number; height: number }
  const overlaps = (a: Box, b: Box) =>
    a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height

  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    await page.waitForTimeout(150)
    const label = `${viewport.width}x${viewport.height}`

    // One legend pill (with the scale bar inside), the toolbar and the camera views.
    const items: Array<[string, Box]> = []
    for (const [name, locator] of [
      ['legend', page.getByTestId('legend')],

      ['camera views', page.getByRole('group', { name: 'Camera presets' })],
    ] as const) {
      const box = await locator.boundingBox()
      if (!box) throw new Error(`HUD item ${name} not measurable at ${label}`)
      items.push([name, box])
    }
    await expect(page.getByTestId('legend').getByTestId('scale-bar')).toBeVisible()
    for (const [index, [nameA, a]] of items.entries()) {
      for (const [nameB, b] of items.slice(index + 1)) {
        expect(overlaps(a, b), `${nameA} and ${nameB} overlap at ${label}`).toBe(false)
      }
    }

    const scroll = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(scroll, `horizontal page scroll at ${label}`).toBeLessThanOrEqual(0)
  }
})
