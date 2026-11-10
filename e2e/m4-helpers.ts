import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { expect, type BrowserContext, type Download, type Locator, type Page } from '@playwright/test'

/**
 * D36 — shared helpers for the M4 e2e specs (`m4-scenarios`, `m4-recovery`, `m4-evidence`).
 *
 * The specs exercise the scenario project over real IndexedDB, so storage is seeded through
 * the page (same origin, database `terraform`, tables `projects` keyed by `siteId` and
 * `scenarios` keyed by `id` with a `siteId` index — ADR-0011 §5) instead of reaching into the
 * app's modules. Every Playwright test gets a fresh browser context, so no storage leaks
 * between tests (the work order's isolation rule).
 */

export const SITE = 'compact-infill'
export const SEEDED_NOW = '2026-11-02T00:00:00.000Z'
/** Dexie scales its declared verno by 10 for the native IndexedDB version: store.ts `version(1)` ⇒ native 10. */
export const IDB_NATIVE_VERSION = 10

export type SeedScenario = {
  schemaVersion: 2
  id: string
  siteId: string
  name: string
  assumptions: { defaultStoreyHeight: number; minStoreys: number; maxStoreys: number }
  volumes: ReadonlyArray<{
    id: string
    name: string
    visible: boolean
    locked: boolean
    tiers: ReadonlyArray<{
      id: string
      name: string
      footprint: { vertices: ReadonlyArray<readonly [number, number]> }
      baseElevation: number
      storeys: number
      storeyHeight: number
      use: 'residential' | 'commercial' | 'mixed' | 'civic' | 'other'
    }>
  }>
  notes: string
  createdAt: string
  updatedAt: string
}

export type SeedProjectRow = {
  schemaVersion: number
  siteId: string
  activeScenarioId: string
  scenarioIds: readonly string[]
  updatedAt: string
}

export type SeedScenarioRow = { id: string; siteId: string; json: string }
export type SeedPayload = { project: SeedProjectRow; scenarios: readonly SeedScenarioRow[] }

/** The QA-12 shape the hand calculation is based on: 20 × 10 m, single tier, 3.2 m storeys. */
export function rectangleScenario(args: { id: string; name: string; storeys: number; notes?: string }): SeedScenario {
  return {
    schemaVersion: 2,
    id: args.id,
    siteId: SITE,
    name: args.name,
    assumptions: { defaultStoreyHeight: 3.2, minStoreys: 1, maxStoreys: 40 },
    volumes: [
      {
        id: `v-${args.id}`,
        name: 'Seed block',
        visible: true,
        locked: false,
        tiers: [
          {
            id: `t-${args.id}`,
            name: 'Ground tier',
            footprint: {
              vertices: [[-10, -5], [10, -5], [10, 5], [-10, 5]],
            },
            baseElevation: 0,
            storeys: args.storeys,
            storeyHeight: 3.2,
            use: 'residential',
          },
        ],
      },
    ],
    notes: args.notes ?? '',
    createdAt: SEEDED_NOW,
    updatedAt: SEEDED_NOW,
  }
}

/** A `SchemaVersion 2` project record for the seeded scenarios. */
export function projectPayload(activeScenarioId: string, scenarios: readonly { id: string }[], schemaVersion = 2): SeedProjectRow {
  const ids = scenarios.map((scenario) => scenario.id)
  if (activeScenarioId !== '' && !ids.includes(activeScenarioId)) throw new Error('activeScenarioId must be one of scenarioIds')
  return { schemaVersion, siteId: SITE, activeScenarioId, scenarioIds: ids, updatedAt: SEEDED_NOW }
}

export function payloadFor(activeScenarioId: string, scenarios: readonly { id: string; json: string }[]): SeedPayload {
  return {
    project: projectPayload(activeScenarioId, scenarios),
    scenarios: scenarios.map(({ id, json }) => ({ id, siteId: SITE, json })),
  }
}
export async function readFixture(name: string): Promise<string> {
  return readFile(path.join(process.cwd(), 'src', 'features', 'scenarios', '__fixtures__', name), 'utf8')
}

/**
 * Write project + scenario rows into the origin's IndexedDB before the studio loads. Runs on a
 * throwaway landing page in the same context, so the studio page on the same origin sees it.
 *
 * Every test uses a fresh browser context, so clearing the scenario table is safe and avoids an
 * index cursor in the same transaction (which has proven unreliable here). The native version
 * must match Dexie's scale (Dexie opens `version(1)` as native version 10), otherwise the open
 * throws VersionError or the app forces an upgrade that can drop the seeded rows.
 */
export async function seedRows(context: BrowserContext, payload: SeedPayload): Promise<void> {
  const page = await context.newPage()
  await page.goto('/')
  await page.evaluate(async ({ data, version }: { data: SeedPayload; version: number }) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('terraform', version)
      request.onupgradeneeded = () => {
        const database = request.result
        if (!database.objectStoreNames.contains('projects')) database.createObjectStore('projects', { keyPath: 'siteId' })
        if (!database.objectStoreNames.contains('scenarios')) {
          const scenarios = database.createObjectStore('scenarios', { keyPath: 'id' })
          scenarios.createIndex('siteId', 'siteId')
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['projects', 'scenarios'], 'readwrite')
      const projects = tx.objectStore('projects')
      const scenarios = tx.objectStore('scenarios')
      // The app stores project rows as { siteId, json }; a raw record would be read as a damaged index and silently rebuilt.
      projects.put({ siteId: data.project.siteId, json: JSON.stringify(data.project) })
      scenarios.clear()
      for (const row of data.scenarios) scenarios.put(row)
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => reject(tx.error)
    })
  }, { data: payload, version: IDB_NATIVE_VERSION })
  await page.close()
}

export type StoredScenarioRow = { id: string; json: string }

/** Read the raw stored rows back, so tests can prove nothing (or exactly what) was written. */
export async function readRows(context: BrowserContext, siteId: string): Promise<{ projectJson: string | null; scenarioRows: StoredScenarioRow[] }> {
  const page = await context.newPage()
  await page.goto('/')
  const result = await page.evaluate(async ({ site, version }: { site: string; version: number }): Promise<{ projectJson: string | null; scenarioRows: StoredScenarioRow[] }> => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('terraform', version)
      request.onupgradeneeded = () => {
        const database = request.result
        if (!database.objectStoreNames.contains('projects')) database.createObjectStore('projects', { keyPath: 'siteId' })
        if (!database.objectStoreNames.contains('scenarios')) {
          const scenarios = database.createObjectStore('scenarios', { keyPath: 'id' })
          scenarios.createIndex('siteId', 'siteId')
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const out: { projectJson: string | null; scenarioRows: StoredScenarioRow[] } = { projectJson: null, scenarioRows: [] }
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['projects', 'scenarios'], 'readonly')
      const projects = tx.objectStore('projects')
      const scenarios = tx.objectStore('scenarios')
      const projectRequest = projects.get(site)
      const rowsRequest = scenarios.index('siteId').getAll()
      let pending = 2
      let settled = false
      const check = () => {
        pending -= 1
        if (pending === 0 && !settled) { settled = true; db.close(); resolve() }
      }
      projectRequest.onsuccess = () => {
        const row = projectRequest.result as { json?: string } | undefined
        out.projectJson = row?.json ?? null
        check()
      }
      projectRequest.onerror = () => reject(projectRequest.error)
      rowsRequest.onsuccess = () => {
        const rows = rowsRequest.result as Array<{ id: string; siteId: string; json: string }>
        out.scenarioRows = rows.filter((row) => row.siteId === site).map(({ id, json }) => ({ id, json }))
        check()
      }
      rowsRequest.onerror = () => reject(rowsRequest.error)
    })
    return out
  }, { site: siteId, version: IDB_NATIVE_VERSION })
  await page.close()
  return result
}

/** Open the compact-infill studio and wait for its 3D viewport. */
export async function openStudio(page: Page): Promise<void> {
  await page.goto(`/studio/${SITE}`)
  await expect(page.getByRole('region', { name: /3D site viewport for Compact Infill/i })).toBeVisible()
}

/** The top bar's save indicator. */
export function saveStatus(page: Page): Locator {
  return page.locator('header').getByText(
    /^(Saved|Saving…|Unsaved changes|Not saved — storage is full|Not saved — storage unavailable|Not saved — this browser can't store data|Read-only — saved by a newer version)$/,
    { exact: true },
  )
}

export async function expectSaveStatus(page: Page, text: string): Promise<void> {
  await expect(page.locator('header').getByText(text, { exact: true })).toBeVisible({ timeout: 20_000 })
}

export async function expectSaved(page: Page): Promise<void> {
  await expectSaveStatus(page, 'Saved')
}

/** The scenario name disclosure button in the top bar. */
export function scenarioTrigger(page: Page): Locator {
  return page.locator('header button[aria-expanded]')
}

export async function openScenarioMenu(page: Page): Promise<void> {
  await scenarioTrigger(page).click()
  await expect(page.getByRole('group', { name: 'Scenarios' })).toBeVisible()
}

/** Open the menu and activate the scenario whose name starts with `name`. */
export async function switchScenario(page: Page, name: string): Promise<void> {
  await openScenarioMenu(page)
  const group = page.getByRole('group', { name: 'Scenarios' })
  await group.getByRole('button', { name: new RegExp(`^${name}`) }).first().click()
  await expect(group).toHaveCount(0)
  await expect(scenarioTrigger(page)).toHaveText(new RegExp(`^${name}`))
}

/** Centre of the 3D viewport, in page (viewport) coordinates. */
export async function viewportCentre(page: Page): Promise<{ x: number; y: number }> {
  const box = await page.getByRole('region', { name: /3D site viewport for Compact Infill/i }).boundingBox()
  if (!box) throw new Error('The 3D site viewport region was not found')
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/** Draw a square footprint in the deterministically scaled Plan view, like `massing.spec.ts`. */
export async function drawMass(page: Page, halfSidePx = 60): Promise<void> {
  await page.getByRole('button', { name: 'Plan', exact: true }).click()
  // The preset snaps instantly with reduced motion; allow one short settle for the renderer.
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: 'Draw building' }).click()
  const centre = await viewportCentre(page)
  for (const [east, north] of [[-halfSidePx, -halfSidePx], [halfSidePx, -halfSidePx], [halfSidePx, halfSidePx], [-halfSidePx, halfSidePx]]) {
    await page.mouse.click(centre.x + east, centre.y + north)
  }
  // Clicking the canvas does not move focus off the Draw building button, so blur it first.
  await page.getByRole('button', { name: 'Draw building' }).evaluate((button) => button.blur())
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('Name')).toHaveValue('Mass 1')
  await expect(page.getByRole('textbox', { name: 'Storeys' })).toHaveValue('3')
}

export async function setStoreys(page: Page, value: string): Promise<void> {
  const storeys = page.getByRole('textbox', { name: 'Storeys' })
  await storeys.fill(value)
  await storeys.press('Enter')
  await expect(storeys).toHaveValue(value)
}

export async function undo(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Undo' }).click()
}

export async function redo(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Redo' }).click()
}

/** Select a mass from the inspector's list and confirm its fields are shown. */
export async function selectMass(page: Page, name = 'Mass 1'): Promise<void> {
  const list = page.getByRole('list', { name: 'Masses' })
  await expect(list).toBeVisible()
  await list.getByRole('button', { name: new RegExp(`^${name}`) }).click()
  await expect(page.getByLabel('Name')).toHaveValue(name)
}
/** Centre of the roof handle button, in page (viewport) coordinates. */
export async function roofHandleCentre(page: Page): Promise<{ x: number; y: number }> {
  const handle = page.getByRole('button', { name: /^Drag to change storeys/ })
  await expect(handle).toBeVisible()
  const box = await handle.boundingBox()
  if (!box) throw new Error('The roof handle button has no bounding box')
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

/** Re-seat the camera in the isometric preset (well-conditioned drag plane) and return the handle. */
export async function moveToRoofDragView(page: Page): Promise<{ x: number; y: number }> {
  await page.getByRole('button', { name: '3D', exact: true }).click()
  await page.waitForTimeout(400)
  return roofHandleCentre(page)
}

/** Count IndexedDB `put` calls from before the page loads (FR-043: no writes during a gesture). */
export async function installPutCounter(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const proto = IDBObjectStore.prototype
    const original = proto.put
    let count = 0
    proto.put = function put(this: IDBObjectStore, ...args: unknown[]) {
      count += 1
      return original.apply(this, args as Parameters<typeof original>)
    }
    ;(globalThis as unknown as { __putCount: () => number }).__putCount = () => count
  })
}

export async function putCount(page: Page): Promise<number> {
  return page.evaluate(() => (globalThis as unknown as { __putCount: () => number }).__putCount())
}

/** Make every later IndexedDB write fail with QuotaExceededError until `__restorePut()` runs. */
export async function failPutsWithQuota(page: Page): Promise<void> {
  await page.evaluate(() => {
    const proto = IDBObjectStore.prototype
    const original = proto.put
    let restored = false
    proto.put = function put(this: IDBObjectStore, ...args: unknown[]) {
      if (!restored) throw new DOMException('Simulated quota exhaustion', 'QuotaExceededError')
      return original.apply(this, args as Parameters<typeof original>)
    }
    ;(globalThis as unknown as { __restorePut: () => void }).__restorePut = () => {
      if (restored) return
      restored = true
      proto.put = original
    }
  })
}

export async function restorePut(page: Page): Promise<void> {
  await page.evaluate(() => (globalThis as unknown as { __restorePut: () => void }).__restorePut())
}

/** Make IndexedDB unusable before any page script runs (QA-14: storage unavailable). */
export async function blockIndexedDb(page: Page): Promise<void> {
  await page.addInitScript(() => {
    IDBFactory.prototype.open = () => {
      throw new DOMException('Storage blocked for this test', 'BlockedError')
    }
  })
}
/** Read a Playwright download into text (native FS path is stable for the context's lifetime). */
export async function downloadText(download: Download): Promise<string> {
  const filePath = await download.path()
  if (!filePath) throw new Error('The download has no file path')
  return readFile(filePath, 'utf8')
}

/** Open the panel's "Site" group (it holds Export and Import) without toggling it shut. */
export async function openSiteGroup(page: Page): Promise<void> {
  const group = page.getByRole('complementary', { name: 'Parameters' }).locator('details', { has: page.locator('summary', { hasText: /^Site/ }) }).first()
  if (!(await group.evaluate((element) => (element as HTMLDetailsElement).open))) await group.locator('summary').click()
}

