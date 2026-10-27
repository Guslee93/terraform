import type { Vec2 } from '../../lib/coordinates'
import {
  SCENARIO_SCHEMA_VERSION,
  type Footprint,
  type MassTier,
  type MassUse,
  type MassVolume,
  type ScenarioAssumptions,
  type ScenarioDocument,
} from './types'
import { MassingValidationError, USES, validateScenario } from './validation'

/** Pure JSON round-trip for M4 persistence (ADR-0004 §5). Migrations are M4's concern. */

export function serializeScenario(document: ScenarioDocument): string {
  const issues = validateScenario(document)
  if (issues.length > 0) throw new MassingValidationError(issues)
  return JSON.stringify(document)
}

export function parseScenarioDocument(json: string): ScenarioDocument {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    fail('$', 'is not valid JSON')
  }
  const document = decodeScenario(raw)
  const issues = validateScenario(document)
  if (issues.length > 0) throw new MassingValidationError(issues)
  return document
}

// Structural decoding: shapes and primitive types only. Ranges and ids are validateScenario's job.

function fail(path: string, message: string): never {
  throw new MassingValidationError([{ path, message }])
}

function asRecord(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(path, 'must be an object')
  }
  return value as Record<string, unknown>
}

function asArray(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value)) fail(path, 'must be an array')
  return value
}

function asString(value: unknown, path: string): string {
  if (typeof value !== 'string') fail(path, 'must be a string')
  return value
}

function asNumber(value: unknown, path: string): number {
  if (typeof value !== 'number') fail(path, 'must be a number')
  return value
}

function asBoolean(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') fail(path, 'must be a boolean')
  return value
}

function isUse(value: unknown): value is MassUse {
  return USES.some((use) => use === value)
}

function decodeVertex(value: unknown, path: string): Vec2 {
  const pair = asArray(value, path)
  const [east, north] = pair
  if (pair.length !== 2 || typeof east !== 'number' || typeof north !== 'number') {
    fail(path, 'must be an [east, north] number pair')
  }
  return [east, north]
}

function decodeFootprint(value: unknown, path: string): Footprint {
  const record = asRecord(value, path)
  const vertices = asArray(record.vertices, `${path}.vertices`)
  return { vertices: vertices.map((vertex, index) => decodeVertex(vertex, `${path}.vertices[${index}]`)) }
}

function decodeTier(value: unknown, path: string): MassTier {
  const record = asRecord(value, path)
  if (!isUse(record.use)) fail(`${path}.use`, 'must be a known use')
  return {
    id: asString(record.id, `${path}.id`),
    name: asString(record.name, `${path}.name`),
    footprint: decodeFootprint(record.footprint, `${path}.footprint`),
    baseElevation: asNumber(record.baseElevation, `${path}.baseElevation`),
    storeys: asNumber(record.storeys, `${path}.storeys`),
    storeyHeight: asNumber(record.storeyHeight, `${path}.storeyHeight`),
    use: record.use,
  }
}

function decodeVolume(value: unknown, path: string): MassVolume {
  const record = asRecord(value, path)
  const tiers = asArray(record.tiers, `${path}.tiers`)
  return {
    id: asString(record.id, `${path}.id`),
    name: asString(record.name, `${path}.name`),
    visible: asBoolean(record.visible, `${path}.visible`),
    locked: asBoolean(record.locked, `${path}.locked`),
    tiers: tiers.map((tier, index) => decodeTier(tier, `${path}.tiers[${index}]`)),
  }
}

function decodeAssumptions(value: unknown, path: string): ScenarioAssumptions {
  const record = asRecord(value, path)
  return {
    defaultStoreyHeight: asNumber(record.defaultStoreyHeight, `${path}.defaultStoreyHeight`),
    minStoreys: asNumber(record.minStoreys, `${path}.minStoreys`),
    maxStoreys: asNumber(record.maxStoreys, `${path}.maxStoreys`),
  }
}

function decodeScenario(value: unknown): ScenarioDocument {
  const record = asRecord(value, '$')
  // A newer schema is rejected rather than guessed at, so no data is silently lost.
  if (record.schemaVersion !== SCENARIO_SCHEMA_VERSION) {
    fail('schemaVersion', `must be ${SCENARIO_SCHEMA_VERSION}`)
  }
  const volumes = asArray(record.volumes, 'volumes')
  return {
    schemaVersion: SCENARIO_SCHEMA_VERSION,
    id: asString(record.id, 'id'),
    siteId: asString(record.siteId, 'siteId'),
    name: asString(record.name, 'name'),
    assumptions: decodeAssumptions(record.assumptions, 'assumptions'),
    volumes: volumes.map((volume, index) => decodeVolume(volume, `volumes[${index}]`)),
  }
}
