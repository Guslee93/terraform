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

test('the legend clears the scale bar and the Site notes button at every viewport', async ({
  page,
}) => {
  // The WebGL scene (with postprocessing) makes resize-based checks slow on some
  // machines; the default 30 s per-test budget is too tight for four viewports.
  test.setTimeout(60_000)

  const viewports = [
    { width: 1024, height: 800 },
    { width: 1280, height: 800 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ]

  // The HUD layout is pure CSS, so load the scene once and resize per viewport.
  await page.setViewportSize(viewports[0])
  await page.goto('/studio/compact-infill')
  await expect(
    page.getByRole('region', { name: /3D site viewport for Compact Infill/i }),
  ).toBeVisible()

  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    await page.waitForTimeout(150)

    const legend = page.getByTestId('legend')
    const scaleBar = page.getByTestId('scale-bar')
    await expect(legend).toBeVisible()
    await expect(scaleBar).toBeVisible()

    const legendBox = await legend.boundingBox()
    const scaleBox = await scaleBar.boundingBox()
    if (!legendBox || !scaleBox) {
      throw new Error(`HUD boxes not measurable at ${viewport.width}x${viewport.height}`)
    }

    // All layers are on by default, so the legend is at its tallest; it must still
    // sit at least 8 px above the scale bar at every width from sm upward.
    expect(
      legendBox.y + legendBox.height + 8,
      `legend must keep an 8 px gap above the scale bar at ${viewport.width}x${viewport.height}`,
    ).toBeLessThanOrEqual(scaleBox.y)

    // Below 1100 px the "Site notes" floating button shares the bottom-left corner;
    // it must never sit on top of the legend (no overlapping boxes). The tool rail
    // also has a control labelled "Site notes" (top-left), so pick the bottom-anchored
    // instance only — it is the one the legend has to clear.
    const notesButtons = page.getByRole('button', { name: 'Site notes' })
    let floatingNotesBox: { x: number; y: number; width: number; height: number } | null = null
    const notesCount = await notesButtons.count()
    for (let i = 0; i < notesCount; i++) {
      const buttonBox = await notesButtons.nth(i).boundingBox()
      if (buttonBox && buttonBox.y > viewport.height / 2) {
        floatingNotesBox = buttonBox
        break
      }
    }
    if (floatingNotesBox) {
      const overlapsX =
        legendBox.x < floatingNotesBox.x + floatingNotesBox.width &&
        floatingNotesBox.x < legendBox.x + legendBox.width
      const overlapsY =
        legendBox.y < floatingNotesBox.y + floatingNotesBox.height &&
        floatingNotesBox.y < legendBox.y + legendBox.height
      expect(
        overlapsX && overlapsY,
        `Site notes must not overlap the legend at ${viewport.width}x${viewport.height}`,
      ).toBe(false)
    }
  }
})