/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { openAnalysis, parameters } from './studio-helpers'

// D33 — M3 fixed-camera evidence screenshots (docs/plans/M3-fable-plan.md §10, §11).
//
// Writes docs/screenshots/m3-*.png for the M3 gate visual review: morning/noon/evening on
// 21 June, noon on 21 December, below-horizon (21 Dec 18:00) and an envelope violation
// (ISO view plus a close-up where the height-limit plane is visible). The render quality is
// pinned to High so Claude's image review sees the full look (AO + 4096 shadows); headless
// software GL would otherwise drop to "Auto → Low".
//
// Capture is opt-in so the regular suite stays fast and file-system quiet:
//   SHOT_EVIDENCE=1 npx playwright test e2e/m3-evidence.spec.ts
test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
test.setTimeout(180_000)

const OUT_DIR = 'docs/screenshots'
const SHOT_SUFFIX = '1440x900'

test.skip(
  process.env.SHOT_EVIDENCE !== '1',
  'Evidence capture is opt-in: run SHOT_EVIDENCE=1 npx playwright test e2e/m3-evidence.spec.ts',
)

test('D33: captures the fixed-camera M3 evidence set', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('terraform.renderQuality', 'high')
  })
  await page.goto('/studio/compact-infill')
  await expect(
    page.getByRole('region', { name: /3D site viewport for Compact Infill/i }),
  ).toBeVisible()
  await expect(page.getByRole('region', { name: /3D site viewport/ })).toBeVisible()
  await page.waitForTimeout(4000)

  const shoot = (name: string) => page.screenshot({ path: `${OUT_DIR}/${name}-${SHOT_SUFFIX}.png` })

  // Summer solstice day: morning (09:00) → noon (12:00) → evening (18:00), 3D camera.
  // Time presets live in the collapsed Sun group of the inspector panel.
  await openAnalysis(page, 'Sun')
  await page.getByRole('button', { name: 'Morning' }).click()
  await page.waitForTimeout(1500)
  await shoot('m3-morning-21jun')

  await page.getByRole('button', { name: 'Noon' }).click()
  await page.waitForTimeout(1500)
  await shoot('m3-noon-21jun')

  await page.getByRole('button', { name: 'Evening' }).click()
  await page.waitForTimeout(1500)
  await shoot('m3-evening-21jun')

  // Winter solstice: noon (12:00) and 18:00 (below the horizon).
  await page.getByRole('button', { name: 'Winter solstice' }).click()
  await page.getByRole('button', { name: 'Noon' }).click()
  await page.waitForTimeout(1500)
  await shoot('m3-noon-21dec')

  await page.getByRole('button', { name: 'Evening' }).click()
  await expect(page.getByRole('region', { name: 'Sun and shadows' }).getByRole('status')).toHaveText('Sun below horizon')
  await page.waitForTimeout(1200)
  await shoot('m3-below-horizon-21dec-1800')

  // Envelope violation, in daylight (21 June 15:00, the default view): a realistic ~24 × 30 m
  // mass straddling the study boundary's west edge (±95 m; terrain ends at ±111.9 m), raised to 7 storeys (22.4 m) so it
  // also breaks the 18 m limit and the height-limit plane visibly cuts through it.
  await page.getByRole('button', { name: 'Summer solstice' }).click()
  await page.getByLabel('Local time').fill('900')
  await expect(page.getByText('2026-06-21 15:00 CEST')).toBeVisible()
  await page.getByRole('button', { name: 'Plan', exact: true }).click()
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: 'Draw building' }).click()
  const viewport = page.getByRole('region', { name: /3D site viewport for Compact Infill/i })
  const box = await viewport.boundingBox()
  if (!box) throw new Error('The 3D site viewport region was not found')
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  // Top view scale: 0.26 × viewport height ≈ 103 m, so metres → px = box.height * 0.26 / 103.
  const px = (metres: number) => Math.round((metres * box.height * 0.26) / 103)
  for (const [east, north] of [[-106, 15], [-82, 15], [-82, -15], [-106, -15]]) {
    await page.mouse.click(cx + px(east), cy - px(north))
  }
  await page.getByRole('button', { name: 'Draw building' }).evaluate((button) => button.blur())
  await page.keyboard.press('Enter')

  // The created mass is selected; its Name field is in the panel's Buildings section.
  await expect(page.getByLabel('Name')).toHaveValue('Mass 1')
  const storeys = page.getByRole('textbox', { name: 'Storeys' })
  await storeys.fill('7')
  await storeys.press('Enter')
  await expect(storeys).toHaveValue('7')

  await page.getByRole('button', { name: '3D', exact: true }).click()
  await page.waitForTimeout(800)
  await expect(page.getByRole('heading', { name: 'Exceeds demo envelope' })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Mass 1 is outside the setback/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /above the limit/ })).toBeVisible()
  // Show the design check, not the fields the Storeys edit scrolled to.
  await parameters(page).evaluate((panel) => panel.scrollTo(0, 0))
  await page.waitForTimeout(1500)
  await shoot('m3-envelope-violation-iso')

  // Close-up: dolly towards the target so the translucent height-limit plane above the mass reads.
  await page.mouse.move(cx, cy)
  for (let index = 0; index < 3; index += 1) {
    await page.mouse.wheel(0, -700)
    await page.waitForTimeout(250)
  }
  await page.waitForTimeout(1500)
  await shoot('m3-envelope-violation-closeup')
})