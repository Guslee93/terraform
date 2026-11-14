/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { openAnalysis } from './studio-helpers'
import { budget } from './budget'

// D34 — claim and disclaimer audit (docs/plans/M3-fable-plan.md §10, AGENTS.md §7).
//
// Required wording on the constraints status surface, in the metrics "About these numbers"
// disclosure and in the Sun method note — and no rendered UI string across the studio and the
// marketing pages may carry a forbidden claim: "compliant", "verified", "BIM-ready",
// "official parcel".
//
// "Sun hours" is checked separately (see below): ADR-0021 (2026-11-10) added a sun-hours
// analysis after this audit was written, so the studio may name that mode and repeat its
// qualified note, but no other wording may use the words.
test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
test.setTimeout(budget(120_000))

const FORBIDDEN_CLAIMS = ['compliant', 'verified', 'bim-ready', 'bim ready', 'official parcel'] as const

/** ADR-0021 §"Claim wording (exact)": the only honest sun-hours sentence the studio may show. */
const SANCTIONED_SUN_HOURS_NOTE =
  'Indicative sun hours — geometric, clear sky, buildings only. Not a daylight assessment.'

/** The Sun card's analysis-mode label (ADR-0021; ADR-0031: `Shadows | Sun hours | Roof solar | VSC`). */
const SANCTIONED_SUN_HOURS_LABEL = 'Sun hours'

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

/**
 * Every rendered use of the words "sun hours" must be the ADR-0021 mode label or its qualified
 * note. Anything else — a headline, a legend, a marketing sentence — would be a claim.
 */
async function expectNoSunHoursClaim(page: Page, where: string) {
  const hits = await page.evaluate(() => {
    const found: string[] = []
    const visit = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = (node.textContent ?? '').trim()
        if (text && /sun hours/i.test(text)) found.push(text)
      }
      node.childNodes.forEach(visit)
    }
    visit(document.body)
    document.querySelectorAll<HTMLElement>('[title],[aria-label]').forEach((node) => {
      const value = `${node.getAttribute('title') ?? ''} ${node.getAttribute('aria-label') ?? ''}`.trim()
      if (value && /sun hours/i.test(value)) found.push(value)
    })
    return found
  })
  for (const hit of hits) {
    const sanctioned = hit === SANCTIONED_SUN_HOURS_LABEL || hit.includes(SANCTIONED_SUN_HOURS_NOTE)
    expect(sanctioned, `${where}: "${hit}" is not the sanctioned sun-hours wording`).toBe(true)
  }
}

test('D34: required wording is present in the studio panels and forbidden claims are absent', async ({ page }) => {
  await page.goto('/studio/compact-infill')
  await expect(page.getByRole('region', { name: /3D site viewport/ })).toBeVisible()

  // Sun group: the method note states this is not a daylight assessment.
  await openAnalysis(page, 'Sun')
  await expect(page.getByText('Geometric sun direction for this site (suncalc). Not a daylight assessment.')).toBeVisible()
  await expectNoForbiddenClaims(page, 'studio Sun group')
  await expectNoSunHoursClaim(page, 'studio Sun group')

  // ADR-0031: the sun-hours controls, legend and caption keep to the sanctioned wording too.
  await page.getByRole('group', { name: 'Sun analysis' }).first().getByRole('button', { name: 'Sun hours', exact: true }).click()
  await expect(page.getByLabel('Median hours of direct sun in the circle')).toBeVisible()
  await expectNoForbiddenClaims(page, 'studio Sun hours')
  await expectNoSunHoursClaim(page, 'studio Sun hours')

})

test('D34: marketing pages carry no forbidden claim', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expectNoForbiddenClaims(page, 'landing page')
  await expectNoSunHoursClaim(page, 'landing page')

  await page.goto('/about')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expectNoForbiddenClaims(page, 'about page')
  await expectNoSunHoursClaim(page, 'about page')
})
