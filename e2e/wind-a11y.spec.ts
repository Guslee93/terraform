import { expect, test, type Page } from '@playwright/test'

// Wind panel accessibility (docs/plans/wind-finish-plan.md D1/D2). No axe dependency: the same
// DOM-level checks as e2e/m5-a11y.spec.ts — every control named, WCAG 2.2 target size ≥ 24 px —
// plus the reduced-motion behaviour of Play demo.
test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })

async function openWind(page: Page) {
  await page.goto('/studio/compact-infill')
  const inspector = page.getByRole('complementary', { name: 'Inspector' })
  await expect(page.getByRole('region', { name: /3D site viewport/ })).toBeVisible()
  const wind = inspector.getByRole('button', { name: 'Wind', exact: true })
  if (!(await wind.isVisible())) await inspector.locator('summary').filter({ hasText: /^Wind and noise/ }).click()
  await inspector.getByRole('group', { name: 'Climate layer' }).getByRole('button', { name: 'Wind', exact: true }).click()
  await expect(page.getByRole('region', { name: /3D site viewport/ }).getByText(/Indicative wind screening/)).toBeVisible({ timeout: 15_000 })
  return inspector
}

test('every Wind panel control has an accessible name and a 24 px target', async ({ page }) => {
  const inspector = await openWind(page)
  const climate = inspector.locator('[data-panel-group="climate"], details:has(summary:has-text("Wind and noise"))').first()
  const problems = await climate.locator('button, input, select').evaluateAll((els) => els.flatMap((el) => {
    const e = el as HTMLInputElement
    const r = e.getBoundingClientRect()
    if (r.width === 0 && r.height === 0) return [] // not rendered
    const name = (e.labels?.[0]?.textContent ?? '') || e.getAttribute('aria-label') || (e.tagName === 'BUTTON' ? e.textContent : '') || ''
    const out: string[] = []
    if (!name.trim()) out.push(`${e.tagName.toLowerCase()}#${e.id || '?'} has no accessible name`)
    // Checkboxes inside a full-width label count the label as the target.
    const target = e.type === 'checkbox' && e.closest('label') ? e.closest('label')!.getBoundingClientRect() : r
    if (target.height < 24 && target.width < 24) out.push(`${e.tagName.toLowerCase()} "${name.trim().slice(0, 30)}" target ${Math.round(target.width)}×${Math.round(target.height)}`)
    return out
  }))
  expect(problems).toEqual([])
})

test('Play demo under reduced motion steps through fixed directions without orbiting', async ({ page }) => {
  // Regression: a negative first rAF time once crashed the studio here (demoFrame, reduced motion).
  const errors: string[] = []
  page.on('console', (m) => { if (m.type() === 'error' && /render error/.test(m.text())) errors.push(m.text()) })
  await openWind(page)
  const dial = page.getByLabel('Wind blows from')
  await page.getByRole('button', { name: 'Play demo' }).click()
  await expect(page.getByRole('button', { name: 'Stop demo' })).toBeVisible()
  // Reduced script: 270° for 0–3 s, then 0°, 90°, 180°, 3 s each.
  await expect(dial).toHaveValue('0', { timeout: 6_000 })
  await expect(dial).toHaveValue('90', { timeout: 6_000 })
  await page.getByRole('button', { name: 'Stop demo' }).click()
  await expect(dial).toHaveValue('270') // settings restored
  expect(errors).toEqual([])
})
