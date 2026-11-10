import { expect, test, type BrowserContext } from '@playwright/test'
import { openGroup } from './studio-helpers'
import {
  openSiteGroup,
  blockIndexedDb,
  drawMass,
  downloadText,
  expectSaved,
  expectSaveStatus,
  failPutsWithQuota,
  openScenarioMenu,
  openStudio,
  readFixture,
  readRows,
  rectangleScenario,
  restorePut,
  scenarioTrigger,
  seedRows,
  selectMass,
  setStoreys,
  SITE,
  SEEDED_NOW,
} from './m4-helpers'

// D36 — M4 recovery end-to-end flows (QA-14, FR-048; docs/handoffs/D36-D37-m4-e2e-evidence.md).
//
// Rows are seeded straight into the page's IndexedDB (database `terraform`, tables `projects`
// keyed by `siteId` and `scenarios` keyed by `id`) before the studio loads, using the D35
// fixtures where a persisted corrupt/newer record is needed. Each test gets a fresh browser
// context, so storage never leaks between tests.

test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
test.describe.configure({ mode: 'serial' })

/** A valid Concept A (20 × 10 × 3 storeys) plus Concept B stored as the corrupt truncated fixture. */
async function seedCorruptPair(context: BrowserContext): Promise<{ corruptText: string }> {
  const corruptText = await readFixture('corrupt-truncated.json')
  const a = rectangleScenario({ id: 'seed-a', name: 'Concept A', storeys: 3 })
  await seedRows(context, {
    project: {
      schemaVersion: 2,
      siteId: SITE,
      activeScenarioId: 'seed-a',
      scenarioIds: ['seed-a', 'seed-b-corrupt'],
      updatedAt: SEEDED_NOW,
    },
    scenarios: [
      { id: 'seed-a', siteId: SITE, json: JSON.stringify(a) },
      { id: 'seed-b-corrupt', siteId: SITE, json: corruptText },
    ],
  })
  return { corruptText }
}

test('QA-14: a corrupt saved scenario is skipped, listed and exported raw', async ({ browser }) => {
  test.setTimeout(120_000)
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  const { corruptText } = await seedCorruptPair(context)

  // The studio still renders with the readable scenario…
  await openStudio(page)
  await expect(scenarioTrigger(page)).toHaveText(/^Concept A/)
  await expectSaved(page)

  // …and the recovery strip lists the unreadable record.
  const strip = page.getByRole('region', { name: 'Project recovery' })
  await expect(strip.getByText(/1 saved scenario couldn't be opened/)).toBeVisible()
  await strip.locator('summary').filter({ hasText: 'Details' }).click()
  await expect(strip.getByText(/seed-b-corrupt · corrupt/)).toBeVisible()
  await expect(strip.getByText('Saved data is not valid JSON')).toBeVisible()

  // The raw export keeps the unreadable text verbatim.
  const downloadPromise = page.waitForEvent('download')
  await strip.getByRole('button', { name: 'Export raw data' }).click()
  const download = await downloadPromise
  const bundle = JSON.parse(await downloadText(download))
  expect(bundle.unreadable).toEqual([{ id: 'seed-b-corrupt', json: corruptText }])

  // The readable scenario is still editable: its seed block is present in the menu.
  await openScenarioMenu(page)
  await expect(page.getByRole('group', { name: 'Scenarios' }).locator('li').first().getByText('3 floors · Concept GFA 600 m²')).toBeVisible()
})

test('QA-14: a newer-version project is read-only, never written, and exportable', async ({ browser }) => {
  test.setTimeout(120_000)
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  const newerProject = {
    schemaVersion: 99,
    siteId: SITE,
    activeScenarioId: 'future',
    scenarioIds: ['future'],
    updatedAt: SEEDED_NOW,
  }
  await seedRows(context, { project: newerProject, scenarios: [] })

  await openStudio(page)
  await expectSaveStatus(page, 'Read-only — saved by a newer version')
  const strip = page.getByRole('region', { name: 'Project recovery' })
  await expect(strip.getByText(/saved by a newer version of Terraform \(format 99\)/)).toBeVisible()
  await expect(strip.getByText(/Nothing will be overwritten/)).toBeVisible()
  await expect(strip.getByRole('button', { name: 'Export saved data' })).toBeVisible()

  // Editing works in memory…
  await openScenarioMenu(page)
  const group = page.getByRole('group', { name: 'Scenarios' })
  await group.getByRole('button', { name: 'Rename' }).first().click()
  await page.getByLabel('Scenario name').fill('In-memory only')
  await page.getByRole('button', { name: 'Save name' }).click()
  await expect(scenarioTrigger(page)).toHaveText(/^In-memory only/)

  // …but nothing reaches storage: the project row is byte-identical and no scenario row exists.
  const stored = await readRows(context, SITE)
  expect(JSON.parse(stored.projectJson ?? 'null')).toEqual(newerProject)
  expect(stored.scenarioRows).toEqual([])

  await page.reload()
  await expectSaveStatus(page, 'Read-only — saved by a newer version')
  const afterReload = await readRows(context, SITE)
  expect(JSON.parse(afterReload.projectJson ?? 'null')).toEqual(newerProject)
  expect(afterReload.scenarioRows).toEqual([])
})

test('QA-14: a quota failure is reported truthfully and Try again recovers to Saved', async ({ page }) => {
  test.setTimeout(120_000)
  await openStudio(page)
  await expectSaved(page)

  // Every write from here on fails with QuotaExceededError.
  await failPutsWithQuota(page)
  await openGroup(page, 'Notes')
  await page.getByLabel('Scenario notes').fill('Backup before closing this tab')
  await page.getByLabel('Scenario notes').press('Tab') // blur commits the note

  await expectSaveStatus(page, 'Not saved — storage is full')
  const strip = page.getByRole('region', { name: 'Project recovery' })
  await expect(strip.getByText(/Browser storage is full/)).toBeVisible()
  await expect(strip.getByRole('button', { name: 'Export project' })).toBeVisible()
  await expect(strip.getByRole('button', { name: 'Try again' })).toBeVisible()

  // Restore storage: Try again flushes the still-pending save and returns to Saved.
  await restorePut(page)
  await strip.getByRole('button', { name: 'Try again' }).click()
  await expectSaved(page)
  await expect(strip).toHaveCount(0)
})

test('QA-14: without IndexedDB the studio still works and never claims Saved', async ({ page }) => {
  test.setTimeout(120_000)
  await blockIndexedDb(page)
  await openStudio(page)
  await expectSaveStatus(page, "Not saved — this browser can't store data")

  const strip = page.getByRole('region', { name: 'Project recovery' })
  await expect(strip.getByText(/can't store data, so changes last only until you close the tab/)).toBeVisible()

  // Editing still works in memory…
  await openGroup(page, 'Notes')
  await page.getByLabel('Scenario notes').fill('Session-only note')
  await page.getByLabel('Scenario notes').press('Tab')
  await expect(page.getByLabel('Scenario notes')).toHaveValue('Session-only note')

  // …and it never claims to have saved.
  await page.waitForTimeout(1500)
  await expect(page.locator('header').getByText('Saved', { exact: true })).toHaveCount(0)
  await expect(page.locator('header').getByText("Not saved — this browser can't store data", { exact: true })).toBeVisible()
})

test('FR-048: export, reset demo and import restore the exact geometry', async ({ page }) => {
  test.setTimeout(150_000)
  await openStudio(page)
  await expectSaved(page)
  await drawMass(page)
  await setStoreys(page, '4')
  await expectSaved(page)

  // Export the project backup.
  await openSiteGroup(page)
  const inspector = page.getByRole('complementary', { name: 'Parameters' })
  const downloadPromise = page.waitForEvent('download')
  await inspector.getByRole('button', { name: 'Export project', exact: true }).click()
  const download = await downloadPromise
  const exportPath = await download.path()
  if (!exportPath) throw new Error('The download did not produce a file')

  // Reset the demo (confirmation required)…
  await openScenarioMenu(page)
  await page.getByRole('group', { name: 'Scenarios' }).getByRole('button', { name: 'Reset demo…' }).click()
  const resetDialog = page.getByRole('dialog')
  await expect(resetDialog.getByRole('heading')).toHaveText('Reset demo?')
  await resetDialog.getByRole('button', { name: 'Reset demo' }).click()
  await expectSaved(page)
  await expect(page.getByRole('list', { name: 'Masses' })).toHaveCount(0)

  // …then import the backup back (confirmation required).
  const input = page.getByLabel('Import project…')
  await input.setInputFiles(exportPath)
  const importDialog = page.getByRole('dialog')
  await expect(importDialog.getByRole('heading')).toHaveText('Import project?')
  await importDialog.getByRole('button', { name: 'Import project' }).click()
  await expect(page.getByText('Project imported.', { exact: true })).toBeVisible()

  // The mass is back with identical numbers, and survives a reload.
  await selectMass(page)
  await expect(page.getByRole('textbox', { name: 'Storeys' })).toHaveValue('4')
  await expect(page.getByLabel('Name')).toHaveValue('Mass 1')
  await expectSaved(page)
  await page.reload()
  await expect(page.getByRole('region', { name: /3D site viewport for Compact Infill/i })).toBeVisible()
  await expectSaved(page)
  await selectMass(page)
  await expect(page.getByRole('textbox', { name: 'Storeys' })).toHaveValue('4')
  await expect(page.getByLabel('Name')).toHaveValue('Mass 1')
})

test('a corrupt import is rejected and the current scenarios are unchanged', async ({ page }) => {
  test.setTimeout(150_000)
  await openStudio(page)
  await expectSaved(page)
  await drawMass(page)
  await expectSaved(page)

  await openSiteGroup(page)
  const corruptText = await readFixture('corrupt-truncated.json')
  const input = page.getByLabel('Import project…')
  await input.setInputFiles({
    name: 'corrupt-truncated.json',
    mimeType: 'application/json',
    buffer: Buffer.from(corruptText, 'utf8'),
  })

  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading')).toHaveText('Import project?')
  await dialog.getByRole('button', { name: 'Import project' }).click()

  // An error appears and the dialog closes (the file is not valid JSON).
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByText(/This file couldn't be imported: \$ The file is not valid JSON/)).toBeVisible()

  // The current scenarios are unchanged.
  await selectMass(page)
  await expect(page.getByRole('textbox', { name: 'Storeys' })).toHaveValue('3')
  await expect(page.getByLabel('Name')).toHaveValue('Mass 1')
})