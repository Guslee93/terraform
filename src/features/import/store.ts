import Dexie, { type Table } from 'dexie'
import { isRecord } from '../scenarios/migrate'
import { toStoreError, StoreError, type StoreErrorKind } from '../scenarios/store'
import { parseSitePackage } from '../sites/package'
import type { ImportWarning } from './assemble'
import type { ImportedSite } from './session'

export type ImportedRow = { id: string; savedAt: string; json: string }
export type UnreadableImport = { id: string; status: 'unreadable' }
export type ImportedEntry = UnreadableImport | { id: string; status: 'ready'; summary: ImportedSite['summary']; savedAt: string; buildingCount: number }
export interface ImportedSiteStore {
  list(): Promise<ImportedEntry[]>
  get(id: string): Promise<ImportedSite | UnreadableImport | undefined>
  put(site: ImportedSite): Promise<void>
  delete(id: string): Promise<void>
}

function string(value: unknown, field: string, empty = false): string {
  if (typeof value !== 'string' || (!empty && !value.trim())) throw new Error(`Invalid ${field}`)
  return value
}
function date(value: unknown, field: string): string {
  const result = string(value, field)
  if (!Number.isFinite(Date.parse(result))) throw new Error(`Invalid ${field}`)
  return result
}

/** The single migration entry point; future versions must migrate before parsing. */
export function migrate(raw: unknown): ImportedSite {
  if (!isRecord(raw)) throw new Error('Invalid imported site')
  if (raw.schemaVersion !== 1) throw new Error(`Unsupported imported site schema version: ${String(raw.schemaVersion)}`)
  const summary = raw.summary
  if (!isRecord(summary) || summary.dataStatus !== 'user-import' || summary.morphology !== 'Imported area') throw new Error('Invalid imported summary')
  const id = string(summary.id, 'summary.id')
  if (!/^import-[a-z0-9-]+$/.test(id)) throw new Error('Invalid imported site id')
  const sitePackage = parseSitePackage(raw.sitePackage)
  if (sitePackage.manifest.id !== id || sitePackage.manifest.dataStatus !== 'user-import') throw new Error('Package does not match imported summary')
  if (!Array.isArray(raw.warnings)) throw new Error('Invalid warnings')
  const warnings = raw.warnings.map((warning: unknown): ImportWarning => {
    if (!isRecord(warning)) throw new Error('Invalid warning')
    const code = warning.code
    if (code !== 'terrain-estimated' && code !== 'terrain-water' && code !== 'terrain-flat' && code !== 'heights-estimated' && code !== 'trees-unavailable' && code !== 'roofs-flat') throw new Error('Invalid warning code')
    return { code, message: string(warning.message, 'warning.message') }
  })
  if (summary.notices !== undefined && !Array.isArray(summary.notices)) throw new Error('Invalid notices')
  return {
    summary: {
      id, title: string(summary.title, 'summary.title'), subtitle: string(summary.subtitle, 'summary.subtitle'),
      description: string(summary.description, 'summary.description'), thumbnail: string(summary.thumbnail, 'summary.thumbnail', true),
      morphology: 'Imported area', dataStatus: 'user-import',
      ...(Array.isArray(summary.notices) ? { notices: summary.notices.map((item: unknown) => string(item, 'notice')) } : {}),
    },
    sitePackage, warnings, importedAt: date(raw.importedAt, 'importedAt'),
  }
}

function read(row: ImportedRow): ImportedSite | UnreadableImport {
  try {
    date(row.savedAt, 'savedAt')
    const site = migrate(JSON.parse(row.json))
    if (site.summary.id !== row.id) throw new Error('Row id mismatch')
    return site
  } catch { return { id: row.id, status: 'unreadable' } }
}
type Rows = { list(): Promise<ImportedRow[]>; get(id: string): Promise<ImportedRow | undefined>; put(row: ImportedRow): Promise<void>; delete(id: string): Promise<void> }
function repository(rows: Rows, now: () => string): ImportedSiteStore {
  return {
    async list() {
      return (await rows.list()).sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt)).map((row) => {
        const site = read(row)
        return 'status' in site ? site : { id: row.id, status: 'ready', summary: site.summary, savedAt: row.savedAt, buildingCount: site.sitePackage.buildings.buildings.length }
      })
    },
    async get(id) { const row = await rows.get(id); return row ? read(row) : undefined },
    async put(site) {
      const validated = migrate({ ...site, schemaVersion: 1 })
      await rows.put({ id: validated.summary.id, savedAt: now(), json: JSON.stringify({ ...validated, schemaVersion: 1 }) })
    },
    delete: (id) => rows.delete(id),
  }
}

export function createMemoryImportedSiteStore(initial: ImportedRow[] = [], now = () => new Date().toISOString()) {
  const rows = new Map(initial.map((row) => [row.id, { ...row }]))
  const store: ImportedSiteStore & { failNext?: StoreErrorKind } = repository({
    async list() { return [...rows.values()] },
    async get(id) { return rows.get(id) },
    async put(row) {
      if (store.failNext) { const kind = store.failNext; delete store.failNext; throw new StoreError(kind, `Simulated ${kind} failure`) }
      rows.set(row.id, row)
    },
    async delete(id) { rows.delete(id) },
  }, now)
  return store
}
class ImportsDatabase extends Dexie {
  sites!: Table<ImportedRow, string>
  constructor() { super('terraform-imports'); this.version(1).stores({ sites: 'id' }) }
}
export function createDexieImportedSiteStore(): ImportedSiteStore {
  const db = new ImportsDatabase()
  async function run<T>(work: () => Promise<T>): Promise<T> {
    try { return await work() } catch (error) { throw toStoreError(error) }
  }
  return repository({
    list: () => run(() => db.sites.toArray()), get: (id) => run(() => db.sites.get(id)),
    put: (row) => run(async () => { await db.sites.put(row) }), delete: (id) => run(() => db.sites.delete(id)),
  }, () => new Date().toISOString())
}
