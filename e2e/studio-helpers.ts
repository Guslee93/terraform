import type { Page } from '@playwright/test'

/** The studio's right panel (ADR-0016). */
export const parameters = (page: Page) => page.getByRole('complementary', { name: 'Parameters' })

/**
 * Make a dock card active (ADR-0016 rev 2). Its quick controls appear in the dock and its full
 * controls open as the first group of Parameters. No-op when the card is already active.
 */
export async function openAnalysis(page: Page, label: 'Draw' | 'Sun' | 'Wind' | 'Noise' | 'Area') {
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
