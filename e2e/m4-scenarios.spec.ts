import { expect, test, type BrowserContext } from '@playwright/test'
import {
  drawMass,
  expectSaved,
  installPutCounter,
  moveToRoofDragView,
  openScenarioMenu,
  openStudio,
  payloadFor,
  putCount,
  rectangleScenario,
  redo,
  scenarioTrigger,
  seedRows,
  selectMass,
  setStoreys,
  switchScenario,
  undo,
} from './m4-helpers'

// D36 — M4 scenario end-to-end flows (docs/handoffs/D36-D37-m4-e2e-evidence.md).
//
// Every test runs in a fresh browser context, so IndexedDB (per origin and context) is isolated.
// Draw clicks mirror `massing.spec.ts`: the footprint is drawn in the Plan preset with a fixed
// step from the viewport centre; the roof drag happens in the 3D preset (see that file's camera
// note). Save status assertions wait for `Saved` before a reload, so no assertion can race an in-
// flight autosave.

test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' })
test.describe.configure({ mode: 'serial' })

/** Seed the hand-calculable QA-12 pair (20 × 10 m, 3 vs 7 storeys of 3.2 m) on a fresh context. */
async function seedQa12Pair(context: BrowserContext): Promise<void> {
  const a = rectangleScenario({ id: 'qa12-a', name: 'Concept A', storeys: 3, notes: 'Low concept' })
  const b = rectangleScenario({ id: 'qa12-b', name: 'Concept B', storeys: 7, notes: 'Tall concept' })
  await seedRows(context, payloadFor('qa12-a', [
    { id: a.id, json: JSON.stringify(a) },
    { id: b.id, json: JSON.stringify(b) },
  ]))
}

test('QA-09: two concepts persist distinctly across a reload, each with its own undo', async ({ page }) => {
  test.setTimeout(150_000)
  await openStudio(page)
  await expectSaved(page)

  // Concept A: one mass at the default 3 storeys.
  await drawMass(page)
  await expectSaved(page)

  // Concept B: a different mass, raised to 5 storeys.
  await switchScenario(page, 'Concept B')
  await drawMass(page)
  await setStoreys(page, '5')
  await expectSaved(page)

  // Undo stays per scenario: undoing B's storey edit must not touch Concept A.
  await undo(page)
  await expect(page.getByRole('textbox', { name: 'Storeys' })).toHaveValue('3')
  await redo(page)
  await expect(page.getByRole('textbox', { name: 'Storeys' })).toHaveValue('5')
  await expectSaved(page)

  // Undo in Concept A removes only Concept A's mass; redo restores it.
  await switchScenario(page, 'Concept A')
  await undo(page)
  await expect(page.getByLabel('Name')).toHaveCount(0)
  await redo(page)
  await expect(page.getByLabel('Name')).toHaveValue('Mass 1')
  await expectSaved(page)

  // Reload: both scenarios still exist and each shows its own mass.
  await page.reload()
  await expect(page.getByRole('region', { name: /3D site viewport for Compact Infill/i })).toBeVisible()
  await expectSaved(page)
  await expect(scenarioTrigger(page)).toHaveText(/^Concept A/)
  await selectMass(page)
  await expect(page.getByRole('textbox', { name: 'Storeys' })).toHaveValue('3')

  await switchScenario(page, 'Concept B')
  await selectMass(page)
  await expect(page.getByRole('textbox', { name: 'Storeys' })).toHaveValue('5')
})

test('FR-046: an edit survives an immediate switch and a reload', async ({ page }) => {
  test.setTimeout(150_000)
  await openStudio(page)
  await expectSaved(page)

  // Commit an edit, then switch away and back without waiting for the autosave debounce.
  await drawMass(page)
  await switchScenario(page, 'Concept B')
  await switchScenario(page, 'Concept A')

  // The edit is on screen and has been flushed on the switch.
  await selectMass(page)
  await expect(page.getByRole('textbox', { name: 'Storeys' })).toHaveValue('3')
  await expectSaved(page)
  await page.reload()
  await expect(page.getByRole('region', { name: /3D site viewport for Compact Infill/i })).toBeVisible()
  await expectSaved(page)
  await selectMass(page)
  await expect(page.getByRole('textbox', { name: 'Storeys' })).toHaveValue('3')
})

test('QA-12: comparison rows and B − A deltas match the hand calculation', async ({ browser }) => {
  test.setTimeout(180_000)
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  await seedQa12Pair(context)

  await openStudio(page)
  await expectSaved(page)
  // Height measured from Datum, so "tallest" is terrain-independent: exactly 9.6 m and 22.4 m.
  await page.getByLabel('Height measured from').selectOption('datum')

  await page.locator('header').getByRole('button', { name: 'Compare' }).click()
  const panel = page.getByRole('complementary', { name: 'Compare' })
  await expect(panel).toBeVisible()
  const table = panel.getByRole('table')

  const THIN = '\u2009' // the studio's digit-grouping separator (formatNumber)
  const rowCells = async (label: string) => {
    const row = table.locator('tr').filter({ hasText: label })
    await expect(row).toHaveCount(1)
    return row.locator('td')
  }

  // Hand calculation for 20 × 10 m footprints at 3.2 m storeys (A 3 storeys, B 7 storeys):
  // GFA 600 / 1 400 m² · footprint 200 / 200 m² · tallest above datum 9.6 / 22.4 m ·
  // volume 1 920 / 4 480 m³ · buildings 1 / 1.
  const gfa = await rowCells('Concept GFA')
  await expect(gfa.nth(0)).toHaveText('600')
  await expect(gfa.nth(1)).toHaveText(`1${THIN}400`)
  await expect(gfa.nth(2)).toHaveText('+800 m²')

  const footprint = await rowCells('Footprint')
  await expect(footprint.nth(0)).toHaveText('200')
  await expect(footprint.nth(1)).toHaveText('200')
  await expect(footprint.nth(2)).toHaveText('±0')

  const tallest = await rowCells('Tallest above datum')
  await expect(tallest.nth(0)).toHaveText('9.6')
  await expect(tallest.nth(1)).toHaveText('22.4')
  await expect(tallest.nth(2)).toHaveText('+12.8 m')

  const volume = await rowCells('Volume')
  await expect(volume.nth(0)).toHaveText(`1${THIN}920`)
  await expect(volume.nth(1)).toHaveText(`4${THIN}480`)
  await expect(volume.nth(2)).toHaveText(`+2${THIN}560 m³`)

  const buildings = await rowCells('Buildings')
  await expect(buildings.nth(0)).toHaveText('1')
  await expect(buildings.nth(1)).toHaveText('1')
  await expect(buildings.nth(2)).toHaveText('±0')

  // Envelope status and notes are shown, with the disclaimer (FR-080, FR-081).
  await expect(table.getByText('Within demo envelope')).toBeVisible()
  await expect(table.getByText('Exceeds demo envelope')).toBeVisible()
  await expect(table.getByText('Illustrative constraint — not planning advice')).toBeVisible()
  await expect(table.getByText('Low concept')).toBeVisible()
  await expect(table.getByText('Tall concept')).toBeVisible()

  // Deltas are neutral: no colour class and no better/worse language.
  await expect(panel.locator('[class*="bg-positive"], [class*="bg-warning"], [class*="bg-danger"]')).toHaveCount(0)
  expect(await table.innerText()).not.toMatch(/better|worse|improved/i)

  // Both thumbnails render from the same camera with the same sun; their PNGs must differ. The
  // fallback text is only shown when the capture itself fails (e.g. WebGL unavailable).
  const images = panel.locator('img')
  const failedFallback = panel.getByText('Thumbnail unavailable in this browser')
  await expect(async () => {
    const imageCount = await images.count()
    const fallbackCount = await failedFallback.count()
    expect(imageCount === 2 || fallbackCount === 1).toBe(true)
  }).toPass({ timeout: 20_000 })
  if ((await failedFallback.count()) === 1) {
    await expect(images).toHaveCount(0)
  } else {
    await expect(images).toHaveCount(2)
    for (const image of await images.all()) await expect(image).toHaveAttribute('alt', /isometric camera view/)
    const srcs = await images.evaluateAll((nodes) => nodes.map((node) => (node as HTMLImageElement).src))
    expect(srcs[0] ?? '').toMatch(/^data:image\/png/)
    expect(srcs[1] ?? '').toMatch(/^data:image\/png/)
    expect(srcs[0]).not.toBe(srcs[1])
  }
  // "Updating thumbnails…" must be gone either way.
  await expect(panel.getByRole('status')).toHaveCount(0)
})

// KNOWN PRODUCT BUG (C15 item 7): the menu closes when a confirmation opens, so focus has nowhere to
// return to and drops to <body> after Escape or Cancel. Remove `.fixme` once ScenarioMenu restores
// focus to its trigger when a confirmation closes.
test.fixme('Escape cancels a confirmation dialog and restores focus to the scenario menu', async ({ page }) => {
  await openStudio(page)
  await expectSaved(page)

  await openScenarioMenu(page)
  const group = page.getByRole('group', { name: 'Scenarios' })
  await group.getByRole('button', { name: 'Reset' }).first().click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('heading')).toHaveText('Reset Concept A?')
  // The native dialog lands focus on Cancel.
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  // Focus returns to the scenario trigger (ScenarioMenu restores it after a dialog closes).
  await expect(scenarioTrigger(page)).toBeFocused()
})

test('no autosave write happens while the roof pointer is held down', async ({ page }) => {
  test.setTimeout(150_000)
  await installPutCounter(page)
  await openStudio(page)
  await expectSaved(page)

  await drawMass(page)
  await expectSaved(page)

  const beforeDrag = await putCount(page)
  const handle = await moveToRoofDragView(page)
  const storeys = page.getByRole('textbox', { name: 'Storeys' })

  await page.mouse.move(handle.x, handle.y)
  await page.mouse.down()
  await page.mouse.move(handle.x, handle.y - 64, { steps: 8 })
  await expect(storeys).not.toHaveValue('3') // the live drag preview moved

  // Hold the pointer down well past the 800 ms autosave debounce: nothing may be written.
  const duringDrag = await putCount(page)
  await page.waitForTimeout(2200)
  expect(await putCount(page)).toBe(duringDrag)

  await page.mouse.up()
  // Within a couple of seconds of the release, the committed storey change is autosaved once.
  await expect.poll(() => putCount(page), { timeout: 5000 }).toBeGreaterThan(beforeDrag)
  await expectSaved(page)
})

test('duplicate, rename collision and delete keep the scenario menu consistent', async ({ page }) => {
  test.setTimeout(120_000)
  await openStudio(page)
  await expectSaved(page)
  const group = page.getByRole('group', { name: 'Scenarios' })

  // Duplicate Concept A: "Concept A copy" is created and becomes active.
  await openScenarioMenu(page)
  await group.locator('li').nth(0).getByRole('button', { name: 'Duplicate' }).click()
  await expect(scenarioTrigger(page)).toHaveText(/^Concept A copy/)
  await expectSaved(page)

  // Renaming the copy to an existing name is rejected and keeps the old name.
  await openScenarioMenu(page)
  const copyRow = group.locator('li').filter({ hasText: /Concept A copy/ })
  await copyRow.getByRole('button', { name: 'Rename' }).click()
  const nameInput = page.getByLabel('Scenario name')
  await expect(nameInput).toBeVisible()
  await nameInput.fill('Concept B')
  await page.getByRole('button', { name: 'Save name' }).click()
  await expect(page.getByRole('alert')).toHaveText('Another scenario already has this name.')
  // Escape cancels the rename. Depending on where focus is, the menu may also close; either way
  // the edit field is gone and the scenario keeps its name.
  await page.keyboard.press('Escape')
  await expect(nameInput).toHaveCount(0)
  await expect(scenarioTrigger(page)).toHaveText(/^Concept A copy/)
  if ((await scenarioTrigger(page).getAttribute('aria-expanded')) === 'true') await scenarioTrigger(page).click()

  // Deleting asks for confirmation; the last remaining scenario can't be deleted.
  await openScenarioMenu(page)
  await group.locator('li').filter({ hasText: /Concept A copy/ }).getByRole('button', { name: 'Delete' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading')).toHaveText('Delete Concept A copy?')
  await dialog.getByRole('button', { name: 'Delete scenario' }).click()
  await expect(dialog).toHaveCount(0)

  await openScenarioMenu(page)
  await group.locator('li').nth(0).getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete scenario' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  // Only Concept B remains; its Delete is unavailable (a project keeps at least one scenario).
  await openScenarioMenu(page)
  await expect(group.locator('li')).toHaveCount(1)
  await expect(group.getByRole('button', { name: 'Delete' })).toHaveCount(0)
})

test('FR-083: Edit B from Compare activates B and closes Compare', async ({ browser }) => {
  test.setTimeout(120_000)
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  await seedQa12Pair(context)

  await openStudio(page)
  await expectSaved(page)
  await page.locator('header').getByRole('button', { name: 'Compare' }).click()
  const panel = page.getByRole('complementary', { name: 'Compare' })
  await expect(panel).toBeVisible()

  await panel.getByRole('button', { name: 'Edit B' }).click()
  await expect(panel).toHaveCount(0)
  await expect(scenarioTrigger(page)).toHaveText(/^Concept B/)
  // The scenario being edited is B's own seeded mass.
  await selectMass(page, 'Seed block')
  await expect(page.getByRole('textbox', { name: 'Storeys' })).toHaveValue('7')
})