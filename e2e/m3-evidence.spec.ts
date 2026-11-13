/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { openAnalysis } from './studio-helpers'
import { budget } from './budget'

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
test.setTimeout(budget(180_000))

const OUT_DIR = 'docs/screenshots'
const SHOT_SUFFIX = '1440x900'

test.skip(
  process.env.SHOT_EVIDENCE !== '1',
  'Evidence capture is opt-in: run SHOT_EVIDENCE=1 npx playwright test e2e/m3-evidence.spec.ts',
)

test('D33: captures the fixed-camera M3 evidence set', async ({ page }) => {
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

})
