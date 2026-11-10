import type { Page } from '@playwright/test'

/** The studio's right panel (ADR-0016). */
export const parameters = (page: Page) => page.getByRole('complementary', { name: 'Parameters' })

/**
 * Make a dock card active (ADR-0016 rev 2). Its quick controls appear in the dock and its full
 * controls open as the first group of Parameters. No-op when the card is already active.
 */
export async function openAnalysis(page: Page, label: 'Blocks' | 'Sun' | 'Wind' | 'Noise') {
  const card = page.getByRole('group', { name: 'Analysis cards' }).getByRole('button', { name: new RegExp(`^${label}`) })
  if ((await card.getAttribute('aria-pressed')) !== 'true') await card.click()
  return parameters(page)
}

/** Open a Parameters group by its title without toggling it shut. */
export async function openGroup(page: Page, title: string) {
  const group = parameters(page).locator('details', { has: page.locator('summary', { hasText: new RegExp(`^${title}`) }) }).first()
  if (!(await group.evaluate((element) => (element as HTMLDetailsElement).open))) await group.locator('summary').click()
  return group
}

export async function openStudio(page: Page) {
  await page.goto('/studio/compact-infill')
  await page.getByRole('button', { name: 'Add a block' }).waitFor()
  await page.getByRole('button', { name: 'Add a block' }).click()
}

export async function drawMass(page: Page) {
  await page.getByRole('button', { name: 'Plan', exact: true }).click()
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: 'Draw building' }).click()
  const box = await page.getByRole('region', { name: /3D site viewport/ }).boundingBox()
  if (!box) throw new Error('No viewport')
  for (const [dx, dy] of [[-60, -60], [60, -60], [60, 60], [-60, 60]]) await page.mouse.click(box.x + box.width / 2 + dx!, box.y + box.height / 2 + dy!)
  await page.getByRole('button', { name: 'Draw building' }).evaluate((button) => button.blur())
  await page.keyboard.press('Enter')
  await page.getByRole('spinbutton', { name: 'Storeys', exact: true }).waitFor()
}
