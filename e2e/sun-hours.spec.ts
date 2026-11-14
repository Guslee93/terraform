/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { openAnalysis } from './studio-helpers'
import { budget } from './budget'

// ADR-0031 — sun hours in the analysis circle: the ground, roofs and façades of the circle get
// hours of direct sun for the date and a window of the day, computed in a worker.
test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
test.setTimeout(budget(120_000))

const DISCLAIMER = 'Indicative sun hours — geometric, clear sky, buildings only. Not a daylight assessment.'

test('ADR-0031: sun hours fill the analysis circle, follow the window and the circle, and leave with Shadows', async ({ page }) => {
  await page.goto('/studio/compact-infill')
  await expect(page.getByRole('region', { name: /3D site viewport for Compact Infill/i })).toBeVisible()
  await openAnalysis(page, 'Sun')
  const analysis = page.getByRole('group', { name: 'Sun analysis' }).first()
  await expect(analysis.getByRole('button', { name: 'Façade', exact: true })).toHaveCount(0)
  await analysis.getByRole('button', { name: 'Sun hours', exact: true }).click()

  const card = page.getByRole('region', { name: 'Sun card' })
  const readout = card.getByLabel('Median hours of direct sun in the circle')
  // The worker answers: ground, roofs and façades each get a median in hours.
  await expect(readout.locator('dd')).toHaveText([/^\d+(\.\d)? h$/, /^\d+(\.\d)? h$/, /^\d+(\.\d)? h$/], { timeout: budget(30_000) })
  const viewport = page.getByRole('region', { name: /3D site viewport/ })
  await expect(viewport.getByText(DISCLAIMER)).toBeVisible()
  await expect(viewport.getByRole('img', { name: /^Colour scale, 0 to [\d.]+ hours of direct sun$/ })).toBeVisible()
  const allDay = await readout.locator('dd').first().textContent()

  // An afternoon window: fewer hours on the same ground.
  await card.getByRole('slider', { name: 'From' }).fill('720')
  await expect(card.getByText('12:00–24:00', { exact: true })).toBeVisible()
  await expect(readout.locator('dd').first()).not.toHaveText(allDay ?? '', { timeout: budget(30_000) })
  const afternoon = Number.parseFloat((await readout.locator('dd').first().textContent()) ?? '')
  expect(afternoon).toBeLessThan(Number.parseFloat(allDay ?? ''))

  // The circle the wind analysis uses: its size slider and Move circle are here too.
  await card.getByRole('slider', { name: 'Analysis circle' }).fill('60')
  await expect(card.getByText('r = 60 m')).toBeVisible()
  await expect(card.getByRole('button', { name: 'Move circle' })).toBeVisible()

  await analysis.getByRole('button', { name: 'Shadows', exact: true }).click()
  await expect(card.getByLabel('Median hours of direct sun in the circle')).toHaveCount(0)
  await expect(viewport.getByText(DISCLAIMER)).toHaveCount(0)
})
