import type { Vec2 } from '../../lib/coordinates'
import { ringCentroid, ringWithin, rotateRing, translateRing } from '../../lib/polygon'
import { tierTop } from '../massing/aggregate'
import { createId, createTier } from '../massing/factories'
import {
  EMPTY_SELECTION,
  type MassTier,
  type MassVolume,
  type ScenarioDocument,
} from '../massing/types'
import type { MassingCommand } from './history'

/**
 * Command factories (ADR-0004 §3). Each returns a pure document transform; `execute`
 * validates the result. Unknown ids and edits to locked masses throw so history is
 * never touched. A locked mass can still be renamed, hidden, unlocked or duplicated.
 */

type VolumePatch = Partial<Pick<MassVolume, 'name' | 'visible' | 'locked'>>

/** Linear scale of a new stacked tier's outline about the tier below's centre (area × 0.36). */
const SETBACK_SCALE = 0.6
const STACKED_STOREYS = 2
/** Tolerance for "this tier sits on that tier's top", in metres. */
const STACK_EPSILON_M = 1e-6
type TierPatch = Partial<Omit<MassTier, 'id'>>

function requireVolume(document: ScenarioDocument, volumeId: string): MassVolume {
  const volume = document.volumes.find((candidate) => candidate.id === volumeId)
  if (!volume) throw new Error(`Unknown volume: ${volumeId}`)
  return volume
}

function mapVolume(
  document: ScenarioDocument,
  volumeId: string,
  transform: (volume: MassVolume) => MassVolume,
): ScenarioDocument {
  requireVolume(document, volumeId)
  return {
    ...document,
    volumes: document.volumes.map((volume) => (volume.id === volumeId ? transform(volume) : volume)),
  }
}

function assertUnlocked(volume: MassVolume): void {
  if (volume.locked) throw new Error(`Mass is locked: ${volume.name}`)
}

/** Like mapVolume, but refuses geometry edits to a locked mass. */
function mapUnlockedVolume(
  document: ScenarioDocument,
  volumeId: string,
  transform: (volume: MassVolume) => MassVolume,
): ScenarioDocument {
  return mapVolume(document, volumeId, (volume) => {
    assertUnlocked(volume)
    return transform(volume)
  })
}

function mapTiers(volume: MassVolume, transform: (tier: MassTier) => MassTier): MassVolume {
  return { ...volume, tiers: volume.tiers.map(transform) }
}

export function addVolume(volume: MassVolume): MassingCommand {
  return {
    label: `Add ${volume.name}`,
    apply: (document) => ({ ...document, volumes: [...document.volumes, volume] }),
    selectionAfter: { volumeId: volume.id, tierId: volume.tiers[0]?.id ?? null },
  }
}

export function removeVolume(volumeId: string): MassingCommand {
  return {
    label: 'Delete mass',
    apply: (document) => {
      assertUnlocked(requireVolume(document, volumeId))
      return { ...document, volumes: document.volumes.filter((volume) => volume.id !== volumeId) }
    },
    selectionAfter: EMPTY_SELECTION,
  }
}

export function duplicateVolume(
  volumeId: string,
  { id = createId('volume'), offset = [0, 0] }: { id?: string; offset?: Vec2 } = {},
): MassingCommand {
  // Tier ids derive from the copy id so selectionAfter is known before apply runs.
  const tierId = (index: number) => `${id}-tier-${index}`
  return {
    label: 'Duplicate mass',
    apply: (document) => {
      const source = requireVolume(document, volumeId)
      const copy: MassVolume = {
        ...source,
        id,
        name: `${source.name} copy`,
        locked: false,
        tiers: source.tiers.map((tier, index) => ({
          ...tier,
          id: tierId(index),
          footprint: { vertices: translateRing(tier.footprint.vertices, offset[0], offset[1]) },
        })),
      }
      return { ...document, volumes: [...document.volumes, copy] }
    },
    selectionAfter: { volumeId: id, tierId: tierId(0) },
  }
}

export function moveVolume(volumeId: string, east: number, north: number): MassingCommand {
  return {
    label: 'Move mass',
    apply: (document) =>
      mapUnlockedVolume(document, volumeId, (volume) =>
        mapTiers(volume, (tier) => ({
          ...tier,
          footprint: { vertices: translateRing(tier.footprint.vertices, east, north) },
        })),
      ),
  }
}

/** Rotates all tiers about one pivot (default: base tier centroid) so stacks stay aligned. */
export function rotateVolume(volumeId: string, radians: number, pivot?: Vec2): MassingCommand {
  return {
    label: 'Rotate mass',
    apply: (document) =>
      mapUnlockedVolume(document, volumeId, (volume) => {
        const origin = pivot ?? ringCentroid(volume.tiers[0]?.footprint.vertices ?? [])
        return mapTiers(volume, (tier) => ({
          ...tier,
          footprint: { vertices: rotateRing(tier.footprint.vertices, radians, origin) },
        }))
      }),
  }
}

export function updateVolume(volumeId: string, patch: VolumePatch): MassingCommand {
  return {
    label: 'Edit mass',
    apply: (document) => mapVolume(document, volumeId, (volume) => ({ ...volume, ...patch })),
  }
}

export function addTier(volumeId: string, tier: MassTier): MassingCommand {
  return {
    label: 'Add tier',
    apply: (document) =>
      mapUnlockedVolume(document, volumeId, (volume) => ({ ...volume, tiers: [...volume.tiers, tier] })),
    selectionAfter: { volumeId, tierId: tier.id },
  }
}

/** Stacks a set-back tier on the mass's current top tier and selects it. */
export function stackTier(volumeId: string, { id = createId('tier') }: { id?: string } = {}): MassingCommand {
  return {
    label: 'Add tier',
    apply: (document) =>
      mapUnlockedVolume(document, volumeId, (volume) => {
        const top = volume.tiers.reduce((highest, tier) => (tierTop(tier) > tierTop(highest) ? tier : highest))
        const outline = top.footprint.vertices
        const [east, north] = ringCentroid(outline)
        const scaled = outline.map(
          ([x, y]) => [east + (x - east) * SETBACK_SCALE, north + (y - north) * SETBACK_SCALE] as const,
        )
        // A concave outline can push the scaled copy outside; stack the full outline instead.
        const footprint = ringWithin(scaled, outline) ? { vertices: scaled } : top.footprint
        const tier = createTier({
          id,
          name: `Tier ${volume.tiers.length + 1}`,
          footprint,
          baseElevation: tierTop(top),
          storeys: STACKED_STOREYS,
          storeyHeight: top.storeyHeight,
          use: top.use,
        })
        return { ...volume, tiers: [...volume.tiers, tier] }
      }),
    selectionAfter: { volumeId, tierId: id },
  }
}

/**
 * Edits one tier. Tiers stacked at or above its old top move with it, so upper tiers stay
 * attached when a lower tier gains storeys or changes base elevation.
 */
export function updateTier(volumeId: string, tierId: string, patch: TierPatch): MassingCommand {
  return {
    label: 'Edit tier',
    apply: (document) =>
      mapUnlockedVolume(document, volumeId, (volume) => {
        const target = volume.tiers.find((tier) => tier.id === tierId)
        if (!target) throw new Error(`Unknown tier: ${tierId}`)
        const updated = { ...target, ...patch }
        const oldTop = tierTop(target)
        const delta = tierTop(updated) - oldTop
        return mapTiers(volume, (tier) => {
          if (tier.id === tierId) return updated
          if (delta !== 0 && tier.baseElevation >= oldTop - STACK_EPSILON_M) {
            return { ...tier, baseElevation: tier.baseElevation + delta }
          }
          return tier
        })
      }),
  }
}

export function removeTier(volumeId: string, tierId: string): MassingCommand {
  return {
    label: 'Delete tier',
    apply: (document) =>
      mapUnlockedVolume(document, volumeId, (volume) => {
        if (!volume.tiers.some((tier) => tier.id === tierId)) {
          throw new Error(`Unknown tier: ${tierId}`)
        }
        return { ...volume, tiers: volume.tiers.filter((tier) => tier.id !== tierId) }
      }),
    selectionAfter: { volumeId, tierId: null },
  }
}

/** Scenario name and notes (FR-040, FR-041), undoable like any other edit. */
export function updateScenarioDetails(patch: Partial<Pick<ScenarioDocument, 'name' | 'notes'>>): MassingCommand {
  return {
    label: patch.name !== undefined ? 'Rename scenario' : 'Edit notes',
    apply: (document) => ({ ...document, ...patch }),
  }
}
