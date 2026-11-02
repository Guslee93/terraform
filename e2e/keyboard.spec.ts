import { expect, test, type Page } from '@playwright/test'

// K1 (docs/reviews/studio-v2-code-review.md, docs/plans/M4-plan.md §6):
// the studio is keyboard-operable in visual order with a visible focus ring.

test.use({ viewport: { width: 1440, height: 900 } })

async function openStudio(page: Page) {
  await page.goto('/studio/compact-infill')
  await expect(page.getByRole('region', { name: /3D site viewport/ })).toBeVisible()
}

type Stop = { group: string; label: string; outline: string; shadow: string }

/** Which landmark group the focused element belongs to, in visual order. */
const GROUPS = ['topbar', 'tools', 'camera', 'sun', 'inspector'] as const

async function tabThrough(page: Page, max = 80): Promise<Stop[]> {
  const stops: Stop[] = []
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab')
    const stop = await page.evaluate(() => {
      const el = document.activeElement
      if (!(el instanceof HTMLElement) || el === document.body) return null
      const group = el.closest('header')
        ? 'topbar'
        : el.closest('nav[aria-label="Studio tools"]')
          ? 'tools'
          : el.closest('[role="group"][aria-label="Camera presets"]')
            ? 'camera'
            : el.closest('[aria-label="Sun and shadows"]')
              ? 'sun'
              : el.closest('aside[aria-label="Inspector"]')
                ? 'inspector'
                : 'other'
      const cs = getComputedStyle(el)
      return {
        group,
        label: (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 40),
        outline: cs.outlineStyle,
        shadow: cs.boxShadow,
      }
    })
    if (!stop) break // wrapped back to <body>: one full cycle done
    stops.push(stop)
  }
  return stops
}

test('Tab reaches top bar, tools, camera, sun band and inspector in visual order', async ({ page }) => {
  await openStudio(page)
  const stops = await tabThrough(page)
  const groups = stops.map((s) => s.group)
  const firstIndex = GROUPS.map((g) => groups.indexOf(g))

  for (const [i, g] of GROUPS.entries()) {
    expect(firstIndex[i], `focus never reached ${g}: ${JSON.stringify(groups)}`).toBeGreaterThanOrEqual(0)
  }
  for (let i = 1; i < firstIndex.length; i++) {
    expect(firstIndex[i], `${GROUPS[i]} reached before ${GROUPS[i - 1]}`).toBeGreaterThan(firstIndex[i - 1])
  }

  // Named stops within the groups, in order.
  const labels = stops.map((s) => s.label)
  const expected = [
    'Terraform home',
    'Fit site',
    'About',
    'Select',
    'Draw building',
    'Layers',
    '3D',
    'Plan',
    'North',
    'South',
    'Street',
    'Local time',
    'Play',
  ]
  const at = expected.map((name) => labels.findIndex((l) => l.startsWith(name)))
  for (const [i, name] of expected.entries()) {
    expect(at[i], `stop "${name}" not reached: ${JSON.stringify(labels)}`).toBeGreaterThanOrEqual(0)
    if (i > 0) expect(at[i], `"${name}" before "${expected[i - 1]}"`).toBeGreaterThan(at[i - 1])
  }
  // Undo/Redo are disabled with no history and must not be tab stops.
  expect(labels.some((l) => /^(Undo|Redo)/.test(l))).toBe(false)
})

test('every Tab stop has a visible focus indicator', async ({ page }) => {
  await openStudio(page)
  const stops = await tabThrough(page)
  expect(stops.length).toBeGreaterThan(10)
  const invisible = stops.filter((s) => s.outline === 'none' && s.shadow === 'none')
  expect(invisible, 'stops without outline or box-shadow').toEqual([])
})

test('Enter toggles each inspector panel group', async ({ page }) => {
  await openStudio(page)
  const inspector = page.getByRole('complementary', { name: 'Inspector' })
  const names = ['Sun', 'Layers and render quality', 'Site and sources', 'Assumptions', 'About these numbers']
  for (const name of names) {
    const summary = inspector.locator('details > summary').filter({ hasText: new RegExp(`^${name}`) })
    await expect(summary, name).toHaveCount(1)
    const details = summary.locator('xpath=..')
    const wasOpen = (await details.getAttribute('open')) !== null
    await summary.focus()
    await page.keyboard.press('Enter')
    if (wasOpen) await expect(details, `${name} closes`).not.toHaveAttribute('open')
    else await expect(details, `${name} opens`).toHaveAttribute('open', '')
    await page.keyboard.press('Enter')
    if (wasOpen) await expect(details, `${name} reopens`).toHaveAttribute('open', '')
    else await expect(details, `${name} closes again`).not.toHaveAttribute('open')
  }
})

test('Local time slider: Arrow = 15 min, Shift+Arrow = 1 h', async ({ page }) => {
  await openStudio(page)
  const slider = page.getByRole('slider', { name: 'Local time' })
  await expect(slider).toHaveAttribute('aria-valuetext', /15:00/)
  await slider.focus()
  await page.keyboard.press('ArrowRight')
  await expect(slider).toHaveAttribute('aria-valuetext', /15:15/)
  await page.keyboard.press('Shift+ArrowRight')
  await expect(slider).toHaveAttribute('aria-valuetext', /16:15/)
})
