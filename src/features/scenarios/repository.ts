import { serializeScenario } from '../massing/serialize'
import { SCENARIO_SCHEMA_VERSION, type ScenarioDocument } from '../massing/types'
import { isRecord, migrateScenario, parseStoredScenario, ScenarioLoadError, storedVersion } from './migrate'
import { createDefaultProject, decodeProject, type ProjectExport, type ProjectRecord } from './project'
import { StoreError, type ScenarioRow, type ScenarioStore } from './store'

/** A stored record that could not be used, with its raw text for export (QA-14). */
export type SkippedRecord = {
  readonly id: string
  readonly json: string | null
  readonly reason: 'corrupt' | 'newer-version' | 'missing'
  readonly detail: string
}

export type LoadResult =
  | {
      readonly status: 'ready'
      readonly project: ProjectRecord
      readonly scenarios: readonly ScenarioDocument[]
      readonly skipped: readonly SkippedRecord[]
      /** The stored project index was missing, damaged or stale; save `project` to repair it. */
      readonly repaired: boolean
    }
  | { readonly status: 'empty' }
  | { readonly status: 'newer-version'; readonly version: number }
  | { readonly status: 'unavailable'; readonly reason: string }

export interface ScenarioRepository {
  load(siteId: string): Promise<LoadResult>
  /** Validates, then writes. Writes to one scenario id land in call order. Rejects with StoreError. */
  saveScenario(document: ScenarioDocument): Promise<void>
  saveProject(project: ProjectRecord): Promise<void>
  deleteScenario(id: string): Promise<void>
  /** Delete every stored record for the site (Reset demo, ADR-0011 §4). */
  resetSite(siteId: string): Promise<void>
  /** Backup JSON (FR-048): readable scenarios plus unreadable records verbatim. */
  exportProject(siteId: string): Promise<string>
  /** Validate and migrate the whole bundle first; write it in one transaction or not at all. */
  importProject(json: string): Promise<LoadResult>
}

type Options = { now: () => string; appVersion: string }

const byCreated = (a: ScenarioDocument, b: ScenarioDocument) =>
  a.createdAt.localeCompare(b.createdAt) || a.name.localeCompare(b.name)

export function createScenarioRepository(store: ScenarioStore, { now, appVersion }: Options): ScenarioRepository {
  const queues = new Map<string, Promise<void>>()

  /** Serialise writes per key so a slower earlier write never lands after a later one. */
  function enqueue(key: string, write: () => Promise<void>): Promise<void> {
    const previous = queues.get(key) ?? Promise.resolve()
    const next = previous.catch(() => undefined).then(write)
    queues.set(key, next)
    return next
  }

  async function readSite(siteId: string) {
    const [projectRow, rows] = await Promise.all([store.getProject(siteId), store.listScenarios(siteId)])
    return { projectRow, rows }
  }

  async function load(siteId: string): Promise<LoadResult> {
    let site: Awaited<ReturnType<typeof readSite>>
    try {
      site = await readSite(siteId)
    } catch (error) {
      return { status: 'unavailable', reason: error instanceof StoreError ? error.message : "This browser can't store data" }
    }
    const { projectRow, rows } = site
    if (!projectRow && rows.length === 0) return { status: 'empty' }

    let stored: ProjectRecord | null = null
    if (projectRow) {
      try {
        stored = decodeProject(JSON.parse(projectRow.json))
      } catch (error) {
        if (error instanceof ScenarioLoadError && error.kind === 'newer-version') {
          return { status: 'newer-version', version: error.version ?? SCENARIO_SCHEMA_VERSION + 1 }
        }
        stored = null // rebuilt from the scenario rows below
      }
    }

    const valid = new Map<string, ScenarioDocument>()
    const skipped: SkippedRecord[] = []
    for (const row of rows) {
      try {
        const document = parseStoredScenario(row.json, now())
        if (document.siteId !== siteId || document.id !== row.id) throw new ScenarioLoadError('corrupt', 'siteId', 'Record does not belong to this site')
        valid.set(row.id, document)
      } catch (error) {
        const loadError = error instanceof ScenarioLoadError ? error : new ScenarioLoadError('corrupt', '$', String(error))
        skipped.push({ id: row.id, json: row.json, reason: loadError.kind, detail: loadError.message })
      }
    }

    const ordered: ScenarioDocument[] = []
    const rowIds = new Set(rows.map((row) => row.id))
    for (const id of stored?.scenarioIds ?? []) {
      const document = valid.get(id)
      if (document) ordered.push(document)
      else if (!rowIds.has(id)) skipped.push({ id, json: null, reason: 'missing', detail: 'Listed in the project but not stored' })
    }
    const orphans = [...valid.values()].filter((document) => !ordered.includes(document)).sort(byCreated)
    ordered.push(...orphans)

    if (ordered.length === 0) {
      const defaults = createDefaultProject(siteId, now())
      return { status: 'ready', project: defaults.project, scenarios: defaults.scenarios, skipped, repaired: true }
    }

    const scenarioIds = ordered.map((document) => document.id)
    const activeScenarioId = stored && scenarioIds.includes(stored.activeScenarioId) ? stored.activeScenarioId : scenarioIds[0] ?? ''
    const repaired = !stored || stored.activeScenarioId !== activeScenarioId || stored.scenarioIds.join() !== scenarioIds.join()
    const project: ProjectRecord = stored && !repaired
      ? stored
      : { schemaVersion: SCENARIO_SCHEMA_VERSION, siteId, activeScenarioId, scenarioIds, updatedAt: now() }
    return { status: 'ready', project, scenarios: ordered, skipped, repaired }
  }

  function decodeBundle(json: string): { project: ProjectRecord; scenarios: ScenarioDocument[] } {
    let raw: unknown
    try {
      raw = JSON.parse(json)
    } catch {
      throw new ScenarioLoadError('corrupt', '$', 'The file is not valid JSON')
    }
    if (!isRecord(raw)) throw new ScenarioLoadError('corrupt', '$', 'A project file must be an object')
    const version = storedVersion(raw)
    if (version > SCENARIO_SCHEMA_VERSION) {
      throw new ScenarioLoadError('newer-version', 'schemaVersion', `Exported by a newer version (format ${version})`, version)
    }
    const project = decodeProject(raw.project)
    if (!Array.isArray(raw.scenarios)) throw new ScenarioLoadError('corrupt', 'scenarios', 'must be a list')
    const scenarios = raw.scenarios.map((entry: unknown, index) => {
      try {
        return migrateScenario(entry, now())
      } catch (error) {
        if (error instanceof ScenarioLoadError) {
          throw new ScenarioLoadError(error.kind, `scenarios[${index}].${error.path}`, error.message, error.version)
        }
        throw error
      }
    })
    const ids = scenarios.map((document) => document.id)
    if (scenarios.some((document) => document.siteId !== project.siteId)) {
      throw new ScenarioLoadError('corrupt', 'scenarios', 'Every scenario must belong to the project site')
    }
    if (ids.length !== project.scenarioIds.length || !project.scenarioIds.every((id) => ids.includes(id))) {
      throw new ScenarioLoadError('corrupt', 'project.scenarioIds', 'must list exactly the scenarios in the file')
    }
    return { project, scenarios }
  }

  return {
    load,
    saveScenario(document) {
      const row: ScenarioRow = { id: document.id, siteId: document.siteId, json: serializeScenario(document) }
      return enqueue(`scenario:${document.id}`, () => store.putScenario(row))
    },
    saveProject(project) {
      const json = JSON.stringify(decodeProject(project))
      return enqueue(`project:${project.siteId}`, () => store.putProject({ siteId: project.siteId, json }))
    },
    deleteScenario(id) {
      return enqueue(`scenario:${id}`, () => store.deleteScenario(id))
    },
    resetSite(siteId) {
      return enqueue(`project:${siteId}`, () => store.clearSite(siteId))
    },
    async exportProject(siteId) {
      const result = await load(siteId)
      if (result.status !== 'ready') {
        const { projectRow, rows } = await readSite(siteId)
        return JSON.stringify({ schemaVersion: SCENARIO_SCHEMA_VERSION, provenance: { siteId, appVersion, exportedAt: now() }, rawProject: projectRow ?? null, unreadable: rows.map(({ id, json }) => ({ id, json })) })
      }
      const bundle: ProjectExport = {
        schemaVersion: SCENARIO_SCHEMA_VERSION,
        provenance: { siteId, appVersion, exportedAt: now() },
        project: result.project,
        scenarios: result.scenarios,
        ...(result.skipped.some((record) => record.json !== null)
          ? { unreadable: result.skipped.flatMap((record) => (record.json === null ? [] : [{ id: record.id, json: record.json }])) }
          : {}),
      }
      return JSON.stringify(bundle, null, 2)
    },
    async importProject(json) {
      const { project, scenarios } = decodeBundle(json)
      const rows = scenarios.map((document) => ({ id: document.id, siteId: document.siteId, json: serializeScenario(document) }))
      await enqueue(`project:${project.siteId}`, () => store.replaceSite({ siteId: project.siteId, json: JSON.stringify(project) }, rows))
      return load(project.siteId)
    },
  }
}
