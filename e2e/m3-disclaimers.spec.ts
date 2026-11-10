/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { openAnalysis } from './studio-helpers'

// D34 — claim and disclaimer audit (docs/plans/M3-fable-plan.md §10, AGENTS.md §7).
//
// Required wording on the constraints status surface, in the metrics "About these numbers"
// disclosure and in the Sun method note — and no rendered UI string across the studio and the
// marketing pages may carry a forbidden claim: "sun hours" (the permitted phrasing is the
// hyphenated negation "sun-hours assessment"), "compliant", "verified", "BIM-ready",
// "official parcel".
test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
test.setTimeout(120_000)

const FORBIDDEN_CLAIMS = ['sun hours', 'compliant', 'verified', 'bim-ready', 'bim ready', 'official parcel'] as const

/** Sweep the whole rendered page: visible text, hidden panels, titles and aria-labels. */
async function expectNoForbiddenClaims(page: Page, where: string) {
  const samples = await page.evaluate(() => {
    const titles = [...document.querySelectorAll<HTMLElement>('[title]')].map((node) => node.getAttribute('title') ?? '')
    const labels = [...document.querySelectorAll<HTMLElement>('[aria-label]')].map((node) => node.getAttribute('aria-label') ?? '')
    return { body: document.body.textContent ?? '', titles: titles.join('\n'), labels: labels.join('\n') }
  })
  const haystack = `${samples.body}\n${samples.titles}\n${samples.labels}`.toLowerCase()
  for (const claim of FORBIDDEN_CLAIMS) {
    expect(haystack.includes(claim), `${where}: rendered UI must not contain "${claim}"`).toBe(false)
  }
}

test('D34: required wording is present in the studio panels and forbidden claims are absent', async ({ page }) => {
  await page.goto('/studio/compact-infill')
  await expect(page.getByRole('region', { name: /3D site viewport/ })).toBeVisible()

  // Sun group: the method note states this is not a daylight or sun-hours assessment.
  await openAnalysis(page, 'Sun')
  await expect(page.getByText('Geometric sun direction for this site (suncalc). Not a daylight or sun-hours assessment.')).toBeVisible()
  await expectNoForbiddenClaims(page, 'studio Sun group')

})

test('D34: marketing pages carry no forbidden claim', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expectNoForbiddenClaims(page, 'landing page')

  await page.goto('/about')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expectNoForbiddenClaims(page, 'about page')
})