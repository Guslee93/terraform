import { expect, test, type Page } from '@playwright/test'
import { openGroup } from './studio-helpers'
import {
  expectSaved,
  expectSaveStatus,
  failPutsWithQuota,
  openScenarioMenu,
  openStudio,
  payloadFor,
  readFixture,
  rectangleScenario,
  seedRows,
  SITE,
  SEEDED_NOW,
} from './m4-helpers'

// D37 — M4 evidence screenshots into docs/screenshots, fixed 1440×900 reference view.
// Capture is opt-in so the regular suite stays fast and file-system quiet (same convention as
// e2e/m3-evidence.spec.ts):
//   SHOT_EVIDENCE=1 npx playwright test --workers=1 e2e/m4-evidence.spec.ts

test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
test.setTimeout(300_000)
test.skip(
  process.env.SHOT_EVIDENCE !== '1',
  'Evidence capture is opt-in: run SHOT_EVIDENCE=1 npx playwright test e2e/m4-evidence.spec.ts',
)

const OUT = 'docs/screenshots'
const SUFFIX = '1440x900'

async function shoot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `${OUT}/${name}-${SUFFIX}.png` })
}

test('D37: captures the M4 evidence set at 1440×900', async ({ browser }) => {
  // 1. Comparison with two matched thumbnails.
  // 2. Scenario menu open over the same seeded pair.
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  const a = rectangleScenario({ id: 'qa12-a', name: 'Concept A', storeys: 3, notes: 'Low concept' })
  const b = rectangleScenario({ id: 'qa12-b', name: 'Concept B', storeys: 7, notes: 'Tall concept' })
  await seedRows(context, payloadFor('qa12-a', [
    { id: a.id, json: JSON.stringify(a) },
    { id: b.id, json: JSON.stringify(b) },
  ]))
  await openStudio(page)
  await expectSaved(page)
  await page.getByLabel('Height measured from').selectOption('datum')
  await page.locator('header').getByRole('button', { name: 'Compare' }).click()
  const panel = page.getByRole('complementary', { name: 'Compare' })
  await expect(panel).toBeVisible()
  const images = panel.locator('img')
  const failedFallback = panel.getByText('Thumbnail unavailable in this browser')
  await expect(async () => {
    expect((await images.count()) === 2 || (await failedFallback.count()) === 1).toBe(true)
  }).toPass({ timeout: 25_000 })
  await page.waitForTimeout(1200)
  await shoot(page, 'm4-evidence-comparison')

  await openScenarioMenu(page)
  await expect(page.getByRole('group', { name: 'Scenarios' })).toBeVisible()
  await page.waitForTimeout(400)
  await shoot(page, 'm4-evidence-scenario-menu-open')
  await context.close()

  // 3. Recovery strip with a corrupt saved record.
  const corruptContext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const corruptPage = await corruptContext.newPage()
  const corruptText = await readFixture('corrupt-truncated.json')
  const valid = rectangleScenario({ id: 'seed-a', name: 'Concept A', storeys: 3 })
  await seedRows(corruptContext, {
    project: {
      schemaVersion: 2,
      siteId: SITE,
      activeScenarioId: 'seed-a',
      scenarioIds: ['seed-a', 'seed-b-corrupt'],
      updatedAt: SEEDED_NOW,
    },
    scenarios: [
      { id: 'seed-a', siteId: SITE, json: JSON.stringify(valid) },
      { id: 'seed-b-corrupt', siteId: SITE, json: corruptText },
    ],
  })
  await openStudio(corruptPage)
  await expect(corruptPage.getByRole('region', { name: 'Project recovery' })).toBeVisible()
  await expect(corruptPage.getByText(/couldn't be opened/)).toBeVisible()
  await corruptPage.waitForTimeout(800)
  await shoot(corruptPage, 'm4-evidence-recovery-corrupt')
  await corruptContext.close()

  // 4. Read-only newer-version state.
  const newerContext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const newerPage = await newerContext.newPage()
  await seedRows(newerContext, {
    project: {
      schemaVersion: 99,
      siteId: SITE,
      activeScenarioId: 'future',
      scenarioIds: ['future'],
      updatedAt: SEEDED_NOW,
    },
    scenarios: [],
  })
  await openStudio(newerPage)
  await expectSaveStatus(newerPage, 'Read-only — saved by a newer version')
  await expect(newerPage.getByRole('region', { name: 'Project recovery' })).toBeVisible()
  await newerPage.waitForTimeout(800)
  await shoot(newerPage, 'm4-evidence-readonly-newer-version')
  await newerContext.close()

  // 5. Storage-full state after a quota failure.
  const quotaContext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const quotaPage = await quotaContext.newPage()
  await openStudio(quotaPage)
  await expectSaved(quotaPage)
  await failPutsWithQuota(quotaPage)
  await openGroup(quotaPage, 'Notes')
  await quotaPage.getByLabel('Scenario notes').fill('Storage is full — export a backup')
  await quotaPage.getByLabel('Scenario notes').press('Tab')
  await expectSaveStatus(quotaPage, 'Not saved — storage is full')
  await expect(quotaPage.getByRole('region', { name: 'Project recovery' })).toBeVisible()
  await quotaPage.waitForTimeout(800)
  await shoot(quotaPage, 'm4-evidence-storage-full')
  await quotaContext.close()
})