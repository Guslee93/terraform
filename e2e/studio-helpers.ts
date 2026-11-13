import { expect, type Page } from '@playwright/test'

/** The studio's right panel (ADR-0016). */
export const parameters = (page: Page) => page.getByRole('complementary', { name: 'Parameters' })

/**
 * Open an analysis card in the Parameters panel (ADR-0026). The open card is the analysis on the
 * map, and its controls live in the card. No-op when the card is already open.
 */
export async function openAnalysis(page: Page, label: 'Sun' | 'Wind' | 'Noise') {
  const card = page.getByTestId(`analysis-card-${label.toLowerCase()}`)
  if ((await card.getAttribute('aria-expanded')) !== 'true') await card.click()
  return parameters(page)
}

/** Open a Parameters group by its title without toggling it shut. */
export async function openGroup(page: Page, title: string) {
  const group = parameters(page).locator('details', { has: page.locator('summary', { hasText: new RegExp(`^${title}`) }) }).first()
  if (!(await group.evaluate((element) => (element as HTMLDetailsElement).open))) await group.locator('summary').click()
  return group
}

export async function openStudio(page: Page) {
  await page.goto('/studio/compact-infill')
  await page.getByRole('button', { name: 'Add a block' }).waitFor()
  await page.getByRole('button', { name: 'Add a block' }).click()
}

/**
 * A signature of the rendered canvas, read inside the page.
 *
 * Chromium's screenshot path goes through the compositor, which occasionally stalls for
 * minutes on the full city context in software rendering (headless Chromium has no GPU).
 * The pixels are read straight from the canvas instead, inside a requestAnimationFrame
 * callback so the buffer still holds the last rendered frame. The HUD is DOM, so it is
 * never part of the signature.
 */
export async function canvasSignature(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const canvas = document.querySelector('canvas')
    if (!canvas) throw new Error('The studio canvas is not on screen')
    const url = await new Promise<string>((resolve) => {
      requestAnimationFrame(() => resolve(canvas.toDataURL('image/png')))
    })
    // Length plus an FNV-1a hash: two different frames give two different signatures.
    let hash = 2166136261
    for (let index = 0; index < url.length; index += 1) {
      hash = Math.imul(hash ^ url.charCodeAt(index), 16777619)
    }
    return `${url.length}:${hash >>> 0}`
  })
}

/** Wait until the canvas differs from `before` (a layer toggle changed the picture). */
export async function expectCanvasChanged(page: Page, before: string, timeout = 20_000) {
  await expect
    .poll(async () => (await canvasSignature(page)) !== before, { timeout })
    .toBe(true)
}

export async function drawMass(page: Page) {
  await page.getByRole('button', { name: 'Plan', exact: true }).click()
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: 'Draw building' }).click()
  const box = await page.getByRole('region', { name: /3D site viewport/ }).boundingBox()
  if (!box) throw new Error('No viewport')
  for (const [dx, dy] of [[-60, -60], [60, -60], [60, 60], [-60, 60]]) await page.mouse.click(box.x + box.width / 2 + dx!, box.y + box.height / 2 + dy!)
  await page.getByRole('button', { name: 'Draw building' }).evaluate((button) => button.blur())
  await page.keyboard.press('Enter')
  await page.getByRole('spinbutton', { name: 'Storeys', exact: true }).waitFor()
}
