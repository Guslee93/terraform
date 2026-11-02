import Dexie, { type Table } from 'dexie'

/**
 * Low-level storage for the scenario repository (ADR-0011 §5): rows of validated JSON text, so a
 * damaged record can still be listed and exported raw. Two implementations: Dexie for the
 * browser, memory for tests. Neither knows the document schema.
 */

export type ProjectRow = { readonly siteId: string; readonly json: string }
export type ScenarioRow = { readonly id: string; readonly siteId: string; readonly json: string }

export type StoreErrorKind = 'quota' | 'unavailable'

export class StoreError extends Error {
  readonly kind: StoreErrorKind
  constructor(kind: StoreErrorKind, message: string) {
    super(message)
    this.name = 'StoreError'
    this.kind = kind
  }
}

export interface ScenarioStore {
  getProject(siteId: string): Promise<ProjectRow | undefined>
  listScenarios(siteId: string): Promise<ScenarioRow[]>
  putProject(row: ProjectRow): Promise<void>
  putScenario(row: ScenarioRow): Promise<void>
  deleteScenario(id: string): Promise<void>
  /** Remove the site's project and every scenario row. */
  clearSite(siteId: string): Promise<void>
  /** Replace a site's project and scenarios atomically (import). */
  replaceSite(project: ProjectRow, scenarios: readonly ScenarioRow[]): Promise<void>
}

export function createMemoryStore(): ScenarioStore & { failNext?: StoreErrorKind } {
  const projects = new Map<string, ProjectRow>()
  const scenarios = new Map<string, ScenarioRow>()
  const store: ScenarioStore & { failNext?: StoreErrorKind } = {
    async getProject(siteId) {
      return projects.get(siteId)
    },
    async listScenarios(siteId) {
      return [...scenarios.values()].filter((row) => row.siteId === siteId)
    },
    async putProject(row) {
      fail()
      projects.set(row.siteId, row)
    },
    async putScenario(row) {
      fail()
      scenarios.set(row.id, row)
    },
    async deleteScenario(id) {
      scenarios.delete(id)
    },
    async clearSite(siteId) {
      projects.delete(siteId)
      for (const [id, row] of scenarios) if (row.siteId === siteId) scenarios.delete(id)
    },
    async replaceSite(project, rows) {
      fail()
      await store.clearSite(project.siteId)
      projects.set(project.siteId, project)
      for (const row of rows) scenarios.set(row.id, row)
    },
  }
  // Test hook: the next write rejects with this kind, once.
  function fail() {
    const kind = store.failNext
    if (!kind) return
    delete store.failNext
    throw new StoreError(kind, `Simulated ${kind} failure`)
  }
  return store
}

class TerraformDatabase extends Dexie {
  projects!: Table<ProjectRow, string>
  scenarios!: Table<ScenarioRow, string>

  constructor() {
    super('terraform')
    this.version(1).stores({ projects: 'siteId', scenarios: 'id, siteId' })
  }
}

/** Map Dexie/IndexedDB failures onto the two kinds the UI can act on (QA-14). */
export function toStoreError(error: unknown): StoreError {
  const names = new Set<string>()
  let current: unknown = error
  for (let depth = 0; depth < 3 && typeof current === 'object' && current !== null; depth += 1) {
    if ('name' in current && typeof current.name === 'string') names.add(current.name)
    current = 'inner' in current ? current.inner : undefined
  }
  if (names.has('QuotaExceededError')) return new StoreError('quota', 'Browser storage is full')
  return new StoreError('unavailable', "This browser can't store data")
}

export function createDexieStore(): ScenarioStore {
  const db = new TerraformDatabase()
  const run = async <T>(work: () => Promise<T>): Promise<T> => {
    try {
      return await work()
    } catch (error) {
      throw toStoreError(error)
    }
  }
  return {
    getProject: (siteId) => run(() => db.projects.get(siteId)),
    listScenarios: (siteId) => run(() => db.scenarios.where('siteId').equals(siteId).toArray()),
    putProject: (row) => run(async () => { await db.projects.put(row) }),
    putScenario: (row) => run(async () => { await db.scenarios.put(row) }),
    deleteScenario: (id) => run(() => db.scenarios.delete(id)),
    clearSite: (siteId) => run(() => db.transaction('rw', db.projects, db.scenarios, async () => {
      await db.projects.delete(siteId)
      await db.scenarios.where('siteId').equals(siteId).delete()
    })),
    replaceSite: (project, rows) => run(() => db.transaction('rw', db.projects, db.scenarios, async () => {
      await db.projects.delete(project.siteId)
      await db.scenarios.where('siteId').equals(project.siteId).delete()
      await db.projects.put(project)
      await db.scenarios.bulkPut([...rows])
    })),
  }
}
