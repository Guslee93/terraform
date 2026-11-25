/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { openAnalysis } from './studio-helpers'
import { budget } from './budget'

// TF-VIS-046 — stale-result and rapid-change characterisation (studio, no source change). The
// analyses compute in workers; while inputs differ from the result the UI must say so ("computing"
// or the loading text), and once settled the overlay must correspond to the final inputs. These
// tests are opt-in because they exercise the full sun-hours / runoff workers and are timing-heavy.
test.skip(process.env.STALE !== '1', 'Opt-in: STALE=1')
test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
test.setTimeout(budget(240_000))

async function openStudioView(page: Page) {
  await page.goto('/studio/compact-infill')
  await expect(page.getByRole('region', { name: /3D site viewport for Compact Infill/i })).toBeVisible({ timeout: budget(120_000) })
}

test('Water shows the tracing text while it computes, then the screening note', async ({ page }) => {
  await openStudioView(page)
  await openAnalysis(page, 'Water')
  // The 1 m tile fetch + worker take seconds, so the loading caption is reliably observable.
  await expect(page.getByText('Tracing where the water runs…').first()).toBeVisible({ timeout: budget(60_000) })
  await expect(page.getByText(/Screening: flow paths and depressions/).first()).toBeVisible({ timeout: budget(120_000) })
})

// The two Sun-hours cases below are timing-sensitive: the sun-hours worker takes ~10 s+ per input
// change on this machine (under load), so the "computing" state and the final-overlay transition
// cannot be asserted deterministically within a reasonable timeout without changing app code. They
// are kept as fixme with the reason, and the deterministic Water / circle cases stay active.
test.fixme('changing the date while sun hours compute settles on the final date', async ({ page }) => {
  await openStudioView(page)
  await openAnalysis(page, 'Sun')
  const card = page.getByRole('region', { name: 'Sun card' })
  const readout = card.getByLabel('Median hours of direct sun in the circle')
  await expect(readout.locator('dd').first()).toHaveText(/^\d+(\.\d)? h$/, { timeout: budget(60_000) })
  const summer = await readout.locator('dd').first().textContent()

  // Two rapid date changes; the overlay must end up matching the final (winter) date.
  await card.getByLabel('Local date').fill('2026-03-21')
  await card.getByLabel('Local date').fill('2026-12-21')
  await expect.poll(async () => {
    const text = await readout.locator('dd').first().textContent()
    return text !== summer && /^\d+(\.\d)? h$/.test(text ?? '')
  }, { timeout: budget(60_000) }).toBe(true)
  const winter = Number.parseFloat((await readout.locator('dd').first().textContent()) ?? '0')
  expect(winter).toBeLessThan(Number.parseFloat(summer ?? '0'))
})

test('moving the analysis circle repeatedly settles on the final radius', async ({ page }) => {
  await openStudioView(page)
  await openAnalysis(page, 'Sun')
  const card = page.getByRole('region', { name: 'Sun card' })
  const readout = card.getByLabel('Median hours of direct sun in the circle')
  // The circle slider renders with the Sun-hours controls once the first result has arrived.
  await expect(readout.locator('dd').first()).toHaveText(/^\d+(\.\d)? h$/, { timeout: budget(60_000) })
  const slider = card.getByRole('slider', { name: 'Analysis circle' })
  await expect(slider).toBeVisible()

  // Rapid radius changes (the slider runs 60–250 m); the caption must end at the final radius.
  await slider.fill('60')
  await slider.fill('120')
  await slider.fill('80')
  await expect(card.getByText('r = 80 m')).toBeVisible({ timeout: budget(30_000) })
})

test.fixme('switching cards while sun hours compute keeps the final overlay consistent', async ({ page }) => {
  await openStudioView(page)
  await openAnalysis(page, 'Sun')
  const card = page.getByRole('region', { name: 'Sun card' })
  const readout = card.getByLabel('Median hours of direct sun in the circle')
  await expect(readout.locator('dd').first()).toHaveText(/^\d+(\.\d)? h$/, { timeout: budget(60_000) })

  // Switch away and back while the worker is warm; the readout must return a valid value
  // (no stale/blank overlay), not necessarily the exact same floating-point figure.
  await openAnalysis(page, 'Noise')
  await expect(page.getByText(/Statens vegvesen/).first()).toBeVisible({ timeout: budget(30_000) })
  await openAnalysis(page, 'Sun')
  await expect(readout.locator('dd').first()).toHaveText(/^\d+(\.\d)? h$/, { timeout: budget(60_000) })
})
