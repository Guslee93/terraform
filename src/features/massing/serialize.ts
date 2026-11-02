import type { Vec2, Vec3 } from '../../lib/coordinates'
import { CAMERA_PRESET_IDS } from '../sites/manifest'
import {
  SCENARIO_SCHEMA_VERSION,
  type CameraBookmark,
  type Footprint,
  type MassTier,
  type MassUse,
  type MassVolume,
  type ScenarioAssumptions,
  type ScenarioDocument,
} from './types'
import { MassingValidationError, USES, validateScenario } from './validation'

/**
 * Pure JSON round-trip for the current scenario format (ADR-0004 §5, ADR-0011). Older formats go
 * through `migrateScenario` in `features/scenarios`, which ends here.
 */

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
  return decodeScenarioDocument(raw)
}

/** Structural decode plus domain validation of an already-parsed current-version document. */
export function decodeScenarioDocument(raw: unknown): ScenarioDocument {
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

function decodeVec3(value: unknown, path: string): Vec3 {
  const triple = asArray(value, path)
  const [east, north, up] = triple
  if (triple.length !== 3 || typeof east !== 'number' || typeof north !== 'number' || typeof up !== 'number') {
    fail(path, 'must be an [east, north, up] number triple')
  }
  return [east, north, up]
}

function decodeCamera(value: unknown, path: string): CameraBookmark {
  const record = asRecord(value, path)
  const presetId = CAMERA_PRESET_IDS.find((id) => id === record.presetId)
  if (!presetId) fail(`${path}.presetId`, 'must be a known camera preset')
  return {
    presetId,
    position: decodeVec3(record.position, `${path}.position`),
    target: decodeVec3(record.target, `${path}.target`),
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
    notes: asString(record.notes, 'notes'),
    ...(record.camera === undefined ? {} : { camera: decodeCamera(record.camera, 'camera') }),
    createdAt: asString(record.createdAt, 'createdAt'),
    updatedAt: asString(record.updatedAt, 'updatedAt'),
  }
}
