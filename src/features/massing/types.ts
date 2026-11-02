import type { Vec2, Vec3 } from '../../lib/coordinates'
import type { CameraPresetId } from '../sites/manifest'

/** Persisted scenario format (ADR-0011). v0 = unversioned v1, v1 = M2/M3, v2 = M4. */
export const SCENARIO_SCHEMA_VERSION = 2
export const MAX_NOTES_LENGTH = 2000
export const HISTORY_LIMIT = 100
export const MIN_FOOTPRINT_AREA = 4
export const MIN_STOREYS = 1
export const MAX_STOREYS = 40
export const MIN_STOREY_HEIGHT = 2.2
export const MAX_STOREY_HEIGHT = 6

export type MassUse = 'residential' | 'commercial' | 'mixed' | 'civic' | 'other'

export type Footprint = {
  readonly vertices: readonly Vec2[]
}

export type MassTier = {
  readonly id: string
  readonly name: string
  readonly footprint: Footprint
  readonly baseElevation: number
  readonly storeys: number
  readonly storeyHeight: number
  readonly use: MassUse
}

export type MassVolume = {
  readonly id: string
  readonly name: string
  readonly visible: boolean
  readonly locked: boolean
  readonly tiers: readonly MassTier[]
}

export type ScenarioAssumptions = {
  readonly defaultStoreyHeight: number
  readonly minStoreys: number
  readonly maxStoreys: number
}

/** A saved view for a scenario, in local ENU metres (ADR-0002). */
export type CameraBookmark = {
  readonly presetId: CameraPresetId
  readonly position: Vec3
  readonly target: Vec3
}

export type ScenarioDocument = {
  readonly schemaVersion: 2
  readonly id: string
  readonly siteId: string
  readonly name: string
  readonly assumptions: ScenarioAssumptions
  readonly volumes: readonly MassVolume[]
  /** Free text, at most MAX_NOTES_LENGTH characters (FR-041). */
  readonly notes: string
  readonly camera?: CameraBookmark
  /** ISO 8601 instants. */
  readonly createdAt: string
  readonly updatedAt: string
}

export type MassSelection = {
  readonly volumeId: string | null
  readonly tierId: string | null
}

export const EMPTY_SELECTION: MassSelection = { volumeId: null, tierId: null }

export const DEFAULT_ASSUMPTIONS: ScenarioAssumptions = {
  defaultStoreyHeight: 3.2,
  minStoreys: MIN_STOREYS,
  maxStoreys: MAX_STOREYS,
}
