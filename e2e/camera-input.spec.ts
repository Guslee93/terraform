import { expect, test, type Page } from '@playwright/test'
import { canvasSignature, drawMass, expectCanvasChanged } from './studio-helpers'
import { budget } from './budget'

// T7 — TF-VIS-030 camera and input characterisation (run book §7). Locks today's camera and
// editing behaviour before anyone changes the controller. No source change. This spec is not
// opt-in: it must pass in CI with the budget() scaling.
//
// The two light preset tests run first, before the drag tests that stress the software-GL
// renderer (drawing + dragging the WebGL canvas).

test.describe.configure({ mode: 'serial' })

test.use({
  viewport: { width: 1440, height: 900 },
  reducedMotion: 'reduce',
})

/** Open the studio and wait for the viewport (and the cold dev-server load). */
async function openStudio(page: Page) {
  await page.goto('/studio/compact-infill')
  await expect(page.getByRole('region', { name: /3D site viewport/ })).toBeVisible({ timeout: budget(120_000) })
}

/** Centre of the 3D viewport region, in page coordinates. */
async function viewportCentre(page: Page): Promise<{ x: number; y: number }> {
  const box = await page.getByRole('region', { name: /3D site viewport/ }).boundingBox()
  if (!box) throw new Error('The 3D site viewport region was not found')
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/** Open the studio, enable editing, and draw one mass (leaves it selected in the Plan view). */
async function createMass(page: Page): Promise<void> {
  await openStudio(page)
  await page.getByRole('button', { name: 'Add a block' }).click()
  await drawMass(page)
  await expect(page.getByRole('spinbutton', { name: 'Storeys' })).toHaveValue('3')
}

const storeysField = (page: Page) => page.getByRole('spinbutton', { name: 'Storeys' })

test('each camera preset changes the canvas', async ({ page }) => {
  await openStudio(page)
  // Start on the default 3D preset and move through every other preset.
  let signature = await canvasSignature(page)
  for (const preset of ['Plan', 'North', 'South', 'Street', '3D']) {
    await page.getByRole('button', { name: preset, exact: true }).click()
    await expectCanvasChanged(page, signature)
    signature = await canvasSignature(page)
  }
})

test('a preset change snaps without animation under reduced motion', async ({ page }) => {
  await openStudio(page)
  // Let the first frames render so the reference is the settled default view.
  await page.waitForTimeout(1500)
  const before = await canvasSignature(page)
  await page.getByRole('button', { name: 'Plan', exact: true }).click()
  // CameraRig skips its 0.75 s ease under reduced motion, so the new view lands promptly.
  await expectCanvasChanged(page, before, budget(20_000))
  // And there is no ongoing animation: two frames a moment apart agree.
  const settled = await canvasSignature(page)
  await page.waitForTimeout(200)
  expect(await canvasSignature(page)).toBe(settled)
})

test('dragging a mass moves it (not the camera) and is one undo step', async ({ page }) => {
  test.slow() // drawing + dragging on the software-GL canvas
  await createMass(page)

  const centre = await viewportCentre(page)
  const before = await canvasSignature(page)
  // Drag the mass body (not the roof handle, which sits at the footprint centroid).
  await page.mouse.move(centre.x + 40, centre.y + 40)
  await page.mouse.down()
  await page.mouse.move(centre.x + 120, centre.y + 100, { steps: 8 })
  await page.mouse.up()

  // The mass moved, so the canvas changed.
  await expectCanvasChanged(page, before)

  // One undo returns the block to its start, and the camera never orbited — so the frame is the
  // same as before the drag.
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect
    .poll(async () => (await canvasSignature(page)) === before, { timeout: budget(20_000) })
    .toBe(true)
})

test('Escape cancels a mass drag and adds no undo entry', async ({ page }) => {
  test.slow()
  await createMass(page)

  const centre = await viewportCentre(page)
  const before = await canvasSignature(page)
  await page.mouse.move(centre.x + 40, centre.y + 40)
  await page.mouse.down()
  await page.mouse.move(centre.x + 120, centre.y + 100, { steps: 8 })
  await page.keyboard.press('Escape')
  await page.mouse.up()

  // The cancelled drag leaves the block where it was, and it is still selected.
  await expect
    .poll(async () => (await canvasSignature(page)) === before, { timeout: budget(20_000) })
    .toBe(true)
  await expect(storeysField(page)).toBeVisible()

  // No undo entry was added: the only entry is the draw, so undo deletes the block.
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(storeysField(page)).toHaveCount(0)
})

test('a short ground click deselects the block', async ({ page }) => {
  await createMass(page)
  await expect(storeysField(page)).toBeVisible()

  const centre = await viewportCentre(page)
  // Away from the drawn block; a press-and-release with no travel is a click, not an orbit.
  await page.mouse.click(centre.x + 140, centre.y + 140)

  await expect(storeysField(page)).toHaveCount(0)
})

test('a long ground drag orbits the camera without deselecting', async ({ page }) => {
  test.slow()
  await createMass(page)
  await expect(storeysField(page)).toBeVisible()

  const centre = await viewportCentre(page)
  const before = await canvasSignature(page)
  // A drag with more than the click tolerance of travel orbits the camera.
  await page.mouse.move(centre.x + 140, centre.y + 140)
  await page.mouse.down()
  await page.mouse.move(centre.x + 220, centre.y + 140, { steps: 8 })
  await page.mouse.up()

  await expectCanvasChanged(page, before)
  // The block stays selected: orbiting is not a click.
  await expect(storeysField(page)).toBeVisible()
})
