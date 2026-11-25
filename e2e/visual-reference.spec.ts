/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { openAnalysis } from './studio-helpers'
import { budget } from './budget'

// Visual regression reference set (TF-VIS-012). Opt-in because the baselines are only valid on the
// reference machine (Apple M1 Pro, Metal — see the ledger's "Commands the owner must run"). The
// reference captures are headed, so the spec must run headed (headless falls back to SwiftShader).
//
//   VISUAL=1 npx playwright test e2e/visual-reference.spec.ts --headed --update-snapshots   # once, writes baselines
//   VISUAL=1 npx playwright test e2e/visual-reference.spec.ts --headed                      # then, must pass twice
//
// The normal suite and CI are unaffected: without VISUAL=1 every test here is skipped.
test.skip(process.env.VISUAL !== '1', 'Opt-in: VISUAL=1')

// Same frame as scripts/capture-reference.mjs (TF-VIS-010): 1440×900 CSS px at device scale 2,
// reduced motion, and the app's fixed renderPreference="auto" (never forced — run book §6).
test.use({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, reducedMotion: 'reduce' })
test.setTimeout(budget(180_000))

const DATE = '2026-06-21'
const MINUTE_OF_DAY = 900 // 15:00 local
// Differing-pixel ratio. This is a starting point; the owner tightens it from two clean runs on
// the reference machine (capture-reference.mjs expects two runs to match by 0 pixels).
const MAX_DIFF_PIXEL_RATIO = 0.02

async function openStudio(page: Page) {
  await page.goto('/studio/compact-infill')
  // The first navigation pays the dev server's cold start; give the viewport a wide budget.
  await expect(page.getByRole('region', { name: /3D site viewport/ })).toBeVisible({ timeout: budget(120_000) })
}

/** Open the Sun card just long enough to set the date and time; the caller keeps or closes it. */
async function setSun(page: Page) {
  await openAnalysis(page, 'Sun')
  await page.getByLabel('Local date').fill(DATE)
  await page.getByRole('slider', { name: 'Local time' }).fill(String(MINUTE_OF_DAY))
}

/** Close whichever analysis card is open (the card toggles off when clicked while active). */
async function closeAnalysis(page: Page) {
  const open = page.locator('[data-testid^="analysis-card-"][aria-expanded="true"]')
  if (await open.count()) await open.first().click()
}

/** Wait until no analysis is visibly computing (wind, sun hours, water). */
async function computingFinished(page: Page) {
  await expect
    .poll(() => page.getByText(/Computing|Tracing where the water runs/i).filter({ visible: true }).count(), { timeout: budget(120_000) })
    .toBe(0)
}

/** The isometric preset, settled (the same 3D button capture-reference.mjs uses). */
async function setIsometric(page: Page) {
  await page.getByRole('button', { name: '3D', exact: true }).click()
  await page.waitForTimeout(1500)
}

test('neutral (no analysis card open)', async ({ page }) => {
  await openStudio(page)
  await setSun(page)
  await closeAnalysis(page)
  await setIsometric(page)
  await expect(page.locator('canvas').first()).toHaveScreenshot('neutral.png', { scale: 'device', maxDiffPixelRatio: MAX_DIFF_PIXEL_RATIO, timeout: budget(120_000) })
})

test('Sun (sun hours)', async ({ page }) => {
  await openStudio(page)
  await setSun(page)
  await computingFinished(page)
  await setIsometric(page)
  await expect(page.locator('canvas').first()).toHaveScreenshot('sun.png', { scale: 'device', maxDiffPixelRatio: MAX_DIFF_PIXEL_RATIO, timeout: budget(120_000) })
})

test('Wind (direction view, 2 m)', async ({ page }) => {
  await openStudio(page)
  await setSun(page)
  await openAnalysis(page, 'Wind')
  await page.getByRole('group', { name: 'Wind map shows' }).getByRole('button', { name: 'Direction', exact: true }).click()
  await computingFinished(page)
  await setIsometric(page)
  await expect(page.locator('canvas').first()).toHaveScreenshot('wind.png', { scale: 'device', maxDiffPixelRatio: MAX_DIFF_PIXEL_RATIO, timeout: budget(120_000) })
})

test('Noise (Lden)', async ({ page }) => {
  await openStudio(page)
  await setSun(page)
  await openAnalysis(page, 'Noise')
  await computingFinished(page)
  await setIsometric(page)
  await expect(page.locator('canvas').first()).toHaveScreenshot('noise.png', { scale: 'device', maxDiffPixelRatio: MAX_DIFF_PIXEL_RATIO, timeout: budget(120_000) })
})

test('Water', async ({ page }) => {
  await openStudio(page)
  await setSun(page)
  await openAnalysis(page, 'Water')
  await computingFinished(page)
  await setIsometric(page)
  await expect(page.locator('canvas').first()).toHaveScreenshot('water.png', { scale: 'device', maxDiffPixelRatio: MAX_DIFF_PIXEL_RATIO, timeout: budget(120_000) })
})
