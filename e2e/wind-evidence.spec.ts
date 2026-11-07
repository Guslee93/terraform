/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'

// X5 — wind evidence screenshots (docs/handoffs/X5-minimax-wind-evidence.md).
//
// Writes docs/screenshots/wind-*.png for the wind gate: the gap jet, the streamlines, comfort at
// 6 m/s and the delta against a baseline with a new tower on the upwind side. The file names are
// fixed because the case study links to them.
//
// The render quality is pinned to High so the image review sees the full look (AO + 4096 shadows);
// headless software GL would otherwise drop to "Auto → Low". Motion is NOT reduced here: the
// particles must be moving in the evidence.
//
// Capture is opt-in so the regular suite stays fast and the file system quiet:
//   SHOT_EVIDENCE=1 npx playwright test e2e/wind-evidence.spec.ts
test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' })
test.setTimeout(240_000)

const OUT_DIR = 'docs/screenshots'

test.skip(
  process.env.SHOT_EVIDENCE !== '1',
  'Evidence capture is opt-in: run SHOT_EVIDENCE=1 npx playwright test e2e/wind-evidence.spec.ts',
)

/** Camera height of the "Plan" preset per site (public/sites/<id>/manifest.json cameraPresets.top). */
const TOP_VIEW_HEIGHT_M: Record<string, number> = { 'compact-infill': 688.74, 'sloped-edge': 868.51 }
/** Vertical field of view of every camera preset (32°). */
const FOV_DEG = 32

/** Open a site, pin the render quality and switch the wind layer on. */
async function openWind(page: Page, site: string) {
  await page.addInitScript(() => {
    window.localStorage.setItem('terraform.renderQuality', 'high')
  })
  await page.goto(`/studio/${site}`)
  await expect(page.getByRole('region', { name: /3D site viewport/ })).toBeVisible()
  const inspector = page.getByRole('complementary', { name: 'Inspector' })
  const windButton = inspector.getByRole('button', { name: 'Wind', exact: true })
  if (!(await windButton.isVisible())) {
    await inspector.locator('summary').filter({ hasText: /^Wind and noise/ }).click()
  }
  await inspector.getByRole('group', { name: 'Climate layer' }).getByRole('button', { name: 'Wind', exact: true }).click()
  // The claim shows in the panel and on the viewport (C23 finding 3); check the viewport copy.
  await expect(page.getByRole('region', { name: /3D site viewport/ }).getByText('Indicative wind screening — 2D flow, not engineering')).toBeVisible({ timeout: 15_000 })
}

/** The flow must have settled before a shot: "Set baseline" is only enabled then. */
async function waitForSettled(page: Page) {
  await expect(page.getByRole('button', { name: 'Set baseline', exact: true })).toBeEnabled({ timeout: 30_000 })
  await page.waitForTimeout(1500) // let the particles move
}

test('X5: the gap jet on Compact Infill in the Direction view', async ({ page }) => {
  await openWind(page, 'compact-infill')
  await page.getByRole('group', { name: 'Wind map shows' }).getByRole('button', { name: 'Direction', exact: true }).click()
  await page.getByRole('button', { name: '3D', exact: true }).click()
  await waitForSettled(page)
  await page.screenshot({ path: `${OUT_DIR}/wind-gap-jet.png` })
})

test('X5: the streamlines over Compact Infill in the top view', async ({ page }) => {
  await openWind(page, 'compact-infill')
  await page.getByRole('checkbox', { name: 'Streamlines' }).check()
  await page.getByRole('button', { name: 'Plan', exact: true }).click()
  await waitForSettled(page)
  await page.screenshot({ path: `${OUT_DIR}/wind-streamlines.png` })
})

test('X5: the comfort bands at 6 m/s on Sloped Edge', async ({ page }) => {
  await openWind(page, 'sloped-edge')
  // Comfort is the default display and the reference speed defaults to 6 m/s.
  await expect(page.getByRole('group', { name: 'Wind map shows' }).getByRole('button', { name: 'Comfort', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('slider', { name: 'Wind at 10 m height' })).toHaveValue('6')
  await page.getByRole('button', { name: '3D', exact: true }).click()
  await waitForSettled(page)
  // The inspector is taller than the panel: scroll the legend into view so the image shows the
  // comfort bands and the reference speed, not only the direction dial.
  await page.getByRole('list', { name: 'Wind comfort legend' }).scrollIntoViewIfNeeded()
  await expect(page.getByRole('list', { name: 'Wind comfort legend' })).toBeVisible()
  await page.screenshot({ path: `${OUT_DIR}/wind-comfort-6ms.png` })
})

test.describe('delta against a baseline', () => {
  // The delta shot starts in the analysis-only studio and switches massing on with the button, so
  // it gets its own storage state: no leaked test-building flag, no guide.
  test.use({
    storageState: {
      cookies: [],
      origins: [{ origin: 'http://127.0.0.1:5173', localStorage: [{ name: 'terraform:studio-guide-dismissed:v1', value: 'true' }] }],
    },
  })

  test('X5: the delta after a tower is drawn on the upwind side of Sloped Edge', async ({ page }) => {
    await openWind(page, 'sloped-edge')
    await waitForSettled(page)
    await page.getByRole('button', { name: 'Set baseline', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Delta', exact: true })).toBeVisible()

    // Massing on, then the top view: metres map linearly to pixels there.
    await page.getByRole('button', { name: 'Test a building' }).click()
    await page.getByRole('button', { name: 'Plan', exact: true }).click()
    await page.waitForTimeout(800)

    const viewport = page.getByRole('region', { name: /3D site viewport/ })
    const box = await viewport.boundingBox()
    if (!box) throw new Error('The 3D site viewport region was not found')
    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2
    // The plan preset looks straight down with a 32° vertical fov from TOP_VIEW_HEIGHT_M, so the
    // ground span over the canvas height is 2 · h · tan(fov / 2).
    const metresPerPx = (2 * TOP_VIEW_HEIGHT_M['sloped-edge']! * Math.tan((FOV_DEG * Math.PI) / 180 / 2)) / box.height

    await page.getByRole('button', { name: 'Draw building' }).click()
    // A 22 × 44 m footprint on the upwind (west) side of the analysis circle: the wind is from
    // the west, so this is where a new tower changes the flow.
    for (const [east, north] of [[-70, 22], [-48, 22], [-48, -22], [-70, -22]]) {
      await page.mouse.click(cx + east / metresPerPx, cy - north / metresPerPx)
    }
    await page.getByRole('button', { name: 'Draw building' }).evaluate((button) => button.blur())
    await page.keyboard.press('Enter')
    await expect(page.getByLabel('Name')).toHaveValue('Mass 1')

    // 12 storeys at the 3.2 m default = 38.4 m: tall enough to matter, short enough to stay legal.
    const storeys = page.getByRole('textbox', { name: 'Storeys' })
    await storeys.fill('12')
    await storeys.press('Enter')
    await expect(storeys).toHaveValue('12')

    // The edit invalidates the settled field; wait for the solver to settle again.
    const setBaseline = page.getByRole('button', { name: 'Set baseline', exact: true })
    await expect(setBaseline).toBeDisabled()
    await expect(setBaseline).toBeEnabled({ timeout: 30_000 })
    await page.waitForTimeout(1500)

    await page.getByRole('button', { name: '3D', exact: true }).click()
    await page.waitForTimeout(800)
    await page.getByRole('button', { name: 'Delta', exact: true }).click()
    await expect(page.getByRole('list', { name: /No change/ })).toBeVisible()
    await page.waitForTimeout(1500)
    await page.screenshot({ path: `${OUT_DIR}/wind-delta.png` })

    // Delete the mass again so the stored project stays clean.
    await page.getByRole('button', { name: 'Delete', exact: true }).click()
    // The mass fields disappear once nothing is selected — the mass is really gone.
    await expect(page.getByRole('textbox', { name: 'Storeys' })).toHaveCount(0)
  })
})

// W5 — the Forma-style 3D look: streamlines over roofs, roof colouring, m/s ramp.
test('W5: 3D streamlines and roof wind on Compact Infill (Direction, m/s)', async ({ page }) => {
  await openWind(page, 'compact-infill')
  await page.getByRole('group', { name: 'Wind map shows' }).getByRole('button', { name: 'Direction', exact: true }).click()
  await page.getByRole('checkbox', { name: 'Streamlines' }).check()
  await page.getByRole('button', { name: '3D', exact: true }).click()
  // The upper height slices solve in the background (~10 s each); the height select unlocks then.
  await expect(page.getByLabel(/Streamline height/i)).toBeEnabled({ timeout: 150_000 })
  await page.waitForTimeout(2000)
  await page.screenshot({ path: `${OUT_DIR}/wind-3d-streamlines.png` })
})

// ADR-0015 — worst case over 8 directions with the exposure rose.
test('Sweep: worst-case map and direction rose on Compact Infill', async ({ page }) => {
  await openWind(page, 'compact-infill')
  const section = page.getByRole('region', { name: 'All wind directions' })
  await section.getByRole('button', { name: 'Analyse 8 directions' }).click()
  await expect(section.getByText(/directions solved/)).toHaveCount(0, { timeout: 120_000 })
  await expect(section.getByText(/Worst direction:/)).toBeVisible()
  await page.getByRole('group', { name: 'Wind map shows' }).getByRole('button', { name: 'Worst case' }).click()
  await page.getByRole('button', { name: '3D', exact: true }).click()
  await page.waitForTimeout(2000)
  await section.scrollIntoViewIfNeeded()
  await page.screenshot({ path: `${OUT_DIR}/wind-worst-case.png` })
})
