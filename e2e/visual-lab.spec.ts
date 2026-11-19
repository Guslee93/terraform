import { expect, test, type Page } from '@playwright/test'
import { budget } from './budget'
import { canvasSignature } from './studio-helpers'

// Visual Lab smoke + first-view regression (TF-VIS-015, ADR-0040). The Lab route exists in dev, so
// this spec is opt-in:
//   LAB=1 npx playwright test e2e/visual-lab.spec.ts
test.skip(process.env.LAB !== '1', 'Opt-in: LAB=1')

// Reduced motion so CameraRig snaps to the preset instead of easing over 0.75 s.
test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })

/** Open the Lab and wait for the viewport and its canvas to settle. */
async function openLab(page: Page) {
  await page.goto('/lab/compact-infill')
  await expect(page.getByRole('region', { name: /3D site viewport/ })).toBeVisible({ timeout: budget(120_000) })
  await expect(page.locator('canvas').first()).toBeVisible()
  // Let the first frames (environment PMREM, AO, contour build) settle.
  await page.waitForTimeout(1500)
}

test('the Visual Lab opens /lab/compact-infill with a live canvas', async ({ page }) => {
  await openLab(page)
  // The tweak panel is plain HTML and lists the one style available today.
  await expect(page.getByRole('heading', { name: 'Visual Lab' })).toBeVisible()
})

test('the viewport canvas has a substantial height on first mount', async ({ page }) => {
  await openLab(page)
  // Regression for the blank first view (TF-VIS-015 follow-up): ViewportCanvas is h-full, and a
  // min-height-only parent lets the R3F canvas collapse to 0 px in strict engines. A live canvas
  // must be at least a few hundred CSS pixels tall.
  const box = await page.locator('canvas').first().boundingBox()
  expect(box).not.toBeNull()
  expect(box!.height).toBeGreaterThan(300)
  expect(box!.width).toBeGreaterThan(300)
})

test('the camera is placed at the selected preset on first mount', async ({ page }) => {
  await openLab(page)
  // The Lab's default preset is "3D" (isometric). If the first view were blank — camera not yet at
  // the preset — clicking "3D" would change the frame. It must already match, so the two
  // signatures agree (the first mount is already at the selected preset).
  const first = await canvasSignature(page)
  await page.getByRole('button', { name: '3D', exact: true }).click()
  await page.waitForTimeout(500)
  expect(await canvasSignature(page)).toBe(first)
})
