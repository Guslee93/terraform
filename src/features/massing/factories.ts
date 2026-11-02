import { normalizeRing } from '../../lib/polygon'
import type { Vec2 } from '../../lib/coordinates'
import {
  DEFAULT_ASSUMPTIONS,
  SCENARIO_SCHEMA_VERSION,
  type Footprint,
  type MassTier,
  type MassUse,
  type MassVolume,
  type ScenarioAssumptions,
  type ScenarioDocument,
} from './types'

export function createId(prefix: string): string {
  const random = globalThis.crypto?.randomUUID?.()
  if (random) return `${prefix}-${random}`
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function createFootprint(vertices: readonly Vec2[]): Footprint {
  const normalized = normalizeRing(vertices)
  if (normalized.length < 3) {
    throw new Error('A footprint needs at least three distinct vertices')
  }
  return { vertices: normalized }
}

export function createRectangleFootprint(
  width: number,
  depth: number,
  center: Vec2 = [0, 0],
): Footprint {
  if (!(width > 0) || !(depth > 0)) throw new Error('Rectangle dimensions must be positive')
  const halfWidth = width / 2
  const halfDepth = depth / 2
  const [east, north] = center
  return createFootprint([
    [east - halfWidth, north - halfDepth],
    [east + halfWidth, north - halfDepth],
    [east + halfWidth, north + halfDepth],
    [east - halfWidth, north + halfDepth],
  ])
}

type TierInput = {
  id?: string
  name?: string
  footprint: Footprint
  baseElevation?: number
  storeys?: number
  storeyHeight?: number
  use?: MassUse
}

export function createTier({
  id,
  name = 'Tier',
  footprint,
  baseElevation = 0,
  storeys = 3,
  storeyHeight = DEFAULT_ASSUMPTIONS.defaultStoreyHeight,
  use = 'residential',
}: TierInput): MassTier {
  return {
    id: id ?? createId('tier'),
    name,
    footprint,
    baseElevation,
    storeys,
    storeyHeight,
    use,
  }
}

type VolumeInput = {
  id?: string
  name?: string
  tiers: readonly MassTier[]
  visible?: boolean
  locked?: boolean
}

export function createVolume({
  id,
  name = 'Mass',
  tiers,
  visible = true,
  locked = false,
}: VolumeInput): MassVolume {
  if (tiers.length === 0) throw new Error('A mass volume needs at least one tier')
  return {
    id: id ?? createId('volume'),
    name,
    visible,
    locked,
    tiers,
  }
}

type ScenarioInput = {
  id?: string
  siteId: string
  name?: string
  volumes?: readonly MassVolume[]
  assumptions?: Partial<ScenarioAssumptions>
  notes?: string
  /** ISO instant for createdAt/updatedAt; injected in tests for determinism. */
  now?: string
}

export function createScenario({
  id,
  siteId,
  name = 'Concept A',
  volumes = [],
  assumptions,
  notes = '',
  now = new Date().toISOString(),
}: ScenarioInput): ScenarioDocument {
  return {
    schemaVersion: SCENARIO_SCHEMA_VERSION,
    id: id ?? createId('scenario'),
    siteId,
    name,
    assumptions: { ...DEFAULT_ASSUMPTIONS, ...assumptions },
    volumes,
    notes,
    createdAt: now,
    updatedAt: now,
  }
}

export function replaceTierInVolume(
  volume: MassVolume,
  tier: MassTier,
): MassVolume {
  return {
    ...volume,
    tiers: volume.tiers.map((candidate) => (candidate.id === tier.id ? tier : candidate)),
  }
}

export function findTier(
  volume: MassVolume,
  tierId: string,
): MassTier | undefined {
  return volume.tiers.find((tier) => tier.id === tierId)
}
