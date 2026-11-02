import { createScenario } from '../massing/factories'
import { SCENARIO_SCHEMA_VERSION, type ScenarioDocument } from '../massing/types'
import { isRecord, ScenarioLoadError, storedVersion } from './migrate'

/** One per site: which scenarios exist, in what order, and which is active (ADR-0011 §2). */
export type ProjectRecord = {
  readonly schemaVersion: typeof SCENARIO_SCHEMA_VERSION
  readonly siteId: string
  readonly activeScenarioId: string
  readonly scenarioIds: readonly string[]
  readonly updatedAt: string
}

/** A whole-project backup (FR-048): the same documents as storage, plus provenance. */
export type ProjectExport = {
  readonly schemaVersion: typeof SCENARIO_SCHEMA_VERSION
  readonly provenance: { readonly siteId: string; readonly appVersion: string; readonly exportedAt: string }
  readonly project: ProjectRecord
  readonly scenarios: readonly ScenarioDocument[]
  /** Stored records that could not be read, kept verbatim so nothing is lost (QA-14). */
  readonly unreadable?: readonly { readonly id: string; readonly json: string }[]
}

export const DEFAULT_SCENARIO_NAMES = ['Concept A', 'Concept B'] as const

/** First visit to a site: Concept A and Concept B, both empty, A active (FR-040). */
export function createDefaultProject(siteId: string, now: string): { project: ProjectRecord; scenarios: ScenarioDocument[] } {
  const scenarios = DEFAULT_SCENARIO_NAMES.map((name) => createScenario({ siteId, name, now }))
  const first = scenarios[0]
  if (!first) throw new Error('No default scenarios')
  return {
    project: {
      schemaVersion: SCENARIO_SCHEMA_VERSION,
      siteId,
      activeScenarioId: first.id,
      scenarioIds: scenarios.map((scenario) => scenario.id),
      updatedAt: now,
    },
    scenarios,
  }
}

function corrupt(path: string, message: string): never {
  throw new ScenarioLoadError('corrupt', path, message)
}

/**
 * Decode a stored project record. Project records first appear in format 2, so there is nothing
 * to migrate; a newer format is rejected like a scenario.
 */
export function decodeProject(raw: unknown): ProjectRecord {
  if (!isRecord(raw)) corrupt('$', 'A project must be an object')
  const record = raw
  const version = storedVersion(record)
  if (version > SCENARIO_SCHEMA_VERSION) {
    throw new ScenarioLoadError('newer-version', 'schemaVersion', `Saved by a newer version (format ${version})`, version)
  }
  if (version !== SCENARIO_SCHEMA_VERSION) corrupt('schemaVersion', `must be ${SCENARIO_SCHEMA_VERSION}`)
  const { siteId, activeScenarioId, scenarioIds, updatedAt } = record
  if (typeof siteId !== 'string' || siteId.length === 0) corrupt('siteId', 'must be a non-empty string')
  if (!Array.isArray(scenarioIds) || scenarioIds.length === 0 || !scenarioIds.every((id): id is string => typeof id === 'string' && id.length > 0)) {
    corrupt('scenarioIds', 'must be a non-empty list of ids')
  }
  if (new Set(scenarioIds).size !== scenarioIds.length) corrupt('scenarioIds', 'must be unique')
  if (typeof activeScenarioId !== 'string' || !scenarioIds.includes(activeScenarioId)) corrupt('activeScenarioId', 'must be one of scenarioIds')
  if (typeof updatedAt !== 'string' || !Number.isFinite(Date.parse(updatedAt))) corrupt('updatedAt', 'must be an ISO 8601 date-time')
  return { schemaVersion: SCENARIO_SCHEMA_VERSION, siteId, activeScenarioId, scenarioIds, updatedAt }
}
