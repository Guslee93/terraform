import { decodeScenarioDocument } from '../massing/serialize'
import { SCENARIO_SCHEMA_VERSION, type ScenarioDocument } from '../massing/types'
import { MassingValidationError } from '../massing/validation'

/**
 * Loading persisted scenarios (ADR-0011 §3). Every stored record goes through here: known older
 * versions are upgraded step by step, then decoded and validated as the current version. A newer
 * version is never guessed at, so nothing is silently dropped.
 */

export type ScenarioLoadErrorKind = 'corrupt' | 'newer-version'

export class ScenarioLoadError extends Error {
  readonly kind: ScenarioLoadErrorKind
  /** First offending path, e.g. `volumes[0].tiers[1].footprint`; `$` for the whole record. */
  readonly path: string
  /** The stored version, for `newer-version`. */
  readonly version?: number

  constructor(kind: ScenarioLoadErrorKind, path: string, message: string, version?: number) {
    super(message)
    this.name = 'ScenarioLoadError'
    this.kind = kind
    this.path = path
    if (version !== undefined) this.version = version
  }
}

type Raw = Record<string, unknown>

export function isRecord(value: unknown): value is Raw {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** v0 → v1: v0 is a v1 document saved without its version (ADR-0011 §3). */
function v0ToV1(raw: Raw): Raw {
  return { ...raw, schemaVersion: 1 }
}

/** v1 → v2: empty notes, no camera, both timestamps set to the migration instant. */
function v1ToV2(raw: Raw, now: string): Raw {
  return { ...raw, schemaVersion: 2, notes: '', createdAt: now, updatedAt: now }
}

/** The stored version: a missing key is v0; anything that isn't a whole number is corrupt. */
export function storedVersion(raw: Raw): number {
  const value = raw.schemaVersion
  if (value === undefined) return 0
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new ScenarioLoadError('corrupt', 'schemaVersion', 'schemaVersion must be a whole number')
  }
  return value
}

/** Upgrade and validate one stored scenario. `now` stamps documents that predate timestamps. */
export function migrateScenario(raw: unknown, now: string): ScenarioDocument {
  if (!isRecord(raw)) throw new ScenarioLoadError('corrupt', '$', 'A scenario must be an object')
  const version = storedVersion(raw)
  if (version > SCENARIO_SCHEMA_VERSION) {
    throw new ScenarioLoadError('newer-version', 'schemaVersion', `Saved by a newer version (format ${version})`, version)
  }
  let current = raw
  if (version < 1) current = v0ToV1(current)
  if (version < 2) current = v1ToV2(current, now)
  try {
    return decodeScenarioDocument(current)
  } catch (error) {
    if (error instanceof MassingValidationError) {
      const first = error.issues[0]
      throw new ScenarioLoadError('corrupt', first?.path ?? '$', first ? `${first.path} ${first.message}` : 'Invalid scenario')
    }
    throw error
  }
}

/** Parse stored text, then migrate. Invalid JSON is `corrupt` at `$`. */
export function parseStoredScenario(json: string, now: string): ScenarioDocument {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    throw new ScenarioLoadError('corrupt', '$', 'Saved data is not valid JSON')
  }
  return migrateScenario(raw, now)
}
