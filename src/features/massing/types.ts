import type { Vec2 } from '../../lib/coordinates'

export const SCENARIO_SCHEMA_VERSION = 1
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

export type ScenarioDocument = {
  readonly schemaVersion: 1
  readonly id: string
  readonly siteId: string
  readonly name: string
  readonly assumptions: ScenarioAssumptions
  readonly volumes: readonly MassVolume[]
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
