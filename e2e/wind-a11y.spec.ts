import { expect, test, type Page } from '@playwright/test'
import { openAnalysis } from './studio-helpers'
import { budget } from './budget'

// Wind panel accessibility (docs/plans/wind-finish-plan.md D1/D2). No axe dependency: the same
// DOM-level checks as e2e/m5-a11y.spec.ts — every control named, WCAG 2.2 target size ≥ 24 px —
// plus the reduced-motion behaviour of Play demo.
test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })

async function openWind(page: Page) {
  await page.goto('/studio/compact-infill')
  await expect(page.getByRole('button', { name: 'Add a block' })).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByRole('region', { name: /3D site viewport/ })).toBeVisible()
  const inspector = await openAnalysis(page, 'Wind')
  await expect(page.getByRole('region', { name: /3D site viewport/ }).getByText(/Indicative wind screening/)).toBeVisible({ timeout: budget(15_000) })
  return inspector
}

test('every Wind panel control has an accessible name and a 24 px target', async ({ page }) => {
  await openWind(page)
  // The wind controls live in the wind card of the Parameters panel.
  const climate = page.getByRole('region', { name: 'Wind card' })
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
  // The demo follows performance.now() through requestAnimationFrame. On a runner that rasterises
  // in software, frames can land more than 3 s apart and a whole step is never drawn, so the test
  // owns the clock: each fast-forward fires one frame at a known time in the script. An installed
  // clock still runs in real time, so it is paused first; otherwise a slow page plays on by itself.
  await page.clock.install()
  const now = await page.evaluate(() => Date.now())
  await page.clock.pauseAt(now + 1_000)
  await page.getByRole('button', { name: 'Play demo' }).click()
  await expect(page.getByRole('button', { name: 'Stop demo' })).toBeVisible()
  // Reduced script: 270° for 0–3 s, then 0°, 90°, 180°, 3 s each.
  await expect(dial).toHaveValue('270')
  await page.clock.fastForward(3_500)
  await expect(dial).toHaveValue('0')
  await page.clock.fastForward(3_000)
  await expect(dial).toHaveValue('90')
  await page.getByRole('button', { name: 'Stop demo' }).click()
  await expect(dial).toHaveValue('270') // settings restored
  expect(errors).toEqual([])
})
